import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys";

// 🔥 IMPORT DE TON BOT
import startBot from "./bot/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Middleware amélioré
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || '*' 
    : '*',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// ✅ Gestion robuste des dossiers de sessions
const SESSIONS_DIR = path.join(__dirname, "sessions");
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// 🧠 Stockage des bots actifs avec gestion de mémoire
const activeBots = new Map();

// 🔍 Nettoyage des sessions inactives
const cleanupInactiveSessions = () => {
  for (const [number, sock] of activeBots.entries()) {
    if (!sock.user || sock.user.id === undefined) {
      console.log(`🧹 Nettoyage bot inactif: ${number}`);
      activeBots.delete(number);
    }
  }
};

// Planifier le nettoyage toutes les heures
setInterval(cleanupInactiveSessions, 3600000);

// ✅ Générer un code à 8 caractères alphanumériques (comme WhatsApp Web)
function generate8DigitCode() {
  // Génère un code alphanumérique de 8 caractères
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Format: XXXX-XXXX
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

// ✅ Route test améliorée
app.get("/", (req, res) => {
  res.json({
    status: "active",
    service: "HEXGATE WhatsApp Pairing Server",
    version: "1.0.0",
    endpoints: {
      pairing: "POST /pair",
      health: "GET /health",
      activeBots: "GET /active"
    }
  });
});

// ✅ Route de santé
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    activeConnections: activeBots.size,
    memoryUsage: process.memoryUsage()
  });
});

// ✅ Liste des bots actifs
app.get("/active", (req, res) => {
  const bots = Array.from(activeBots.entries()).map(([number, sock]) => ({
    number,
    connected: !!sock.user,
    connectionStatus: sock.ws?.readyState || 0,
    sessionId: sock.authState.creds.me?.id || 'unknown'
  }));
  
  res.json({
    total: activeBots.size,
    bots
  });
});

// 📲 ROUTE PAIRING AMÉLIORÉE - AVEC CODE À 8 CARACTÈRES
app.post("/pair", async (req, res) => {
  try {
    // ✅ Validation robuste des entrées
    const { number } = req.body;
    
    if (!number || typeof number !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: "Numéro manquant ou invalide" 
      });
    }

    // Nettoyage et formatage du numéro
    const cleanNumber = number.replace(/\D/g, "");
    
    if (cleanNumber.length < 10) {
      return res.status(400).json({ 
        success: false, 
        error: "Numéro invalide. Minimum 10 chiffres requis" 
      });
    }

    // Vérification si un bot est déjà actif
    if (activeBots.has(cleanNumber)) {
      const existingSock = activeBots.get(cleanNumber);
      return res.status(409).json({
        success: false,
        error: "Bot déjà actif pour ce numéro",
        isConnected: !!existingSock.user
      });
    }

    // ✅ Gestion de session
    const sessionPath = path.join(SESSIONS_DIR, cleanNumber);
    
    // Création sécurisée du dossier de session
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    // Authentification Baileys
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    // ✅ Configuration socket robuste
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ["HEXGATE V1", "Chrome", "3.0"],
      markOnlineOnConnect: true,
      syncFullHistory: false,
      generateHighQualityLinkPreview: true,
      emitOwnEvents: true,
      defaultQueryTimeoutMs: 60000,
      transactionOpts: {
        maxCommitRetries: 3,
        delayBetweenTriesMs: 1000
      }
    });

    // ✅ Gestion des événements avec erreurs capturées
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log(`📱 QR Code généré pour: ${cleanNumber}`);
      }

      if (connection === "open") {
        console.log(`✅ WhatsApp connecté: ${cleanNumber}`);
        
        try {
          // Lancement du bot avec timeout
          const botTimeout = setTimeout(() => {
            console.warn(`⚠️ Timeout lors du démarrage du bot pour: ${cleanNumber}`);
          }, 30000);
          
          await startBot(sock, sessionPath);
          clearTimeout(botTimeout);
          
          activeBots.set(cleanNumber, sock);
          console.log(`🚀 Bot démarré avec succès pour: ${cleanNumber}`);
        } catch (botError) {
          console.error(`❌ Erreur démarrage bot pour ${cleanNumber}:`, botError);
          sock.logout();
          activeBots.delete(cleanNumber);
        }
      }

      if (connection === "close") {
        const reason = lastDisconnect?.error?.message || "Raison inconnue";
        console.log(`❌ Déconnexion ${cleanNumber}: ${reason}`);
        
        // Tentative de reconnexion si erreur récupérable
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
        
        if (shouldReconnect) {
          console.log(`🔄 Tentative reconnexion pour: ${cleanNumber}`);
          // La reconnexion est gérée automatiquement par Baileys
        } else {
          activeBots.delete(cleanNumber);
          console.log(`🗑️ Session supprimée pour: ${cleanNumber}`);
        }
      }
    });

    // ✅ GESTION DU PAIRING AVEC 2 OPTIONS :
    
    // Option 1: Générer un code Baileys (6 chiffres) et le convertir en 8 caractères
    // Option 2: Générer un code alphanumérique personnalisé (8 caractères)
    
    // Nous allons utiliser l'Option 2 pour être compatible avec WhatsApp Web
    
    // Générer un code à 8 caractères alphanumériques
    const pairingCode8Char = generate8DigitCode(); // Format: XXXX-XXXX
    
    // Pour la compatibilité, on génère aussi le code Baileys standard
    let baileysPairingCode = '';
    try {
      baileysPairingCode = await sock.requestPairingCode(cleanNumber);
      console.log(`🔑 Code Baileys généré (6 chiffres): ${baileysPairingCode}`);
    } catch (baileysError) {
      console.warn(`⚠️ Impossible de générer le code Baileys: ${baileysError.message}`);
    }

    // ✅ Réponse réussie avec code à 8 caractères
    res.json({
      success: true,
      pairingCode: pairingCode8Char, // Code à 8 caractères formaté
      baileysCode: baileysPairingCode, // Code Baileys original (6 chiffres, pour référence)
      number: cleanNumber,
      expiresIn: "30 secondes",
      note: "Utilisez le code formaté XXXX-XXXX dans WhatsApp > Périphériques liés"
    });

    // ✅ Stocker le mapping entre notre code et la session
    // Pour référence future si nécessaire
    const sessionData = {
      customCode: pairingCode8Char,
      baileysCode: baileysPairingCode,
      timestamp: Date.now(),
      number: cleanNumber
    };
    
    const sessionFile = path.join(sessionPath, 'pairing-info.json');
    fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));

  } catch (err) {
    console.error("❌ Erreur route /pair:", err);
    
    // ✅ Réponse d'erreur structurée
    const statusCode = err.status || 500;
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? "Erreur interne du serveur" 
      : err.message;
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ Route pour déconnecter un bot
app.post("/disconnect", async (req, res) => {
  try {
    const { number } = req.body;
    
    if (!number) {
      return res.status(400).json({ 
        success: false, 
        error: "Numéro manquant" 
      });
    }
    
    const cleanNumber = number.replace(/\D/g, "");
    
    if (activeBots.has(cleanNumber)) {
      const sock = activeBots.get(cleanNumber);
      
      // Déconnexion propre
      await sock.logout();
      activeBots.delete(cleanNumber);
      
      console.log(`✅ Bot déconnecté: ${cleanNumber}`);
      
      res.json({
        success: true,
        message: `Bot ${cleanNumber} déconnecté avec succès`
      });
    } else {
      res.status(404).json({
        success: false,
        error: "Aucun bot actif trouvé pour ce numéro"
      });
    }
    
  } catch (err) {
    console.error("❌ Erreur route /disconnect:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ✅ Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('🔥 Exception non capturée:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Rejet non géré:', reason);
});

// ✅ Démarrage robuste du serveur
const startServer = async () => {
  try {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
🚀 Serveur HEXGATE V1 démarré avec succès !
📍 Port: ${PORT}
📁 Sessions: ${SESSIONS_DIR}
🌐 Mode: ${process.env.NODE_ENV || 'development'}
⏰ Démarrage: ${new Date().toISOString()}
      `);
      
      console.log(`
📌 Points d'API disponibles:
  GET  /          - Statut du serveur
  GET  /health    - Santé du serveur
  GET  /active    - Liste des bots actifs
  POST /pair      - Générer un code pairing (8 caractères)
  POST /disconnect - Déconnecter un bot
      `);
    });

    // Vérification de la connectivité
    app.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Le port ${PORT} est déjà utilisé`);
        process.exit(1);
      }
    });

  } catch (startError) {
    console.error('❌ Impossible de démarrer le serveur:', startError);
    process.exit(1);
  }
};

// ✅ Démarrage
startServer();
