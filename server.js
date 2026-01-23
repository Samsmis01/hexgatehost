import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys"

// 🛠️ IMPORT PROTÉGÉ DE TON BOT
let startBot;
try {
    const botModule = await import("./bot/index.js");
    startBot = botModule.default;
    console.log("✅ Module bot chargé avec succès");
} catch (error) {
    console.error("❌ Erreur lors du chargement du module bot :", error.message);
    // Fonction fallback si le bot ne charge pas
    startBot = async (sock, sessionPath) => {
        console.log(`🤖 Bot fallback démarré pour la session: ${sessionPath}`);
        // Ici, vous pouvez ajouter une logique basique ou juste logger
        sock.ev.on("messages.upsert", ({ messages }) => {
            console.log("📨 Message reçu (mode fallback)");
        });
    };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

/* 📁 dossier des sessions */
const SESSIONS_DIR = path.join(__dirname, "sessions");
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

/* 🧠 stockage des bots actifs */
const activeBots = new Map();

/* 🔗 route test */
app.get("/", (req, res) => {
    res.send("✅ Baileys Pairing Server actif");
});

/* 📲 ROUTE PAIRING */
app.post("/pair", async (req, res) => {
    try {
        let { number } = req.body;
        if (!number) {
            return res.status(400).json({ error: "Numéro manquant" });
        }

        number = number.replace(/\D/g, "");
        if (number.length < 10) {
            return res.status(400).json({ error: "Numéro invalide" });
        }
        
        if (activeBots.has(number)) {
            return res.status(400).json({ error: "Bot déjà actif pour ce numéro" });
        }

        const sessionPath = path.join(SESSIONS_DIR, number);
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ["Baileys", "Chrome", "1.0"]
        });

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", async ({ connection, qr }) => {
            if (qr) {
                console.log(`📱 QR code généré pour ${number}`);
            }

            if (connection === "open") {
                console.log(`✅ WhatsApp connecté : ${number}`);

                try {
                    // 🚀 LANCEMENT DE TON BOT avec la socket et le chemin de session
                    await startBot(sock, sessionPath);
                    activeBots.set(number, sock);
                    console.log(`🤖 Bot démarré avec succès pour ${number}`);
                } catch (botError) {
                    console.error(`❌ Erreur lors du démarrage du bot: ${botError.message}`);
                }
            }

            if (connection === "close") {
                console.log(`❌ WhatsApp déconnecté : ${number}`);
                if (activeBots.has(number)) {
                    activeBots.delete(number);
                }
            }
        });

        // 🔑 Génération du pairing code
        const code = await sock.requestPairingCode(number);

        res.json({
            success: true,
            pairingCode: code,
            message: `Code de pairing généré pour ${number}`
        });

    } catch (err) {
        console.error("❌ Erreur dans /pair:", err);
        res.status(500).json({
            error: "Erreur serveur",
            details: err.message
        });
    }
});

/* 📴 ROUTE POUR DÉCONNECTER UN BOT */
app.delete("/disconnect/:number", async (req, res) => {
    try {
        const { number } = req.params;
        const cleanNumber = number.replace(/\D/g, "");
        
        if (activeBots.has(cleanNumber)) {
            const sock = activeBots.get(cleanNumber);
            try {
                await sock.logout();
                console.log(`🔌 Bot déconnecté pour ${cleanNumber}`);
            } catch (logoutError) {
                console.warn(`⚠️ Erreur lors du logout: ${logoutError.message}`);
            }
            
            activeBots.delete(cleanNumber);
            
            // Supprimer le dossier de session
            const sessionPath = path.join(SESSIONS_DIR, cleanNumber);
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log(`🗑️ Session supprimée pour ${cleanNumber}`);
            }
            
            res.json({ 
                success: true, 
                message: `Bot déconnecté pour ${cleanNumber}` 
            });
        } else {
            res.status(404).json({ 
                error: "Bot non trouvé",
                message: `Aucun bot actif pour le numéro ${cleanNumber}`
            });
        }
    } catch (err) {
        console.error("❌ Erreur dans /disconnect:", err);
        res.status(500).json({ 
            error: "Erreur lors de la déconnexion",
            details: err.message 
        });
    }
});

/* 📊 ROUTE POUR LISTER LES BOTS ACTIFS */
app.get("/active-bots", (req, res) => {
    const bots = Array.from(activeBots.keys()).map(number => ({
        number,
        connected: activeBots.get(number)?.user ? true : false,
        timestamp: new Date().toISOString()
    }));
    
    res.json({ 
        success: true, 
        activeBots: bots,
        count: bots.length,
        serverTime: new Date().toISOString()
    });
});

/* 📋 ROUTE POUR VÉRIFIER L'ÉTAT D'UN BOT */
app.get("/bot-status/:number", (req, res) => {
    try {
        const { number } = req.params;
        const cleanNumber = number.replace(/\D/g, "");
        
        if (activeBots.has(cleanNumber)) {
            const sock = activeBots.get(cleanNumber);
            res.json({
                success: true,
                connected: sock?.user ? true : false,
                number: cleanNumber,
                user: sock?.user,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: "Bot non trouvé",
                message: `Aucun bot actif pour le numéro ${cleanNumber}`
            });
        }
    } catch (err) {
        console.error("❌ Erreur dans /bot-status:", err);
        res.status(500).json({ 
            error: "Erreur serveur",
            details: err.message 
        });
    }
});

/* 🩹 ROUTE DE SANTÉ */
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        activeBots: activeBots.size
    });
});

/* 🚀 Lancement serveur */
app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
    console.log(`🌍 URL: http://localhost:${PORT}`);
    console.log(`📱 Endpoint pairing: POST http://localhost:${PORT}/pair`);
    console.log(`📊 Endpoint monitoring: GET http://localhost:${PORT}/active-bots`);
    console.log(`🏥 Health check: GET http://localhost:${PORT}/health`);
});

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du serveur...');
    console.log(`🔌 Déconnexion de ${activeBots.size} bots...`);
    
    activeBots.forEach((sock, number) => {
        try {
            sock.logout();
            console.log(`✅ Bot déconnecté pour ${number}`);
        } catch (e) {
            console.error(`❌ Erreur déconnexion ${number}:`, e.message);
        }
    });
    
    console.log('👋 Serveur arrêté proprement');
    process.exit(0);
});

// Gestion des erreurs non catchées
process.on('uncaughtException', (error) => {
    console.error('❌ Erreur non catchée:', error.message);
    console.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise non gérée:', reason);
    console.error('Promise:', promise);
});
