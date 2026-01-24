// server.js - VERSION MODIFIÉE AVEC FORMULAIRE HTML INTÉGRÉ
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Configuration ES6 pour __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Configuration Render
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
const IS_RENDER = !!RENDER_URL;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Stockage des sessions
const bots = new Map();

// ============================================
// 📱 FONCTION POUR DÉMARRER UN BOT
// ============================================
async function startBot(sessionId, phoneNumber = null) {
    return new Promise(async (resolve, reject) => {
        try {
            // Vérifier si le bot existe déjà
            if (bots.has(sessionId)) {
                const existingBot = bots.get(sessionId);
                if (existingBot.process && !existingBot.process.killed) {
                    return resolve({ 
                        status: 'running', 
                        message: 'Bot déjà en cours d\'exécution',
                        sessionId 
                    });
                }
            }

            // Créer un dossier de session
            const sessionPath = path.join(__dirname, 'sessions', sessionId);
            if (!fs.existsSync(sessionPath)) {
                fs.mkdirSync(sessionPath, { recursive: true });
            }

            console.log(`🚀 Démarrage du bot ${sessionId} pour: ${phoneNumber || 'Génération de pairing code'}`);

            // Variables d'environnement POUR LE BOT
            const env = {
                ...process.env,
                SESSION_ID: sessionId,
                SESSION_PATH: sessionPath,
                PHONE_NUMBER: phoneNumber || '', // 🎯 ENVOYÉ AU BOT
                WEB_MODE: 'true',
                IS_RENDER: IS_RENDER ? 'true' : 'false',
                NODE_ENV: 'production',
                FORCE_PAIRING_MODE: 'true', // 🎯 FORCE LE MODE PAIRING
                DISABLE_QR: 'true' // 🎯 DÉSACTIVE LE QR
            };

            // Ajouter des options spécifiques à Render
            if (IS_RENDER) {
                env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';
                env.PUPPETEER_EXECUTABLE_PATH = '/usr/bin/chromium-browser';
            }

            // 🎯 CRÉER LE FICHIER DE CONFIGURATION POUR LE BOT
            const botConfigPath = path.join(__dirname, 'bot', 'config.json');
            let botConfig = {};
            
            if (fs.existsSync(botConfigPath)) {
                try {
                    botConfig = JSON.parse(fs.readFileSync(botConfigPath, 'utf8'));
                } catch (e) {}
            }
            
            // Mettre à jour la configuration avec le numéro
            botConfig.ownerNumber = phoneNumber || "";
            botConfig.prefix = ".";
            botConfig.botPublic = true;
            botConfig.alwaysOnline = true;
            
            // Sauvegarder la configuration
            fs.writeFileSync(botConfigPath, JSON.stringify(botConfig, null, 2));
            console.log(`📁 Configuration bot sauvegardée: ${botConfigPath}`);

            // Vérifier si le bot principal existe
            const botMainPath = path.join(__dirname, 'bot', 'index.js');
            if (!fs.existsSync(botMainPath)) {
                return reject({ 
                    status: 'error', 
                    message: 'Fichier bot/index.js non trouvé. Créez d\'abord votre bot WhatsApp.' 
                });
            }

            // 🎯 DÉMARRER LE BOT DIRECTEMENT (le bot génère le code)
            const botProcess = spawn('node', [
                '--experimental-modules',
                '--es-module-specifier-resolution=node',
                botMainPath
            ], {
                cwd: __dirname,
                env: env,
                stdio: ['pipe', 'pipe', 'pipe'],
                detached: false
            });

            // Stocker les données du bot
            const botData = {
                process: botProcess,
                sessionId: sessionId,
                phoneNumber: phoneNumber || 'pairing_only',
                status: 'starting',
                startTime: Date.now(),
                logs: [],
                pairingCode: null,
                connected: false,
                lastUpdate: Date.now(),
                codeResolved: false,
                pairingAttempted: false,
                botConfig: botConfig
            };

            bots.set(sessionId, botData);

            // Gérer la sortie stdout
            botProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`[Bot ${sessionId}]: ${output}`);
                
                // Stocker le log
                botData.logs.push({ 
                    type: 'stdout', 
                    message: output, 
                    timestamp: Date.now() 
                });
                botData.lastUpdate = Date.now();
                
                // 🎯 DÉTECTION SPÉCIFIQUE DU PAIRING CODE BAILEYS
                let pairingCode = null;
                
                // Formats de détection
                const formats = [
                    /🎯🎯🎯 CODE DE PAIRING GÉNÉRÉ: ([A-Z0-9]{4}[-][A-Z0-9]{4}) 🎯🎯🎯/i,
                    /CODE DE PAIRING.*?([A-Z0-9]{4}[-][A-Z0-9]{4})/i,
                    /([A-Z0-9]{4}[-][A-Z0-9]{4})/,
                    /\b([A-Z0-9]{8})\b/
                ];
                
                for (const regex of formats) {
                    const match = output.match(regex);
                    if (match && match[1]) {
                        pairingCode = match[1];
                        break;
                    }
                }
                
                // Si trouvé, formater proprement
                if (pairingCode) {
                    let cleanCode = pairingCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    
                    if (cleanCode.length === 8) {
                        if (!pairingCode.includes('-')) {
                            cleanCode = cleanCode.substring(0, 4) + '-' + cleanCode.substring(4);
                        }
                        
                        botData.pairingCode = cleanCode;
                        botData.status = 'pairing';
                        console.log(`🎯 PAIRING CODE pour ${sessionId}: ${cleanCode}`);
                        
                        if (!botData.codeResolved) {
                            botData.codeResolved = true;
                            resolve({
                                status: 'success',
                                sessionId: sessionId,
                                message: '✅ Code de pairing généré avec succès!',
                                pairingCode: cleanCode,
                                phoneNumber: phoneNumber,
                                immediateCode: true,
                                instructions: 'Allez dans WhatsApp → Paramètres → Périphériques liés → Connecter un appareil'
                            });
                        }
                    }
                }
                
                // Détecter la connexion réussie
                if (output.includes('✅✅✅ CONNECTÉ À WHATSAPP!') || 
                    output.includes('Authenticated')) {
                    botData.status = 'connected';
                    botData.connected = true;
                    botData.connectedAt = Date.now();
                    console.log(`✅ Bot ${sessionId} connecté à WhatsApp!`);
                }
                
                // Détecter que le bot tente de générer un pairing code
                if (output.includes('Génération pairing code')) {
                    botData.pairingAttempted = true;
                }
                
                // Limiter les logs en mémoire
                if (botData.logs.length > 1000) {
                    botData.logs = botData.logs.slice(-500);
                }
            });

            // Gérer la sortie stderr
            botProcess.stderr.on('data', (data) => {
                const error = data.toString();
                console.error(`[Bot ${sessionId} ERROR]: ${error}`);
                botData.logs.push({ 
                    type: 'stderr', 
                    message: error, 
                    timestamp: Date.now() 
                });
                botData.lastUpdate = Date.now();
                
                // Détecter les erreurs critiques
                if (error.includes('makeWASocket is not a function') ||
                    error.includes('ERR_MODULE_NOT_FOUND')) {
                    botData.status = 'error';
                    botData.error = error;
                    
                    if (!botData.codeResolved) {
                        botData.codeResolved = true;
                        reject({ 
                            status: 'error', 
                            message: 'Erreur critique dans le bot.',
                            details: error.substring(0, 200)
                        });
                    }
                }
            });

            // Gérer la fermeture du processus
            botProcess.on('close', (code) => {
                console.log(`[Bot ${sessionId}] Arrêté avec code: ${code}`);
                botData.status = 'stopped';
                botData.connected = false;
                botData.endTime = Date.now();
                
                setTimeout(() => {
                    if (bots.has(sessionId) && bots.get(sessionId).status === 'stopped') {
                        bots.delete(sessionId);
                    }
                }, 300000);
            });

            // Gérer les erreurs de processus
            botProcess.on('error', (err) => {
                console.error(`[Bot ${sessionId} PROCESS ERROR]: ${err.message}`);
                botData.status = 'error';
                botData.logs.push({ 
                    type: 'error', 
                    message: `Process error: ${err.message}`, 
                    timestamp: Date.now() 
                });
                
                if (!botData.codeResolved) {
                    botData.codeResolved = true;
                    reject({ 
                        status: 'error', 
                        message: `Erreur processus: ${err.message}` 
                    });
                }
            });

            // Timeout après 90 secondes
            setTimeout(() => {
                if (!botData.codeResolved && !botData.pairingCode) {
                    console.log(`⏰ Timeout pour ${sessionId}`);
                    botData.codeResolved = true;
                    resolve({
                        status: 'timeout',
                        sessionId: sessionId,
                        message: 'Timeout: Aucun pairing code généré',
                        pairingCode: null,
                        phoneNumber: phoneNumber,
                        botStatus: botData.status,
                        pairingAttempted: botData.pairingAttempted
                    });
                }
            }, 90000);

        } catch (error) {
            console.error('Erreur démarrage bot:', error);
            reject({ 
                status: 'error', 
                message: error.message 
            });
        }
    });
}

// ============================================
// 🔧 FONCTIONS UTILITAIRES
// ============================================

async function stopBot(sessionId) {
    return new Promise((resolve, reject) => {
        if (!bots.has(sessionId)) {
            return reject({ 
                status: 'error', 
                message: 'Bot non trouvé' 
            });
        }

        const botData = bots.get(sessionId);
        
        try {
            if (botData.process && !botData.process.killed) {
                botData.process.kill('SIGTERM');
            }
            
            botData.status = 'stopped';
            botData.connected = false;
            botData.endTime = Date.now();
            
            setTimeout(() => {
                if (bots.has(sessionId)) {
                    bots.delete(sessionId);
                }
            }, 10000);
            
            resolve({ 
                status: 'success', 
                message: 'Bot arrêté avec succès',
                sessionId: sessionId
            });
            
        } catch (error) {
            reject({ 
                status: 'error', 
                message: error.message 
            });
        }
    });
}

async function getPairingCode(sessionId) {
    return new Promise((resolve, reject) => {
        if (!bots.has(sessionId)) {
            return reject({ 
                status: 'error', 
                message: 'Bot non trouvé' 
            });
        }

        const botData = bots.get(sessionId);
        
        if (botData.pairingCode) {
            resolve({ 
                status: 'success', 
                pairingCode: botData.pairingCode,
                sessionId: sessionId,
                phoneNumber: botData.phoneNumber,
                botStatus: botData.status,
                connected: botData.connected || false
            });
        } else {
            const checkCode = () => {
                if (botData.pairingCode) {
                    resolve({ 
                        status: 'success', 
                        pairingCode: botData.pairingCode,
                        sessionId: sessionId,
                        phoneNumber: botData.phoneNumber
                    });
                } else {
                    setTimeout(() => {
                        if (Date.now() - botData.startTime > 120000) {
                            resolve({ 
                                status: 'error', 
                                message: 'Timeout: Pairing code non généré',
                                sessionId: sessionId
                            });
                        } else {
                            checkCode();
                        }
                    }, 2000);
                }
            };
            
            checkCode();
        }
    });
}

function cleanupSessions() {
    const now = Date.now();
    bots.forEach((bot, sessionId) => {
        if (bot.status === 'stopped' && bot.endTime && (now - bot.endTime) > 600000) {
            bots.delete(sessionId);
        } else if (bot.lastUpdate && (now - bot.lastUpdate) > 1800000) {
            bots.delete(sessionId);
        }
    });
}

// ============================================
// 📡 ROUTES API
// ============================================

// GET /api/status
app.get('/api/status', (req, res) => {
    const activeBots = Array.from(bots.values()).filter(bot => 
        bot.status === 'connected' || bot.status === 'running' || bot.status === 'pairing'
    ).length;

    const memory = process.memoryUsage();
    
    res.json({
        whatsapp: 'active',
        uptime: Math.floor(process.uptime()),
        activeBots: activeBots,
        totalSessions: bots.size,
        serverTime: new Date().toISOString(),
        platform: 'HexTech Bot Manager',
        environment: IS_RENDER ? 'Render' : 'Local',
        url: req.protocol + '://' + req.get('host'),
        version: '4.0',
        pairingSystem: 'BAILEYS_REAL_PAIRING_CODE',
        pairingFormat: 'XXXX-XXXX',
        status: 'healthy'
    });
});

// GET /api/bots
app.get('/api/bots', (req, res) => {
    const botList = Array.from(bots.values()).map(bot => ({
        sessionId: bot.sessionId,
        status: bot.status,
        phoneNumber: bot.phoneNumber,
        startTime: bot.startTime,
        pairingCode: bot.pairingCode,
        connected: bot.connected || false
    }));

    res.json({
        activeBots: botList.filter(b => 
            b.status === 'connected' || b.status === 'running' || b.status === 'pairing'
        ).length,
        totalBots: botList.length,
        bots: botList
    });
});

// POST /api/bots/create - Créer un nouveau bot
app.post('/api/bots/create', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Numéro de téléphone requis' 
            });
        }

        // Nettoyer le numéro
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        if (cleanNumber.length < 8) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Numéro invalide (minimum 8 chiffres)' 
            });
        }

        // Vérifier si un bot existe déjà
        const existingBot = Array.from(bots.values()).find(bot => 
            bot.phoneNumber === cleanNumber && 
            (bot.status === 'running' || bot.status === 'connected' || bot.status === 'pairing')
        );
        
        if (existingBot) {
            return res.json({
                status: 'exists',
                sessionId: existingBot.sessionId,
                message: 'Bot déjà existant',
                pairingCode: existingBot.pairingCode,
                botStatus: existingBot.status
            });
        }

        // Générer un ID de session
        const sessionId = 'hexgate-' + uuidv4().replace(/-/g, '').substring(0, 12);
        
        console.log(`📱 Création bot pour: ${cleanNumber} (${sessionId})`);
        
        // Démarrer le bot
        const result = await startBot(sessionId, cleanNumber);
        
        res.json({
            status: result.status,
            sessionId: sessionId,
            message: result.message,
            pairingCode: result.pairingCode,
            phoneNumber: cleanNumber,
            immediateCode: !!result.pairingCode
        });

    } catch (error) {
        console.error('Erreur création bot:', error);
        res.status(500).json({ 
            status: 'error', 
            message: error.message || 'Erreur lors de la création du bot' 
        });
    }
});

// GET /api/bots/:sessionId/logs
app.get('/api/bots/:sessionId/logs', (req, res) => {
    const { sessionId } = req.params;
    const botData = bots.get(sessionId);
    
    if (!botData) {
        return res.status(404).json({ 
            status: 'error', 
            message: 'Bot non trouvé' 
        });
    }
    
    const recentLogs = botData.logs
        .slice(-100)
        .map(log => `${new Date(log.timestamp).toISOString()} [${log.type}]: ${log.message.trim()}`);
    
    res.json({
        status: 'success',
        logs: recentLogs,
        sessionId: sessionId,
        botStatus: botData.status,
        pairingCode: botData.pairingCode || 'En attente'
    });
});

// GET /api/bots/:sessionId/status
app.get('/api/bots/:sessionId/status', (req, res) => {
    const { sessionId } = req.params;
    const botData = bots.get(sessionId);
    
    if (!botData) {
        return res.status(404).json({ 
            status: 'error', 
            message: 'Bot non trouvé' 
        });
    }
    
    res.json({
        status: 'success',
        sessionId: sessionId,
        botStatus: botData.status,
        phoneNumber: botData.phoneNumber,
        connected: botData.connected || false,
        pairingCode: botData.pairingCode,
        startTime: botData.startTime,
        uptime: Date.now() - botData.startTime
    });
});

// GET /api/pairing/:sessionId
app.get('/api/pairing/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await getPairingCode(sessionId);
        
        if (result.status === 'error') {
            return res.status(404).json(result);
        }
        
        res.json(result);
        
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
});

// POST /api/test-pairing
app.post('/api/test-pairing', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Numéro requis' 
            });
        }
        
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        const tempSessionId = 'test-' + uuidv4().replace(/-/g, '').substring(0, 8);
        
        console.log(`🧪 Test pairing pour: ${cleanNumber}`);
        
        const result = await startBot(tempSessionId, cleanNumber);
        
        if (result.pairingCode) {
            setTimeout(() => {
                stopBot(tempSessionId).catch(() => {});
            }, 10000);
        }
        
        res.json(result);
        
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
});

// Route de santé
app.get('/health', (req, res) => {
    const activeBots = Array.from(bots.values()).filter(bot => 
        bot.status === 'connected' || bot.status === 'running'
    ).length;
    
    res.json({
        status: 'healthy',
        activeBots: activeBots,
        environment: IS_RENDER ? 'Render' : 'Local',
        pairingSystem: 'BAILEYS_REAL_PAIRING_CODE'
    });
});

// ============================================
// 🌐 ROUTES HTML - INTERFACE UTILISATEUR
// ============================================

// Route principale avec formulaire HTML intégré
app.get('/', (req, res) => {
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    
    if (fs.existsSync(htmlPath)) {
        res.sendFile(htmlPath);
    } else {
        res.send(generateHTML());
    }
});

// Route pour afficher le formulaire seul
app.get('/form', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>HexTech - Connexion WhatsApp</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                    color: #f1f5f9;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                
                .container {
                    max-width: 500px;
                    width: 100%;
                    background: rgba(30, 41, 59, 0.9);
                    border-radius: 20px;
                    padding: 40px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                    border: 1px solid #334155;
                    backdrop-filter: blur(10px);
                }
                
                .logo {
                    text-align: center;
                    margin-bottom: 30px;
                }
                
                .logo h1 {
                    font-size: 2.5em;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-bottom: 10px;
                }
                
                .logo p {
                    color: #94a3b8;
                    font-size: 0.9em;
                }
                
                .form-group {
                    margin-bottom: 25px;
                }
                
                label {
                    display: block;
                    margin-bottom: 8px;
                    color: #cbd5e1;
                    font-weight: 500;
                }
                
                input[type="text"] {
                    width: 100%;
                    padding: 15px;
                    background: #1e293b;
                    border: 2px solid #334155;
                    border-radius: 10px;
                    color: #f1f5f9;
                    font-size: 16px;
                    transition: all 0.3s ease;
                }
                
                input[type="text"]:focus {
                    outline: none;
                    border-color: #6366f1;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
                }
                
                .phone-example {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    margin-top: 5px;
                }
                
                .example-tag {
                    background: rgba(99, 102, 241, 0.1);
                    color: #a5b4fc;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 0.85em;
                    border: 1px solid rgba(99, 102, 241, 0.2);
                    cursor: pointer;
                }
                
                .example-tag:hover {
                    background: rgba(99, 102, 241, 0.2);
                }
                
                .submit-btn {
                    width: 100%;
                    padding: 16px;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 18px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .submit-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
                }
                
                .submit-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }
                
                .result {
                    margin-top: 30px;
                    padding: 20px;
                    border-radius: 10px;
                    background: rgba(30, 41, 59, 0.7);
                    border: 1px solid #334155;
                    display: none;
                }
                
                .result.success {
                    display: block;
                    border-color: #10b981;
                    background: rgba(16, 185, 129, 0.1);
                }
                
                .result.error {
                    display: block;
                    border-color: #ef4444;
                    background: rgba(239, 68, 68, 0.1);
                }
                
                .result.loading {
                    display: block;
                    border-color: #6366f1;
                    background: rgba(99, 102, 241, 0.1);
                }
                
                .code-display {
                    font-family: monospace;
                    font-size: 1.8em;
                    letter-spacing: 3px;
                    text-align: center;
                    margin: 15px 0;
                    padding: 15px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 10px;
                    border: 2px solid #6366f1;
                }
                
                .instructions {
                    background: rgba(30, 41, 59, 0.7);
                    padding: 20px;
                    border-radius: 10px;
                    margin-top: 20px;
                    border: 1px solid #334155;
                }
                
                .instructions h3 {
                    color: #6366f1;
                    margin-bottom: 15px;
                }
                
                .instructions ol {
                    padding-left: 20px;
                }
                
                .instructions li {
                    margin-bottom: 10px;
                    color: #cbd5e1;
                }
                
                .status-info {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 20px;
                    font-size: 0.9em;
                    color: #94a3b8;
                }
                
                .loading-spinner {
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    border: 3px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    border-top-color: #6366f1;
                    animation: spin 1s ease-in-out infinite;
                    margin-right: 10px;
                    vertical-align: middle;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                @media (max-width: 600px) {
                    .container {
                        padding: 25px;
                    }
                    
                    .logo h1 {
                        font-size: 2em;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">
                    <h1>🤖 HexTech Bot</h1>
                    <p>Connectez votre WhatsApp en quelques secondes</p>
                </div>
                
                <form id="phoneForm">
                    <div class="form-group">
                        <label for="phoneNumber">📱 Numéro WhatsApp</label>
                        <input 
                            type="text" 
                            id="phoneNumber" 
                            name="phoneNumber" 
                            placeholder="Ex: 243816107573"
                            required
                        >
                        <div class="phone-example">
                            <span class="example-tag" onclick="document.getElementById('phoneNumber').value='243816107573'">
                                RDC: 243XXXXXXXXX
                            </span>
                            <span class="example-tag" onclick="document.getElementById('phoneNumber').value='33612345678'">
                                France: 33XXXXXXXXX
                            </span>
                            <span class="example-tag" onclick="document.getElementById('phoneNumber').value='19145678901'">
                                USA: 1XXXXXXXXXX
                            </span>
                        </div>
                    </div>
                    
                    <button type="submit" class="submit-btn" id="submitBtn">
                        Générer le Code de Connexion
                    </button>
                </form>
                
                <div id="result" class="result"></div>
                
                <div class="instructions">
                    <h3>📋 Comment se connecter ?</h3>
                    <ol>
                        <li>Entrez votre numéro WhatsApp complet</li>
                        <li>Cliquez sur "Générer le Code de Connexion"</li>
                        <li>Attendez que le code apparaisse</li>
                        <li>Sur votre téléphone : WhatsApp → Paramètres → Périphériques liés</li>
                        <li>Sélectionnez "Connecter un appareil"</li>
                        <li>Choisissez "Connecter avec un numéro de téléphone"</li>
                        <li>Entrez le code affiché (format: XXXX-XXXX)</li>
                        <li>Validez et attendez la connexion</li>
                    </ol>
                </div>
                
                <div class="status-info">
                    <span id="serverStatus">🔵 Serveur en ligne</span>
                    <span id="activeBots">🤖 0 bots actifs</span>
                </div>
            </div>
            
            <script>
                // Éléments DOM
                const form = document.getElementById('phoneForm');
                const phoneInput = document.getElementById('phoneNumber');
                const submitBtn = document.getElementById('submitBtn');
                const resultDiv = document.getElementById('result');
                const serverStatus = document.getElementById('serverStatus');
                const activeBots = document.getElementById('activeBots');
                
                // Vérifier le statut du serveur
                async function checkServerStatus() {
                    try {
                        const response = await fetch('/api/status');
                        const data = await response.json();
                        
                        if (data.status === 'healthy') {
                            serverStatus.innerHTML = '🟢 Serveur en ligne';
                            serverStatus.style.color = '#10b981';
                        }
                        
                        if (data.activeBots !== undefined) {
                            activeBots.innerHTML = \`🤖 \${data.activeBots} bots actifs\`;
                        }
                    } catch (error) {
                        serverStatus.innerHTML = '🔴 Serveur hors ligne';
                        serverStatus.style.color = '#ef4444';
                    }
                }
                
                // Afficher un résultat
                function showResult(type, message, code = null) {
                    resultDiv.className = 'result ' + type;
                    
                    if (type === 'success' && code) {
                        resultDiv.innerHTML = \`
                            <h3>✅ Code généré avec succès !</h3>
                            <div class="code-display">\${code}</div>
                            <p>Utilisez ce code dans WhatsApp → Périphériques liés → Connecter un appareil</p>
                            <p><strong>📱 Numéro:</strong> \${phoneInput.value}</p>
                            <p><strong>⏱️ Valide pendant:</strong> 10 minutes</p>
                        \`;
                    } else if (type === 'error') {
                        resultDiv.innerHTML = \`
                            <h3>❌ Erreur</h3>
                            <p>\${message}</p>
                        \`;
                    } else if (type === 'loading') {
                        resultDiv.innerHTML = \`
                            <h3><span class="loading-spinner"></span>Génération en cours...</h3>
                            <p>Veuillez patienter pendant que nous générons votre code de connexion.</p>
                        \`;
                    }
                    
                    resultDiv.style.display = 'block';
                    resultDiv.scrollIntoView({ behavior: 'smooth' });
                }
                
                // Soumettre le formulaire
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const phoneNumber = phoneInput.value.trim();
                    
                    if (!phoneNumber) {
                        showResult('error', 'Veuillez entrer votre numéro WhatsApp');
                        return;
                    }
                    
                    // Vérifier le format
                    const cleanNumber = phoneNumber.replace(/\\D/g, '');
                    if (cleanNumber.length < 8) {
                        showResult('error', 'Numéro invalide. Format: 243XXXXXXXXX ou votre code pays + numéro');
                        return;
                    }
                    
                    // Désactiver le bouton
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<span class="loading-spinner"></span>Génération en cours...';
                    
                    // Afficher le loading
                    showResult('loading', '');
                    
                    try {
                        // Envoyer la requête au serveur
                        const response = await fetch('/api/bots/create', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ phoneNumber: cleanNumber })
                        });
                        
                        const data = await response.json();
                        
                        if (data.status === 'success' || data.status === 'exists') {
                            if (data.pairingCode) {
                                showResult('success', data.message, data.pairingCode);
                                
                                // Vérifier périodiquement le statut
                                if (data.sessionId) {
                                    checkBotStatus(data.sessionId);
                                }
                            } else {
                                showResult('error', 'Code non généré. Veuillez réessayer.');
                            }
                        } else {
                            showResult('error', data.message || 'Erreur lors de la génération du code');
                        }
                        
                    } catch (error) {
                        showResult('error', 'Erreur de connexion au serveur');
                        console.error('Erreur:', error);
                    } finally {
                        // Réactiver le bouton
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Générer le Code de Connexion';
                    }
                });
                
                // Vérifier le statut du bot
                async function checkBotStatus(sessionId) {
                    try {
                        const response = await fetch(\`/api/bots/\${sessionId}/status\`);
                        const data = await response.json();
                        
                        if (data.connected) {
                            showResult('success', '✅ WhatsApp connecté avec succès !');
                        }
                    } catch (error) {
                        console.error('Erreur vérification statut:', error);
                    }
                }
                
                // Vérifier le statut du serveur au chargement
                checkServerStatus();
                
                // Vérifier périodiquement
                setInterval(checkServerStatus, 30000);
                
                // Focus sur l'input
                phoneInput.focus();
            </script>
        </body>
        </html>
    `);
});

// Fonction pour générer l'HTML par défaut
function generateHTML() {
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HexTech WhatsApp Bot Manager</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', system-ui, sans-serif;
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                color: #f1f5f9;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .container {
                max-width: 800px;
                width: 100%;
                background: rgba(30, 41, 59, 0.9);
                border-radius: 20px;
                padding: 40px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                border: 1px solid #334155;
                backdrop-filter: blur(10px);
            }
            
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .header h1 {
                font-size: 2.8em;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 10px;
            }
            
            .status-badge {
                display: inline-block;
                background: linear-gradient(135deg, #10b981, #34d399);
                color: white;
                padding: 10px 20px;
                border-radius: 10px;
                font-weight: 600;
                margin: 20px 0;
            }
            
            .main-content {
                margin: 30px 0;
            }
            
            .endpoints {
                background: #0f172a;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
            }
            
            .endpoints code {
                display: block;
                margin: 10px 0;
                padding: 10px;
                background: #1e293b;
                border-radius: 5px;
                font-family: monospace;
            }
            
            .instructions {
                background: rgba(30, 41, 59, 0.7);
                padding: 20px;
                border-radius: 10px;
                margin-top: 20px;
                border: 1px solid #334155;
            }
            
            .instructions h3 {
                color: #6366f1;
                margin-bottom: 15px;
            }
            
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
                text-decoration: none;
                padding: 15px 30px;
                border-radius: 10px;
                font-weight: 600;
                margin-top: 20px;
                transition: all 0.3s ease;
            }
            
            .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
            }
            
            .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin: 20px 0;
            }
            
            .info-item {
                background: rgba(30, 41, 59, 0.7);
                padding: 15px;
                border-radius: 10px;
                border: 1px solid #334155;
            }
            
            .info-item h4 {
                color: #94a3b8;
                margin-bottom: 5px;
            }
            
            @media (max-width: 600px) {
                .container {
                    padding: 25px;
                }
                
                .header h1 {
                    font-size: 2em;
                }
                
                .info-grid {
                    grid-template-columns: 1fr;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🤖 HexTech WhatsApp Bot Manager</h1>
                <div class="status-badge">✅ Serveur en ligne - SYSTÈME PAIRING CODE ACTIF</div>
            </div>
            
            <div class="main-content">
                <p>Bienvenue dans le gestionnaire de bots WhatsApp HexTech. Utilisez l'interface web pour connecter votre WhatsApp.</p>
                
                <a href="/form" class="cta-button">📱 Ouvrir l'interface de connexion</a>
            </div>
            
            <div class="info-grid">
                <div class="info-item">
                    <h4>🎯 Système</h4>
                    <p>Pairing Code Réel BaileyJS</p>
                </div>
                <div class="info-item">
                    <h4>🔑 Format</h4>
                    <p>XXXX-XXXX (8 caractères)</p>
                </div>
                <div class="info-item">
                    <h4>⚡ Rôle</h4>
                    <p>Orchestrateur seulement</p>
                </div>
                <div class="info-item">
                    <h4>🌍 Environnement</h4>
                    <p>${IS_RENDER ? 'Render' : 'Local'}</p>
                </div>
            </div>
            
            <div class="endpoints">
                <h3>📡 API Endpoints</h3>
                <code>POST /api/bots/create</code>
                <code>GET /api/status</code>
                <code>GET /health</code>
                <code>GET /api/docs</code>
            </div>
            
            <div class="instructions">
                <h3>📋 Comment utiliser ?</h3>
                <ol style="margin-left: 20px; line-height: 1.6;">
                    <li>Cliquez sur "Ouvrir l'interface de connexion"</li>
                    <li>Entrez votre numéro WhatsApp (ex: 243816107573)</li>
                    <li>Cliquez sur "Générer le Code de Connexion"</li>
                    <li>Attendez que le code apparaisse (format: XXXX-XXXX)</li>
                    <li>Sur votre téléphone : WhatsApp → Paramètres → Périphériques liés</li>
                    <li>Cliquez sur "Connecter un appareil"</li>
                    <li>Sélectionnez "Connecter avec un numéro de téléphone"</li>
                    <li>Entrez le code affiché et validez</li>
                </ol>
            </div>
            
            <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 0.9em;">
                <p>👨‍💻 Développé par <strong>HexTech</strong> | 🇨🇩 RDC</p>
                <p>🚀 Version 4.0 | Mode: ${IS_RENDER ? 'Render 🌍' : 'Local 💻'}</p>
            </div>
        </div>
        
        <script>
            // Vérifier le statut du serveur
            async function checkStatus() {
                try {
                    const response = await fetch('/api/status');
                    const data = await response.json();
                    console.log('Serveur:', data);
                } catch (error) {
                    console.error('Serveur hors ligne');
                }
            }
            
            // Vérifier au chargement
            checkStatus();
        </script>
    </body>
    </html>
    `;
}

// Documentation API
app.get('/api/docs', (req, res) => {
    const publicUrl = RENDER_URL || `http://localhost:${PORT}`;
    
    res.json({
        name: 'HexTech WhatsApp Bot API',
        version: '4.0',
        environment: IS_RENDER ? 'Render' : 'Local',
        url: publicUrl,
        endpoints: {
            'GET /': 'Interface principale',
            'GET /form': 'Formulaire de connexion HTML',
            'POST /api/bots/create': 'Créer un bot WhatsApp',
            'GET /api/bots/:sessionId/status': 'Statut d\'un bot',
            'GET /api/pairing/:sessionId': 'Récupérer pairing code',
            'GET /health': 'Santé du serveur'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route non trouvée'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err);
    res.status(500).json({
        status: 'error',
        message: 'Erreur interne du serveur'
    });
});

// ============================================
// 🚀 DÉMARRAGE DU SERVEUR
// ============================================
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
    const publicUrl = RENDER_URL || `http://localhost:${PORT}`;
    
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                HEXTECH WHATSAPP BOT MANAGER                   ║
╠════════════════════════════════════════════════════════════════╣
║ 🌐 URL publique: ${publicUrl.padEnd(40)} ║
║ 📁 Port: ${PORT.toString().padEnd(45)} ║
║ 📱 Interface: ${publicUrl}${' '.repeat(28)} ║
║ 📋 Formulaire: ${publicUrl}/form${' '.repeat(25)} ║
║ 🎯 Système: Pairing Code BaileyJS${' '.repeat(19)} ║
╚════════════════════════════════════════════════════════════════╝
    `);
    
    // Créer les dossiers
    const dirs = [
        path.join(__dirname, 'public'),
        path.join(__dirname, 'sessions'),
        path.join(__dirname, 'bot'),
        path.join(__dirname, 'bot', 'commands')
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`✅ Dossier créé: ${path.relative(__dirname, dir)}`);
        }
    });
    
    // Nettoyage périodique
    setInterval(cleanupSessions, 60000);
    console.log('🔄 Nettoyage automatique activé');
    
    console.log('\n🚀 SERVEUR PRÊT !');
    console.log(`👉 Allez sur: ${publicUrl}`);
    console.log(`👉 Ou directement sur: ${publicUrl}/form`);
    console.log('👉 Entrez un numéro WhatsApp pour générer un pairing code');
});

// Gestion arrêt
function shutdown() {
    console.log('\n🛑 Arrêt du serveur...');
    
    const promises = [];
    bots.forEach((bot, sessionId) => {
        promises.push(stopBot(sessionId).catch(() => {}));
    });
    
    Promise.all(promises).then(() => {
        console.log('✅ Tous les bots arrêtés');
        process.exit(0);
    });
    
    setTimeout(() => {
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app, startBot, stopBot, getPairingCode };
