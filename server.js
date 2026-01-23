// server.js - VERSION COMPLÈTE AVEC VRAI PAIRING WHATSAPP
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
    },
    
    // Méthode 3: Chemin direct
    async () => {
      try {
        const baileysPath = path.join(__dirname, "node_modules", "@whiskeysockets", "baileys", "lib", "index.js");
        if (fs.existsSync(baileysPath)) {
          const module = await import(`file://${baileysPath}`);
          console.log("✅ Baileys chargé (chemin direct)");
          return { success: true, module };
        }
        return { success: false };
      } catch (e) {
        console.log("⚠️ Chemin direct échoué");
        return { success: false };
      }
    }
  ];
  
  for (let i = 0; i < methods.length; i++) {
    const result = await methods[i]();
    if (result.success && result.module) {
      Baileys = result.module;
      
      // Vérifier que les fonctions nécessaires existent
      if ((Baileys.makeWASocket || Baileys.default) && Baileys.useMultiFileAuthState) {
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

// 🔥 Fonction pour démarrer VOTRE bot depuis bot/index.js (comme dans votre code)
async function startUserBot(sock, sessionPath, phoneNumber) {
  try {
    console.log("🤖 Tentative de démarrage de votre bot personnalisé...");
    
    // Chemin vers votre fichier bot
    const botFilePath = path.join(__dirname, "bot", "index.js");
    
    if (!fs.existsSync(botFilePath)) {
      console.log("⚠️ Fichier bot/index.js non trouvé");
      
      // Bot minimal par défaut
      sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.key.fromMe && msg.message?.conversation) {
          console.log(`📨 Message reçu de ${msg.key.remoteJid}: ${msg.message.conversation}`);
          
          // Réponse automatique
          await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ HEXGATE Bot connecté!\n\nVotre numéro: ${phoneNumber}\n\nTapez .menu pour les commandes`
          });
        }
      });
      
      return { success: true, message: "Bot par défaut démarré" };
    }
    
    console.log("📦 Importation de votre bot depuis bot/index.js...");
    
    // Importer votre bot
    let userBot;
    try {
      // Essayer ES Module
      const botModule = await import(`file://${botFilePath}`);
      userBot = botModule.default || botModule;
    } catch (importError) {
      console.log("⚠️ Import ES échoué:", importError.message);
      try {
        // Essayer CommonJS
        const { createRequire } = await import("module");
        const require = createRequire(import.meta.url);
        userBot = require(botFilePath);
      } catch (requireError) {
        console.error("❌ Impossible d'importer votre bot:", requireError.message);
        return { success: false, error: requireError.message };
      }
    }
    
    if (typeof userBot !== 'function') {
      console.error("❌ Votre bot doit exporter une fonction");
      return { success: false, error: "Bot n'est pas une fonction" };
    }
    
    // Démarrer VOTRE bot avec la socket WhatsApp
    console.log("🚀 Démarrage de votre bot personnalisé...");
    await userBot(sock, sessionPath);
    
    console.log("✅ Votre bot démarré avec succès!");
    return { success: true, message: "Bot personnalisé démarré" };
    
  } catch (error) {
    console.error(`💥 Erreur démarrage bot: ${error.message}`);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

// 🌐 ROUTE PRINCIPALE (compatible HTML)
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "✅ HEXGATE Pairing Server - V1",
    version: "1.0.0",
    status: "online",
    baileys_available: baileysAvailable,
    endpoints: {
      pairing: "POST /pair",
      activeBots: "GET /active-bots",
      health: "GET /health",
      panel: "GET /panel",
      stats: "GET /stats"
    },
    timestamp: new Date().toISOString()
  });
});

// 🩺 HEALTH CHECK
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

// 🛠️ Fonction pour valider et formater les numéros
function validateAndFormatPhoneNumber(number) {
  if (!number || typeof number !== 'string') {
    return { valid: false, error: "Numéro requis" };
  }
  
  // Nettoyer: garder uniquement les chiffres
  let cleaned = number.replace(/\D/g, '');
  
  // Vérifier la longueur minimale
  if (cleaned.length < 9) {
    return { valid: false, error: "Numéro trop court" };
  }
  
  // WhatsApp fonctionne avec le format international
  // Si le numéro n'a pas de code pays, ajouter + par défaut
  const formattedForBaileys = cleaned.startsWith('1') ? `+${cleaned}` : 
                             cleaned.startsWith('2') ? `+${cleaned}` : 
                             cleaned.startsWith('3') ? `+${cleaned}` : 
                             cleaned.startsWith('4') ? `+${cleaned}` : 
                             cleaned.startsWith('5') ? `+${cleaned}` : 
                             cleaned.startsWith('6') ? `+${cleaned}` : 
                             cleaned.startsWith('7') ? `+${cleaned}` : 
                             cleaned.startsWith('8') ? `+${cleaned}` : 
                             cleaned.startsWith('9') ? `+${cleaned}` : 
                             `+${cleaned}`;
  
  return {
    valid: true,
    original: number,
    cleaned: cleaned,
    formatted: formattedForBaileys
  };
}

// 📱 ROUTE PAIRING - GÉNÈRE DE VRAIS CODES WHATSAPP
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
    
    // Valider et formater le numéro
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

    // 🔥 MODE RÉEL avec Baileys - GÉNÈRE DE VRAIS CODES
    console.log(`🔥 Génération code réel WhatsApp pour: ${formattedNumber}`);
    
    // Extraire les fonctions de Baileys
    const makeWASocket = Baileys.makeWASocket || Baileys.default;
    const useMultiFileAuthState = Baileys.useMultiFileAuthState;
    const fetchLatestBaileysVersion = Baileys.fetchLatestBaileysVersion;
    const Browsers = Baileys.Browsers;
    const DisconnectReason = Baileys.DisconnectReason || {};
    
    // VÉRIFICATION CRITIQUE
    if (typeof makeWASocket !== "function") {
      console.error("❌ ERREUR: makeWASocket n'est pas une fonction");
      
      // Fallback au mode démo
      const pairingCode = generatePairingCode();
      
      return res.json({
        success: true,
        pairingCode: pairingCode,
        number: formattedNumber,
        original_number: number,
        message: "Code généré (mode démo - erreur Baileys)",
        demo_mode: true,
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
      // 🔑 CHARGER LA SESSION (comme dans votre code)
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      
      // 📦 VERSION BAILEYS
      const { version } = await fetchLatestBaileysVersion();
      
      // 🔌 CRÉER LA SOCKET WHATSAPP (configuration comme votre code)
      sock = makeWASocket({
        version,
        logger: { level: "silent" }, // Silencieux pour Render
        printQRInTerminal: false,
        auth: state,
        browser: Browsers.ubuntu("Chrome"),
        markOnlineOnConnect: true,
        syncFullHistory: false,
        connectTimeoutMs: 30000,
      });
      
      sock.ev.on("creds.update", saveCreds);
      
      // 📞 GÉNÉRER LE VRAI CODE DE PAIRING WHATSAPP (comme votre code!)
      console.log(`🔗 Contact des serveurs WhatsApp pour: ${formattedNumber}`);
      
      // ⚠️ CETTE LIGNE GÉNÈRE LE VRAI CODE WHATSAPP
      pairingCode = await sock.requestPairingCode(formattedNumber);
      
      console.log(`✅ VRAI Code WhatsApp généré: ${pairingCode}`);
      
      // Écouter les événements de connexion
      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === "close") {
          console.log(`🔌 Connexion fermée pour ${formattedNumber}`);
          activeBots.delete(formattedNumber);
          
          const reason = lastDisconnect?.error?.output?.statusCode;
          if (reason === DisconnectReason.loggedOut) {
            console.log(`🗑️ Session supprimée pour ${formattedNumber}`);
            if (fs.existsSync(sessionPath)) {
              fs.rmSync(sessionPath, { recursive: true, force: true });
            }
          }
        }
        
        if (connection === "open") {
          console.log(`✅ WhatsApp connecté pour ${formattedNumber}`);
          
          // 🔥 DÉMARRER VOTRE BOT ICI !
          try {
            const botResult = await startUserBot(sock, sessionPath, formattedNumber);
            
            if (botResult.success) {
              console.log(`🤖 Bot démarré pour ${formattedNumber}`);
              
              // Stocker le bot actif
              activeBots.set(formattedNumber, {
                sock: sock,
                number: formattedNumber,
                connected: true,
                botStarted: true,
                timestamp: Date.now()
              });
              
              // Envoyer message de bienvenue
              try {
                await sock.sendMessage(`${formattedNumber.replace('+', '')}@s.whatsapp.net`, {
                  text: `✅ *HEXGATE BOT CONNECTÉ*\n\n🚀 Votre bot WhatsApp est maintenant actif!\n📱 Numéro: ${formattedNumber}\n🔗 Tapez .menu pour les commandes`
                });
              } catch (msgError) {
                console.log("⚠️ Impossible d'envoyer message:", msgError.message);
              }
            } else {
              console.error(`❌ Erreur démarrage bot: ${botResult.error}`);
            }
          } catch (botError) {
            console.error(`💥 Erreur bot: ${botError.message}`);
          }
        }
      });
      
      // Garder la socket ouverte pour le bot
      // Ne pas fermer immédiatement!
      
    } catch (whatsappError) {
      console.error(`❌ Erreur WhatsApp: ${whatsappError.message}`);
      
      // Fallback au mode démo
      const demoCode = generatePairingCode();
      
      return res.json({
        success: true,
        pairingCode: demoCode,
        number: formattedNumber,
        original_number: number,
        message: "Code généré (mode démo - erreur WhatsApp)",
        demo_mode: true,
        whatsapp_error: whatsappError.message,
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
    
    // ✅ RÉPONSE FINALE - VRAI CODE WHATSAPP
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
        `4. Saisissez le code: ${pairingCode}`,
        "5. Cliquez sur 'Valider'",
        "6. Votre bot démarrera automatiquement après connexion!"
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

// 📊 ACTIVE BOTS (compatible HTML)
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
    
    // Construire la liste des bots
    const botsList = [];
    
    // Ajouter les bots réels
    activeBots.forEach((bot, number) => {
      botsList.push({
        number: number,
        connected: bot.connected,
        botStarted: bot.botStarted || false,
        demo: false,
        timestamp: bot.timestamp
      });
    });
    
    // Ajouter des bots démo si pas de vrais bots
    if (botsList.length === 0 && !baileysAvailable) {
      botsList.push(
        {
          number: "+243810000000",
          connected: true,
          botStarted: true,
          demo: true,
          name: "Demo Congo"
        }
      );
    }
    
    // RÉPONSE EXACTE attendue par votre HTML
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
║ 🤖 Bot: ${fs.existsSync(path.join(__dirname, 'bot', 'index.js')) ? '✅ Personnalisé' : '⚠️ Non configuré'} ║
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
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ PROMISE NON GÉRÉE:', reason);
});

// 🏁 Démarrer le serveur
try {
  startServer().catch(error => {
    console.error('💥 ERREUR DÉMARRAGE:', error.message);
    process.exit(1);
  });
} catch (fatalError) {
  console.error('💥 ERREUR FATALE:', fatalError.message);
  process.exit(1);
}

export { app, baileysAvailable };
