import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
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
    return new Promise((resolve, reject) => {
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

            // Vérifier si le bot principal existe
            const botMainPath = path.join(__dirname, 'bot', 'index.js');
            if (!fs.existsSync(botMainPath)) {
                return reject({ 
                    status: 'error', 
                    message: 'Fichier bot/index.js non trouvé. Créez d\'abord votre bot WhatsApp.' 
                });
            }

            // ============================================
            // 🎯 CODE QUI SERA GÉNÉRÉ POUR CHAQUE SESSION
            // ============================================
            const botFilePath = path.join(sessionPath, 'index.js');
            const botContent = `
// ============================================
// 🤖 BOT BAILEY GÉNÉRÉ PAR HEXTECH SERVER
// ============================================
// SESSION: ${sessionId}
// PHONE: ${phoneNumber || 'N/A - ATTENTE DE PAIRING'}
// GENERATED: ${new Date().toISOString()}
// RENDER: ${IS_RENDER ? 'YES' : 'NO'}
// ============================================

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Variables d'environnement
process.env.SESSION_ID = '${sessionId}';
process.env.SESSION_PATH = '${sessionPath}';
process.env.PHONE_NUMBER = '${phoneNumber || ''}';
process.env.WEB_MODE = 'true';
process.env.IS_RENDER = '${IS_RENDER}';

console.log('╔══════════════════════════════════════════════════╗');
console.log('║          🤖 HEXGATE BAILEY BOT - V3              ║');
console.log('╠══════════════════════════════════════════════════╣');
console.log('║ 📱 Session ID: ${sessionId}');
console.log('║ 🌐 Environnement: ${IS_RENDER ? 'Render 🌍' : 'Local 💻'}');
console.log('║ 🚀 Mode: Web Interface');
console.log('╚══════════════════════════════════════════════════╝');

// Importer le bot principal
import { startBotForWeb } from '${botMainPath.replace(/\\/g, '\\\\')}';

// Démarrer le bot
async function startSession() {
    try {
        await startBotForWeb('${phoneNumber || ''}');
    } catch (error) {
        console.error('❌ Erreur démarrage session:', error);
        process.exit(1);
    }
}

// Démarrer
startSession();

// 🔄 Garder le processus actif
setInterval(() => {
    console.log('🔄 Bot actif -', new Date().toLocaleTimeString());
}, 30000);
`;

            // Écrire le fichier du bot
            fs.writeFileSync(botFilePath, botContent);
            console.log(`✅ Fichier bot généré: ${botFilePath}`);

            // Variables d'environnement
            const env = {
                ...process.env,
                SESSION_ID: sessionId,
                SESSION_PATH: sessionPath,
                PHONE_NUMBER: phoneNumber || '',
                WEB_MODE: 'true',
                IS_RENDER: IS_RENDER ? 'true' : 'false',
                NODE_ENV: 'production',
                NODE_OPTIONS: '--experimental-modules --es-module-specifier-resolution=node --max-old-space-size=512',
                RENDER_EXTERNAL_URL: RENDER_URL || ''
            };

            // Ajouter des options spécifiques à Render
            if (IS_RENDER) {
                env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';
                env.PUPPETEER_EXECUTABLE_PATH = '/usr/bin/chromium-browser';
            }

            console.log(`🚀 Démarrage du bot ${sessionId} pour: ${phoneNumber || 'Génération de pairing code'}`);

            // Démarrer le processus
            const botProcess = spawn('node', ['--experimental-modules', '--es-module-specifier-resolution=node', botFilePath], {
                cwd: sessionPath,
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
                pendingPairing: phoneNumber ? {
                    phone: phoneNumber,
                    timestamp: Date.now(),
                    status: 'waiting'
                } : null
            };

            bots.set(sessionId, botData);

            // Gérer la sortie stdout
            botProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`[Bot ${sessionId}]: ${output}`);
                botData.logs.push({ type: 'stdout', message: output, timestamp: Date.now() });
                botData.lastUpdate = Date.now();
                
                // 🎯 DÉTECTION DU PAIRING CODE (VRAI SYSTÈME BAILEY)
                // Recherche du code de pairing généré par Bailey
                const pairingMatch = 
                    output.match(/✅ Code de pairing:\s*(\d{6})/i) || 
                    output.match(/📱 Génération pair code pour:\s*.+?\n✅ Pair code généré:\s*(\d{6})/i) ||
                    output.match(/Pair code généré.*?(\d{6})/i) ||
                    output.match(/pairing code.*?(\d{6})/i) ||
                    output.match(/code.*?(\d{6})/i);
                
                if (pairingMatch) {
                    const code = pairingMatch[1] || pairingMatch[2];
                    botData.pairingCode = code;
                    botData.status = 'pairing';
                    console.log(`✅ Pairing code détecté pour ${sessionId}: ${botData.pairingCode}`);
                    
                    // Notifier que le code est disponible
                    if (botData.waitingForCode) {
                        botData.waitingForCode.resolve(code);
                        botData.waitingForCode = null;
                    }
                }
                
                // Détecter les QR codes
                const qrMatch = output.match(/QR Code:\s*(.+)/i) ||
                               output.match(/qr:\s*(.+)/i);
                if (qrMatch) {
                    botData.qrCode = qrMatch[1];
                    botData.status = 'qr_waiting';
                }
                
                // Détecter la connexion
                if (output.includes('✅ Connecté à WhatsApp') || 
                    output.includes('HEX-GATE CONNECTEE') ||
                    output.includes('✅ Connecté') ||
                    output.includes('READY') ||
                    output.includes('Authenticated')) {
                    botData.status = 'connected';
                    botData.connected = true;
                    botData.connectedAt = Date.now();
                    console.log(`✅ Bot ${sessionId} connecté!`);
                }
                
                // Détecter les erreurs
                if (output.includes('❌') || 
                    output.includes('ERREUR') || 
                    output.includes('ERROR') ||
                    output.includes('FAILED') ||
                    output.includes('EACCES')) {
                    if (!output.includes('✅')) {
                        botData.status = 'error';
                    }
                }
                
                // Limiter les logs
                if (botData.logs.length > 1000) {
                    botData.logs = botData.logs.slice(-500);
                }
            });

            // Gérer la sortie stderr
            botProcess.stderr.on('data', (data) => {
                const error = data.toString();
                console.error(`[Bot ${sessionId} ERROR]: ${error}`);
                botData.logs.push({ type: 'stderr', message: error, timestamp: Date.now() });
                botData.lastUpdate = Date.now();
                
                if (error.includes('Error') || error.includes('Failed') || error.includes('EACCES')) {
                    botData.status = 'error';
                }
            });

            // Gérer la fermeture du processus
            botProcess.on('close', (code) => {
                console.log(`[Bot ${sessionId}] Arrêté avec code: ${code}`);
                botData.status = 'stopped';
                botData.connected = false;
                botData.endTime = Date.now();
                
                // Nettoyer après 5 minutes
                setTimeout(() => {
                    if (bots.has(sessionId) && bots.get(sessionId).status === 'stopped') {
                        bots.delete(sessionId);
                        console.log(`🧹 Session ${sessionId} nettoyée`);
                    }
                }, 300000);
            });

            // Gérer les erreurs de processus
            botProcess.on('error', (err) => {
                console.error(`[Bot ${sessionId} PROCESS ERROR]: ${err.message}`);
                botData.status = 'error';
            });

            // Résoudre la promesse avec succès
            setTimeout(() => {
                resolve({
                    status: 'success',
                    sessionId: sessionId,
                    message: 'Bot démarré avec succès',
                    botStatus: botData.status
                });
            }, 3000);

        } catch (error) {
            console.error('Erreur démarrage bot:', error);
            reject({ status: 'error', message: error.message });
        }
    });
}

// Fonction pour arrêter un bot
async function stopBot(sessionId) {
    return new Promise((resolve, reject) => {
        if (!bots.has(sessionId)) {
            return reject({ status: 'error', message: 'Bot non trouvé' });
        }

        const botData = bots.get(sessionId);
        
        try {
            if (botData.process && !botData.process.killed) {
                botData.process.kill('SIGTERM');
                console.log(`🛑 Signal d'arrêt envoyé au bot ${sessionId}`);
            }
            
            botData.status = 'stopped';
            botData.connected = false;
            botData.endTime = Date.now();
            
            // Retirer après un délai
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
            reject({ status: 'error', message: error.message });
        }
    });
}

// Fonction pour obtenir le pairing code d'un bot
async function getPairingCode(sessionId) {
    return new Promise((resolve, reject) => {
        if (!bots.has(sessionId)) {
            return reject({ status: 'error', message: 'Bot non trouvé' });
        }

        const botData = bots.get(sessionId);
        
        // Si le bot a déjà un code, le retourner
        if (botData.pairingCode) {
            resolve({ 
                status: 'success', 
                pairingCode: botData.pairingCode,
                sessionId: sessionId,
                phoneNumber: botData.phoneNumber,
                generatedAt: botData.startTime
            });
        } else {
            // Sinon, indiquer qu'on attend
            resolve({ 
                status: 'pending', 
                message: 'Pairing code en cours de génération...',
                sessionId: sessionId
            });
        }
    });
}

// Nettoyage périodique
function cleanupSessions() {
    const now = Date.now();
    let cleaned = 0;
    
    bots.forEach((bot, sessionId) => {
        if (bot.status === 'stopped' && bot.endTime && (now - bot.endTime) > 600000) {
            bots.delete(sessionId);
            cleaned++;
        }
        else if (bot.lastUpdate && (now - bot.lastUpdate) > 1800000) {
            bots.delete(sessionId);
            cleaned++;
        }
    });
    
    if (cleaned > 0) {
        console.log(`🧹 ${cleaned} sessions nettoyées`);
    }
}

// ============================================
// 📡 ROUTES API
// ============================================

// GET /api/status
app.get('/api/status', (req, res) => {
    const activeBots = Array.from(bots.values()).filter(bot => 
        bot.status === 'connected' || bot.status === 'running'
    ).length;

    const memory = process.memoryUsage();
    
    res.json({
        whatsapp: 'active',
        uptime: Math.floor(process.uptime()),
        memory: {
            rss: Math.round(memory.rss / 1024 / 1024) + 'MB',
            heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + 'MB',
            heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB'
        },
        activeBots: activeBots,
        totalSessions: bots.size,
        serverTime: new Date().toISOString(),
        platform: 'HexTech Bot Manager',
        environment: IS_RENDER ? 'Render' : 'Local',
        url: req.protocol + '://' + req.get('host'),
        ownerNumber: '243816107573'
    });
});

// GET /api/bots
app.get('/api/bots', (req, res) => {
    const botList = Array.from(bots.values()).map(bot => ({
        sessionId: bot.sessionId,
        status: bot.status,
        phoneNumber: bot.phoneNumber,
        startTime: bot.startTime,
        uptime: bot.startTime ? Date.now() - bot.startTime : 0,
        pairingCode: bot.pairingCode,
        connected: bot.connected || false,
        logsCount: bot.logs.length
    }));

    res.json({
        activeBots: botList.filter(b => b.status === 'connected' || b.status === 'running').length,
        totalBots: botList.length,
        bots: botList
    });
});

// POST /api/bots/create
app.post('/api/bots/create', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Numéro de téléphone requis' 
            });
        }

        // Nettoyer le numéro - support tous les pays
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        if (cleanNumber.length < 8) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Numéro de téléphone invalide (minimum 8 chiffres)' 
            });
        }

        // Vérifier si un bot existe déjà pour ce numéro
        const existingBot = Array.from(bots.values()).find(bot => 
            bot.phoneNumber === cleanNumber && 
            (bot.status === 'running' || bot.status === 'connected' || bot.status === 'starting')
        );
        
        if (existingBot) {
            return res.json({
                status: 'exists',
                sessionId: existingBot.sessionId,
                message: 'Un bot existe déjà pour ce numéro',
                pairingCode: existingBot.pairingCode
            });
        }

        // Générer un ID de session unique
        const sessionId = 'hexgate-' + uuidv4().replace(/-/g, '').substring(0, 12);
        
        // Démarrer le bot
        startBot(sessionId, cleanNumber)
            .then(result => {
                console.log(`✅ Bot ${sessionId} démarré`);
            })
            .catch(error => {
                console.error(`❌ Erreur démarrage bot ${sessionId}:`, error.message);
            });

        res.json({
            status: 'success',
            sessionId: sessionId,
            message: 'Bot créé avec succès. Le pairing code sera disponible bientôt.',
            botStatus: 'starting',
            phoneNumber: cleanNumber
        });

    } catch (error) {
        console.error('Erreur création bot:', error);
        res.status(500).json({ 
            status: 'error', 
            message: error.message || 'Erreur lors de la création du bot' 
        });
    }
});

// DELETE /api/bots/:sessionId
app.delete('/api/bots/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await stopBot(sessionId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: error.message 
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
        totalLogs: botData.logs.length,
        sessionId: sessionId,
        status: botData.status,
        connected: botData.connected || false
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
        uptime: Date.now() - botData.startTime,
        logsCount: botData.logs.length
    });
});

// 🆕 ROUTE POUR PAIRING CODE
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
            message: error.message || 'Erreur lors de la récupération du pairing code' 
        });
    }
});

// Route de santé
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        bots: bots.size,
        uptime: process.uptime(),
        environment: IS_RENDER ? 'Render' : 'Local',
        owner: '243816107573'
    });
});

// Route principale - sert l'HTML
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // Fallback si l'HTML n'existe pas
        res.status(404).send(`
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>HexTech Bot Manager</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        text-align: center;
                        padding: 50px;
                    }
                    .container {
                        max-width: 800px;
                        margin: 0 auto;
                        background: rgba(0,0,0,0.7);
                        padding: 30px;
                        border-radius: 15px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    }
                    h1 {
                        font-size: 2.5em;
                        margin-bottom: 20px;
                    }
                    .status {
                        background: #28a745;
                        padding: 10px 20px;
                        border-radius: 5px;
                        display: inline-block;
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🤖 HexTech WhatsApp Bot Manager</h1>
                    <div class="status">✅ Serveur en ligne</div>
                    <p>Interface HTML non trouvée. Placez votre fichier index.html dans le dossier "public/"</p>
                    <p>👨‍💻 Développé par <strong>HexTech</strong> | 🇨🇩 RDC | 📞 Owner: 243816107573</p>
                </div>
            </body>
            </html>
        `);
    }
});

// Documentation API
app.get('/api/docs', (req, res) => {
    res.json({
        name: 'HexTech WhatsApp Bot API',
        version: '1.0.0',
        environment: IS_RENDER ? 'Render' : 'Local',
        url: RENDER_URL || `http://localhost:${PORT}`,
        owner: '243816107573',
        endpoints: {
            'GET /api/status': 'Statut du serveur',
            'GET /api/bots': 'Liste des bots',
            'POST /api/bots/create': 'Créer un nouveau bot',
            'DELETE /api/bots/:sessionId': 'Arrêter un bot',
            'GET /api/bots/:sessionId/logs': 'Logs d\'un bot',
            'GET /api/bots/:sessionId/status': 'Statut d\'un bot',
            'GET /api/pairing/:sessionId': 'Pairing code d\'un bot',
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

// Démarrer le serveur
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
    const publicUrl = RENDER_URL || `http://localhost:${PORT}`;
    
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                HEXTECH WHATSAPP BOT MANAGER                   ║
╠════════════════════════════════════════════════════════════════╣
║ 🌐 URL publique: ${publicUrl}                                 ║
║ 📁 Port: ${PORT}                                              ║
║ 🤖 Environnement: ${IS_RENDER ? 'Render 🌍' : 'Local 💻'}     ║
║ 🎯 Owner fixe: 243816107573                                  ║
║ 🔗 API: ${publicUrl}/api/*                                   ║
║ 🚀 Interface: ${publicUrl}                                   ║
╚════════════════════════════════════════════════════════════════╝
    `);
    
    if (IS_RENDER) {
        console.log(`✅ Détection automatique: Render`);
        console.log(`🌍 Votre application est accessible depuis partout sur Internet`);
    } else {
        console.log(`💻 Mode développement local`);
        console.log(`📱 Pour accéder depuis votre téléphone:`);
        console.log(`   1. Connectez-vous au même WiFi`);
        console.log(`   2. Trouvez votre IP locale (ipconfig/ifconfig)`);
        console.log(`   3. Accédez à: http://VOTRE-IP:${PORT}`);
    }
    
    // Créer les dossiers nécessaires
    const dirs = [
        path.join(__dirname, 'public'),
        path.join(__dirname, 'sessions'),
        path.join(__dirname, 'bot')
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`✅ Dossier créé: ${dir}`);
        }
    });
    
    // Vérifier l'HTML
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(htmlPath)) {
        console.log(`✅ Interface HTML trouvée: ${htmlPath}`);
    } else {
        console.log(`⚠️  Interface HTML non trouvée`);
        console.log(`👉 Placez votre fichier index.html dans: ${htmlPath}`);
    }
    
    // Vérifier le bot principal
    const botPath = path.join(__dirname, 'bot', 'index.js');
    if (!fs.existsSync(botPath)) {
        console.log(`⚠️  Fichier bot/index.js non trouvé`);
        console.log(`👉 Créez votre bot Bailey dans: ${botPath}`);
        
        // Créer un template minimal
        const exampleBot = `
// HexTech WhatsApp Bot - Template
export async function startBotForWeb(phoneNumber = null) {
    console.log('🤖 HexTech WhatsApp Bot v3.0');
    console.log('📱 Numéro:', phoneNumber || '243816107573');
    console.log('🔑 Session:', process.env.SESSION_ID);
    console.log('🌐 Environnement:', process.env.IS_RENDER === 'true' ? 'Render' : 'Local');
    
    console.log('✅ Bot démarré avec succès!');
    
    // Garder actif
    setInterval(() => {
        console.log('🔄 Bot actif -', new Date().toLocaleTimeString());
    }, 30000);
}

export default startBotForWeb;
`;
        fs.writeFileSync(botPath, exampleBot);
        console.log(`✅ Template de bot créé: ${botPath}`);
    } else {
        console.log(`✅ Bot principal trouvé: ${botPath}`);
    }
    
    // Nettoyage périodique
    setInterval(cleanupSessions, 60000);
    console.log('🔄 Nettoyage automatique activé (toutes les minutes)');
    
    console.log('\n🚀 PRÊT À UTILISER !');
    console.log(`📱 Allez sur: ${publicUrl}`);
    console.log('👉 Entrez un numéro WhatsApp (n\'importe quel pays)');
    console.log('👉 Cliquez sur "Générer Code WhatsApp"');
});

// Arrêt propre
function shutdown() {
    console.log('\n🛑 Arrêt du serveur...');
    
    const promises = [];
    bots.forEach((bot, sessionId) => {
        console.log(`🛑 Arrêt du bot ${sessionId}...`);
        promises.push(
            stopBot(sessionId).catch(err => {
                console.error(`❌ Erreur arrêt ${sessionId}:`, err.message);
            })
        );
    });
    
    Promise.all(promises).then(() => {
        console.log('✅ Tous les bots arrêtés');
        console.log('👋 Serveur arrêté');
        process.exit(0);
    });
    
    setTimeout(() => {
        console.log('⏰ Timeout, arrêt forcé');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
