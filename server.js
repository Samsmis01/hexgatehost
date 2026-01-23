// server.js - VERSION SANS DÉMO - VRAI WHATSAPP SEULEMENT
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
  
  console.log("❌ Baileys non disponible - Serveur désactivé");
  baileysAvailable = false;
  return false;
}

// 🌐 ROUTE PRINCIPALE
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "✅ HEXGATE WhatsApp Pairing Server",
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

// 🩺 HEALTH CHECK
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: baileysAvailable ? "ready" : "waiting",
    baileys: baileysAvailable ? "loaded" : "not_loaded",
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
  
  // Nettoyer: garder uniquement les chiffres et le +
  let cleaned = number.replace(/[^\d+]/g, '');
  
  // Si le numéro commence par +, le garder
  const hasPlus = cleaned.startsWith('+');
  if (hasPlus) {
    cleaned = cleaned.substring(1);
  }
  
  // Vérifier la longueur minimale
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

// 📱 ROUTE PAIRING PRINCIPALE - VRAI WHATSAPP SEULEMENT
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
    
    // ❌ REFUSER SI Baileys n'est pas disponible
    if (!baileysAvailable || !Baileys) {
      console.log("❌ Baileys non disponible - Rejet de la demande");
      
      return res.status(503).json({
        success: false,
        error: "Service WhatsApp temporairement indisponible",
        message: "Le service de génération de codes WhatsApp est actuellement hors ligne. Veuillez réessayer plus tard.",
        timestamp: new Date().toISOString()
      });
    }

    // 🔥 MODE RÉEL avec Baileys
    console.log(`🔥 Génération VRAI code WhatsApp pour: ${formattedNumber}`);
    
    // Extraire les fonctions
    const makeWASocket = Baileys.makeWASocket;
    const useMultiFileAuthState = Baileys.useMultiFileAuthState;
    const fetchLatestBaileysVersion = Baileys.fetchLatestBaileysVersion;
    const Browsers = Baileys.Browsers;
    const DisconnectReason = Baileys.DisconnectReason;
    
    // VÉRIFICATION CRITIQUE
    if (typeof makeWASocket !== "function") {
      console.error("❌ ERREUR: makeWASocket n'est pas une fonction");
      
      return res.status(500).json({
        success: false,
        error: "Erreur d'initialisation WhatsApp",
        message: "Impossible d'initialiser la connexion WhatsApp",
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
      // 🔑 CHARGER LA SESSION
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      
      // 📦 VERSION BAILEYS
      const { version } = await fetchLatestBaileysVersion();
      
      // 🔌 CRÉER LA SOCKET WHATSAPP - CORRECTION CRITIQUE ICI
      // ✅ Logger compatible avec les nouvelles versions de Baileys
      const logger = {
        level: 'silent',
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {}
      };
      
      // ✅ Solution pour éviter logger.child
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
        // ✅ Important: désactiver les logs détaillés
        emitOwnEvents: false,
        fireInitQueries: false,
        // ✅ Éviter les erreurs de bruitage
        keepAliveIntervalMs: 30000,
      });
      
      // Gérer les mises à jour des credentials
      sock.ev.on("creds.update", saveCreds);
      
      // Gérer la connexion
      sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          if (statusCode === DisconnectReason.loggedOut) {
            console.log(`⚠️ Déconnecté de ${formattedNumber}, suppression session...`);
            try {
              fs.rmSync(sessionPath, { recursive: true, force: true });
            } catch (e) {
              // Ignorer
            }
          }
        }
      });
      
      // 📞 GÉNÉRER LE CODE DE PAIRING (WhatsApp réel)
      console.log(`🔗 Demande code WhatsApp pour: ${formattedNumber}`);
      
      try {
        pairingCode = await sock.requestPairingCode(formattedNumber);
        console.log(`✅ VRAI Code WhatsApp généré: ${pairingCode}`);
      } catch (pairError) {
        console.error(`❌ Erreur requestPairingCode: ${pairError.message}`);
        throw pairError;
      }
      
      // Stocker le bot actif
      activeBots.set(formattedNumber, {
        sock: sock,
        number: formattedNumber,
        connected: true,
        timestamp: Date.now(),
        sessionPath: sessionPath
      });
      
      // Fermer proprement après délai (30 secondes)
      setTimeout(() => {
        try {
          if (sock && sock.ws && sock.ws.readyState === 1) {
            sock.ws.close();
            console.log(`🔌 Connexion fermée pour ${formattedNumber}`);
          }
        } catch (e) {
          // Ignorer
        }
      }, 30000);
      
    } catch (pairError) {
      console.error(`❌ Erreur WhatsApp: ${pairError.message}`);
      console.error(pairError.stack);
      
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
    
    // ✅ RÉPONSE FINALE (VRAI CODE WHATSAPP)
    res.json({
      success: true,
      pairingCode: pairingCode,
      number: formattedNumber,
      original_number: number,
      message: "✅ VRAI Code WhatsApp généré avec succès",
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
    
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
      message: error.message || "Une erreur est survenue",
      timestamp: new Date().toISOString()
    });
  }
});

// 📊 ACTIVE BOTS - VRAIS BOTS SEULEMENT
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
    
    // Ajouter les sessions existantes
    sessionDirs.forEach(sessionDir => {
      const sessionPath = path.join(SESSIONS_DIR, sessionDir);
      try {
        // Extraire le numéro du nom de session
        const number = sessionDir.replace(/_/g, '').replace(/[^+\d]/g, '');
        if (number) {
          botsList.push({
            number: number,
            connected: activeBots.has(number),
            sessionId: sessionDir,
            timestamp: fs.statSync(sessionPath).mtimeMs
          });
        }
      } catch (e) {
        // Ignorer les erreurs
      }
    });
    
    // Si pas de sessions, montrer les bots actifs
    if (botsList.length === 0) {
      activeBots.forEach((bot, number) => {
        botsList.push({
          number: number,
          connected: true,
          timestamp: bot.timestamp
        });
      });
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
      baileys_status: baileysAvailable ? "loaded" : "not_loaded",
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
    
    // ❌ PAS DE MODE DÉMO
    return res.status(400).json({
      success: false,
      error: "Fonction non disponible",
      message: "La regénération de code n'est pas supportée",
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
║           WHATSAPP PAIRING SERVER - RÉEL            ║
╠══════════════════════════════════════════════════════╣
║ 🚀 Serveur lancé sur le port ${PORT}                     ║
║ 🌍 URL: http://localhost:${PORT}                       ║
║ 🖥️ Panel: http://localhost:${PORT}/panel              ║
║ 📱 Mode: ${baileysAvailable ? '✅ WhatsApp ACTIF' : '❌ WhatsApp HORS LIGNE'} ║
║ 🔥 VRAIS Codes WhatsApp Seulement                   ║
║ ❌ Pas de mode démo - Réel ou Rien                  ║
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
