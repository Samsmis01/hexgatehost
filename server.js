// server.js - VERSION FINALE CORRIGÉE POUR RENDER
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
  console.log("📁 Dossier sessions cree");
}

// 🎯 Variables Baileys - IMPORTANT: Toujours initialisées
let baileysAvailable = false;
let Baileys = null;

// 🔧 Fonction pour charger Baileys
async function loadBaileys() {
  if (Baileys) return true; // Déjà chargé
  
  try {
    console.log("🔄 Chargement de Baileys...");
    
    // Tentative 1: Import ES module
    try {
      const module = await import("@whiskeysockets/baileys");
      Baileys = module;
      baileysAvailable = true;
      console.log("✅ Baileys charge (ES Module)");
      return true;
    } catch (e) {
      console.warn("⚠️ ES Module failed:", e.message);
    }
    
    // Tentative 2: Require CommonJS
    try {
      const { createRequire } = await import("module");
      const require = createRequire(import.meta.url);
      Baileys = require("@whiskeysockets/baileys");
      baileysAvailable = true;
      console.log("✅ Baileys charge (CommonJS)");
      return true;
    } catch (e) {
      console.warn("⚠️ CommonJS failed:", e.message);
    }
    
    console.warn("❌ Baileys non disponible - Mode demo");
    baileysAvailable = false;
    return false;
    
  } catch (error) {
    console.error("💥 Erreur chargement Baileys:", error.message);
    baileysAvailable = false;
    return false;
  }
}

// 📞 ROUTES (disponibles même sans Baileys)

// 🌐 ROUTE PRINCIPALE
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 HEXGATE Pairing Server - V1",
    version: "1.0.0",
    status: baileysAvailable ? "full" : "demo",
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

// 🩺 HEALTH CHECK (obligatoire pour Render)
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    baileys: baileysAvailable ? "loaded" : "demo",
    uptime: process.uptime(),
    memory: Math.round(process.memoryUsage().rss / 1024 / 1024) + "MB",
    timestamp: new Date().toISOString()
  });
});

// 🖥️ INTERFACE WEB
app.get("/panel", (req, res) => {
  const htmlPath = path.join(__dirname, "public", "index.html");
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    res.json({
      success: false,
      error: "HTML interface not found",
      tip: "Create public/index.html"
    });
  }
});

// 📱 ROUTE PAIRING PRINCIPALE (CORRIGÉE)
app.post("/pair", async (req, res) => {
  const startTime = Date.now();
  
  try {
    let { number } = req.body;
    
    // Validation
    if (!number || typeof number !== "string") {
      return res.status(400).json({
        success: false,
        error: "WhatsApp number required (format: 243810000000)"
      });
    }
    
    // Nettoyer le numéro
    number = number.replace(/\D/g, "");
    if (number.length < 9) {
      return res.status(400).json({
        success: false,
        error: "Invalid number (min 9 digits)"
      });
    }
    
    if (!number.startsWith("243")) {
      number = "243" + number;
    }
    number = number.substring(0, 12);
    
    console.log(`📱 Pairing request for: ${number}`);
    
    // 🔧 FORCER le chargement de Baileys si pas déjà fait
    if (!Baileys) {
      await loadBaileys();
    }
    
    // 🎭 MODE DÉMO si Baileys non disponible
    if (!baileysAvailable || !Baileys) {
      const pairingCode = generatePairingCode();
      const responseTime = Date.now() - startTime;
      
      console.log(`🎭 Demo code generated: ${pairingCode}`);
      
      return res.json({
        success: true,
        pairingCode: pairingCode,
        number: number,
        message: "Code generated (demo mode)",
        demo_mode: true,
        instructions: [
          "1. Go to https://web.whatsapp.com",
          "2. Click 'Connect with phone number'",
          "3. Enter your number",
          "4. Enter the pairing code above",
          "5. Click 'Validate'"
        ],
        expiresIn: "5 minutes",
        responseTime: responseTime + "ms",
        timestamp: new Date().toISOString()
      });
    }
    
    // 🔥 MODE RÉEL avec Baileys
    console.log(`🔥 Real mode for: ${number}`);
    
    // EXTRAIRE les fonctions CORRECTEMENT
    const {
      makeWASocket,
      useMultiFileAuthState,
      DisconnectReason,
      fetchLatestBaileysVersion,
      Browsers
    } = Baileys;
    
    // VÉRIFICATION CRITIQUE
    if (typeof makeWASocket !== "function") {
      throw new Error("makeWASocket is not a function - Check Baileys import");
    }
    
    const sessionPath = path.join(SESSIONS_DIR, number);
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
      sock = makeWASocket({
        version,
        logger: { level: "silent" },
        printQRInTerminal: false,
        auth: state,
        browser: Browsers.ubuntu("Chrome"),
        markOnlineOnConnect: true,
        syncFullHistory: false,
        connectTimeoutMs: 30000,
      });
      
      sock.ev.on("creds.update", saveCreds);
      
      // 📞 GÉNÉRER LE CODE DE PAIRING
      pairingCode = await sock.requestPairingCode(number);
      console.log(`✅ Pair code generated: ${pairingCode}`);
      
      // FERMER PROPREMENT
      setTimeout(() => {
        try {
          if (sock && sock.ws) {
            sock.ws.close();
          }
        } catch (e) {
          // Ignorer
        }
      }, 2000);
      
    } catch (pairError) {
      console.error(`❌ Pairing error: ${pairError.message}`);
      
      // Fallback au mode démo
      const demoCode = generatePairingCode();
      const responseTime = Date.now() - startTime;
      
      return res.json({
        success: true,
        pairingCode: demoCode,
        number: number,
        message: "Code generated (demo fallback)",
        demo_mode: true,
        error: pairError.message,
        instructions: [
          "1. Go to https://web.whatsapp.com",
          "2. Click 'Connect with phone number'",
          "3. Enter your number",
          "4. Enter the pairing code above"
        ],
        expiresIn: "5 minutes",
        responseTime: responseTime + "ms",
        timestamp: new Date().toISOString()
      });
    }
    
    const responseTime = Date.now() - startTime;
    
    // ✅ RÉPONSE FINALE (VRAI CODE)
    res.json({
      success: true,
      pairingCode: pairingCode,
      number: number,
      message: "WhatsApp pairing code generated",
      demo_mode: false,
      instructions: [
        "1. Go to https://web.whatsapp.com",
        "2. Click 'Connect with phone number'",
        "3. Enter your number: " + number,
        "4. Enter the code: " + pairingCode,
        "5. Click 'Validate' to connect"
      ],
      expiresIn: "5 minutes",
      responseTime: responseTime + "ms",
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`💥 Fatal error in /pair: ${error.message}`);
    
    const demoCode = generatePairingCode();
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      pairingCode: demoCode,
      number: req.body?.number || "243000000000",
      message: "Code generated (emergency demo)",
      demo_mode: true,
      emergency: true,
      instructions: [
        "1. Go to https://web.whatsapp.com",
        "2. Click 'Connect with phone number'",
        "3. Enter your number",
        "4. Enter the pairing code above"
      ],
      expiresIn: "5 minutes",
      responseTime: responseTime + "ms",
      timestamp: new Date().toISOString()
    });
  }
});

// 📊 ACTIVE BOTS (compatible HTML)
app.get("/active-bots", (req, res) => {
  try {
    let sessionDirs = [];
    try {
      sessionDirs = fs.readdirSync(SESSIONS_DIR);
    } catch (e) {
      // Ignorer
    }
    
    // Données compatibles avec votre HTML
    const demoBots = baileysAvailable ? [] : [
      {
        number: "243810000000",
        connected: true,
        demo: true
      },
      {
        number: "243900000000", 
        connected: false,
        demo: true
      }
    ];
    
    res.json({
      success: true,
      activeBots: demoBots,
      count: demoBots.length,
      totalSessions: sessionDirs.length,
      mode: baileysAvailable ? "real" : "demo"
    });
    
  } catch (error) {
    res.json({
      success: true,
      activeBots: [],
      count: 0,
      mode: "error"
    });
  }
});

// 📈 STATISTICS
app.get("/stats", (req, res) => {
  res.json({
    success: true,
    stats: {
      mode: baileysAvailable ? "real" : "demo",
      baileys: baileysAvailable ? "loaded" : "demo",
      uptime: process.uptime(),
      platform: process.platform,
      node: process.version
    }
  });
});

// 🛠️ FONCTION GÉNÉRER CODE
function generatePairingCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += "-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}

// 🚀 DÉMARRER SERVEUR
async function startServer() {
  // Charger Baileys au démarrage
  await loadBaileys();
  
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║               HEXGATE PAIRING SERVER                ║
╠══════════════════════════════════════════════════════╣
║ 🚀 Server running on port ${PORT}                     ║
║ 🌍 URL: http://localhost:${PORT}                       ║
║ 🖥️ Panel: http://localhost:${PORT}/panel              ║
║ 📱 Mode: ${baileysAvailable ? "REAL (Baileys)" : "DEMO"}        ║
║ 📁 Sessions: ${SESSIONS_DIR}                          ║
║ 🛡️  Health: http://localhost:${PORT}/health            ║
╚══════════════════════════════════════════════════════╝
    `);
    
    // Keep-alive pour Render
    if (process.env.RENDER) {
      console.log("🔄 Auto-ping enabled for Render.com");
      setInterval(() => {
        fetch(`http://localhost:${PORT}/health`).catch(() => {});
      }, 600000); // 10 minutes
    }
  });
}

// 🛑 GESTION ERREURS
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

// 🏁 POINT D'ENTRÉE
startServer().catch(error => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

// Export pour tests
export { app, baileysAvailable };
