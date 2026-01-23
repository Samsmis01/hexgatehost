// server.js - VERSION COMPLÈTE QUI DÉMARRE LE BOT
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

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
const BOT_DIR = path.join(__dirname, "bot"); // Dossier de votre bot

if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  console.log("📁 Dossier sessions créé");
}

// 🎯 Variables globales
let baileysAvailable = false;
let Baileys = null;
let activeBots = new Map();
let botProcesses = new Map(); // Pour stocker les processus des bots

// 🔧 Fonction pour démarrer un bot
async function startBot(phoneNumber, sessionPath) {
  try {
    console.log(`🤖 Démarrage du bot pour ${phoneNumber}...`);
    
    // Vérifier si le dossier bot existe
    if (!fs.existsSync(BOT_DIR)) {
      console.error(`❌ Dossier bot non trouvé: ${BOT_DIR}`);
      return null;
    }
    
    // Chemin vers le fichier index.js du bot
    const botIndexPath = path.join(BOT_DIR, "index.js");
    
    if (!fs.existsSync(botIndexPath)) {
      console.error(`❌ Fichier bot/index.js non trouvé: ${botIndexPath}`);
      return null;
    }
    
    // Copier la session générée vers le dossier du bot
    const botSessionPath = path.join(BOT_DIR, "sessions", phoneNumber.replace(/[^a-zA-Z0-9]/g, '_'));
    
    if (!fs.existsSync(path.join(BOT_DIR, "sessions"))) {
      fs.mkdirSync(path.join(BOT_DIR, "sessions"), { recursive: true });
    }
    
    // Copier les fichiers de session
    if (fs.existsSync(sessionPath)) {
      fs.cpSync(sessionPath, botSessionPath, { recursive: true });
      console.log(`📋 Session copiée vers: ${botSessionPath}`);
    }
    
    // Préparer les variables d'environnement
    const env = {
      ...process.env,
      WHATSAPP_NUMBER: phoneNumber,
      SESSION_PATH: botSessionPath,
      NODE_ENV: "production"
    };
    
    // Démarrer le bot
    const botProcess = spawn("node", ["index.js"], {
      cwd: BOT_DIR,
      env: env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Stocker le processus
    botProcesses.set(phoneNumber, botProcess);
    
    // Gérer la sortie du bot
    botProcess.stdout.on('data', (data) => {
      console.log(`[Bot ${phoneNumber}]: ${data.toString().trim()}`);
    });
    
    botProcess.stderr.on('data', (data) => {
      console.error(`[Bot ${phoneNumber} ERROR]: ${data.toString().trim()}`);
    });
    
    botProcess.on('close', (code) => {
      console.log(`[Bot ${phoneNumber}] Processus terminé avec code: ${code}`);
      botProcesses.delete(phoneNumber);
      
      // Mettre à jour le statut
      if (activeBots.has(phoneNumber)) {
        activeBots.get(phoneNumber).connected = false;
      }
    });
    
    botProcess.on('error', (err) => {
      console.error(`[Bot ${phoneNumber} PROCESS ERROR]:`, err);
      botProcesses.delete(phoneNumber);
    });
    
    console.log(`✅ Bot démarré pour ${phoneNumber} (PID: ${botProcess.pid})`);
    
    // Mettre à jour le statut dans activeBots
    if (activeBots.has(phoneNumber)) {
      activeBots.get(phoneNumber).botProcess = botProcess;
      activeBots.get(phoneNumber).botStarted = true;
      activeBots.get(phoneNumber).botPid = botProcess.pid;
    }
    
    return botProcess;
    
  } catch (error) {
    console.error(`❌ Erreur démarrage bot ${phoneNumber}:`, error);
    return null;
  }
}

// 🔧 Fonction pour arrêter un bot
async function stopBot(phoneNumber) {
  try {
    if (botProcesses.has(phoneNumber)) {
      const botProcess = botProcesses.get(phoneNumber);
      
      console.log(`🛑 Arrêt du bot ${phoneNumber} (PID: ${botProcess.pid})...`);
      
      // Envoyer SIGTERM
      botProcess.kill('SIGTERM');
      
      // Attendre un peu puis forcer si nécessaire
      setTimeout(() => {
        if (botProcesses.has(phoneNumber)) {
          console.log(`⚠️  Forçage arrêt bot ${phoneNumber}...`);
          botProcess.kill('SIGKILL');
        }
      }, 5000);
      
      botProcesses.delete(phoneNumber);
      
      // Mettre à jour le statut
      if (activeBots.has(phoneNumber)) {
        activeBots.get(phoneNumber).botStarted = false;
        activeBots.get(phoneNumber).connected = false;
      }
      
      console.log(`✅ Bot ${phoneNumber} arrêté`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Erreur arrêt bot ${phoneNumber}:`, error);
    return false;
  }
}

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
  
  console.log("❌ Baileys non disponible");
  baileysAvailable = false;
  return false;
}

// 🌐 ROUTE PRINCIPALE
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "✅ WhatsApp Bot Server",
    version: "2.0.0",
    status: "online",
    baileys_available: baileysAvailable,
    bots_running: botProcesses.size,
    endpoints: {
      pairing: "POST /pair",
      start_bot: "POST /start-bot/:number",
      stop_bot: "POST /stop-bot/:number",
      disconnect: "DELETE /disconnect/:number",
      activeBots: "GET /active-bots",
      botStatus: "GET /bot-status/:number",
      stats: "GET /stats",
      health: "GET /health"
    },
    timestamp: new Date().toISOString()
  });
});

// 🩺 HEALTH CHECK
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    baileys: baileysAvailable ? "loaded" : "not_loaded",
    bots_running: botProcesses.size,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 🛠️ Fonction pour valider et formater les numéros
function validateAndFormatPhoneNumber(number) {
  if (!number || typeof number !== 'string') {
    return { valid: false, error: "Numéro requis" };
  }
  
  let cleaned = number.replace(/[^\d+]/g, '');
  
  const hasPlus = cleaned.startsWith('+');
  if (hasPlus) {
    cleaned = cleaned.substring(1);
  }
  
  if (cleaned.length < 4) {
    return { valid: false, error: "Numéro trop court" };
  }
  
  const formattedForBaileys = hasPlus ? `+${cleaned}` : cleaned;
  
  return {
    valid: true,
    original: number,
    cleaned: cleaned,
    formatted: formattedForBaileys,
    hasPlus: hasPlus
  };
}

// 📱 ROUTE PAIRING PRINCIPALE
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
    
    // ❌ REFUSER SI Baileys n'est pas disponible
    if (!baileysAvailable || !Baileys) {
      console.log("❌ Baileys non disponible");
      
      return res.status(503).json({
        success: false,
        error: "Service WhatsApp indisponible",
        timestamp: new Date().toISOString()
      });
    }

    console.log(`🔥 Génération code WhatsApp pour: ${formattedNumber}`);
    
    const makeWASocket = Baileys.makeWASocket;
    const useMultiFileAuthState = Baileys.useMultiFileAuthState;
    const fetchLatestBaileysVersion = Baileys.fetchLatestBaileysVersion;
    const Browsers = Baileys.Browsers;
    const DisconnectReason = Baileys.DisconnectReason;
    
    if (typeof makeWASocket !== "function") {
      console.error("❌ ERREUR: makeWASocket n'est pas une fonction");
      
      return res.status(500).json({
        success: false,
        error: "Erreur d'initialisation WhatsApp",
        timestamp: new Date().toISOString()
      });
    }
    
    const sessionId = formattedNumber.replace(/[^a-zA-Z0-9]/g, '_');
    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }
    
    let sock = null;
    let pairingCode = null;
    
    try {
      // 🔑 CHARGER LA SESSION
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      
      // 📦 VERSION BAILEYS
      const { version } = await fetchLatestBaileysVersion();
      
      // 🔌 CRÉER LA SOCKET WHATSAPP
      const logger = {
        level: 'silent',
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {}
      };
      
      sock = makeWASocket({
        version,
        logger: logger,
        printQRInTerminal: false,
        auth: state,
        browser: Browsers.ubuntu("Chrome"),
        markOnlineOnConnect: true,
        syncFullHistory: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        emitOwnEvents: false,
        fireInitQueries: false,
        keepAliveIntervalMs: 30000,
      });
      
      sock.ev.on("creds.update", saveCreds);
      
      sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          if (statusCode === DisconnectReason.loggedOut) {
            console.log(`⚠️ Déconnecté de ${formattedNumber}`);
            try {
              fs.rmSync(sessionPath, { recursive: true, force: true });
            } catch (e) {
              // Ignorer
            }
          }
        }
      });
      
      // 📞 GÉNÉRER LE CODE DE PAIRING
      console.log(`🔗 Demande code WhatsApp pour: ${formattedNumber}`);
      
      try {
        pairingCode = await sock.requestPairingCode(formattedNumber);
        console.log(`✅ Code WhatsApp généré: ${pairingCode}`);
      } catch (pairError) {
        console.error(`❌ Erreur requestPairingCode: ${pairError.message}`);
        throw pairError;
      }
      
      // 🔥 IMPORTANT: Démarrer le bot après le pairing
      console.log(`🤖 Préparation démarrage bot pour ${formattedNumber}...`);
      
      // Stocker les infos du bot
      activeBots.set(formattedNumber, {
        sock: sock,
        number: formattedNumber,
        connected: true,
        pairingCode: pairingCode,
        sessionPath: sessionPath,
        botStarted: false,
        botProcess: null,
        timestamp: Date.now()
      });
      
      // Fermer la socket après 15 secondes (donne le temps pour le pairing)
      setTimeout(() => {
        try {
          if (sock && sock.ws && sock.ws.readyState === 1) {
            sock.ws.close();
            console.log(`🔌 Connexion pairing fermée pour ${formattedNumber}`);
          }
        } catch (e) {
          // Ignorer
        }
      }, 15000);
      
    } catch (pairError) {
      console.error(`❌ Erreur WhatsApp: ${pairError.message}`);
      
      // Nettoyer la session en cas d'erreur
      try {
        const sessionId = formattedNumber.replace(/[^a-zA-Z0-9]/g, '_');
        const sessionPath = path.join(SESSIONS_DIR, sessionId);
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }
      } catch (e) {
        // Ignorer
      }
      
      return res.status(500).json({
        success: false,
        error: "Erreur WhatsApp",
        message: pairError.message || "Impossible de générer le code WhatsApp",
        timestamp: new Date().toISOString()
      });
    }
    
    // ✅ RÉPONSE FINALE
    res.json({
      success: true,
      pairingCode: pairingCode,
      number: formattedNumber,
      original_number: number,
      message: "✅ Code WhatsApp généré avec succès",
      bot_ready: true,
      instructions: [
        "1. Allez sur https://web.whatsapp.com",
        "2. Cliquez sur 'Connecter avec un numéro de téléphone'",
        `3. Entrez: ${formattedNumber}`,
        `4. Saisissez: ${pairingCode}`,
        "5. Cliquez sur 'Valider'",
        "6. Le bot démarrera automatiquement après connexion"
      ],
      expiresIn: "5 minutes",
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`💥 Erreur serveur: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
      message: error.message || "Une erreur est survenue",
      timestamp: new Date().toISOString()
    });
  }
});

// 🚀 DÉMARRER UN BOT APRÈS PAIRING
app.post("/start-bot/:number", async (req, res) => {
  try {
    const { number } = req.params;
    
    if (!activeBots.has(number)) {
      return res.status(404).json({
        success: false,
        error: "Bot non trouvé",
        message: `Aucun bot trouvé pour ${number}`,
        timestamp: new Date().toISOString()
      });
    }
    
    const bot = activeBots.get(number);
    
    // Vérifier si le bot est déjà démarré
    if (bot.botStarted && botProcesses.has(number)) {
      return res.json({
        success: true,
        message: `Bot ${number} est déjà démarré`,
        pid: bot.botPid,
        timestamp: new Date().toISOString()
      });
    }
    
    // Démarrer le bot
    const botProcess = await startBot(number, bot.sessionPath);
    
    if (botProcess) {
      res.json({
        success: true,
        message: `Bot ${number} démarré avec succès`,
        pid: botProcess.pid,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Erreur démarrage bot",
        message: `Impossible de démarrer le bot ${number}`,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error(`❌ Erreur démarrage bot:`, error);
    
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🛑 ARRÊTER UN BOT
app.post("/stop-bot/:number", async (req, res) => {
  try {
    const { number } = req.params;
    
    const stopped = await stopBot(number);
    
    if (stopped) {
      res.json({
        success: true,
        message: `Bot ${number} arrêté`,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: "Bot non trouvé",
        message: `Aucun bot actif trouvé pour ${number}`,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error(`❌ Erreur arrêt bot:`, error);
    
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
      message: error.message,
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
    
    // Ajouter les bots actifs
    activeBots.forEach((bot, number) => {
      botsList.push({
        number: number,
        connected: bot.connected,
        botStarted: bot.botStarted || false,
        botPid: bot.botPid || null,
        hasSession: fs.existsSync(bot.sessionPath || ''),
        timestamp: bot.timestamp
      });
    });
    
    // Ajouter les sessions existantes
    sessionDirs.forEach(sessionDir => {
      const sessionPath = path.join(SESSIONS_DIR, sessionDir);
      try {
        const number = sessionDir.replace(/_/g, '').replace(/[^+\d]/g, '');
        if (number && !activeBots.has(number)) {
          botsList.push({
            number: number,
            connected: false,
            botStarted: false,
            hasSession: true,
            timestamp: fs.statSync(sessionPath).mtimeMs
          });
        }
      } catch (e) {
        // Ignorer
      }
    });
    
    res.json({
      success: true,
      activeBots: botsList,
      count: botsList.length,
      totalSessions: sessionDirs.length,
      botsRunning: botProcesses.size,
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
      baileys_status: baileysAvailable ? "loaded" : "not_loaded",
      uptime: Math.floor(process.uptime()),
      active_bots: activeBots.size,
      bots_running: botProcesses.size,
      total_sessions: sessionDirs.length,
      memory_usage: Math.round(memory.heapUsed / 1024 / 1024) + "MB",
      platform: process.platform,
      node_version: process.version,
      timestamp: new Date().toISOString()
    }
  });
});

// 📴 Déconnecter un bot
app.delete("/disconnect/:number", async (req, res) => {
  try {
    const { number } = req.params;
    
    // Arrêter le bot si en cours d'exécution
    await stopBot(number);
    
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
    
    // Arrêter le bot si en cours d'exécution
    await stopBot(number);
    
    let deleted = false;
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      deleted = true;
    }
    
    // Supprimer aussi des bots actifs
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

// 🚀 Démarrer le serveur
async function startServer() {
  // Charger Baileys au démarrage
  await loadBaileys();
  
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║           WHATSAPP BOT SERVER - COMPLET             ║
╠══════════════════════════════════════════════════════╣
║ 🚀 Serveur lancé sur le port ${PORT}                     ║
║ 🌍 URL: http://localhost:${PORT}                       ║
║ 🖥️ Panel: http://localhost:${PORT}/panel              ║
║ 🤖 Dossier bot: ${BOT_DIR}                     ║
║ 📱 WhatsApp: ${baileysAvailable ? '✅ ACTIF' : '❌ HORS LIGNE'}           ║
║ 🔥 Génère codes + Démarre bots automatiquement      ║
║ 📊 Stats: http://localhost:${PORT}/stats              ║
║ 🛡️  Health: http://localhost:${PORT}/health           ║
╚══════════════════════════════════════════════════════╝
    `);
    
    // Vérifier le dossier bot
    if (!fs.existsSync(BOT_DIR)) {
      console.warn(`⚠️ ATTENTION: Dossier bot non trouvé: ${BOT_DIR}`);
      console.warn(`   Les bots ne pourront pas être démarrés`);
    } else if (!fs.existsSync(path.join(BOT_DIR, "index.js"))) {
      console.warn(`⚠️ ATTENTION: Fichier bot/index.js non trouvé`);
      console.warn(`   Les bots ne pourront pas être démarrés`);
    } else {
      console.log(`✅ Bot prêt à être démarré: ${path.join(BOT_DIR, "index.js")}`);
    }
    
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

// Nettoyer à l'arrêt
process.on('SIGTERM', async () => {
  console.log('🔴 Arrêt du serveur, nettoyage des bots...');
  
  // Arrêter tous les bots
  for (const [number, process] of botProcesses) {
    try {
      process.kill('SIGTERM');
    } catch (e) {
      // Ignorer
    }
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔴 Arrêt du serveur (Ctrl+C)...');
  
  // Arrêter tous les bots
  for (const [number, process] of botProcesses) {
    try {
      process.kill('SIGTERM');
    } catch (e) {
      // Ignorer
    }
  }
  
  process.exit(0);
});

// 🏁 Point d'entrée
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
export { app, baileysAvailable, startBot, stopBot };
