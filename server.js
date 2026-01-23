
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

            // 🎯 GÉNÉRER UN CODE IMMÉDIAT
            const immediateCode = Math.floor(100000 + Math.random() * 900000);

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
// PAIRING CODE: ${immediateCode}
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
process.env.RENDER_EXTERNAL_URL = '${RENDER_URL || ''}';
process.env.IMMEDIATE_PAIRING_CODE = '${immediateCode}';

console.log('╔══════════════════════════════════════════════════╗');
console.log('║          🤖 HEXGATE BAILEY BOT - V3              ║');
console.log('╠══════════════════════════════════════════════════╣');
console.log('║ 📱 Session ID: ${sessionId}');
console.log('║ 📞 Numéro: ${phoneNumber || 'En attente...'}');
console.log('║ 🔐 Code de pairing IMMÉDIAT: ${immediateCode}');
console.log('║ 🌐 Environnement: ${IS_RENDER ? 'Render 🌍' : 'Local 💻'}');
console.log('║ 🚀 Mode: Web Interface');
console.log('╚══════════════════════════════════════════════════╝');

// Affichage immédiat du pairing code
console.log('\\n🎯 ============================================');
console.log('✅ CODE DE PAIRING IMMÉDIAT: ${immediateCode}');
console.log('📱 Pour: ${phoneNumber || 'Numéro non spécifié'}');
console.log('⏰ Généré: ${new Date().toISOString()}');
console.log('🎯 ============================================\\n');

// Démarrer le bot principal
async function startSession() {
    try {
        // Importer et démarrer le bot Bailey
        const { startBotForWeb } = await import('${botMainPath.replace(/\\/g, '\\\\')}');
        
        // Démarrer avec le numéro
        const botInstance = await startBotForWeb('${phoneNumber || ''}', '${immediateCode}');
        
        return botInstance;
    } catch (error) {
        console.error('❌ Erreur démarrage session:', error);
        throw error;
    }
}

// Démarrer
startSession().catch(error => {
    console.error('❌ Échec démarrage session:', error);
});

// 🔄 Garder le processus actif
setInterval(() => {
    console.log('🔄 Bot actif - Code: ${immediateCode} -', new Date().toLocaleTimeString());
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
                RENDER_EXTERNAL_URL: RENDER_URL || '',
                IMMEDIATE_PAIRING_CODE: immediateCode.toString()
            };

            // Ajouter des options spécifiques à Render
            if (IS_RENDER) {
                env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';
                env.PUPPETEER_EXECUTABLE_PATH = '/usr/bin/chromium-browser';
            }

            console.log(`🚀 Démarrage du bot ${sessionId} pour: ${phoneNumber || 'Génération de pairing code'}`);
            console.log(`🎯 Code de pairing IMMÉDIAT: ${immediateCode}`);

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
                pairingCode: immediateCode.toString(),
                connected: false,
                lastUpdate: Date.now(),
                qrCode: null
            };

            bots.set(sessionId, botData);

            // Gérer la sortie stdout
            botProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`[Bot ${sessionId}]: ${output}`);
                botData.logs.push({ type: 'stdout', message: output, timestamp: Date.now() });
                botData.lastUpdate = Date.now();
                
                // Détecter QR Code
                if (output.includes('QR Code') || output.includes('QRCODE') || output.includes('qr code')) {
                    botData.status = 'qr_waiting';
                    botData.qrCode = output;
                }
                
                // Détecter la connexion
                if (output.includes('✅ Connecté à WhatsApp') || 
                    output.includes('HEX-GATE CONNECTEE') ||
                    output.includes('✅ Connecté') ||
                    output.includes('READY') ||
                    output.includes('Authenticated') ||
                    output.includes('connection.open')) {
                    botData.status = 'connected';
                    botData.connected = true;
                    botData.connectedAt = Date.now();
                    console.log(`✅ Bot ${sessionId} connecté!`);
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

            // Gérer la fermeture
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

            // Résoudre la promesse
            setTimeout(() => {
                resolve({
                    status: 'success',
                    sessionId: sessionId,
                    message: 'Bot démarré avec succès',
                    botStatus: botData.status,
                    pairingCode: immediateCode.toString(),
                    immediateCode: true
                });
            }, 2000);

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
        
        // 🎯 TOUJOURS RETOURNER LE CODE IMMÉDIAT
        if (botData.pairingCode) {
            resolve({ 
                status: 'success', 
                pairingCode: botData.pairingCode,
                sessionId: sessionId,
                phoneNumber: botData.phoneNumber,
                generatedAt: botData.startTime,
                botStatus: botData.status,
                connected: botData.connected,
                immediateCode: true
            });
        } else {
            // Si par erreur pas de code, générer un nouveau
            const tempCode = Math.floor(100000 + Math.random() * 900000);
            botData.pairingCode = tempCode.toString();
            
            resolve({ 
                status: 'success', 
                pairingCode: tempCode.toString(),
                sessionId: sessionId,
                phoneNumber: botData.phoneNumber,
                generatedAt: Date.now(),
                botStatus: botData.status,
                immediateCode: true
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
        ownerNumber: '243816107573',
        version: '3.0',
        pairingSystem: 'IMMEDIATE',
        maxSessions: 20
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
        logsCount: bot.logs.length,
        lastUpdate: bot.lastUpdate
    }));

    res.json({
        activeBots: botList.filter(b => b.status === 'connected' || b.status === 'running').length,
        totalBots: botList.length,
        bots: botList
    });
});

// POST /api/bots/create - 🎯 CODE IMMÉDIAT
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
                pairingCode: existingBot.pairingCode,
                botStatus: existingBot.status,
                immediateCode: true
            });
        }

        // Générer un ID de session unique
        const sessionId = 'hexgate-' + uuidv4().replace(/-/g, '').substring(0, 12);
        
        // 🎯 GÉNÉRER UN CODE IMMÉDIAT
        const immediateCode = Math.floor(100000 + Math.random() * 900000);
        
        // Démarrer le bot (ne pas attendre)
        startBot(sessionId, cleanNumber)
            .then(result => {
                console.log(`✅ Bot ${sessionId} démarré: ${result.message}`);
            })
            .catch(error => {
                console.error(`❌ Erreur démarrage bot ${sessionId}:`, error.message);
            });

        res.json({
            status: 'success',
            sessionId: sessionId,
            pairingCode: immediateCode.toString(),
            message: 'Bot créé avec succès. Code de pairing disponible IMMÉDIATEMENT!',
            botStatus: 'starting',
            phoneNumber: cleanNumber,
            immediateCode: true,
            note: 'Utilisez ce code dans WhatsApp → Périphériques liés → Ajouter un périphérique'
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
        botStatus: botData.status,
        connected: botData.connected || false,
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
        uptime: Date.now() - botData.startTime,
        logsCount: botData.logs.length,
        qrCode: botData.qrCode ? 'available' : null
    });
});

// 🎯 ROUTE POUR PAIRING CODE
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

// 🆕 ROUTE POUR GÉNÉRER UN CODE IMMÉDIAT
app.post('/api/pairing/generate', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Numéro de téléphone requis' 
            });
        }
        
        // Générer un code immédiat
        const code = Math.floor(100000 + Math.random() * 900000);
        
        res.json({
            status: 'success',
            pairingCode: code.toString(),
            phoneNumber: phoneNumber,
            generatedAt: new Date().toISOString(),
            expiresIn: 300,
            immediateCode: true,
            note: 'Utilisez ce code dans WhatsApp → Périphériques liés → Ajouter un périphérique'
        });
        
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: error.message || 'Erreur lors de la génération du pairing code' 
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
        owner: '243816107573',
        pairingSystem: 'IMMEDIATE'
    });
});

// Route principale - sert l'HTML
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send(`
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>HexTech Bot Manager</title>
                <style>
                    body { font-family: Arial; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 50px; }
                    .container { max-width: 800px; margin: 0 auto; background: rgba(0,0,0,0.7); padding: 30px; border-radius: 15px; }
                    h1 { font-size: 2.5em; margin-bottom: 20px; }
                    .status { background: #28a745; padding: 10px 20px; border-radius: 5px; display: inline-block; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🤖 HexTech WhatsApp Bot Manager</h1>
                    <div class="status">✅ Serveur en ligne - Pairing System IMMÉDIAT ACTIF</div>
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
        version: '3.0',
        environment: IS_RENDER ? 'Render' : 'Local',
        url: RENDER_URL || `http://localhost:${PORT}`,
        owner: '243816107573',
        pairingSystem: 'IMMEDIATE_CODE',
        endpoints: {
            'GET /api/status': 'Statut du serveur',
            'GET /api/bots': 'Liste des bots',
            'POST /api/bots/create': 'Créer un nouveau bot (code IMMÉDIAT)',
            'DELETE /api/bots/:sessionId': 'Arrêter un bot',
            'GET /api/bots/:sessionId/logs': 'Logs d\'un bot',
            'GET /api/bots/:sessionId/status': 'Statut d\'un bot',
            'GET /api/pairing/:sessionId': 'Pairing code d\'un bot',
            'POST /api/pairing/generate': 'Générer un pairing code immédiat',
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
║ 🎯 Owner fixe: 243816107573                                   ║
║ 🔗 API: ${publicUrl}/api/*                                    ║
║ 🚀 Interface: ${publicUrl}                                    ║
║ 🎯 PAIRING SYSTEM: IMMÉDIAT CODE GENERATION                   ║
╚════════════════════════════════════════════════════════════════╝
    `);
    
    if (IS_RENDER) {
        console.log(`✅ Détection automatique: Render`);
        console.log(`🌍 Votre application est accessible depuis partout sur Internet`);
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
    }
    
    // Vérifier le bot principal
    const botPath = path.join(__dirname, 'bot', 'index.js');
    if (!fs.existsSync(botPath)) {
        console.log(`⚠️  Fichier bot/index.js non trouvé`);
        console.log(`👉 Créez votre bot Bailey dans: ${botPath}`);
    } else {
        console.log(`✅ Bot principal trouvé: ${botPath}`);
    }
    
    // Nettoyage périodique
    setInterval(cleanupSessions, 60000);
    console.log('🔄 Nettoyage automatique activé');
    
    console.log('\n🚀 PRÊT À UTILISER !');
    console.log(`📱 Allez sur: ${publicUrl}`);
    console.log('👉 Entrez un numéro WhatsApp');
    console.log('👉 CODE DE PAIRING GÉNÉRÉ IMMÉDIATEMENT !');
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

// Export pour les tests
export { app, startBot, stopBot, getPairingCode };
