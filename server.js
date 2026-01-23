const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Stockage des sessions
const sessions = new Map();
const bots = new Map();

// Fonction pour démarrer un bot
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

            // Créer un dossier de session si nécessaire
            const sessionPath = path.join(__dirname, 'sessions', sessionId);
            if (!fs.existsSync(sessionPath)) {
                fs.mkdirSync(sessionPath, { recursive: true });
            }

            // Copier le fichier index.js du bot
            const botFilePath = path.join(sessionPath, 'index.js');
            if (!fs.existsSync(botFilePath)) {
                const botSource = fs.readFileSync(path.join(__dirname, 'bot', 'index.js'), 'utf8');
                fs.writeFileSync(botFilePath, botSource);
            }

            // Variables d'environnement pour ce bot
            const env = {
                ...process.env,
                SESSION_ID: sessionId,
                SESSION_PATH: sessionPath,
                PHONE_NUMBER: phoneNumber,
                NODE_ENV: 'production',
                PORT: parseInt(PORT) + parseInt(sessionId.slice(-4)) % 1000 || 8080
            };

            // Démarrer le processus du bot
            const botProcess = spawn('node', [botFilePath], {
                cwd: sessionPath,
                env: env,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Stocker les données du bot
            const botData = {
                process: botProcess,
                sessionId: sessionId,
                phoneNumber: phoneNumber,
                status: 'starting',
                startTime: Date.now(),
                logs: [],
                pairingCode: null,
                qrCode: null
            };

            bots.set(sessionId, botData);

            // Gérer la sortie du bot
            botProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`[Bot ${sessionId}]: ${output}`);
                botData.logs.push({ type: 'stdout', message: output, timestamp: Date.now() });
                
                // Détecter les QR codes et pairing codes
                if (output.includes('Code de pairing:')) {
                    const codeMatch = output.match(/Code de pairing:\s*(\d+)/);
                    if (codeMatch) {
                        botData.pairingCode = codeMatch[1];
                        console.log(`✅ Pairing code détecté pour ${sessionId}: ${botData.pairingCode}`);
                    }
                }
                
                if (output.includes('QR Code:')) {
                    const qrMatch = output.match(/QR Code:\s*(.+)/);
                    if (qrMatch) {
                        botData.qrCode = qrMatch[1];
                    }
                }
                
                // Détecter si le bot est connecté
                if (output.includes('Connecté à WhatsApp')) {
                    botData.status = 'connected';
                    botData.connectedAt = Date.now();
                    console.log(`✅ Bot ${sessionId} connecté avec succès`);
                }
            });

            botProcess.stderr.on('data', (data) => {
                const error = data.toString();
                console.error(`[Bot ${sessionId} ERROR]: ${error}`);
                botData.logs.push({ type: 'stderr', message: error, timestamp: Date.now() });
                
                if (error.includes('Déconnecté') || error.includes('Erreur')) {
                    botData.status = 'error';
                }
            });

            botProcess.on('close', (code) => {
                console.log(`[Bot ${sessionId}] Processus terminé avec code: ${code}`);
                botData.status = 'stopped';
                botData.endTime = Date.now();
                
                // Nettoyer après 5 minutes
                setTimeout(() => {
                    if (bots.has(sessionId)) {
                        bots.delete(sessionId);
                    }
                }, 300000);
            });

            // Attendre que le bot démarre
            setTimeout(() => {
                botData.status = 'running';
                resolve({
                    status: 'success',
                    sessionId: sessionId,
                    message: 'Bot démarré avec succès',
                    pairingCode: botData.pairingCode
                });
            }, 3000);

        } catch (error) {
            console.error('Erreur démarrage bot:', error);
            reject({ status: 'error', message: error.message });
        }
    });
}

// Fonction pour arrêter un bot
function stopBot(sessionId) {
    return new Promise((resolve, reject) => {
        if (!bots.has(sessionId)) {
            return reject({ status: 'error', message: 'Bot non trouvé' });
        }

        const botData = bots.get(sessionId);
        
        try {
            if (botData.process && !botData.process.killed) {
                botData.process.kill('SIGTERM');
            }
            
            bots.delete(sessionId);
            resolve({ status: 'success', message: 'Bot arrêté avec succès' });
            
        } catch (error) {
            reject({ status: 'error', message: error.message });
        }
    });
}

// Routes API
app.get('/api/status', (req, res) => {
    const activeBots = Array.from(bots.values()).filter(bot => 
        bot.status === 'running' || bot.status === 'connected'
    ).length;

    res.json({
        whatsapp: 'active',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        activeBots: activeBots,
        totalSessions: bots.size,
        serverTime: new Date().toISOString()
    });
});

app.get('/api/bots', (req, res) => {
    const botList = Array.from(bots.values()).map(bot => ({
        sessionId: bot.sessionId,
        status: bot.status,
        phoneNumber: bot.phoneNumber,
        startTime: bot.startTime,
        uptime: bot.startTime ? Date.now() - bot.startTime : 0,
        pairingCode: bot.pairingCode,
        connected: bot.status === 'connected'
    }));

    res.json({
        activeBots: botList.filter(b => b.status === 'connected' || b.status === 'running').length,
        totalBots: botList.length,
        bots: botList
    });
});

app.post('/api/bots/create', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Numéro de téléphone requis' 
            });
        }

        // Nettoyer le numéro de téléphone
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        if (cleanNumber.length < 8) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Numéro de téléphone invalide' 
            });
        }

        // Générer un ID de session unique
        const sessionId = uuidv4().replace(/-/g, '').substring(0, 12);
        
        // Démarrer le bot
        const result = await startBot(sessionId, cleanNumber);
        
        // Attendre un peu pour récupérer le pairing code
        setTimeout(() => {
            const botData = bots.get(sessionId);
            res.json({
                status: 'success',
                sessionId: sessionId,
                pairingCode: botData?.pairingCode || null,
                message: 'Bot créé avec succès. Vérifiez la console pour le pairing code.',
                botStatus: botData?.status || 'starting'
            });
        }, 5000);

    } catch (error) {
        console.error('Erreur création bot:', error);
        res.status(500).json({ 
            status: 'error', 
            message: error.message || 'Erreur lors de la création du bot' 
        });
    }
});

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

app.get('/api/bots/:sessionId/logs', (req, res) => {
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
        logs: botData.logs.slice(-50), // Derniers 50 logs
        totalLogs: botData.logs.length
    });
});

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour les sessions
app.get('/sessions', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sessions.html'));
});

// Démarrer le serveur
const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`🚀 Serveur HexTech démarré sur le port ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🤖 Dossier bot: ${path.join(__dirname, 'bot')}`);
    console.log(`📁 Dossier sessions: ${path.join(__dirname, 'sessions')}`);
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
    console.log('🛑 Arrêt du serveur...');
    
    // Arrêter tous les bots
    bots.forEach((bot, sessionId) => {
        try {
            if (bot.process && !bot.process.killed) {
                bot.process.kill('SIGTERM');
            }
        } catch (error) {
            console.error(`Erreur arrêt bot ${sessionId}:`, error);
        }
    });
    
    server.close(() => {
        console.log('✅ Serveur arrêté proprement');
        process.exit(0);
    });
});

module.exports = { app, startBot, stopBot, bots };
