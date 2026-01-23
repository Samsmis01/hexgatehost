// server.js - VERSION ULTIME CORRIGÉE - CONNEXION STABLE
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
  console.log("📁 Dossier sessions créé");
}

// Vérification bot
const BOT_INDEX_PATH = path.join(BOT_DIR, "index.js");
console.log(`🔍 Vérification bot: ${BOT_INDEX_PATH}`);
console.log(`   Existe: ${fs.existsSync(BOT_INDEX_PATH) ? '✅' : '❌'}`);

// 🎯 Variables globales
let baileysAvailable = false;
let Baileys = null;
let activeBots = new Map();
let botProcesses = new Map();

// 🔧 FONCTION POUR DÉMARRER VOTRE BOT
async function startBot(phoneNumber, sessionPath) {
  console.log(`\n🚀 [START BOT] ${phoneNumber}`);
  
  try {
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
      console.log(`📋 Session copiée vers bot`);
    }
    
    // Démarrer bot
    console.log(`🤖 Lancement: node index.js`);
    console.log(`📁 Répertoire: ${BOT_DIR}`);
    
    const botProcess = spawn("node", ["index.js"], {
      cwd: BOT_DIR,
      env: {
        ...process.env,
        WHATSAPP_NUMBER: phoneNumber,
        SESSION_NAME: sessionName,
        SESSION_PATH: botSessionPath
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });
    
    botProcesses.set(phoneNumber, botProcess);
    
    // Logs
    botProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) console.log(`[BOT ${phoneNumber}]: ${output}`);
    });
    
    botProcess.stderr.on('data', (data) => {
      const error = data.toString().trim();
      if (error) console.error(`[BOT ${phoneNumber} ERROR]: ${error}`);
    });
    
    botProcess.on('close', (code) => {
      console.log(`[BOT ${phoneNumber}] Fermé (code: ${code})`);
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
    console.error(`❌ Erreur démarrage bot:`, error.message);
    return null;
  }
}

// 🔧 FONCTION CHARGEMENT BAILEYS CORRIGÉE
async function loadBaileys() {
  if (Baileys && baileysAvailable) return true;
  
  console.log("🔄 Chargement Baileys...");
  
  try {
    // Essayer ES Module d'abord
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
    
    // Vérifier fonctions critiques
    if (!Baileys.makeWASocket) {
      console.error("❌ makeWASocket non disponible");
      return false;
    }
    if (!Baileys.useMultiFileAuthState) {
      console.error("❌ useMultiFileAuthState non disponible");
      return false;
    }
    if (!Baileys.fetchLatestBaileysVersion) {
      console.error("❌ fetchLatestBaileysVersion non disponible");
      return false;
    }
    if (!Baileys.Browsers) {
      console.error("❌ Browsers non disponible");
      return false;
    }
    
    baileysAvailable = true;
    console.log("✨ Baileys prêt à l'emploi");
    return true;
    
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
    message: "WhatsApp Bot Server",
    status: "online",
    baileys: baileysAvailable,
    bot_ready: fs.existsSync(BOT_INDEX_PATH),
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    baileys: baileysAvailable,
    timestamp: new Date().toISOString()
  });
});

function validatePhoneNumber(number) {
  if (!number || typeof number !== 'string') {
    return { valid: false, error: "Numéro requis" };
  }
  
  // Nettoyer
  let cleaned = number.replace(/[^\d+]/g, '').trim();
  
  // Ajouter + si absent
  if (!cleaned.startsWith('+') && cleaned.length > 0) {
    // Détecter Congo RDC
    if (cleaned.startsWith('243') && cleaned.length >= 12) {
      cleaned = '+' + cleaned;
    }
    // Détecter France
    else if (cleaned.startsWith('33') && cleaned.length >= 10) {
      cleaned = '+' + cleaned;
    }
    // Par défaut
    else if (cleaned.length >= 10) {
      cleaned = '+' + cleaned;
    }
  }
  
  if (cleaned.length < 10) {
    return { valid: false, error: "Numéro trop court" };
  }
  
  return { valid: true, formatted: cleaned };
}

// 📱 ROUTE PAIRING - CONNEXION STABLE
app.post("/pair", async (req, res) => {
  console.log("\n" + "=".repeat(50));
  console.log("📞 NOUVELLE DEMANDE DE PAIRING");
  console.log("=".repeat(50));
  
  try {
    const { number } = req.body;
    
    if (!number) {
      return res.status(400).json({ 
        success: false, 
        error: "Numéro WhatsApp requis" 
      });
    }
    
    console.log(`📱 Numéro reçu: ${number}`);
    
    const validation = validatePhoneNumber(number);
    if (!validation.valid) {
      console.log(`❌ Validation échouée: ${validation.error}`);
      return res.status(400).json({ 
        success: false, 
        error: validation.error 
      });
    }
    
    const formattedNumber = validation.formatted;
    console.log(`✅ Numéro formaté: ${formattedNumber}`);
    
    // Charger Baileys
    if (!Baileys) {
      console.log("🔄 Chargement Baileys...");
      await loadBaileys();
    }
    
    if (!baileysAvailable || !Baileys) {
      console.log("❌ Baileys non disponible");
      return res.status(503).json({
        success: false,
        error: "Service WhatsApp temporairement indisponible"
      });
    }
    
    console.log("✅ Baileys chargé");
    
    // Extraire fonctions
    const { 
      makeWASocket, 
      useMultiFileAuthState, 
      fetchLatestBaileysVersion,
      Browsers,
      DisconnectReason 
    } = Baileys;
    
    // Vérifier
    if (typeof makeWASocket !== 'function') {
      console.error("❌ makeWASocket n'est pas une fonction");
      return res.status(500).json({
        success: false,
        error: "Erreur interne WhatsApp"
      });
    }
    
    // Créer session
    const sessionId = formattedNumber.replace(/[^0-9]/g, '');
    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    
    console.log(`📁 Chemin session: ${sessionPath}`);
    
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
      console.log("✅ Dossier session créé");
    }
    
    let sock = null;
    let pairingCode = null;
    
    try {
      // 1. CHARGER LA SESSION
      console.log("🔄 Chargement état d'authentification...");
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      console.log("✅ État d'authentification chargé");
      
      // 2. VERSION BAILEYS
      console.log("🔄 Récupération version Baileys...");
      const { version } = await fetchLatestBaileysVersion();
      console.log(`✅ Version Baileys: ${version}`);
      
      // 3. CONFIGURATION SOCKET - CORRIGÉE
      console.log("🔄 Configuration socket WhatsApp...");
      
      // ✅ LOGGER COMPATIBLE
      const createLogger = () => {
        const baseLogger = {
          level: 'silent',
          trace: () => {},
          debug: () => {},
          info: () => {},
          warn: () => {},
          error: () => {},
          fatal: () => {}
        };
        
        // ✅ S'assurer que .child existe
        if (typeof baseLogger.child !== 'function') {
          baseLogger.child = () => baseLogger;
        }
        
        return baseLogger;
      };
      
      // ✅ CONFIGURATION STABLE
      const socketConfig = {
        version,
        logger: createLogger(),
        printQRInTerminal: false,
        auth: state,
        browser: Browsers.ubuntu("Chrome"),
        markOnlineOnConnect: false,  // Important: false pour pairing
        syncFullHistory: false,
        connectTimeoutMs: 45000,     // 45 secondes timeout
        defaultQueryTimeoutMs: 30000,
        // Options de stabilité
        emitOwnEvents: true,
        fireInitQueries: false,      // Important: false pour pairing
        mobile: false,
        // Keep alive
        keepAliveIntervalMs: 15000,
        // Retry
        maxMsgRetryCount: 1,
        retryRequestDelayMs: 1000,
        // Optimisations
        linkPreviewImageThumbnailWidth: 192,
        generateHighQualityLinkPreview: false,
        // Désactiver certaines fonctions pour pairing
        getMessage: async () => undefined,
        appStateMacVerification: {
          patch: false,
          snapshot: false
        }
      };
      
      console.log("✅ Configuration socket prête");
      
      // 4. CRÉER LA SOCKET
      console.log("🔄 Création socket WhatsApp...");
      sock = makeWASocket(socketConfig);
      console.log("✅ Socket créée");
      
      // 5. ÉCOUTEURS D'ÉVÉNEMENTS
      sock.ev.on("creds.update", saveCreds);
      
      sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        console.log(`🔌 État connexion: ${connection}`);
        
        if (connection === 'close') {
          console.log("🔌 Connexion fermée");
          if (lastDisconnect?.error) {
            console.log(`💥 Erreur: ${lastDisconnect.error.message}`);
          }
        } else if (connection === 'open') {
          console.log("✅ Connexion WhatsApp ouverte");
        } else if (connection === 'connecting') {
          console.log("🔄 Connexion en cours...");
        }
      });
      
      // 6. ATTENDRE QUE LA CONNEXION SOIT PRÊTE
      console.log("⏳ Attente connexion WhatsApp...");
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout connexion WhatsApp"));
        }, 30000);
        
        sock.ev.once("connection.update", (update) => {
          if (update.connection === 'open' || update.qr) {
            clearTimeout(timeout);
            resolve();
          }
        });
      });
      
      console.log("✅ Connexion WhatsApp établie");
      
      // 7. GÉNÉRER LE CODE
      console.log(`🔗 Demande code pour: ${formattedNumber}`);
      
      try {
        pairingCode = await sock.requestPairingCode(formattedNumber);
        console.log(`✅ CODE WHATSAPP GÉNÉRÉ: ${pairingCode}`);
      } catch (codeError) {
        console.error(`❌ Erreur génération code:`, codeError.message);
        throw new Error(`Impossible de générer le code: ${codeError.message}`);
      }
      
      // 8. SAUVEGARDER LE BOT
      activeBots.set(formattedNumber, {
        number: formattedNumber,
        connected: true,
        sessionPath: sessionPath,
        pairingCode: pairingCode,
        timestamp: Date.now()
      });
      
      console.log(`✅ Bot enregistré: ${formattedNumber}`);
      
      // 9. DÉMARRER LE BOT SI DISPONIBLE
      if (fs.existsSync(BOT_INDEX_PATH)) {
        console.log("🤖 Détection bot/index.js - Démarrage automatique...");
        setTimeout(async () => {
          try {
            const botProcess = await startBot(formattedNumber, sessionPath);
            if (botProcess) {
              console.log(`🎉 Bot ${formattedNumber} démarré avec succès!`);
            }
          } catch (botError) {
            console.error(`⚠️  Erreur démarrage bot:`, botError.message);
          }
        }, 3000); // Attendre 3s avant de démarrer
      } else {
        console.log("ℹ️  bot/index.js non trouvé - Démarrage manuel requis");
      }
      
      // 10. FERMER PROPREMENT APRÈS 20 SECONDES
      setTimeout(() => {
        if (sock && sock.ws) {
          try {
            sock.ws.close();
            console.log("🔌 Socket fermée proprement");
          } catch (e) {
            // Ignorer
          }
        }
      }, 20000);
      
    } catch (pairError) {
      console.error(`💥 ERREUR PENDANT PAIRING:`, pairError.message);
      console.error(pairError.stack);
      
      // Nettoyer
      try {
        if (sock && sock.ws) {
          sock.ws.close();
        }
      } catch (e) {}
      
      try {
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true });
        }
      } catch (e) {}
      
      return res.status(500).json({
        success: false,
        error: "Erreur WhatsApp",
        message: pairError.message || "La connexion WhatsApp a échoué"
      });
    }
    
    // ✅ RÉPONSE SUCCÈS
    console.log("\n" + "=".repeat(50));
    console.log("✅ PAIRING RÉUSSI!");
    console.log(`📱 Numéro: ${formattedNumber}`);
    console.log(`🔑 Code: ${pairingCode}`);
    console.log("=".repeat(50) + "\n");
    
    res.json({
      success: true,
      pairingCode: pairingNumber,
      number: formattedNumber,
      message: "✅ Code WhatsApp généré avec succès",
      demo_mode: false,
      real_whatsapp: true,
      bot_auto_start: fs.existsSync(BOT_INDEX_PATH),
      instructions: [
        "1. Allez sur https://web.whatsapp.com",
        "2. Cliquez sur 'Connecter avec un numéro de téléphone'",
        `3. Entrez: ${formattedNumber}`,
        `4. Saisissez: ${pairingCode}`,
        "5. Cliquez sur 'Valider'",
        "6. Le bot démarrera automatiquement"
      ],
      expiresIn: "5 minutes",
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("\n💥 ERREUR GLOBALE SERVEUR:");
    console.error(error.message);
    console.error(error.stack);
    
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
      message: "Une erreur inattendue est survenue",
      timestamp: new Date().toISOString()
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
      res.json({
        success: true,
        message: `Bot ${number} démarré`,
        pid: botProcess.pid
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Impossible de démarrer le bot"
      });
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
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
        hasSession: true,
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
    res.json({
      success: true,
      activeBots: [],
      count: 0
    });
  }
});

// 🚀 Démarrer serveur
async function startServer() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 DÉMARRAGE SERVEUR WHATSAPP BOT");
  console.log("=".repeat(60));
  
  await loadBaileys();
  
  app.listen(PORT, () => {
    console.log(`\n✅ SERVEUR ACTIF`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🖥️  Panel: http://localhost:${PORT}/panel`);
    console.log(`🤖 Bot: ${fs.existsSync(BOT_INDEX_PATH) ? '✅ PRÊT' : '❌ MANQUANT'}`);
    console.log(`📱 WhatsApp: ${baileysAvailable ? '✅ CONNECTÉ' : '❌ HORS LIGNE'}`);
    console.log("\n" + "=".repeat(60));
  });
}

// Gestion erreurs
process.on('uncaughtException', (err) => {
  console.error('💥 ERREUR NON GÉRÉE:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ PROMISE REJECTED:', reason);
});

// Démarrer
startServer().catch(err => {
  console.error('💥 ERREUR DÉMARRAGE:', err);
  process.exit(1);
});
