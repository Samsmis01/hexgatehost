// server.js - VERSION ULTIME CORRIGÉE
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

// 📁 Dossiers
const SESSIONS_DIR = path.join(__dirname, "sessions");
const BOT_DIR = path.join(__dirname, "bot");

// Créer les dossiers nécessaires
[ SESSIONS_DIR ].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Dossier créé: ${dir}`);
  }
});

// 🎯 Variables globales
let baileysAvailable = false;
let Baileys = null;
let activeBots = new Map();
let botProcesses = new Map();

// 🔧 Fonction pour charger Baileys
async function loadBaileys() {
  if (Baileys && baileysAvailable) return true;
  
  console.log("🔄 Chargement de Baileys...");
  
  try {
    // Essayer ES module d'abord
    const module = await import("@whiskeysockets/baileys");
    Baileys = module;
    
    if (Baileys && Baileys.makeWASocket) {
      baileysAvailable = true;
      console.log("✅ Baileys chargé (ES Module)");
      return true;
    }
  } catch (e) {
    console.log("⚠️ ES Module échoué, essai CommonJS...");
    
    try {
      const { createRequire } = await import("module");
      const require = createRequire(import.meta.url);
      Baileys = require("@whiskeysockets/baileys");
      
      if (Baileys && Baileys.makeWASocket) {
        baileysAvailable = true;
        console.log("✅ Baileys chargé (CommonJS)");
        return true;
      }
    } catch (e2) {
      console.log("❌ CommonJS échoué:", e2.message);
    }
  }
  
  console.log("❌ Baileys non disponible");
  baileysAvailable = false;
  return false;
}

// 🚀 Fonction pour démarrer un bot
async function startBot(phoneNumber, sessionPath) {
  try {
    console.log(`🤖 Démarrage du bot pour ${phoneNumber}...`);
    
    // Vérifier le dossier bot
    if (!fs.existsSync(BOT_DIR)) {
      console.error(`❌ Dossier bot non trouvé: ${BOT_DIR}`);
      return null;
    }
    
    const botIndexPath = path.join(BOT_DIR, "index.js");
    if (!fs.existsSync(botIndexPath)) {
      console.error(`❌ Fichier bot/index.js non trouvé`);
      return null;
    }
    
    // Créer le dossier sessions dans bot si nécessaire
    const botSessionsDir = path.join(BOT_DIR, "sessions");
    if (!fs.existsSync(botSessionsDir)) {
      fs.mkdirSync(botSessionsDir, { recursive: true });
    }
    
    // Copier la session vers le dossier bot
    const sessionId = phoneNumber.replace(/[^a-zA-Z0-9]/g, '_');
    const botSessionPath = path.join(botSessionsDir, sessionId);
    
    if (fs.existsSync(sessionPath)) {
      // Nettoyer l'ancienne session si elle existe
      if (fs.existsSync(botSessionPath)) {
        fs.rmSync(botSessionPath, { recursive: true, force: true });
      }
      // Copier la nouvelle session
      fs.cpSync(sessionPath, botSessionPath, { recursive: true });
      console.log(`📋 Session copiée vers bot: ${botSessionPath}`);
    }
    
    // Préparer l'environnement
    const env = {
      ...process.env,
      WHATSAPP_NUMBER: phoneNumber,
      SESSION_NAME: sessionId,
      NODE_ENV: "production",
      // Désactiver les logs inutiles
      DEBUG: "",
      NODE_OPTIONS: "--max-old-space-size=512"
    };
    
    // Démarrer le processus
    console.log(`🚀 Lancement: node index.js dans ${BOT_DIR}`);
    const botProcess = spawn("node", ["index.js"], {
      cwd: BOT_DIR,
      env: env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });
    
    // Stocker le processus
    botProcesses.set(phoneNumber, botProcess);
    
    // Gérer les logs
    botProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[Bot ${phoneNumber}]: ${output}`);
      }
    });
    
    botProcess.stderr.on('data', (data) => {
      const error = data.toString().trim();
      if (error && !error.includes('ExperimentalWarning')) {
        console.error(`[Bot ${phoneNumber} ERROR]: ${error}`);
      }
    });
    
    botProcess.on('close', (code) => {
      console.log(`[Bot ${phoneNumber}] Processus terminé (code: ${code})`);
      botProcesses.delete(phoneNumber);
      
      // Mettre à jour le statut
      if (activeBots.has(phoneNumber)) {
        activeBots.get(phoneNumber).botStarted = false;
      }
    });
    
    botProcess.on('error', (err) => {
      console.error(`[Bot ${phoneNumber} PROCESS ERROR]:`, err.message);
      botProcesses.delete(phoneNumber);
    });
    
    console.log(`✅ Bot démarré pour ${phoneNumber} (PID: ${botProcess.pid})`);
    
    // Mettre à jour les informations
    if (activeBots.has(phoneNumber)) {
      const bot = activeBots.get(phoneNumber);
      bot.botStarted = true;
      bot.botPid = botProcess.pid;
      bot.botProcess = botProcess;
    }
    
    return botProcess;
    
  } catch (error) {
    console.error(`❌ Erreur démarrage bot ${phoneNumber}:`, error.message);
    return null;
  }
}

// 🛑 Fonction pour arrêter un bot
async function stopBot(phoneNumber) {
  try {
    if (botProcesses.has(phoneNumber)) {
      const botProcess = botProcesses.get(phoneNumber);
      console.log(`🛑 Arrêt du bot ${phoneNumber} (PID: ${botProcess.pid})...`);
      
      // Envoyer SIGTERM
      botProcess.kill('SIGTERM');
      
      // Attendre puis forcer si nécessaire
      setTimeout(() => {
        if (botProcesses.has(phoneNumber)) {
          console.log(`⚠️  Forçage arrêt bot ${phoneNumber}`);
          botProcess.kill('SIGKILL');
        }
      }, 3000);
      
      botProcesses.delete(phoneNumber);
      
      // Mettre à jour le statut
      if (activeBots.has(phoneNumber)) {
        activeBots.get(phoneNumber).botStarted = false;
      }
      
      console.log(`✅ Bot ${phoneNumber} arrêté`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Erreur arrêt bot ${phoneNumber}:`, error.message);
    return false;
  }
}

// 🌐 ROUTE PRINCIPALE
app.get("/", (req, res) => {
  const domain = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  
  res.json({
    success: true,
    message: "🤖 WhatsApp Bot Server",
    version: "3.0.0",
    domain: domain,
    status: "online",
    baileys_available: baileysAvailable,
    bots_running: botProcesses.size,
    endpoints: {
      pairing: "POST /pair",
      start_bot: "POST /start-bot/:number",
      stop_bot: "POST /stop-bot/:number",
      activeBots: "GET /active-bots",
      stats: "GET /stats",
      health: "GET /health",
      panel: "GET /panel"
    },
    timestamp: new Date().toISOString()
  });
});

// 🩺 HEALTH CHECK (important pour Render)
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    baileys: baileysAvailable ? "loaded" : "not_loaded",
    bots_running: botProcesses.size,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// 🛠️ Fonction pour valider les numéros
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
  
  const formatted = hasPlus ? `+${cleaned}` : cleaned;
  
  return {
    valid: true,
    original: number,
    formatted: formatted
  };
}

// 📱 ROUTE PAIRING - CORRIGÉE (évite sock.ev.once)
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
    
    // Validation
    const validation = validateAndFormatPhoneNumber(number);
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: validation.error 
      });
    }
    
    const formattedNumber = validation.formatted;
    console.log(`📱 Traitement pour: ${formattedNumber}`);
    
    // Charger Baileys
    if (!Baileys) {
      await loadBaileys();
    }
    
    if (!baileysAvailable || !Baileys) {
      console.log("❌ Baileys non disponible");
      
      return res.status(503).json({
        success: false,
        error: "Service WhatsApp indisponible",
        timestamp: new Date().toISOString()
      });
    }

    console.log(`🔥 Génération code WhatsApp pour: ${formattedNumber}`);
    
    // Extraire les fonctions nécessaires
    const makeWASocket = Baileys.makeWASocket;
    const useMultiFileAuthState = Baileys.useMultiFileAuthState;
    const fetchLatestBaileysVersion = Baileys.fetchLatestBaileysVersion;
    const Browsers = Baileys.Browsers;
    
    if (typeof makeWASocket !== "function") {
      console.error("❌ makeWASocket n'est pas une fonction");
      return res.status(500).json({
        success: false,
        error: "Erreur d'initialisation WhatsApp",
        timestamp: new Date().toISOString()
      });
    }
    
    // Créer le dossier de session
    const sessionId = formattedNumber.replace(/[^a-zA-Z0-9]/g, '_');
    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }
    
    let sock = null;
    let pairingCode = null;
    
    try {
      // Charger l'état d'authentification
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      
      // Obtenir la version
      const { version } = await fetchLatestBaileysVersion();
      
      // 🔧 CORRECTION CRITIQUE : Créer un logger simple
      const logger = {
        level: 'silent',
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {}
      };
      
      // Créer la socket
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
        // Options pour éviter les erreurs
        emitOwnEvents: false,
        fireInitQueries: true,
        // Éviter les connexions multiples
        shouldSyncHistoryMessage: () => false,
      });
      
      // Sauvegarder les credentials
      if (sock.ev && typeof sock.ev.on === "function") {
        sock.ev.on("creds.update", saveCreds);
      }
      
      // 🔧 CORRECTION : Utiliser sock.ev.on au lieu de sock.ev.once
      if (sock.ev && typeof sock.ev.on === "function") {
        sock.ev.on("connection.update", (update) => {
          const { connection } = update;
          if (connection === 'open') {
            console.log(`✅ WhatsApp connecté pour ${formattedNumber}`);
          }
        });
      }
      
      // Attendre que la socket soit prête
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Générer le code de pairing
      console.log(`🔗 Demande code pour: ${formattedNumber}`);
      
      if (typeof sock.requestPairingCode === "function") {
        pairingCode = await sock.requestPairingCode(formattedNumber);
        console.log(`✅ Code WhatsApp généré: ${pairingCode}`);
      } else {
        throw new Error("requestPairingCode non disponible");
      }
      
      // Stocker le bot
      activeBots.set(formattedNumber, {
        number: formattedNumber,
        connected: true,
        pairingCode: pairingCode,
        sessionPath: sessionPath,
        botStarted: false,
        timestamp: Date.now()
      });
      
      // Démarrer le bot automatiquement après 5 secondes
      setTimeout(async () => {
        try {
          console.log(`🤖 Démarrage automatique du bot pour ${formattedNumber}...`);
          await startBot(formattedNumber, sessionPath);
        } catch (botError) {
          console.error(`❌ Erreur démarrage auto bot:`, botError.message);
        }
      }, 5000);
      
      // Fermer la socket après 10 secondes
      setTimeout(() => {
        try {
          if (sock && sock.ws && sock.ws.readyState === 1) {
            sock.ws.close();
            console.log(`🔌 Socket fermée pour ${formattedNumber}`);
          }
        } catch (e) {
          // Ignorer
        }
      }, 10000);
      
    } catch (pairError) {
      console.error(`❌ Erreur WhatsApp:`, pairError.message);
      
      // Nettoyer en cas d'erreur
      try {
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }
      } catch (e) {
        // Ignorer
      }
      
      return res.status(500).json({
        success: false,
        error: "Erreur WhatsApp",
        message: pairError.message || "Impossible de générer le code",
        timestamp: new Date().toISOString()
      });
    }
    
    // ✅ RÉPONSE SUCCÈS
    const domain = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    
    res.json({
      success: true,
      pairingCode: pairingCode,
      number: formattedNumber,
      original_number: number,
      message: "✅ Code WhatsApp généré avec succès",
      bot_auto_start: true,
      server_url: domain,
      instructions: [
        "1. Allez sur https://web.whatsapp.com",
        "2. Cliquez sur 'Connecter avec un numéro de téléphone'",
        `3. Entrez: ${formattedNumber}`,
        `4. Saisissez: ${pairingCode}`,
        "5. Cliquez sur 'Valider'",
        "6. Le bot démarre automatiquement après connexion"
      ],
      expiresIn: "5 minutes",
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`💥 Erreur serveur:`, error.message);
    
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
      message: error.message || "Une erreur est survenue",
      timestamp: new Date().toISOString()
    });
  }
});

// 🚀 Démarrer un bot manuellement
app.post("/start-bot/:number", async (req, res) => {
  try {
    const { number } = req.params;
    
    if (!activeBots.has(number)) {
      return res.status(404).json({
        success: false,
        error: "Session non trouvée",
        message: `Aucune session trouvée pour ${number}`,
        timestamp: new Date().toISOString()
      });
    }
    
    const bot = activeBots.get(number);
    
    // Vérifier si déjà démarré
    if (botProcesses.has(number)) {
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
        error: "Erreur démarrage",
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

// 🛑 Arrêter un bot
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

// 📊 Liste des bots
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
      const isBotRunning = botProcesses.has(number);
      
      botsList.push({
        number: number,
        connected: bot.connected,
        botStarted: isBotRunning,
        botPid: isBotRunning ? botProcesses.get(number).pid : null,
        hasSession: fs.existsSync(bot.sessionPath || ''),
        pairingCode: bot.pairingCode,
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

// 📈 Statistiques
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
  
  const domain = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  
  res.json({
    success: true,
    stats: {
      server_status: "online",
      baileys_status: baileysAvailable ? "loaded" : "not_loaded",
      domain: domain,
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

// 🗑️ Supprimer une session
app.delete("/delete-session/:number", async (req, res) => {
  try {
    const { number } = req.params;
    const sessionId = number.replace(/[^a-zA-Z0-9]/g, '_');
    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    
    // Arrêter le bot si en cours
    await stopBot(number);
    
    let deleted = false;
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      deleted = true;
    }
    
    // Supprim
   const botSessionPath = path.join(BOT_DIR, "sessions", sessionId);
    if (fs.existsSync(botSessionPath)) {
      fs.rmSync(botSessionPath, { recursive: true, force: true });
    }
    
    // Supprimer des bots actifs
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

// 🖥️ Panel web
app.get("/panel", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🚀 Démarrer le serveur
async function startServer() {
  // Charger Baileys
  await loadBaileys();
  
  app.listen(PORT, () => {
    const domain = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    
    console.log(`
╔══════════════════════════════════════════════════════╗
║           WHATSAPP BOT SERVER - ULTIME              ║
╠══════════════════════════════════════════════════════╣
║ 🚀 Serveur lancé sur le port ${PORT}                     ║
║ 🌍 Domaine: ${domain.padEnd(40)} ║
║ 🖥️  Panel: ${domain}/panel${" ".repeat(27)}║
║ 🤖 Dossier bot: ${BOT_DIR}                     ║
║ 📱 WhatsApp: ${baileysAvailable ? '✅ ACTIF' : '❌ HORS LIGNE'}           ║
║ 🔥 Auto-démarrage des bots activé                  ║
║ 📊 Stats: ${domain}/stats${" ".repeat(30)}║
║ 🛡️  Health: ${domain}/health${" ".repeat(28)}║
╚══════════════════════════════════════════════════════╝
    `);
    
    // Vérifier le bot
    if (fs.existsSync(BOT_DIR)) {
      console.log(`✅ Dossier bot trouvé: ${BOT_DIR}`);
      
      if (fs.existsSync(path.join(BOT_DIR, "index.js"))) {
        console.log(`✅ Fichier bot/index.js trouvé`);
      } else {
        console.warn(`⚠️  Fichier bot/index.js non trouvé`);
      }
    } else {
      console.warn(`⚠️  Dossier bot non trouvé: ${BOT_DIR}`);
      console.warn(`   Créez le dossier 'bot' avec votre index.js`);
    }
    
    // Keep-alive pour Render
    if (process.env.RENDER) {
      console.log("🔄 Auto-ping activé pour Render.com");
      setInterval(() => {
        fetch(`${domain}/health`).catch(() => {});
      }, 300000); // 5 minutes
    }
  });
}

// 🛑 Gestion des arrêts
process.on('SIGTERM', async () => {
  console.log('🔴 Arrêt du serveur (SIGTERM)...');
  
  // Arrêter tous les bots
  for (const [number] of botProcesses) {
    await stopBot(number);
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 2000);
});

process.on('SIGINT', async () => {
  console.log('🔴 Arrêt du serveur (Ctrl+C)...');
  
  for (const [number] of botProcesses) {
    await stopBot(number);
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 2000);
});

process.on('uncaughtException', (error) => {
  console.error('💥 ERREUR NON CATCHÉE:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ PROMISE NON GÉRÉE:', reason);
});

// 🏁 Lancer le serveur
startServer().catch(error => {
  console.error('💥 ERREUR DÉMARRAGE:', error.message);
  console.error(error.stack);
  process.exit(1);
});

// Export pour les tests
export { app, baileysAvailable, startBot, stopBot };
