// server.js - VERSION AVEC VRAI BAILEYS FORCÉ
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

// 📁 Sessions
const SESSIONS_DIR = path.join(__dirname, "sessions");
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// 🎯 CHARGER BAILEYS MANUELLEMENT
let Baileys = null;
let baileysAvailable = false;

async function forceLoadBaileys() {
  console.log("🔄 Loading Baileys (forced)...");
  
  // Essayer plusieurs méthodes
  const loadMethods = [
    // Méthode 1: ES Module normal
    async () => {
      const module = await import("@whiskeysockets/baileys");
      return module;
    },
    
    // Méthode 2: Chemin absolu
    async () => {
      const baileysPath = path.join(__dirname, "node_modules", "@whiskeysockets", "baileys", "lib", "index.js");
      if (fs.existsSync(baileysPath)) {
        const module = await import(`file://${baileysPath}`);
        return module;
      }
      throw new Error("Baileys path not found");
    },
    
    // Méthode 3: Dynamic import avec URL
    async () => {
      const module = await import("@whiskeysockets/baileys/lib/index.js");
      return module;
    },
    
    // Méthode 4: CommonJS
    async () => {
      const { createRequire } = await import("module");
      const require = createRequire(import.meta.url);
      return require("@whiskeysockets/baileys");
    }
  ];
  
  for (let i = 0; i < loadMethods.length; i++) {
    try {
      console.log(`Trying method ${i + 1}...`);
      Baileys = await loadMethods[i]();
      baileysAvailable = true;
      console.log(`✅ Baileys loaded with method ${i + 1}`);
      
      // Vérifier que makeWASocket est disponible
      if (Baileys.makeWASocket || Baileys.default) {
        return true;
      }
    } catch (error) {
      console.warn(`Method ${i + 1} failed: ${error.message}`);
    }
  }
  
  console.error("❌ All Baileys loading methods failed");
  baileysAvailable = false;
  return false;
}

// 🌐 ROUTES DE BASE
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "✅ HEXGATE Pairing Server - V1",
    status: "online",
    baileys: baileysAvailable ? "loaded" : "missing",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    baileys: baileysAvailable,
    uptime: process.uptime()
  });
});

app.get("/panel", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 📱 ROUTE PAIRING AVEC VRAI WHATSAPP
app.post("/pair", async (req, res) => {
  console.log("📞 Pairing request received");
  
  try {
    let { number } = req.body;
    
    if (!number) {
      return res.status(400).json({
        success: false,
        error: "Phone number required"
      });
    }
    
    // Nettoyer le numéro
    number = number.replace(/\D/g, "");
    if (number.length < 9) {
      return res.status(400).json({
        success: false,
        error: "Invalid number"
      });
    }
    
    if (!number.startsWith("243")) {
      number = "243" + number;
    }
    number = number.substring(0, 12);
    
    console.log(`Processing: ${number}`);
    
    // 🔥 FORCER le chargement de Baileys
    if (!Baileys) {
      await forceLoadBaileys();
    }
    
    // ❌ Si Baileys n'est PAS disponible
    if (!baileysAvailable || !Baileys) {
      console.log("❌ Baileys not available - CANNOT generate real code");
      
      return res.json({
        success: false,
        error: "Baileys not installed on server",
        solution: "Server needs Baileys installed to generate real WhatsApp codes",
        temporary_code: generateDemoCode(),
        message: "This is a DEMO code (not real WhatsApp)",
        timestamp: new Date().toISOString()
      });
    }
    
    // ✅ Baileys EST disponible - Générer VRAI code WhatsApp
    console.log("🔥 Generating REAL WhatsApp code...");
    
    // Extraire les fonctions de Baileys
    const makeWASocket = Baileys.makeWASocket || Baileys.default;
    const useMultiFileAuthState = Baileys.useMultiFileAuthState;
    const fetchLatestBaileysVersion = Baileys.fetchLatestBaileysVersion;
    const Browsers = Baileys.Browsers;
    
    if (!makeWASocket || typeof makeWASocket !== "function") {
      throw new Error("makeWASocket not found in Baileys");
    }
    
    // Créer session
    const sessionPath = path.join(SESSIONS_DIR, number);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }
    
    // 🔑 GÉNÉRER VRAI CODE WHATSAPP
    try {
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      const { version } = await fetchLatestBaileysVersion();
      
      const sock = makeWASocket({
        version,
        logger: { level: "silent" },
        printQRInTerminal: false,
        auth: state,
        browser: Browsers.ubuntu("Chrome"),
        connectTimeoutMs: 30000,
      });
      
      sock.ev.on("creds.update", saveCreds);
      
      // ⚠️ ATTENTION : Cette ligne contacte VRAIMENT les serveurs WhatsApp
      const pairingCode = await sock.requestPairingCode(number);
      
      console.log(`✅ REAL WhatsApp code generated: ${pairingCode}`);
      
      // Fermer la connexion
      setTimeout(() => {
        try {
          sock.ws?.close();
        } catch (e) {
          // Ignorer
        }
      }, 1000);
      
      // ✅ RETOURNER LE VRAI CODE
      return res.json({
        success: true,
        pairingCode: pairingCode,
        number: number,
        message: "✅ REAL WhatsApp pairing code generated",
        real_whatsapp: true,
        instructions: [
          "1. Go to https://web.whatsapp.com",
          "2. Click 'Connect with phone number'",
          "3. Enter: " + number,
          "4. Enter code: " + pairingCode,
          "5. Click 'Validate'"
        ],
        expiresIn: "5 minutes",
        timestamp: new Date().toISOString()
      });
      
    } catch (whatsappError) {
      console.error("WhatsApp API error:", whatsappError.message);
      
      return res.json({
        success: false,
        error: "WhatsApp connection failed",
        details: whatsappError.message,
        temporary_code: generateDemoCode(),
        message: "Could not connect to WhatsApp servers",
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error("Server error:", error);
    
    res.json({
      success: false,
      error: "Server error",
      details: error.message,
      temporary_code: generateDemoCode(),
      timestamp: new Date().toISOString()
    });
  }
});

// 📊 Active bots (pour votre HTML)
app.get("/active-bots", (req, res) => {
  res.json({
    success: true,
    activeBots: [],
    count: 0,
    totalSessions: 0
  });
});

// 🛠️ Générer code démo
function generateDemoCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  code += "-";
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

// 🚀 Démarrer
async function startServer() {
  // Charger Baileys au démarrage
  await forceLoadBaileys();
  
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   HEXGATE WHATSAPP SERVER             ║
╠════════════════════════════════════════╣
║ 🚀 Port: ${PORT}                          ║
║ 🌍 URL: http://localhost:${PORT}           ║
║ 📱 Baileys: ${baileysAvailable ? '✅ LOADED' : '❌ MISSING'}     ║
║ 🔗 Panel: http://localhost:${PORT}/panel   ║
╚════════════════════════════════════════╝
    `);
    
    if (!baileysAvailable) {
      console.log("⚠️  WARNING: Baileys not installed!");
      console.log("⚠️  Only DEMO codes will work");
      console.log("⚠️  Fix: Install Baileys manually on Render");
    }
  });
}

// 🏁 Démarrer le serveur
startServer().catch(error => {
  console.error("Failed to start:", error);
  process.exit(1);
});
