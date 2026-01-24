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
                // Forcer le mode pairing code
                FORCE_PAIRING_MODE: 'true',
                DISABLE_QR: 'true'
            };

            // Ajouter des options spécifiques à Render
            if (IS_RENDER) {
                env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';
                env.PUPPETEER_EXECUTABLE_PATH = '/usr/bin/chromium-browser';
            }

            console.log(`🚀 Démarrage du bot ${sessionId} pour: ${phoneNumber || 'Génération de pairing code'}`);

            // 🎯 MODIFICATION IMPORTANTE : DÉMARRER LE BOT AVEC LES VARIABLES D'ENVIRONNEMENT CORRECTES
            const botProcess = spawn('node', [
                '--experimental-modules',
                '--es-module-specifier-resolution=node',
                botMainPath  // Démarrer directement ton bot existant
            ], {
                cwd: __dirname,  // Exécuter depuis la racine pour que le bot trouve ses fichiers
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
                pairingCode: null,  // Sera mis à jour quand le bot le générera
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
                
                // 🎯 DÉTECTER LE PAIRING CODE GÉNÉRÉ PAR TON BOT
                const pairingMatch = output.match(/Code de pairing: (\w+)/i) || 
                                    output.match(/pairing code: (\w+)/i) ||
                                    output.match(/✅ Code de pairing: (\w+)/i);
                
                if (pairingMatch && pairingMatch[1]) {
                    botData.pairingCode = pairingMatch[1];
                    botData.status = 'pairing';
                    console.log(`🎯 Pairing code détecté pour ${sessionId}: ${pairingMatch[1]}`);
                    
                    // Envoyer un événement pour mettre à jour l'interface
                    if (global.io) {
                        global.io.emit('pairingCode', {
                            sessionId: sessionId,
                            pairingCode: pairingMatch[1],
                            phoneNumber: botData.phoneNumber
                        });
                    }
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

            // Attendre que le bot génère le pairing code
            const waitForPairingCode = () => {
                return new Promise((resolve) => {
                    let attempts = 0;
                    const maxAttempts = 30; // Attendre 30 secondes max
                    
                    const checkInterval = setInterval(() => {
                        if (botData.pairingCode) {
                            clearInterval(checkInterval);
                            resolve(botData.pairingCode);
                        } else if (attempts >= maxAttempts) {
                            clearInterval(checkInterval);
                            resolve(null);
                        }
                        attempts++;
                    }, 1000);
                });
            };

            // Attendre le pairing code
            waitForPairingCode().then((code) => {
                resolve({
                    status: code ? 'success' : 'waiting',
                    sessionId: sessionId,
                    message: code ? 'Bot démarré avec succès' : 'En attente du pairing code...',
                    botStatus: botData.status,
                    pairingCode: code,
                    phoneNumber: phoneNumber
                });
            });

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
        
        if (botData.pairingCode) {
            resolve({ 
                status: 'success', 
                pairingCode: botData.pairingCode,
                sessionId: sessionId,
                phoneNumber: botData.phoneNumber,
                generatedAt: botData.startTime,
                botStatus: botData.status,
                connected: botData.connected || false
            });
        } else {
            // Si pas encore de code, attendre
            setTimeout(() => {
                if (botData.pairingCode) {
                    resolve({ 
                        status: 'success', 
                        pairingCode: botData.pairingCode,
                        sessionId: sessionId,
                        phoneNumber: botData.phoneNumber,
                        generatedAt: Date.now(),
                        botStatus: botData.status
                    });
                } else {
                    resolve({ 
                        status: 'waiting', 
                        message: 'En attente du pairing code...',
                        sessionId: sessionId
                    });
                }
            }, 2000);
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
        pairingSystem: 'BAILEYS_PAIRING_CODE',
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
                pairingCode: existingBot.pairingCode,
                botStatus: existingBot.status
            });
        }

        // Générer un ID de session unique
        const sessionId = 'hexgate-' + uuidv4().replace(/-/g, '').substring(0, 12);
        
        // Démarrer le bot
        const result = await startBot(sessionId, cleanNumber);
        
        res.json({
            status: result.status,
            sessionId: sessionId,
            message: result.message,
            botStatus: result.botStatus,
            pairingCode: result.pairingCode,
            phoneNumber: cleanNumber,
            note: 'Le pairing code sera disponible dans quelques secondes'
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

// ROUTE POUR PAIRING CODE
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
        owner: '243816107573',
        pairingSystem: 'BAILEYS_PAIRING_CODE'
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
                    <div class="status">✅ Serveur en ligne - Système BAILEYS PAIRING ACTIF</div>
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
        pairingSystem: 'BAILEYS_PAIRING_CODE',
        endpoints: {
            'GET /api/status': 'Statut du serveur',
            'GET /api/bots': 'Liste des bots',
            'POST /api/bots/create': 'Créer un nouveau bot (pairing code)',
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
║ 🎯 Owner fixe: 243816107573                                   ║
║ 🔗 API: ${publicUrl}/api/*                                    ║
║ 🚀 Interface: ${publicUrl}                                    ║
║ 🎯 PAIRING SYSTEM: BAILEYS (ton index.js)                     ║
╚════════════════════════════════════════════════════════════════╝
    `);
    
    if (IS_RENDER) {
        console.log(`✅ Détection automatique: Render`);
        console.log(`🌍 Votre application est accessible depuis partout sur Internet`);
    }
    
    // Créer les dossiers nécessaires
    const dirs = [
        path.join(__dirname, 'public'),
        path.join(__dirname, 'sessions')
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
        console.log(`🎯 Utilisation du système de pairing code intégré au bot`);
    }
    
    // Nettoyage périodique
    setInterval(cleanupSessions, 60000);
    console.log('🔄 Nettoyage automatique activé');
    
    console.log('\n🚀 PRÊT À UTILISER !');
    console.log(`📱 Allez sur: ${publicUrl}`);
    console.log('👉 Entrez un numéro WhatsApp');
    console.log('👉 LE BOT GÉNÈRE SON PAIRING CODE DIRECTEMENT !');
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
