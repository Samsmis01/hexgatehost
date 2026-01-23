// server.js - Serveur HEXGATE WhatsApp Pairing
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";

// Import Baileys
import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} from "@whiskeysockets/baileys";

// Configuration des chemins
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// 📁 Dossier des sessions
const SESSIONS_DIR = path.join(__dirname, "sessions");
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  console.log(chalk.green(`✅ Dossier sessions créé: ${SESSIONS_DIR}`));
}

// 🧠 Stockage des bots actifs
const activeBots = new Map();

// 🎨 Couleurs pour les logs
const colors = {
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.cyan,
  highlight: chalk.magenta,
  reset: chalk.reset
};

// 🔥 Fonction pour démarrer le bot
async function startBot(sock, sessionPath) {
  try {
    console.log(colors.info(`🤖 Démarrage du bot pour la session...`));
    
    // Ici vous pouvez ajouter votre logique de bot personnalisée
    // Par exemple:
    // sock.ev.on('messages.upsert', async (m) => {
    //   console.log(colors.info('📨 Nouveau message reçu'));
    //   // Votre logique de traitement des messages
    // });
    
    return { success: true, message: "Bot démarré avec succès" };
  } catch (error) {
    console.log(colors.error(`❌ Erreur démarrage bot: ${error.message}`));
    return { success: false, error: error.message };
  }
}

// 🌐 ROUTE PRINCIPALE - Page d'accueil
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "✅ HEXGATE Pairing Server - V1",
    version: "1.0.0",
    endpoints: {
      pairing: "POST /pair",
      disconnect: "DELETE /disconnect/:number",
      activeBots: "GET /active-bots",
      botStatus: "GET /bot-status/:number",
      stats: "GET /stats",
      health: "GET /health"
    },
    frontend: "GET /panel"
  });
});

// 🩺 Route de santé
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeBots: activeBots.size,
    totalSessions: fs.readdirSync(SESSIONS_DIR).length
  });
});

// 🖥️ Route pour l'interface HTML
app.get("/panel", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 📱 ROUTE PAIRING PRINCIPALE
app.post("/pair", async (req, res) => {
  console.log(colors.info("📱 Requête de pairing reçue..."));
  
  try {
    let { number } = req.body;
    
    if (!number) {
      console.log(colors.error("❌ Numéro manquant dans la requête"));
      return res.status(400).json({ 
        success: false, 
        error: "Numéro WhatsApp requis" 
      });
    }

    // Nettoyer le numéro
    number = number.replace(/\D/g, "");
    
    if (number.length < 9) {
      console.log(colors.error(`❌ Numéro invalide: ${number} (trop court)`));
      return res.status(400).json({ 
        success: false, 
        error: "Numéro invalide (minimum 9 chiffres)" 
      });
    }
    
    // Ajouter le code pays 243 si absent
    if (!number.startsWith("243")) {
      number = "243" + number;
    }

    // Vérifier si le bot est déjà actif
    if (activeBots.has(number)) {
      const bot = activeBots.get(number);
      console.log(colors.warning(`⚠️ Bot déjà actif pour: ${number}`));
      return res.status(400).json({ 
        success: false, 
        error: "Bot déjà actif pour ce numéro",
        connected: bot?.user ? true : false
      });
    }

    console.log(colors.info(`📱 Tentative de connexion pour: ${number}`));

    const sessionPath = path.join(SESSIONS_DIR, number);
    
    // Créer le dossier de session s'il n'existe pas
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    let pairingCode = null;
    let sock = null;

    try {
      // Charger l'état d'authentification
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      
      // Obtenir la dernière version de Baileys
      const { version } = await fetchLatestBaileysVersion();
      
      // Créer la socket WhatsApp
      sock = makeWASocket({
        version,
        logger: { level: "silent" },
        printQRInTerminal: false,
        auth: state,
        browser: Browsers.ubuntu("Chrome"),
        markOnlineOnConnect: true,
        syncFullHistory: false,
      });

      // Gestion des mises à jour des credentials
      sock.ev.on("creds.update", saveCreds);

      // Stocker temporairement la socket
      activeBots.set(number, sock);

      // Gestion de la connexion
      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (connection === "close") {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          
          console.log(colors.warning(`🔌 Connexion fermée pour ${number}`));
          
          if (statusCode === DisconnectReason.loggedOut) {
            console.log(colors.error(`❌ Déconnecté (logged out) pour ${number}`));
            
            // Supprimer le dossier de session
            if (fs.existsSync(sessionPath)) {
              try {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log(colors.info(`🗑️ Session supprimée pour ${number}`));
              } catch (err) {
                console.log(colors.error(`❌ Erreur suppression session: ${err.message}`));
              }
            }
          }
          
          // Retirer du stockage actif
          activeBots.delete(number);
        }
        
        if (connection === "open") {
          console.log(colors.success(`✅ WhatsApp connecté: ${number}`));
          
          try {
            // Démarrer le bot
            const botResult = await startBot(sock, sessionPath);
            if (botResult.success) {
              console.log(colors.success(`🤖 Bot démarré pour ${number}`));
              
              // Envoyer un message de confirmation
              try {
                const userJid = sock.user?.id;
                if (userJid) {
                  await sock.sendMessage(userJid, {
                    text: `✅ *HEXGATE CONNECTÉ*\n\n🚀 Votre compte WhatsApp est maintenant connecté à HEXGATE V1!\n\n📊 Mode: PUBLIC\n🔓 Système de pairing réussi\n\nTapez .menu pour voir les commandes disponibles`
                  });
                  console.log(colors.success(`📨 Message de bienvenue envoyé à ${number}`));
                }
              } catch (msgError) {
                console.log(colors.warning(`⚠️ Impossible d'envoyer message: ${msgError.message}`));
              }
            }
          } catch (botError) {
            console.log(colors.error(`❌ Erreur démarrage bot: ${botError.message}`));
          }
        }
        
        // Afficher le QR code si généré (pour debug)
        if (qr) {
          console.log(colors.info(`📷 QR Code généré pour ${number}`));
        }
      });

      // 🔑 Génération du pairing code
      console.log(colors.info(`🔑 Génération du pairing code pour ${number}...`));
      
      try {
        // Générer le pairing code
        pairingCode = await sock.requestPairingCode(number);
        console.log(colors.success(`✅ Pair code généré: ${pairingCode} pour ${number}`));
        
      } catch (pairError) {
        console.log(colors.error(`❌ Erreur génération pair code: ${pairError.message}`));
        
        // Nettoyer
        activeBots.delete(number);
        if (sock) {
          try {
            await sock.logout();
          } catch (logoutError) {}
        }
        
        return res.status(500).json({
          success: false,
          error: "Erreur génération pairing code",
          details: pairError.message
        });
      }

      // Réponse avec le pairing code
      res.json({
        success: true,
        pairingCode: pairingCode,
        number: number,
        message: "Code généré avec succès",
        instructions: [
          "1. Ouvrez WhatsApp sur votre téléphone",
          "2. Appuyez sur les trois points (⋮)",
          "3. Sélectionnez « Périphériques liés »",
          "4. Appuyez sur « Ajouter un périphérique »",
          "5. Entrez le code ci-dessus"
        ],
        expiresIn: "5 minutes",
        timestamp: new Date().toISOString()
      });

    } catch (socketError) {
      console.log(colors.error(`❌ Erreur création socket: ${socketError.message}`));
      
      // Nettoyer en cas d'erreur
      if (sock) {
        try {
          await sock.logout();
        } catch (logoutError) {}
      }
      activeBots.delete(number);
      
      throw socketError;
    }

  } catch (err) {
    console.error(colors.error(`❌ Erreur dans /pair: ${err.message}`));
    console.error(err.stack);
    
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🔄 ROUTE POUR GÉNÉRER UN NOUVEAU CODE
app.post("/regenerate-code/:number", async (req, res) => {
  try {
    const { number } = req.params;
    const cleanNumber = number.replace(/\D/g, "");
    
    console.log(colors.info(`🔄 Regénération code pour: ${cleanNumber}`));
    
    if (!activeBots.has(cleanNumber)) {
      return res.status(404).json({ 
        success: false, 
        error: "Bot non trouvé ou déconnecté" 
      });
    }

    const sock = activeBots.get(cleanNumber);
    
    // Générer un nouveau pairing code
    const newCode = await sock.requestPairingCode(cleanNumber);
    
    console.log(colors.success(`✅ Nouveau code généré: ${newCode}`));
    
    res.json({
      success: true,
      pairingCode: newCode,
      number: cleanNumber,
      message: "Nouveau code généré",
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error(colors.error(`❌ Erreur regénération code: ${err.message}`));
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// 📴 ROUTE POUR DÉCONNECTER UN BOT
app.delete("/disconnect/:number", async (req, res) => {
  try {
    const { number } = req.params;
    const cleanNumber = number.replace(/\D/g, "");
    
    console.log(colors.warning(`📴 Déconnexion demandée pour: ${cleanNumber}`));
    
    if (activeBots.has(cleanNumber)) {
      const sock = activeBots.get(cleanNumber);
      
      try {
        await sock.logout();
        console.log(colors.success(`✅ Bot déconnecté pour ${cleanNumber}`));
      } catch (logoutError) {
        console.log(colors.warning(`⚠️ Erreur logout: ${logoutError.message}`));
      }
      
      activeBots.delete(cleanNumber);
      
      // Supprimer le dossier de session
      const sessionPath = path.join(SESSIONS_DIR, cleanNumber);
      if (fs.existsSync(sessionPath)) {
        try {
          fs.rmSync(sessionPath, { recursive: true, force: true });
          console.log(colors.info(`🗑️ Session supprimée pour ${cleanNumber}`));
        } catch (rmError) {
          console.log(colors.error(`❌ Erreur suppression: ${rmError.message}`));
        }
      }
      
      res.json({ 
        success: true, 
        message: `Bot déconnecté pour ${cleanNumber}`,
        sessionDeleted: true,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: "Bot non trouvé" 
      });
    }
  } catch (err) {
    console.error(colors.error(`❌ Erreur déconnexion: ${err.message}`));
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// 📊 ROUTE POUR LISTER LES BOTS ACTIFS
app.get("/active-bots", (req, res) => {
  try {
    const bots = Array.from(activeBots.entries()).map(([number, sock]) => ({
      number,
      connected: sock?.user ? true : false,
      user: sock?.user ? {
        id: sock.user.id,
        name: sock.user.name || "Inconnu",
        phone: sock.user.phone || number
      } : null,
      timestamp: Date.now(),
      status: sock?.user ? "connected" : "connecting"
    }));
    
    // Lire les sessions sur disque
    let sessionDirs = [];
    try {
      sessionDirs = fs.readdirSync(SESSIONS_DIR);
    } catch (readError) {
      console.log(colors.warning(`⚠️ Erreur lecture sessions: ${readError.message}`));
    }
    
    res.json({
      success: true,
      activeBots: bots,
      count: bots.length,
      totalSessions: sessionDirs.length,
      offlineSessions: sessionDirs.filter(dir => !activeBots.has(dir)).length,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error(colors.error(`❌ Erreur récupération bots: ${err.message}`));
    res.status(500).json({
      success: false,
      error: err.message,
      activeBots: [],
      count: 0
    });
  }
});

// 📋 ROUTE POUR VÉRIFIER L'ÉTAT D'UN BOT
app.get("/bot-status/:number", (req, res) => {
  try {
    const { number } = req.params;
    const cleanNumber = number.replace(/\D/g, "");
    
    if (activeBots.has(cleanNumber)) {
      const sock = activeBots.get(cleanNumber);
      const sessionPath = path.join(SESSIONS_DIR, cleanNumber);
      const sessionExists = fs.existsSync(sessionPath);
      
      res.json({
        success: true,
        connected: sock?.user ? true : false,
        number: cleanNumber,
        sessionExists: sessionExists,
        user: sock?.user ? {
          id: sock.user.id,
          name: sock.user.name || "Inconnu",
          phone: sock.user.phone || cleanNumber
        } : null,
        timestamp: Date.now(),
        status: "active"
      });
    } else {
      // Vérifier si une session existe sur disque
      const sessionPath = path.join(SESSIONS_DIR, cleanNumber);
      const sessionExists = fs.existsSync(sessionPath);
      
      res.json({
        success: true,
        connected: false,
        number: cleanNumber,
        sessionExists: sessionExists,
        message: sessionExists ? "Session existante mais bot non connecté" : "Aucune session trouvée",
        timestamp: Date.now(),
        status: sessionExists ? "disconnected" : "not_found"
      });
    }
  } catch (err) {
    console.error(colors.error(`❌ Erreur statut bot: ${err.message}`));
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// 🗑️ ROUTE POUR SUPPRIMER UNE SESSION
app.delete("/delete-session/:number", async (req, res) => {
  try {
    const { number } = req.params;
    const cleanNumber = number.replace(/\D/g, "");
    
    console.log(colors.warning(`🗑️ Suppression session demandée pour: ${cleanNumber}`));
    
    // Déconnecter le bot si actif
    if (activeBots.has(cleanNumber)) {
      const sock = activeBots.get(cleanNumber);
      try {
        await sock.logout();
        console.log(colors.info(`✅ Bot déconnecté avant suppression`));
      } catch (logoutError) {
        console.log(colors.warning(`⚠️ Erreur logout: ${logoutError.message}`));
      }
      activeBots.delete(cleanNumber);
    }
    
    // Supprimer le dossier de session
    const sessionPath = path.join(SESSIONS_DIR, cleanNumber);
    let deleted = false;
    
    if (fs.existsSync(sessionPath)) {
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        deleted = true;
        console.log(colors.success(`✅ Session supprimée pour ${cleanNumber}`));
      } catch (rmError) {
        console.log(colors.error(`❌ Erreur suppression session: ${rmError.message}`));
      }
    }
    
    res.json({
      success: true,
      deleted: deleted,
      number: cleanNumber,
      message: deleted ? `Session supprimée pour ${cleanNumber}` : "Aucune session à supprimer",
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error(colors.error(`❌ Erreur suppression session: ${err.message}`));
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// 📊 ROUTE POUR LES STATISTIQUES
app.get("/stats", (req, res) => {
  try {
    const sessions = fs.readdirSync(SESSIONS_DIR);
    const activeCount = activeBots.size;
    
    res.json({
      success: true,
      stats: {
        activeBots: activeCount,
        totalSessions: sessions.length,
        inactiveSessions: sessions.length - activeCount,
        uptime: process.uptime(),
        memory: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + "MB",
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB"
        },
        platform: process.platform,
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// 🎯 Route fallback pour toutes les autres requêtes
app.get("*", (req, res) => {
  res.redirect("/panel");
});

// 🚀 Lancement du serveur
app.listen(PORT, () => {
  console.log(colors.success(`
╔══════════════════════════════════════════════════╗
║       HEXGATE PAIRING SERVER - V1               ║
╠══════════════════════════════════════════════════╣
║ 🚀 Serveur lancé sur le port ${PORT}                ║
║ 🌍 URL: http://localhost:${PORT}                    ║
║ 🖥️ Panel: http://localhost:${PORT}/panel           ║
║ 📱 Pairing: POST http://localhost:${PORT}/pair     ║
║ 📊 Stats: GET http://localhost:${PORT}/stats       ║
║ 📁 Sessions: ${SESSIONS_DIR}       ║
║ 🤖 Bots actifs: ${activeBots.size}                    ║
╚══════════════════════════════════════════════════╝
  `));
  
  // Afficher les sessions existantes
  try {
    const sessions = fs.readdirSync(SESSIONS_DIR);
    if (sessions.length > 0) {
      console.log(colors.info(`📁 Sessions existantes: ${sessions.length}`));
      sessions.forEach(session => {
        console.log(colors.highlight(`  • ${session}`));
      });
    }
  } catch (err) {
    console.log(colors.warning(`⚠️ Erreur lecture sessions: ${err.message}`));
  }
});

// 🛑 Gestion propre de l'arrêt
process.on('SIGINT', () => {
  console.log(colors.warning("\n🛑 Arrêt du serveur..."));
  
  // Déconnecter tous les bots
  activeBots.forEach((sock, number) => {
    try {
      sock.logout();
      console.log(colors.info(`  ✅ Bot déconnecté pour ${number}`));
    } catch (e) {
      console.log(colors.error(`  ❌ Erreur déconnexion ${number}: ${e.message}`));
    }
  });
  
  console.log(colors.success("✅ Serveur arrêté proprement"));
  process.exit(0);
});

// ⚠️ Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error(colors.error(`❌ Erreur non catchée: ${error.message}`));
  console.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(colors.error(`❌ Promise non gérée: ${reason}`));
});
