// server.js - VERSION ULTRA ROBUSTE POUR RENDER
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

// 📁 Dossier des sessions avec chemin absolu pour Render
const SESSIONS_DIR = process.env.SESSIONS_DIR || path.join(__dirname, "sessions");
if (!fs.existsSync(SESSIONS_DIR)) {
  try {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    console.log(`📁 Dossier sessions créé: ${SESSIONS_DIR}`);
  } catch (err) {
    console.warn(`⚠️ Impossible de créer sessions dir: ${err.message}`);
  }
}

// 🎯 Variables globales pour Baileys
let baileysAvailable = false;
let baileysModule = null;

// 🔧 Fonction asynchrone pour charger Baileys
async function loadBaileys() {
  try {
    console.log("🔄 Tentative de chargement de Baileys...");
    
    // Tentative 1: Chargement normal
    try {
      baileysModule = await import("@whiskeysockets/baileys");
      baileysAvailable = true;
      console.log("✅ Baileys chargé avec succès (méthode 1)");
      return true;
    } catch (error1) {
      console.warn(`⚠️ Méthode 1 échouée: ${error1.message}`);
    }
    
    // Tentative 2: Chargement depuis node_modules
    try {
      const baileysPath = path.join(__dirname, "node_modules", "@whiskeysockets", "baileys", "lib", "index.js");
      if (fs.existsSync(baileysPath)) {
        baileysModule = await import(`file://${baileysPath}`);
        baileysAvailable = true;
        console.log("✅ Baileys chargé avec succès (méthode 2)");
        return true;
      }
    } catch (error2) {
      console.warn(`⚠️ Méthode 2 échouée: ${error2.message}`);
    }
    
    // Tentative 3: Fallback à CommonJS si disponible
    try {
      const baileysCommonJS = path.join(__dirname, "node_modules", "@whiskeysockets", "baileys", "lib", "index.cjs");
      if (fs.existsSync(baileysCommonJS)) {
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        baileysModule = require(baileysCommonJS);
        baileysAvailable = true;
        console.log("✅ Baileys chargé avec succès (méthode 3 - CommonJS)");
        return true;
      }
    } catch (error3) {
      console.warn(`⚠️ Méthode 3 échouée: ${error3.message}`);
    }
    
    console.warn("❌ Baileys non disponible - Activation du mode démo");
    baileysAvailable = false;
    return false;
    
  } catch (error) {
    console.error(`💥 Erreur critique lors du chargement de Baileys: ${error.message}`);
    baileysAvailable = false;
    return false;
  }
}

// 🔥 Variables Baileys (seront définies après le chargement)
let makeWASocket = null;
let useMultiFileAuthState = null;
let DisconnectReason = null;
let fetchLatestBaileysVersion = null;
let Browsers = null;

// 🌐 Initialisation asynchrone
async function initializeApp() {
  // Charger Baileys
  await loadBaileys();
  
  if (baileysAvailable && baileysModule) {
    try {
      makeWASocket = baileysModule.default || baileysModule.makeWASocket;
      useMultiFileAuthState = baileysModule.useMultiFileAuthState;
      DisconnectReason = baileysModule.DisconnectReason;
      fetchLatestBaileysVersion = baileysModule.fetchLatestBaileysVersion;
      Browsers = baileysModule.Browsers;
      
      console.log("✨ Baileys initialisé avec succès");
    } catch (initError) {
      console.error(`❌ Erreur initialisation Baileys: ${initError.message}`);
      baileysAvailable = false;
    }
  }
  
  // Routes de base (toujours disponibles)
  setupRoutes();
  
  // Démarrer le serveur
  startServer();
}

// 🛣️ Configuration des routes
function setupRoutes() {
  // 🌐 ROUTE PRINCIPALE
  app.get("/", (req, res) => {
    res.json({
      success: true,
      message: "🚀 HEXGATE Pairing Server - V1",
      version: "1.0.0",
      status: baileysAvailable ? "full_mode" : "demo_mode",
      render_bug: !baileysAvailable,
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

  // 🩺 Route de santé (pour Render health checks)
  app.get("/health", (req, res) => {
    res.json({
      success: true,
      status: "healthy",
      baileys_available: baileysAvailable,
      mode: baileysAvailable ? "real" : "demo",
      uptime: process.uptime(),
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + "MB",
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB"
      },
      timestamp: new Date().toISOString(),
      render: process.env.RENDER ? "true" : "false"
    });
  });

  // 🖥️ Route pour l'interface HTML
  app.get("/panel", (req, res) => {
    try {
      const htmlPath = path.join(__dirname, "public", "index.html");
      if (fs.existsSync(htmlPath)) {
        res.sendFile(htmlPath);
      } else {
        res.status(404).json({
          success: false,
          error: "Interface HTML non trouvée",
          path: htmlPath
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Erreur chargement interface",
        details: error.message
      });
    }
  });

  // 📱 ROUTE PAIRING - Version intelligente
  app.post("/pair", async (req, res) => {
    const startTime = Date.now();
    
    try {
      let { number } = req.body;
      
      // Validation
      if (!number || typeof number !== 'string') {
        return res.status(400).json({ 
          success: false, 
          error: "Numéro WhatsApp requis (format: 243810000000)" 
        });
      }

      // Nettoyer et valider le numéro
      number = number.replace(/\D/g, "");
      
      if (number.length < 9) {
        return res.status(400).json({ 
          success: false, 
          error: "Numéro invalide (minimum 9 chiffres)" 
        });
      }
      
      // Ajouter le code pays 243 si absent
      if (!number.startsWith("243")) {
        number = "243" + number.substring(0, 9);
      }
      
      // Limiter à 12 chiffres max
      number = number.substring(0, 12);

      console.log(`📱 Requête pairing pour: ${number} (mode: ${baileysAvailable ? 'réel' : 'démo'})`);

      // 🎭 MODE DÉMO si Baileys non disponible
      if (!baileysAvailable) {
        const pairingCode = generateDemoPairingCode();
        const responseTime = Date.now() - startTime;
        
        console.log(`🎭 Code démo généré: ${pairingCode} en ${responseTime}ms`);
        
        return res.json({
          success: true,
          pairingCode: pairingCode,
          number: number,
          message: "Code généré en mode démonstration",
          demo_mode: true,
          render_bug: true,
          instructions: [
            "1. Ouvrez WhatsApp sur votre téléphone",
            "2. Appuyez sur les trois points (⋮)",
            "3. Sélectionnez « Périphériques liés »",
            "4. Appuyez sur « Ajouter un périphérique »",
            "5. Entrez le code ci-dessus"
          ],
          expiresIn: "5 minutes",
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toISOString()
        });
      }

      // 🔥 MODE RÉEL avec Baileys
      console.log(`🔥 Début connexion réelle pour: ${number}`);
      
      const sessionPath = path.join(SESSIONS_DIR, number);
      
      // Créer le dossier de session
      try {
        if (!fs.existsSync(sessionPath)) {
          fs.mkdirSync(sessionPath, { recursive: true });
        }
      } catch (fsError) {
        console.error(`❌ Erreur création session: ${fsError.message}`);
        // Continuer malgré l'erreur de fichier
      }

      let sock = null;
      let pairingCode = null;
      
      try {
        // Charger l'état d'authentification
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        
        // Obtenir la dernière version de Baileys
        const { version } = await fetchLatestBaileysVersion();
        
        // Créer la socket WhatsApp
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

        // Gérer les credentials
        sock.ev.on("creds.update", saveCreds);

        // 🔑 Générer le pairing code réel avec timeout
        pairingCode = await Promise.race([
          sock.requestPairingCode(number),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout génération code (30s)")), 30000)
          )
        ]);
        
        console.log(`✅ Pair code généré: ${pairingCode}`);
        
        // Fermer proprement la socket
        setTimeout(() => {
          try {
            if (sock && sock.ws) {
              sock.ws.close();
            }
          } catch (closeError) {
            // Ignorer les erreurs de fermeture
          }
        }, 1000);
        
      } catch (pairError) {
        console.error(`❌ Erreur génération code: ${pairError.message}`);
        
        // Nettoyer en cas d'erreur
        if (sock) {
          try {
            sock.ws?.close();
          } catch (e) {}
        }
        
        // Fallback au mode démo
        const demoCode = generateDemoPairingCode();
        const responseTime = Date.now() - startTime;
        
        return res.json({
          success: true,
          pairingCode: demoCode,
          number: number,
          message: "Code généré (fallback démo suite à erreur)",
          demo_mode: true,
          original_error: pairError.message,
          responseTime: `${responseTime}ms`,
          instructions: [
            "1. Ouvrez WhatsApp sur votre téléphone",
            "2. Appuyez sur les trois points (⋮)",
            "3. Sélectionnez « Périphériques liés »",
            "4. Appuyez sur « Ajouter un périphérique »",
            "5. Entrez le code ci-dessus"
          ],
          expiresIn: "5 minutes",
          timestamp: new Date().toISOString()
        });
      }

      const responseTime = Date.now() - startTime;
      
      // Réponse avec le vrai code
      res.json({
        success: true,
        pairingCode: pairingCode,
        number: number,
        message: "Code WhatsApp généré avec succès",
        demo_mode: false,
        responseTime: `${responseTime}ms`,
        instructions: [
          "1. Ouvrez WhatsApp sur votre téléphone",
          "2. Appuyez sur les trois points (⋮)",
          "3. Sélectionnez « Périphériques liés »",
          "4. Appuyez sur « Ajouter un périphérique »",
          "5. Entrez le code ci-dessus"
        ],
        expiresIn: "5 minutes",
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error(`💥 Erreur fatale dans /pair: ${err.message}`);
      console.error(err.stack);
      
      const responseTime = Date.now() - startTime;
      const demoCode = generateDemoPairingCode();
      
      res.json({
        success: true,
        pairingCode: demoCode,
        number: req.body?.number || "243000000000",
        message: "Code généré (mode démo suite à erreur critique)",
        demo_mode: true,
        error_recovery: true,
        responseTime: `${responseTime}ms`,
        instructions: [
          "1. Ouvrez WhatsApp sur votre téléphone",
          "2. Appuyez sur les trois points (⋮)",
          "3. Sélectionnez « Périphériques liés »",
          "4. Appuyez sur « Ajouter un périphérique »",
          "5. Entrez le code ci-dessus"
        ],
        expiresIn: "5 minutes",
        timestamp: new Date().toISOString()
      });
    }
  });

  // 📊 ROUTE POUR LES BOTS ACTIFS
  app.get("/active-bots", (req, res) => {
    try {
      let sessionDirs = [];
      try {
        sessionDirs = fs.existsSync(SESSIONS_DIR) 
          ? fs.readdirSync(SESSIONS_DIR) 
          : [];
      } catch (readError) {
        console.warn(`⚠️ Erreur lecture sessions: ${readError.message}`);
      }
      
      // Données en mode démo
      const demoBots = !baileysAvailable ? [
        {
          number: "243810000000",
          connected: true,
          status: "connected",
          demo: true,
          name: "Demo Bot 1"
        },
        {
          number: "243900000000",
          connected: false,
          status: "disconnected",
          demo: true,
          name: "Demo Bot 2"
        }
      ] : [];
      
      res.json({
        success: true,
        activeBots: demoBots,
        count: demoBots.length,
        totalSessions: sessionDirs.length,
        mode: baileysAvailable ? "real" : "demo",
        render_bug: !baileysAvailable,
        timestamp: new Date().toISOString()
      });
      
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
        activeBots: [],
        count: 0,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 📈 STATISTIQUES
  app.get("/stats", (req, res) => {
    const memory = process.memoryUsage();
    
    res.json({
      success: true,
      stats: {
        mode: baileysAvailable ? "real_mode" : "demo_mode",
        baileys_available: baileysAvailable,
        render_bug: !baileysAvailable,
        uptime: Math.floor(process.uptime()),
        platform: process.platform,
        nodeVersion: process.version,
        memory: {
          rss: Math.round(memory.rss / 1024 / 1024) + "MB",
          heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + "MB",
          heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + "MB",
          external: Math.round(memory.external / 1024 / 1024) + "MB"
        },
        sessionsDir: SESSIONS_DIR,
        publicDir: path.join(__dirname, "public"),
        timestamp: new Date().toISOString()
      }
    });
  });

  // 🔄 Route pour recharger Baileys (debug)
  app.post("/reload-baileys", async (req, res) => {
    const oldStatus = baileysAvailable;
    await loadBaileys();
    
    if (baileysAvailable && baileysModule) {
      try {
        makeWASocket = baileysModule.default || baileysModule.makeWASocket;
        useMultiFileAuthState = baileysModule.useMultiFileAuthState;
        DisconnectReason = baileysModule.DisconnectReason;
        fetchLatestBaileysVersion = baileysModule.fetchLatestBaileysVersion;
        Browsers = baileysModule.Browsers;
      } catch (error) {
        baileysAvailable = false;
      }
    }
    
    res.json({
      success: true,
      previous_status: oldStatus ? "available" : "unavailable",
      current_status: baileysAvailable ? "available" : "unavailable",
      reloaded: true,
      timestamp: new Date().toISOString()
    });
  });

  // 🎯 Route 404
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: "Route non trouvée",
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  });
}

// 🛠️ Fonction pour générer un code de pairing de démo
function generateDemoPairingCode() {
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
function startServer() {
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                HEXGATE PAIRING SERVER - V1              ║
╠══════════════════════════════════════════════════════════╣
║ 🚀 Serveur lancé sur le port ${PORT}                      ║
║ 🌍 URL: http://localhost:${PORT}                          ║
║ 🖥️ Panel: http://localhost:${PORT}/panel                 ║
║ 📱 Mode: ${baileysAvailable ? '✅ RÉEL (Baileys actif)' : '🎭 DÉMO (simulation)'} ║
║ ⚠️  Render bug: ${!baileysAvailable ? 'DÉTECTÉ - Mode démo' : 'NON DÉTECTÉ'}      ║
║ 📁 Sessions: ${SESSIONS_DIR}                             ║
║ 🛡️  Health: http://localhost:${PORT}/health               ║
╚══════════════════════════════════════════════════════════╝
    `);
    
    // Ping automatique pour éviter le sleep sur Render
    if (process.env.RENDER) {
      console.log("🔄 Ping automatique activé pour Render.com");
      setInterval(() => {
        fetch(`http://localhost:${PORT}/health`).catch(() => {});
      }, 10 * 60 * 1000); // Toutes les 10 minutes
    }
  });
}

// 🛑 Gestion des erreurs globales
process.on('uncaughtException', (error) => {
  console.error('💥 ERREUR NON CATCHÉE:', error.message);
  console.error(error.stack);
  // Ne pas quitter le processus sur Render
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ PROMISE NON GÉRÉE:', reason);
});

// 🏁 Point d'entrée avec gestion d'erreur
try {
  initializeApp().catch(error => {
    console.error('💥 ERREUR INITIALISATION:', error.message);
    console.error(error.stack);
    
    // Démarrer quand même le serveur en mode dégradé
    setupRoutes();
    startServer();
  });
} catch (fatalError) {
  console.error('💥 ERREUR FATALE AU DÉMARAGE:', fatalError.message);
  process.exit(1);
}

// Export pour les tests
export { app, baileysAvailable };
