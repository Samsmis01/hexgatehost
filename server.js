// server.js - VERSION RENDER.COM
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

// Vérification bot
const BOT_INDEX_PATH = path.join(BOT_DIR, "index.js");

// 🎯 Variables globales
let baileysAvailable = false;
let Baileys = null;
let activeBots = new Map();
let botProcesses = new Map();

// 🔧 FONCTION POUR DÉMARRER VOTRE BOT
async function startBot(phoneNumber, sessionPath) {
  try {
    console.log(`🤖 Démarrage bot pour: ${phoneNumber}`);
    
    if (!fs.existsSync(BOT_INDEX_PATH)) {
      console.error(`❌ bot/index.js non trouvé`);
      return null;
    }
    
    // Préparer dossier sessions
    const botSessionsDir = path.join(BOT_DIR, "sessions");
    if (!fs.existsSync(botSessionsDir)) {
      fs.mkdirSync(botSessionsDir, { recursive: true });
    }
    
    // Copier session
    const sessionName = phoneNumber.replace(/[^0-9]/g, '');
    const botSessionPath = path.join(botSessionsDir, sessionName);
    
    if (fs.existsSync(sessionPath)) {
      if (fs.existsSync(botSessionPath)) {
        fs.rmSync(botSessionPath, { recursive: true, force: true });
      }
      fs.cpSync(sessionPath, botSessionPath, { recursive: true });
    }
    
    // Démarrer bot
    const botProcess = spawn("node", ["index.js"], {
      cwd: BOT_DIR,
      env: {
        ...process.env,
        WHATSAPP_NUMBER: phoneNumber,
        SESSION_NAME: sessionName,
        SESSION_PATH: botSessionPath
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    botProcesses.set(phoneNumber, botProcess);
    
    // Logs
    botProcess.stdout.on('data', (data) => {
      console.log(`[BOT ${phoneNumber}]: ${data.toString().trim()}`);
    });
    
    botProcess.stderr.on('data', (data) => {
      console.error(`[BOT ${phoneNumber} ERROR]: ${data.toString().trim()}`);
    });
    
    botProcess.on('close', (code) => {
      console.log(`[BOT ${phoneNumber}] Arrêté (code: ${code})`);
      botProcesses.delete(phoneNumber);
    });
    
    console.log(`✅ Bot démarré (PID: ${botProcess.pid})`);
    
    // Mettre à jour statut
    if (activeBots.has(phoneNumber)) {
      activeBots.get(phoneNumber).botRunning = true;
      activeBots.get(phoneNumber).botPid = botProcess.pid;
    }
    
    return botProcess;
    
  } catch (error) {
    console.error(`❌ Erreur démarrage bot:`, error);
    return null;
  }
}

// 🔧 FONCTION CHARGEMENT BAILEYS
async function loadBaileys() {
  if (Baileys && baileysAvailable) return true;
  
  console.log("🔄 Chargement Baileys...");
  
  try {
    // Essayer ES Module
    try {
      const module = await import("@whiskeysockets/baileys");
      Baileys = module;
      console.log("✅ Baileys (ES Module)");
    } catch (e1) {
      // Fallback CommonJS
      const { createRequire } = await import("module");
      const require = createRequire(import.meta.url);
      Baileys = require("@whiskeysockets/baileys");
      console.log("✅ Baileys (CommonJS)");
    }
    
    if (Baileys.makeWASocket && Baileys.useMultiFileAuthState) {
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
  // URL dynamique pour Render
  const protocol = req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  
  res.json({
    success: true,
    message: "WhatsApp Bot Server",
    status: "online",
    server_url: baseUrl,
    baileys_available: baileysAvailable,
    bot_ready: fs.existsSync(BOT_INDEX_PATH),
    endpoints: {
      panel: `${baseUrl}/panel`,
      pair: `${baseUrl}/pair`,
      stats: `${baseUrl}/stats`,
      health: `${baseUrl}/health`
    },
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    baileys: baileysAvailable,
    bots_running: botProcesses.size,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get("/panel", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

function validatePhoneNumber(number) {
  if (!number || typeof number !== 'string') {
    return { valid: false, error: "Numéro requis" };
  }
  
  let cleaned = number.replace(/[^\d+]/g, '').trim();
  
  // Ajouter + si absent
  if (!cleaned.startsWith('+') && cleaned.length >= 10) {
    cleaned = '+' + cleaned;
  }
  
  if (cleaned.length < 10) {
    return { valid: false, error: "Numéro trop court" };
  }
  
  return { valid: true, formatted: cleaned };
}

// 📱 ROUTE PAIRING
app.post("/pair", async (req, res) => {
  console.log("\n📞 Nouvelle demande de pairing");
  
  try {
    const { number } = req.body;
    
    if (!number) {
      return res.status(400).json({ 
        success: false, 
        error: "Numéro WhatsApp requis" 
      });
    }
    
    const validation = validatePhoneNumber(number);
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: validation.error 
      });
    }
    
    const formattedNumber = validation.formatted;
    console.log(`📱 Pour: ${formattedNumber}`);
    
    // Charger Baileys
    if (!Baileys) await loadBaileys();
    if (!baileysAvailable) {
      return res.status(503).json({
        success: false,
        error: "Service WhatsApp indisponible"
      });
    }
    
    // Extraire fonctions
    const { 
      makeWASocket, 
      useMultiFileAuthState, 
      fetchLatestBaileysVersion,
      Browsers 
    } = Baileys;
    
    // Session
    const sessionId = formattedNumber.replace(/[^0-9]/g, '');
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
      
      // Logger compatible
      const logger = {
        level: 'silent',
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {},
        child: () => ({
          level: 'silent',
          trace: () => {},
          debug: () => {},
          info: () => {},
          warn: () => {},
          error: () => {},
          fatal: () => {}
        })
      };
      
      // Configuration socket
      const socketConfig = {
        version,
        logger: logger,
        printQRInTerminal: false,
        auth: state,
        browser: Browsers.ubuntu("Chrome"),
        markOnlineOnConnect: false,
        syncFullHistory: false,
        connectTimeoutMs: 30000,
        defaultQueryTimeoutMs: 20000,
        fireInitQueries: false,
        emitOwnEvents: true,
        keepAliveIntervalMs: 10000
      };
      
      // Créer socket
      sock = makeWASocket(socketConfig);
      sock.ev.on("creds.update", saveCreds);
      
      // Attendre connexion
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout connexion"));
        }, 15000);
        
        sock.ev.once("connection.update", (update) => {
          if (update.connection === 'open' || update.qr) {
            clearTimeout(timeout);
            resolve();
          }
        });
      });
      
      // Générer code
      console.log(`🔗 Génération code...`);
      pairingCode = await sock.requestPairingCode(formattedNumber);
      console.log(`✅ Code: ${pairingCode}`);
      
      // Stocker
      activeBots.set(formattedNumber, {
        number: formattedNumber,
        connected: true,
        sessionPath: sessionPath,
        pairingCode: pairingCode,
        timestamp: Date.now()
      });
      
      // Démarrer bot si disponible
      if (fs.existsSync(BOT_INDEX_PATH)) {
        console.log("🤖 Démarrage auto du bot...");
        setTimeout(async () => {
          try {
            await startBot(formattedNumber, sessionPath);
          } catch (e) {
            console.error("⚠️ Erreur démarrage bot:", e.message);
          }
        }, 2000);
      }
      
      // Fermer socket après 10s
      setTimeout(() => {
        try {
          if (sock && sock.ws) sock.ws.close();
        } catch (e) {}
      }, 10000);
      
    } catch (pairError) {
      console.error(`❌ Erreur pairing:`, pairError.message);
      
      // Nettoyer
      try {
        if (sock && sock.ws) sock.ws.close();
      } catch (e) {}
      
      try {
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true });
        }
      } catch (e) {}
      
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
      return res.status(404).json({ success: false, error: "Session non trouvée" });
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

// 📈 Statistiques
app.get("/stats", (req, res) => {
  const memory = process.memoryUsage();
  
  res.json({
    success: true,
    stats: {
      server_status: "online",
      baileys_status: baileysAvailable ? "loaded" : "not_loaded",
      uptime: Math.floor(process.uptime()),
      active_bots: activeBots.size,
      bots_running: botProcesses.size,
      memory_usage: Math.round(memory.heapUsed / 1024 / 1024) + "MB",
      platform: process.platform,
      node_version: process.version,
      timestamp: new Date().toISOString()
    }
  });
});

// 🗑️ Supprimer session
app.delete("/delete-session/:number", async (req, res) => {
  try {
    const { number } = req.params;
    
    // Arrêter bot
    if (botProcesses.has(number)) {
      const process = botProcesses.get(number);
      process.kill('SIGTERM');
      botProcesses.delete(number);
    }
    
    // Supprimer session
    const sessionId = number.replace(/[^0-9]/g, '');
    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    
    let deleted = false;
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      deleted = true;
    }
    
    // Supprimer de la liste
    activeBots.delete(number);
    
    res.json({
      success: true,
      deleted: deleted,
      message: deleted ? "Session supprimée" : "Session non trouvée"
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🚀 Démarrer serveur
async function startServer() {
  await loadBaileys();
  
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║           WHATSAPP BOT SERVER - RENDER.COM          ║
╠══════════════════════════════════════════════════════╣
║ 🚀 Serveur actif sur le port ${PORT}                     ║
║ 🌍 Votre URL Render: (configurée automatiquement)   ║
║ 🤖 Bot: ${fs.existsSync(BOT_INDEX_PATH) ? '✅ PRÊT' : '❌ MANQUANT'}      ║
║ 📱 WhatsApp: ${baileysAvailable ? '✅ ACTIF' : '❌ HORS LIGNE'}         ║
║ 🔥 Démarrage auto bot: ACTIVÉ                       ║
║ 📊 Accédez à: /panel pour l'interface               ║
╚══════════════════════════════════════════════════════╝
    `);
    
    // Afficher l'URL Render (si disponible)
    if (process.env.RENDER_EXTERNAL_URL) {
      console.log(`\n🌐 Votre URL Render: ${process.env.RENDER_EXTERNAL_URL}`);
      console.log(`🖥️  Panel: ${process.env.RENDER_EXTERNAL_URL}/panel`);
    } else if (process.env.RENDER) {
      console.log(`\n⚠️  URL Render détectée mais non disponible`);
      console.log(`   Elle sera visible dans le dashboard Render`);
    }
  });
}

// Gestion erreurs
process.on('uncaughtException', (err) => {
  console.error('💥 Erreur non gérée:', err.message);
});

// Démarrer
startServer().catch(err => {
  console.error('💥 Erreur démarrage:', err);
  process.exit(1);
});
