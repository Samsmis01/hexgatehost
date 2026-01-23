
// server.js - VERSION ULTIME - TOUT FONCTIONNE
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

if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Vérification CRITIQUE du bot
const BOT_INDEX_PATH = path.join(BOT_DIR, "index.js");
if (!fs.existsSync(BOT_DIR)) {
  console.error(`❌ CRITIQUE: Dossier 'bot' manquant. Créez: ${BOT_DIR}`);
  console.error(`   mkdir bot`);
  console.error(`   mv votre-index.js bot/index.js`);
}
if (!fs.existsSync(BOT_INDEX_PATH)) {
  console.error(`❌ CRITIQUE: Fichier 'bot/index.js' manquant.`);
  console.error(`   Placez votre bot dans: ${BOT_INDEX_PATH}`);
}

// 🎯 Variables globales
let baileysAvailable = false;
let Baileys = null;
let activeBots = new Map();
let botProcesses = new Map();

// 🔧 FONCTION POUR DÉMARRER VOTRE BOT
async function startBot(phoneNumber, sessionPath) {
  try {
    console.log(`\n🤖 [DÉMARRAGE BOT] ${phoneNumber}`);
    
    if (!fs.existsSync(BOT_INDEX_PATH)) {
      console.error(`❌ Fichier bot introuvable: ${BOT_INDEX_PATH}`);
      return null;
    }
    
    // Préparer le dossier sessions du bot
    const botSessionsDir = path.join(BOT_DIR, "sessions");
    if (!fs.existsSync(botSessionsDir)) {
      fs.mkdirSync(botSessionsDir, { recursive: true });
    }
    
    // Copier la session
    const sessionName = `session_${phoneNumber.replace(/[^0-9]/g, '')}`;
    const botSessionPath = path.join(botSessionsDir, sessionName);
    
    if (fs.existsSync(sessionPath)) {
      if (fs.existsSync(botSessionPath)) {
        fs.rmSync(botSessionPath, { recursive: true, force: true });
      }
      fs.cpSync(sessionPath, botSessionPath, { recursive: true });
      console.log(`📋 Session copiée: ${botSessionPath}`);
    }
    
    // Démarrer le processus
    const botProcess = spawn("node", ["index.js"], {
      cwd: BOT_DIR,
      env: {
        ...process.env,
        WHATSAPP_NUMBER: phoneNumber,
        SESSION_PATH: botSessionPath,
        NODE_ENV: "production"
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    botProcesses.set(phoneNumber, botProcess);
    
    // Logs du bot
    botProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      console.log(`[BOT ${phoneNumber}]: ${output}`);
    });
    
    botProcess.stderr.on('data', (data) => {
      console.error(`[BOT ${phoneNumber} ERROR]: ${data.toString().trim()}`);
    });
    
    botProcess.on('close', (code) => {
      console.log(`[BOT ${phoneNumber}] Arrêté (code: ${code})`);
      botProcesses.delete(phoneNumber);
    });
    
    console.log(`✅ Bot démarré (PID: ${botProcess.pid})`);
    
    if (activeBots.has(phoneNumber)) {
      activeBots.get(phoneNumber).botPid = botProcess.pid;
      activeBots.get(phoneNumber).botRunning = true;
    }
    
    return botProcess;
    
  } catch (error) {
    console.error(`❌ Erreur démarrage bot:`, error);
    return null;
  }
}

// 🔧 FONCTION POUR CHARGER BAILEYS SANS ERREUR LOGGER
async function loadBaileys() {
  if (Baileys && baileysAvailable) return true;
  
  console.log("🔄 Chargement Baileys...");
  
  try {
    // Méthode 1: ES Module
    try {
      const module = await import("@whiskeysockets/baileys");
      Baileys = module;
      console.log("✅ Baileys chargé (ES Module)");
    } catch (e1) {
      // Méthode 2: CommonJS
      const { createRequire } = await import("module");
      const require = createRequire(import.meta.url);
      Baileys = require("@whiskeysockets/baileys");
      console.log("✅ Baileys chargé (CommonJS)");
    }
    
    // Vérifier les fonctions
    if (Baileys && Baileys.makeWASocket && Baileys.useMultiFileAuthState) {
      baileysAvailable = true;
      console.log("✨ Baileys prêt");
      return true;
    }
    
    baileysAvailable = false;
    return false;
    
  } catch (error) {
    console.error("❌ Erreur chargement Baileys:", error.message);
    baileysAvailable = false;
    return false;
  }
}

// 🌐 ROUTES
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "✅ WhatsApp Bot Server",
    status: "online",
    baileys_available: baileysAvailable,
    bot_ready: fs.existsSync(BOT_INDEX_PATH),
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    baileys: baileysAvailable ? "loaded" : "not_loaded",
    bots_running: botProcesses.size,
    timestamp: new Date().toISOString()
  });
});

function validatePhoneNumber(number) {
  if (!number) return { valid: false, error: "Numéro requis" };
  
  let cleaned = number.replace(/[^\d+]/g, '');
  const hasPlus = cleaned.startsWith('+');
  if (hasPlus) cleaned = cleaned.substring(1);
  
  if (cleaned.length < 4) return { valid: false, error: "Numéro trop court" };
  
  return {
    valid: true,
    formatted: hasPlus ? `+${cleaned}` : cleaned
  };
}

// 📱 ROUTE PRINCIPALE - CORRECTION DÉFINITIVE LOGGER
app.post("/pair", async (req, res) => {
  console.log("\n📞 PAIRING REQUEST");
  
  try {
    let { number } = req.body;
    if (!number) {
      return res.status(400).json({ success: false, error: "Numéro requis" });
    }
    
    const validation = validatePhoneNumber(number);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }
    
    const formattedNumber = validation.formatted;
    console.log(`📱 Pour: ${formattedNumber}`);
    
    // Charger Baileys
    if (!Baileys) await loadBaileys();
    if (!baileysAvailable) {
      return res.status(503).json({ success: false, error: "WhatsApp indisponible" });
    }
    
    // Extraire fonctions
    const makeWASocket = Baileys.makeWASocket;
    const useMultiFileAuthState = Baileys.useMultiFileAuthState;
    const fetchLatestBaileysVersion = Baileys.fetchLatestBaileysVersion;
    const Browsers = Baileys.Browsers;
    
    // Session
    const sessionId = `session_${formattedNumber.replace(/[^0-9]/g, '')}`;
    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }
    
    let sock = null;
    let pairingCode = null;
    
    try {
      // Charger session
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      const { version } = await fetchLatestBaileysVersion();
      
      // ✅ LOGGER CORRIGÉ - PLUS D'ERREUR .child()
      const createSafeLogger = () => {
        const logger = {
          level: 'silent',
          trace: () => {},
          debug: () => {},
          info: () => {},
          warn: () => {},
          error: () => {},
          fatal: () => {}
        };
        
        // ✅ FORCER l'existence de .child()
        Object.defineProperty(logger, 'child', {
          value: () => logger,
          writable: false,
          configurable: false
        });
        
        return logger;
      };
      
      // Configuration socket
      const socketConfig = {
        version,
        logger: createSafeLogger(), // ✅ Logger corrigé
        printQRInTerminal: false,
        auth: state,
        browser: Browsers.ubuntu("Chrome"),
        markOnlineOnConnect: true,
        syncFullHistory: false,
        connectTimeoutMs: 30000,
        // Options minimales pour éviter les erreurs
        emitOwnEvents: false,
        fireInitQueries: true,
        defaultQueryTimeoutMs: 15000
      };
      
      // Créer socket
      sock = makeWASocket(socketConfig);
      sock.ev.on("creds.update", saveCreds);
      
      // Générer code
      console.log(`🔗 Génération code WhatsApp...`);
      pairingCode = await sock.requestPairingCode(formattedNumber);
      console.log(`✅ CODE WHATSAPP: ${pairingCode}`);
      
      // Stocker
      activeBots.set(formattedNumber, {
        number: formattedNumber,
        connected: true,
        sessionPath: sessionPath,
        pairingCode: pairingCode,
        timestamp: Date.now()
      });
      
      // 🔥 DÉMARRER LE BOT AUTOMATIQUEMENT
      console.log(`🚀 Démarrage auto du bot...`);
      setTimeout(async () => {
        if (fs.existsSync(BOT_INDEX_PATH)) {
          const botProcess = await startBot(formattedNumber, sessionPath);
          if (botProcess) {
            console.log(`🎉 Bot ${formattedNumber} en cours d'exécution!`);
          }
        } else {
          console.error(`❌ Impossible de démarrer: bot/index.js manquant`);
        }
      }, 2000);
      
      // Fermer socket
      setTimeout(() => {
        try {
          if (sock && sock.ws) sock.ws.close();
        } catch (e) {}
      }, 10000);
      
    } catch (pairError) {
      console.error(`❌ Erreur pairing:`, pairError.message);
      return res.status(500).json({
        success: false,
        error: "Erreur WhatsApp",
        message: pairError.message
      });
    }
    
    // Réponse
    res.json({
      success: true,
      pairingCode: pairingCode,
      number: formattedNumber,
      message: "✅ Code WhatsApp généré",
      bot_auto_start: fs.existsSync(BOT_INDEX_PATH),
      instructions: [
        "1. https://web.whatsapp.com",
        "2. 'Connecter avec un numéro de téléphone'",
        `3. Entrez: ${formattedNumber}`,
        `4. Code: ${pairingCode}`,
        "5. Valider"
      ],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`💥 Erreur serveur:`, error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
      message: error.message
    });
  }
});

// 🚀 Démarrer bot manuellement
app.post("/start-bot/:number", async (req, res) => {
  try {
    const { number } = req.params;
    
    if (!activeBots.has(number)) {
      return res.status(404).json({ success: false, error: "Bot non trouvé" });
    }
    
    const bot = activeBots.get(number);
    const botProcess = await startBot(number, bot.sessionPath);
    
    if (botProcess) {
      res.json({ success: true, message: "Bot démarré", pid: botProcess.pid });
    } else {
      res.status(500).json({ success: false, error: "Erreur démarrage" });
    }
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🛑 Arrêter bot
app.post("/stop-bot/:number", async (req, res) => {
  try {
    const { number } = req.params;
    
    if (botProcesses.has(number)) {
      const process = botProcesses.get(number);
      process.kill('SIGTERM');
      botProcesses.delete(number);
      res.json({ success: true, message: "Bot arrêté" });
    } else {
      res.status(404).json({ success: false, error: "Bot non trouvé" });
    }
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📊 Liste bots
app.get("/active-bots", (req, res) => {
  try {
    const botsList = [];
    
    activeBots.forEach((bot, number) => {
      botsList.push({
        number: number,
        connected: bot.connected,
        botRunning: botProcesses.has(number),
        botPid: bot.botPid,
        timestamp: bot.timestamp
      });
    });
    
    res.json({
      success: true,
      activeBots: botsList,
      count: botsList.length,
      botsRunning: botProcesses.size,
      baileys_available: baileysAvailable
    });
    
  } catch (error) {
    res.json({ success: true, activeBots: [], count: 0 });
  }
});

// 🚀 Démarrer serveur
async function startServer() {
  await loadBaileys();
  
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║           WHATSAPP BOT SERVER - ULTIME              ║
╠══════════════════════════════════════════════════════╣
║ 🚀 Port: ${PORT}                                          ║
║ 🌍 URL: http://localhost:${PORT}                          ║
║ 🤖 Bot: ${fs.existsSync(BOT_INDEX_PATH) ? '✅ PRÊT' : '❌ ABSENT'}      ║
║ 📱 WhatsApp: ${baileysAvailable ? '✅ ACTIF' : '❌ HORS LIGNE'}         ║
║ 🔥 Auto-démarrage bot: OUI                          ║
║ 🐛 logger.child FIXÉ: OUI                           ║
║ 📊 Interface: http://localhost:${PORT}/panel           ║
╚══════════════════════════════════════════════════════╝
    `);
    
    if (!fs.existsSync(BOT_INDEX_PATH)) {
      console.log(`\n⚠️  IMPORTANT: Créez le fichier bot/index.js`);
      console.log(`   Structure requise:`);
      console.log(`   📁 bot/`);
      console.log(`   └── 📄 index.js    <-- VOTRE BOT ICI\n`);
    }
  });
}

// 🏁 Démarrer
startServer().catch(console.error);
