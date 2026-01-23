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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Stockage des sessions
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

            // Créer le fichier de session du bot
            const botFilePath = path.join(sessionPath, 'index.js');
            const botContent = `
// BOT SESSION: ${sessionId}
// PHONE: ${phoneNumber || 'AUTO'}
// GENERATED: ${new Date().toISOString()}

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

console.log('🤖 HexTech WhatsApp Bot v3.0');
console.log('📱 Numéro:', '${phoneNumber || '243816107573'}');
console.log('🔑 Session:', '${sessionId}');
console.log('🚀 Démarrage en cours...');

try {
    // Importer le bot principal
    const mainBot = await import('${botMainPath.replace(/\\/g, '\\\\')}');
    
    // Démarrer le bot selon la méthode disponible
    if (typeof mainBot.startBotForWeb === 'function') {
        await mainBot.startBotForWeb('${phoneNumber || ''}');
    } else if (typeof mainBot.default === 'function') {
        await mainBot.default('${phoneNumber || ''}');
    } else if (typeof mainBot.start === 'function') {
        await mainBot.start();
    } else {
        console.log('⚠️ Aucune méthode de démarrage trouvée, tentative standard...');
        // Tenter d'appeler directement si c'est une fonction
        if (typeof mainBot === 'function') {
            await mainBot('${phoneNumber || ''}');
        }
    }
} catch (error) {
    console.error('❌ Erreur de démarrage:', error.message);
    process.exit(1);
}
`;

            fs.writeFileSync(botFilePath, botContent);

            // Variables d'environnement
            const env = {
                ...process.env,
                SESSION_ID: sessionId,
                SESSION_PATH: sessionPath,
                PHONE_NUMBER: phoneNumber || '243816107573',
                WEB_MODE: 'true',
                NODE_ENV: 'production',
                NODE_OPTIONS: '--experimental-modules --es-module-specifier-resolution=node'
            };

            console.log(`🚀 Démarrage du bot ${sessionId} pour: ${phoneNumber || '243816107573'}`);

            // Démarrer le processus
            const botProcess = spawn('node', ['--experimental-modules', '--es-module-specifier-resolution=node', botFilePath], {
                cwd: sessionPath,
                env: env,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Stocker les données du bot
            const botData = {
                process: botProcess,
                sessionId: sessionId,
                phoneNumber: phoneNumber || '243816107573',
                status: 'starting',
                startTime: Date.now(),
                logs: [],
                pairingCode: null,
                qrCode: null,
                connected: false,
                lastUpdate: Date.now()
            };

            bots.set(sessionId, botData);

            // Gérer la sortie stdout
            botProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`[Bot ${sessionId}]: ${output}`);
                botData.logs.push({ type: 'stdout', message: output, timestamp: Date.now() });
                botData.lastUpdate = Date.now();
                
                // Détecter les pairing codes
                const pairingMatch = output.match(/Code de pairing:\s*(\d{6})/i) || 
                                     output.match(/pairing code:\s*(\d{6})/i);
                if (pairingMatch) {
                    botData.pairingCode = pairingMatch[1];
                    botData.status = 'pairing';
                    console.log(`✅ Pairing code détecté pour ${sessionId}: ${botData.pairingCode}`);
                }
                
                // Détecter les QR codes
                const qrMatch = output.match(/QR Code:\s*(.+)/i);
                if (qrMatch) {
                    botData.qrCode = qrMatch[1];
                    botData.status = 'qr_waiting';
                }
                
                // Détecter la connexion
                if (output.includes('Connecté à WhatsApp') || 
                    output.includes('HEX-GATE CONNECTEE') ||
                    output.includes('✅ Connecté') ||
                    output.includes('READY')) {
                    botData.status = 'connected';
                    botData.connected = true;
                    botData.connectedAt = Date.now();
                    console.log(`✅ Bot ${sessionId} connecté!`);
                }
                
                // Détecter les erreurs
                if (output.includes('❌') || 
                    output.includes('ERREUR') || 
                    output.includes('ERROR') ||
                    output.includes('FAILED')) {
                    if (!output.includes('✅')) {
                        botData.status = 'error';
                    }
                }
                
                // Limiter les logs à 1000 entrées
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
                
                if (error.includes('Error') || error.includes('Failed')) {
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

            // Résoudre la promesse après un court délai
            setTimeout(() => {
                botData.status = 'running';
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
                console.log(`🛑 Bot ${sessionId} arrêté`);
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

// Nettoyage périodique des sessions
function cleanupSessions() {
    const now = Date.now();
    let cleaned = 0;
    
    bots.forEach((bot, sessionId) => {
        // Nettoyer les sessions arrêtées depuis plus de 10 minutes
        if (bot.status === 'stopped' && bot.endTime && (now - bot.endTime) > 600000) {
            bots.delete(sessionId);
            cleaned++;
        }
        // Nettoyer les sessions inactives depuis plus de 30 minutes
        else if (bot.lastUpdate && (now - bot.lastUpdate) > 1800000) {
            bots.delete(sessionId);
            cleaned++;
        }
    });
    
    if (cleaned > 0) {
        console.log(`🧹 ${cleaned} sessions nettoyées`);
    }
}

// Routes API - EXACTEMENT ce que votre HTML attend

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
        url: req.protocol + '://' + req.get('host')
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

        // Nettoyer le numéro
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

        // Générer un ID de session
        const sessionId = 'hexgate-' + uuidv4().replace(/-/g, '').substring(0, 12);
        
        // Démarrer le bot (en arrière-plan)
        startBot(sessionId, cleanNumber)
            .then(result => {
                console.log(`✅ Bot ${sessionId} démarré`);
            })
            .catch(error => {
                console.error(`❌ Erreur démarrage bot ${sessionId}:`, error.message);
            });

        // Réponse immédiate (comme votre HTML l'attend)
        res.json({
            status: 'success',
            sessionId: sessionId,
            message: 'Bot créé avec succès. Le pairing code sera disponible bientôt.',
            botStatus: 'starting'
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
    
    // Formater les logs comme votre HTML l'attend
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
    
    if (!botData.pairingCode) {
        return res.json({
            status: 'pending',
            message: 'Pairing code non encore généré'
        });
    }
    
    res.json({
        status: 'success',
        pairingCode: botData.pairingCode,
        generatedAt: botData.startTime,
        expiresIn: 300
    });
});

// Route de santé
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        bots: bots.size,
        uptime: process.uptime()
    });
});

// Route principale - Votre HTML
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send(`
            <h1>Fichier HTML non trouvé</h1>
            <p>Placez votre fichier index.html dans le dossier "public/"</p>
        `);
    }
});

// Documentation API
app.get('/api/docs', (req, res) => {
    res.json({
        name: 'HexTech WhatsApp Bot API',
        version: '1.0.0',
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
    console.log(`
╔══════════════════════════════════════════════════╗
║         HEXTECH WHATSAPP BOT MANAGER            ║
╠══════════════════════════════════════════════════╣
║ 🌐 Serveur démarré sur le port: ${PORT}          ║
║ 📁 Interface: http://localhost:${PORT}           ║
║ 🤖 Dossier bot: ${path.join(__dirname, 'bot')}   ║
║ 🎯 Owner fixe: 243816107573                     ║
║ 🔗 API disponible sur /api/*                    ║
╚══════════════════════════════════════════════════╝
    `);
    
    // Afficher l'URL Render si disponible
    const renderUrl = process.env.RENDER_EXTERNAL_URL;
    if (renderUrl) {
        console.log(`🌍 URL publique: ${renderUrl}`);
    } else {
        console.log(`🌐 Accès réseau: http://0.0.0.0:${PORT}`);
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
    
    // Vérifier si votre HTML existe
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(htmlPath)) {
        console.log(`✅ Interface HTML trouvée: ${htmlPath}`);
    } else {
        console.log(`⚠️  Interface HTML non trouvée dans: ${htmlPath}`);
        console.log(`👉 Placez votre fichier HTML dans le dossier "public/"`);
    }
    
    // Vérifier le bot principal
    const botPath = path.join(__dirname, 'bot', 'index.js');
    if (!fs.existsSync(botPath)) {
        console.log(`⚠️  Fichier bot/index.js non trouvé`);
        console.log(`👉 Créez votre bot WhatsApp dans: ${botPath}`);
        
        // Créer un exemple de bot
        const exampleBot = `
// HexTech WhatsApp Bot - Exemple
// Remplacez ce code par votre bot réel

export async function startBotForWeb(phoneNumber = null) {
    console.log('🤖 HexTech WhatsApp Bot v3.0');
    console.log('📱 Numéro:', phoneNumber || '243816107573');
    console.log('🚀 Démarrage en cours...');
    
    // Simuler un pairing code (à remplacer par votre logique réelle)
    setTimeout(() => {
        const pairingCode = Math.floor(100000 + Math.random() * 900000);
        console.log('Code de pairing:', pairingCode);
    }, 2000);
    
    // Simuler la connexion
    setTimeout(() => {
        console.log('✅ Connecté à WhatsApp');
        console.log('🚀 HEX-GATE CONNECTEE');
        console.log('📊 Bot opérationnel');
    }, 5000);
    
    // Garder le bot actif
    setInterval(() => {
        console.log('🔄 Bot actif -', new Date().toLocaleTimeString());
    }, 30000);
}

// Pour tester directement: node bot/index.js
if (import.meta.url === \`file://\${process.argv[1]}\`) {
    startBotForWeb();
}
`;
        fs.writeFileSync(botPath, exampleBot);
        console.log(`✅ Exemple de bot créé: ${botPath}`);
    } else {
        console.log(`✅ Bot principal trouvé: ${botPath}`);
    }
    
    // Démarrer le nettoyage périodique
    setInterval(cleanupSessions, 60000);
    console.log('🔄 Nettoyage automatique activé (toutes les minutes)');
    
    console.log('\n✅ Serveur prêt !');
    console.log('👉 Votre interface HTML est accessible sur:');
    console.log(`   http://localhost:${PORT}`);
    console.log('\n📱 Pour créer un bot WhatsApp:');
    console.log('   1. Allez sur l\'interface web');
    console.log('   2. Entrez un numéro (ex: 243816107573)');
    console.log('   3. Cliquez sur "Générer Code WhatsApp"');
    console.log('   4. Utilisez le code pour connecter WhatsApp');
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
    console.log('\n🛑 Arrêt du serveur en cours...');
    
    // Arrêter tous les bots
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
        console.log('👋 Serveur arrêté proprement');
        process.exit(0);
    });
    
    // Timeout de sécurité
    setTimeout(() => {
        console.log('⏰ Timeout atteint, arrêt forcé');
        process.exit(1);
    }, 10000);
});

process.on('SIGINT', () => {
    console.log('\n👋 Arrêt par Ctrl+C');
    process.exit(0);
});
