// server.js - VERSION INTERNATIONALE CORRIGÉE
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
  console.log("📁 Dossier sessions créé");
}

// 🎯 Variables globales
let baileysAvailable = false;
let Baileys = null;
let activeBots = new Map();

// 🔧 Fonction robuste pour charger Baileys
async function loadBaileys() {
  if (Baileys && baileysAvailable) return true;
  
  console.log("🔄 Chargement de Baileys...");
  
  const methods = [
    // Méthode 1: Import ES module normal
    async () => {
      try {
        const module = await import("@whiskeysockets/baileys");
        console.log("✅ Baileys chargé (ES Module)");
        return { success: true, module };
      } catch (e) {
        console.log("⚠️ ES Module échoué:", e.message);
        return { success: false };
      }
    },
    
    // Méthode 2: CommonJS
    async () => {
      try {
        const { createRequire } = await import("module");
        const require = createRequire(import.meta.url);
        const module = require("@whiskeysockets/baileys");
        console.log("✅ Baileys chargé (CommonJS)");
        return { success: true, module };
      } catch (e) {
        console.log("⚠️ CommonJS échoué:", e.message);
        return { success: false };
      }
    }
  ];
  
  for (let i = 0; i < methods.length; i++) {
    const result = await methods[i]();
    if (result.success && result.module) {
      Baileys = result.module;
      
      // Vérifier que les fonctions nécessaires existent
      if (Baileys.makeWASocket && Baileys.useMultiFileAuthState) {
        baileysAvailable = true;
        console.log(`✨ Baileys initialisé avec succès`);
        return true;
      }
    }
  }
  
  console.log("❌ Baileys non disponible - Mode démo activé");
  baileysAvailable = false;
  return false;
}

// 🌐 ROUTE PRINCIPALE (compatible HTML - STATUT SERVEUR)
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "✅ HEXGATE Pairing Server - V1",
    version: "1.0.0",
    status: "online",
    baileys_available: baileysAvailable,
    endpoints: {
      pairing: "POST /pair",
      disconnect: "DELETE /disconnect/:number",
      activeBots: "GET /active-bots",
      botStatus: "GET /bot-status/:number",
      stats: "GET /stats",
      health: "GET /health"
    },
    timestamp: new Date().toISOString()
  });
});

// 🩺 HEALTH CHECK (Render compatible)
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    baileys: baileysAvailable ? "loaded" : "demo",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 🖥️ INTERFACE WEB
app.get("/panel", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🛠️ Fonction pour valider et formater les numéros internationaux
function validateAndFormatPhoneNumber(number) {
  if (!number || typeof number !== 'string') {
    return { valid: false, error: "Numéro requis" };
  }
  
  // Nettoyer: garder uniquement les chiffres et le +
  let cleaned = number.replace(/[^\d+]/g, '');
  
  // Si le numéro commence par +, le garder
  const hasPlus = cleaned.startsWith('+');
  if (hasPlus) {
    cleaned = cleaned.substring(1);
  }
  
  // Vérifier la longueur minimale (sans code pays)
  if (cleaned.length < 4) {
    return { valid: false, error: "Numéro trop court" };
  }
  
  // WhatsApp fonctionne avec: 
  // - Format international: +1234567890
  // - Format local: 1234567890 (code pays implicite)
  
  const formattedForBaileys = hasPlus ? `+${cleaned}` : cleaned;
  
  return {
    valid: true,
    original: number,
    cleaned: cleaned,
    formatted: formattedForBaileys,
    hasPlus: hasPlus
  };
}

// 📱 ROUTE PAIRING PRINCIPALE - VRAI CODE WHATSAPP
app.post("/pair", async (req, res) => {
  console.log("📞 Requête pairing reçue");
  
  try {
    let { number } = req.body;
    
    if (!number) {
      return res.status(400).json({ 
        success: false, 
        error: "Numéro WhatsApp requis" 
      });
    }
    
    // Valider et formater le numéro (support international)
    const validation = validateAndFormatPhoneNumber(number);
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: validation.error 
      });
    }
    
    const formattedNumber = validation.formatted;
    console.log(`📱 Traitement pour: ${formattedNumber}`);
    
    // 🔥 Charger Baileys si nécessaire
    if (!Baileys) {
      await loadBaileys();
    }
    
    // 🎭 MODE DÉMO si Baileys non disponible
    if (!baileysAvailable || !Baileys) {
      console.log("🎭 Mode démo activé");
      
      const pairingCode = generatePairingCode();
      
      return res.json({
        success: true,
        pairingCode: pairingCode,
        number: formattedNumber,
        original_number: number,
        message: "Code généré en mode démonstration",
        demo_mode: true,
        instructions: [
          "1. Allez sur https://web.whatsapp.com",
          "2. Cliquez sur 'Connecter avec un numéro de téléphone'",
          "3. Entrez votre numéro",
          "4. Saisissez le code ci-dessus",
          "5. Cliquez sur 'Valider'"
        ],
        expiresIn: "5 minutes",
        timestamp: new Date().toISOString()
      });
    }

    // 🔥 MODE RÉEL avec Baileys - GÉNÉRATION VRAI CODE
    console.log(`🔥 Génération VRAI code WhatsApp pour: ${formattedNumber}`);
    
    // Extraire les fonctions CORRECTEMENT - CORRECTION ICI
    const makeWASocket = Baileys.makeWASocket;
    const useMultiFileAuthState = Baileys.useMultiFileAuthState;
    const fetchLatestBaileysVersion = Baileys.fetchLatestBaileysVersion;
    const Browsers = Baileys.Browsers;
    
    // VÉRIFICATION CRITIQUE - ÉVITE "makeWASocket is not a function"
    if (typeof makeWASocket !== "function") {
      console.error("❌ ERREUR: makeWASocket n'est pas une fonction");
      console.error("Baileys structure disponible:", Object.keys(Baileys).join(", "));
      
      // Fallback au mode démo
      const pairingCode = generatePairingCode();
      
      return res.json({
        success: true,
        pairingCode: pairingCode,
        number: formattedNumber,
        original_number: number,
        message: "Code généré (mode démo - erreur Baileys)",
        demo_mode: true,
        baileys_error: "makeWASocket not function",
        instructions: [
          "1. Allez sur https://web.whatsapp.com",
          "2. Cliquez sur 'Connecter avec un numéro de téléphone'",
          "3. Entrez votre numéro",
          "4. Saisissez le code ci-dessus"
        ],
        expiresIn: "5 minutes",
        timestamp: new Date().toISOString()
      });
    }
    
    // Créer un ID de session unique
    const sessionId = formattedNumber.replace(/[^a-zA-Z0-9]/g, '_');
    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }
    
    let sock = null;
    let pairingCode = null;
    
    try {
      // 🔑 CHARGER LA SESSION - COMME DANS index.js
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      
      // 📦 VERSION BAILEYS
      const { version } = await fetchLatestBaileysVersion();
      
      // 🔌 CRÉER LA SOCKET WHATSAPP - CORRECTION DU LOGGER POUR ÉVITER L'ERREUR
      // ✅ CORRECTION ICI: logger.chil d n'est pas une fonction
      // Utilisation de logger simplifié
      const logger = {
        level: "silent",
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {}
      };
      
      sock = makeWASocket({
        version,
        logger: logger, // ✅ Corrigé: logger simple
        printQRInTerminal: false,
        auth: state,
        browser: Browsers.ubuntu("Chrome"),
        markOnlineOnConnect: true,
        syncFullHistory: false,
        connectTimeoutMs: 60000,
      });
      
      sock.ev.on("creds.update", saveCreds);
      
      // 📞 GÉNÉRER LE CODE DE PAIRING (WhatsApp réel) - COMME DANS index.js
      console.log(`🔗 Demande code WhatsApp pour: ${formattedNumber}`);
      
      // Utiliser requestPairingCode comme dans votre index.js
      pairingCode = await sock.requestPairingCode(formattedNumber);
      
      console.log(`✅ VRAI Code WhatsApp généré: ${pairingCode}`);
      
      // Stocker le bot actif
      activeBots.set(formattedNumber, {
        sock: sock,
        number: formattedNumber,
        connected: true,
        timestamp: Date.now()
      });
      
      // Fermer proprement après délai
      setTimeout(() => {
        try {
          if (sock && sock.ws) {
            sock.ws.close();
          }
        } catch (e) {
          // Ignorer
        }
      }, 10000); // 10 secondes
      
    } catch (pairError) {
      console.error(`❌ Erreur WhatsApp: ${pairError.message}`);
      console.error(pairError.stack);
      
      // Fallback au mode démo
      const demoCode = generatePairingCode();
      
      return res.json({
        success: true,
        pairingCode: demoCode,
        number: formattedNumber,
        original_number: number,
        message: "Code généré (mode démo - erreur WhatsApp)",
        demo_mode: true,
        whatsapp_error: pairError.message,
        instructions: [
          "1. Allez sur https://web.whatsapp.com",
          "2. Cliquez sur 'Connecter avec un numéro de téléphone'",
          "3. Entrez votre numéro",
          "4. Saisissez le code ci-dessus"
        ],
        expiresIn: "5 minutes",
        timestamp: new Date().toISOString()
      });
    }
    
    // ✅ RÉPONSE FINALE (VRAI CODE WHATSAPP)
    res.json({
      success: true,
      pairingCode: pairingCode,
      number: formattedNumber,
      original_number: number,
      message: "✅ VRAI Code WhatsApp généré avec succès",
      demo_mode: false,
      real_whatsapp: true,
      instructions: [
        "1. Allez sur https://web.whatsapp.com",
        "2. Cliquez sur 'Connecter avec un numéro de téléphone'",
        `3. Entrez: ${formattedNumber}`,
        `4. Saisissez: ${pairingCode}`,
        "5. Cliquez sur 'Valider'"
      ],
      expiresIn: "5 minutes",
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`💥 Erreur serveur: ${error.message}`);
    console.error(error.stack);
    
    const demoCode = generatePairingCode();
    
    res.json({
      success: true,
      pairingCode: demoCode,
      number: req.body?.number || "+1234567890",
      message: "Code généré (mode démo - erreur serveur)",
      demo_mode: true,
      server_error: error.message,
      instructions: [
        "1. Allez sur https://web.whatsapp.com",
        "2. Cliquez sur 'Connecter avec un numéro de téléphone'",
        "3. Entrez votre numéro",
        "4. Saisissez le code ci-dessus"
      ],
      expiresIn: "5 minutes",
      timestamp: new Date().toISOString()
    });
  }
});

// 📊 ACTIVE BOTS
app.get("/active-bots", (req, res) => {
  try {
    let sessionDirs = [];
    try {
      sessionDirs = fs.existsSync(SESSIONS_DIR) 
        ? fs.readdirSync(SESSIONS_DIR) 
        : [];
    } catch (e) {
      console.warn("⚠️ Erreur lecture sessions:", e.message);
    }
    
    const botsList = [];
    
    activeBots.forEach((bot, number) => {
      botsList.push({
        number: number,
        connected: bot.connected,
        demo: false,
        timestamp: bot.timestamp
      });
    });
    
    if (botsList.length === 0 && !baileysAvailable) {
      botsList.push(
        {
          number: "+243810000000",
          connected: true,
          demo: true,
          name: "Demo Congo"
        },
        {
          number: "+33123456789",
          connected: false,
          demo: true,
          name: "Demo France"
        },
        {
          number: "+14155552671",
          connected: true,
          demo: true,
          name: "Demo USA"
        }
      );
    }
    
    res.json({
      success: true,
      activeBots: botsList,
      count: botsList.length,
      totalSessions: sessionDirs.length,
      baileys_available: baileysAvailable,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Erreur active-bots:", error.message);
    
    res.json({
      success: true,
      activeBots: [],
      count: 0,
      totalSessions: 0,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 📈 STATISTIQUES
app.get("/stats", (req, res) => {
  const memory = process.memoryUsage();
  let sessionDirs = [];
  
  try {
    sessionDirs = fs.existsSync(SESSIONS_DIR) 
      ? fs.readdirSync(SESSIONS_DIR) 
      : [];
  } catch (e) {
    // Ignorer
  }
  
  res.json({
    success: true,
    stats: {
      server_status: "online",
      baileys_status: baileysAvailable ? "loaded" : "demo",
      uptime: Math.floor(process.uptime()),
      active_bots: activeBots.size,
      total_sessions: sessionDirs.length,
      memory_usage: Math.round(memory.heapUsed / 1024 / 1024) + "MB",
      platform: process.platform,
      node_version: process.version,
      timestamp: new Date().toISOString()
    }
  });
});

// 🔄 Route pour regénérer un code
app.post("/regenerate-code/:number", async (req, res) => {
  try {
    const { number } = req.params;
    
    // Mode démo seulement
    const pairingCode = generatePairingCode();
    
    res.json({
      success: true,
      pairingCode: pairingCode,
      number: number,
      message: "Nouveau code généré (mode démo)",
      demo_mode: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📴 Déconnecter un bot
app.delete("/disconnect/:number", async (req, res) => {
  try {
    const { number } = req.params;
    
    if (activeBots.has(number)) {
      const bot = activeBots.get(number);
      try {
        if (bot.sock && bot.sock.ws) {
          bot.sock.ws.close();
        }
      } catch (e) {
        // Ignorer
      }
      activeBots.delete(number);
    }
    
    res.json({
      success: true,
      message: `Bot déconnecté pour ${number}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🗑️ Supprimer une session
app.delete("/delete-session/:number", async (req, res) => {
  try {
    const { number } = req.params;
    const sessionId = number.replace(/[^a-zA-Z0-9]/g, '_');
    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    
    let deleted = false;
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      deleted = true;
    }
    
    if (activeBots.has(number)) {
      activeBots.delete(number);
    }
    
    res.json({
      success: true,
      deleted: deleted,
      message: deleted ? `Session supprimée pour ${number}` : "Session non trouvée",
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🛠️ Fonction pour générer un code de pairing
function generatePairingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}

// 🚀 Démarrer le serveur
async function startServer() {
  // Charger Baileys au démarrage
  await loadBaileys();
  
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║               HEXGATE PAIRING SERVER                ║
╠══════════════════════════════════════════════════════╣
║ 🚀 Serveur lancé sur le port ${PORT}                     ║
║ 🌍 URL: http://localhost:${PORT}                       ║
║ 🖥️ Panel: http://localhost:${PORT}/panel              ║
║ 📱 Mode: ${baileysAvailable ? '✅ RÉEL (Baileys)' : '🎭 DÉMO'}        ║
║ 🔥 VRAI Codes WhatsApp: ${baileysAvailable ? '✅ ACTIVÉ' : '❌ DÉMO'} ║
║ 🌐 Support: Tous formats internationaux             ║
║ 📊 Stats: http://localhost:${PORT}/stats              ║
║ 🛡️  Health: http://localhost:${PORT}/health           ║
╚══════════════════════════════════════════════════════╝
    `);
    
    // Keep-alive pour Render
    if (process.env.RENDER) {
      console.log("🔄 Auto-ping activé pour Render.com");
      setInterval(() => {
        fetch(`http://localhost:${PORT}/health`).catch(() => {});
      }, 600000);
    }
  });
}

// 🛑 Gestion des erreurs globales
process.on('uncaughtException', (error) => {
  console.error('💥 ERREUR NON CATCHÉE:', error.message);
  console.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ PROMISE NON GÉRÉE:', reason);
});

// 🏁 Point d'entrée avec gestion d'erreur
try {
  startServer().catch(error => {
    console.error('💥 ERREUR DÉMARRAGE:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
} catch (fatalError) {
  console.error('💥 ERREUR FATALE:', fatalError.message);
  process.exit(1);
}

// Export pour les tests
export { app, baileysAvailable };
