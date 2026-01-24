// server.js - VERSION SIMPLIFIÉE AVEC ENVOI NUMÉRO
// Le serveur NE GÉNÈRE PAS de pairing code, il orchestre seulement le bot

import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// Configuration ES6 pour __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Stockage des sessions
const bots = new Map();

// ============================================
// 📱 DÉMARRER UN BOT
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
                        message: 'Bot déjà en cours',
                        sessionId 
                    });
                }
            }

            // Créer un dossier de session
            const sessionPath = path.join(__dirname, 'sessions', sessionId);
            if (!fs.existsSync(sessionPath)) {
                fs.mkdirSync(sessionPath, { recursive: true });
            }

            console.log(`🚀 Démarrage bot ${sessionId} pour: ${phoneNumber || 'pairing'}`);

            // Variables d'environnement pour le bot
            const env = {
                ...process.env,
                SESSION_ID: sessionId,
                SESSION_PATH: sessionPath,
                PHONE_NUMBER: phoneNumber || ''
            };

            // Vérifier si le bot principal existe
            const botMainPath = path.join(__dirname, 'bot', 'index.js');
            if (!fs.existsSync(botMainPath)) {
                return reject({ 
                    status: 'error', 
                    message: 'Fichier bot/index.js non trouvé' 
                });
            }

            // Démarrer le bot
            const botProcess = spawn('node', [botMainPath], {
                cwd: __dirname,
                env: env,
                stdio: ['pipe', 'pipe', 'pipe'],
                detached: false
            });

            // Stocker les données du bot
            const botData = {
                process: botProcess,
                sessionId: sessionId,
                phoneNumber: phoneNumber || 'pairing',
                status: 'starting',
                startTime: Date.now(),
                logs: [],
                pairingCode: null,
                connected: false,
                lastUpdate: Date.now()
            };

            bots.set(sessionId, botData);

            // Gérer la sortie du bot
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
                
                // Détecter le pairing code
                const pairingMatch = output.match(/CODE DE PAIRING.*?([A-Z0-9]{4}[-][A-Z0-9]{4})/i);
                if (pairingMatch && pairingMatch[1]) {
                    botData.pairingCode = pairingMatch[1];
                    botData.status = 'pairing';
                }
                
                // Détecter la connexion
                if (output.includes('CONNECTÉ') || output.includes('Authenticated')) {
                    botData.status = 'connected';
                    botData.connected = true;
                }
                
                // Limiter les logs
                if (botData.logs.length > 100) {
                    botData.logs = botData.logs.slice(-50);
                }
            });

            // Gérer les erreurs
            botProcess.stderr.on('data', (data) => {
                const error = data.toString();
                console.error(`[Bot ${sessionId} ERROR]: ${error}`);
                botData.logs.push({ 
                    type: 'stderr', 
                    message: error, 
                    timestamp: Date.now() 
                });
            });

            // Gérer la fermeture
            botProcess.on('close', (code) => {
                console.log(`[Bot ${sessionId}] Arrêté avec code: ${code}`);
                botData.status = 'stopped';
                botData.connected = false;
                botData.endTime = Date.now();
                
                // Nettoyer après 5 minutes
                setTimeout(() => {
                    if (bots.has(sessionId)) {
                        bots.delete(sessionId);
                    }
                }, 300000);
            });

            // Gérer les erreurs de processus
            botProcess.on('error', (err) => {
                console.error(`[Bot ${sessionId} PROCESS ERROR]: ${err.message}`);
                botData.status = 'error';
                
                if (!botData.codeResolved) {
                    reject({ 
                        status: 'error', 
                        message: `Erreur processus: ${err.message}` 
                    });
                }
            });

            // Timeout après 60 secondes
            setTimeout(() => {
                if (botData.pairingCode) {
                    resolve({
                        status: 'success',
                        sessionId: sessionId,
                        message: 'Code généré',
                        pairingCode: botData.pairingCode,
                        phoneNumber: phoneNumber
                    });
                } else {
                    resolve({
                        status: 'timeout',
                        sessionId: sessionId,
                        message: 'Timeout: Attente du code'
                    });
                }
            }, 60000);

            resolve({
                status: 'started',
                sessionId: sessionId,
                message: 'Bot démarré'
            });

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
// 🔧 FONCTION POUR ENVOYER UN NUMÉRO AU BOT
// ============================================
function sendPhoneNumberToBot(sessionId, phoneNumber) {
    return new Promise((resolve, reject) => {
        if (!bots.has(sessionId)) {
            return reject({ 
                status: 'error', 
                message: 'Bot non trouvé' 
            });
        }

        const botData = bots.get(sessionId);
        
        if (!botData.process || botData.process.killed) {
            return reject({ 
                status: 'error', 
                message: 'Bot non en cours d\'exécution' 
            });
        }

        // Nettoyer le numéro
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        if (cleanNumber.length < 8) {
            return reject({ 
                status: 'error', 
                message: 'Numéro invalide (minimum 8 chiffres)' 
            });
        }

        try {
            // Envoyer le numéro via stdin du bot
            if (botData.process.stdin.writable) {
                const message = `PHONE_NUMBER_INPUT:${cleanNumber}\n`;
                botData.process.stdin.write(message);
                
                console.log(`📤 Numéro envoyé au bot ${sessionId}: ${cleanNumber}`);
                
                // Mettre à jour le numéro
                botData.phoneNumber = cleanNumber;
                botData.lastUpdate = Date.now();
                
                // Ajouter un log
                botData.logs.push({
                    type: 'stdin',
                    message: `Numéro envoyé: ${cleanNumber}`,
                    timestamp: Date.now()
                });
                
                resolve({
                    status: 'success',
                    message: 'Numéro envoyé au bot',
                    sessionId: sessionId,
                    phoneNumber: cleanNumber
                });
            } else {
                reject({ 
                    status: 'error', 
                    message: 'Impossible d\'écrire dans stdin du bot' 
                });
            }
        } catch (error) {
            console.error('Erreur envoi numéro:', error);
            reject({ 
                status: 'error', 
                message: `Erreur: ${error.message}` 
            });
        }
    });
}

// ============================================
// 🔧 FONCTIONS UTILITAIRES
// ============================================

// Arrêter un bot
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
                message: 'Bot arrêté',
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

// Nettoyage automatique
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

    res.json({
        status: 'online',
        activeBots: activeBots,
        totalSessions: bots.size,
        platform: 'HexTech Bot Manager',
        version: '1.0',
        features: {
            phoneInputFromLogs: true
        }
    });
});

// GET /api/bots
app.get('/api/bots', (req, res) => {
    const botList = Array.from(bots.values()).map(bot => ({
        sessionId: bot.sessionId,
        status: bot.status,
        phoneNumber: bot.phoneNumber,
        pairingCode: bot.pairingCode,
        connected: bot.connected || false,
        logsCount: bot.logs.length
    }));

    res.json({
        activeBots: botList.filter(b => 
            b.status === 'connected' || b.status === 'running' || b.status === 'pairing'
        ).length,
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
                message: 'Numéro requis' 
            });
        }

        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        if (cleanNumber.length < 8) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Numéro invalide' 
            });
        }

        // Vérifier si existe déjà
        const existingBot = Array.from(bots.values()).find(bot => 
            bot.phoneNumber === cleanNumber && 
            (bot.status === 'running' || bot.status === 'connected' || bot.status === 'pairing')
        );
        
        if (existingBot) {
            return res.json({
                status: 'exists',
                sessionId: existingBot.sessionId,
                pairingCode: existingBot.pairingCode
            });
        }

        // Créer nouvelle session
        const sessionId = 'bot-' + uuidv4().replace(/-/g, '').substring(0, 8);
        
        console.log(`📱 Création bot: ${cleanNumber}`);
        
        // Démarrer le bot
        const result = await startBot(sessionId, cleanNumber);
        
        res.json({
            status: 'success',
            sessionId: sessionId,
            message: 'Bot démarré',
            phoneNumber: cleanNumber
        });

    } catch (error) {
        console.error('Erreur création bot:', error);
        res.status(500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
});

// NOUVELLE ROUTE : Envoyer un numéro depuis les logs
app.post('/api/bots/:sessionId/send-phone', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Numéro requis' 
            });
        }
        
        console.log(`📤 Envoi numéro à ${sessionId}: ${phoneNumber}`);
        
        const result = await sendPhoneNumberToBot(sessionId, phoneNumber);
        
        res.json({
            status: 'success',
            message: result.message,
            sessionId: sessionId,
            phoneNumber: result.phoneNumber,
            note: 'Le numéro a été envoyé au bot via stdin'
        });
        
    } catch (error) {
        console.error('Erreur envoi numéro:', error);
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
        .slice(-50)
        .map(log => `${new Date(log.timestamp).toISOString()}: ${log.message.trim()}`);
    
    res.json({
        status: 'success',
        logs: recentLogs,
        sessionId: sessionId,
        pairingCode: botData.pairingCode || 'En attente',
        supportsPhoneInput: true
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
        supportsPhoneInput: true
    });
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

// GET /api/pairing/:sessionId
app.get('/api/pairing/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const botData = bots.get(sessionId);
    
    if (!botData) {
        return res.status(404).json({ 
            status: 'error', 
            message: 'Bot non trouvé' 
        });
    }
    
    if (botData.pairingCode) {
        res.json({ 
            status: 'success', 
            pairingCode: botData.pairingCode,
            sessionId: sessionId
        });
    } else {
        res.json({ 
            status: 'waiting', 
            message: 'Code en attente',
            sessionId: sessionId
        });
    }
});

// Route principale - sert l'HTML
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send(`
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <title>HexTech Bot Manager</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        background: #0f172a; 
                        color: white; 
                        text-align: center; 
                        padding: 50px; 
                    }
                    .container { 
                        max-width: 600px; 
                        margin: 0 auto; 
                        background: #1e293b; 
                        padding: 30px; 
                        border-radius: 10px; 
                    }
                    h1 { 
                        color: #6366f1; 
                        margin-bottom: 20px; 
                    }
                    .status { 
                        background: #10b981; 
                        padding: 10px 20px; 
                        border-radius: 5px; 
                        display: inline-block; 
                        margin: 20px 0; 
                    }
                    .feature {
                        background: #3b82f6;
                        padding: 15px;
                        border-radius: 5px;
                        margin: 15px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🤖 HexTech WhatsApp Bot Manager</h1>
                    <div class="status">✅ Serveur en ligne</div>
                    
                    <div class="feature">
                        <h3>✨ Fonctionnalité active ✨</h3>
                        <p><strong>Envoi de numéro depuis les logs</strong></p>
                        <p>Ouvrez les logs d'un bot et utilisez le champ pour envoyer un numéro</p>
                    </div>
                    
                    <p>Interface HTML non trouvée dans public/index.html</p>
                    <p>API disponible sur /api/*</p>
                </div>
            </body>
            </html>
        `);
    }
});

// Route de santé
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        features: {
            phoneInputFromLogs: true
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route non trouvée',
        availableRoutes: [
            'GET /api/status',
            'GET /api/bots',
            'POST /api/bots/create',
            'POST /api/bots/:id/send-phone',
            'GET /api/bots/:id/logs',
            'GET /api/health'
        ]
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err);
    res.status(500).json({
        status: 'error',
        message: 'Erreur interne'
    });
});

// ============================================
// 🚀 DÉMARRAGE DU SERVEUR
// ============================================
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════╗
║       HexTech Bot Manager               ║
╠══════════════════════════════════════════╣
║ 🌐 URL: http://localhost:${PORT}        ║
║ 📁 Port: ${PORT}                        ║
║ 🎯 Rôle: Orchestrateur seulement        ║
║ ✨ Envoi numéro depuis logs: ✅         ║
╚══════════════════════════════════════════╝
    `);
    
    // Créer les dossiers
    const dirs = [
        path.join(__dirname, 'public'),
        path.join(__dirname, 'sessions'),
        path.join(__dirname, 'bot')
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
    
    // Nettoyage périodique
    setInterval(cleanupSessions, 60000);
    
    console.log('\n🚀 Serveur prêt !');
    console.log('📤 Route pour envoyer numéro: POST /api/bots/:id/send-phone');
});

// Gestion arrêt
function shutdown() {
    console.log('\n🛑 Arrêt du serveur...');
    
    bots.forEach((bot) => {
        if (bot.process && !bot.process.killed) {
            bot.process.kill('SIGTERM');
        }
    });
    
    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
