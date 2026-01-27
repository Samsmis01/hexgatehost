// server.js - VERSION PROFESSIONNELLE POUR HEXTECH BOT MANAGER
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { createRequire } from 'module';
import { promisify } from 'util';
import WebSocket from 'ws';

const require = createRequire(import.meta.url);
const execAsync = promisify(require('child_process').exec);

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
// Stockage des connexions WebSocket
const wsConnections = new Map();

// ============================================
// 📱 FONCTION POUR VÉRIFIER ET INSTALLER LES DÉPENDANCES
// ============================================
async function checkAndInstallDependencies() {
    console.log('🔍 Vérification des dépendances du bot...');
    
    try {
        // Vérifier si le dossier bot existe
        const botDir = path.join(__dirname, 'bot');
        if (!fs.existsSync(botDir)) {
            fs.mkdirSync(botDir, { recursive: true });
            console.log('✅ Dossier bot créé');
        }

        // Vérifier si le bot existe
        const botMainPath = path.join(botDir, 'index.js');
        if (!fs.existsSync(botMainPath)) {
            console.log('❌ Fichier bot/index.js non trouvé');
            return false;
        }

        // Créer un package.json pour le bot
        const packageJsonPath = path.join(botDir, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            const packageJson = {
                name: 'whatsapp-bot',
                version: '1.0.0',
                type: 'module',
                dependencies: {
                    "@whiskeysockets/baileys": "^6.5.0",
                    "pino": "^8.19.0"
                }
            };
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log('📄 package.json créé pour le bot');
        }

        // Vérifier si node_modules existe
        const nodeModulesPath = path.join(botDir, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
            console.log('📦 Installation des dépendances du bot...');
            try {
                await execAsync('npm install', { cwd: botDir });
                console.log('✅ Dépendances installées avec succès');
            } catch (installError) {
                console.log('⚠️ Erreur installation npm, tentative alternative...');
                // Installation individuelle
                await execAsync('npm install @whiskeysockets/baileys@^6.5.0 pino@^8.19.0', { cwd: botDir });
                console.log('✅ Dépendances principales installées');
            }
        } else {
            console.log('✅ Dépendances déjà présentes');
        }

        return true;
    } catch (error) {
        console.error('❌ Erreur vérification dépendances:', error);
        return false;
    }
}

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

            // Vérifier et installer les dépendances
            const depsReady = await checkAndInstallDependencies();
            if (!depsReady) {
                return reject({ 
                    status: 'error', 
                    message: 'Erreur d\'installation des dépendances' 
                });
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
                PHONE_NUMBER: phoneNumber || '',
                WEB_MODE: 'true',
                IS_RENDER: IS_RENDER ? 'true' : 'false',
                NODE_ENV: 'production',
                FORCE_PAIRING_MODE: 'true',
                DISABLE_QR: 'true'
            };

            // Ajouter des options spécifiques à Render
            if (IS_RENDER) {
                env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';
                env.PUPPETEER_EXECUTABLE_PATH = '/usr/bin/chromium-browser';
            }

            // Vérifier si le bot existe
            const botMainPath = path.join(__dirname, 'bot', 'index.js');
            if (!fs.existsSync(botMainPath)) {
                return reject({ 
                    status: 'error', 
                    message: 'Fichier bot/index.js non trouvé. Créez votre bot d\'abord.' 
                });
            }

            // Lire le contenu actuel du bot
            let botContent = fs.readFileSync(botMainPath, 'utf8');
            
            // Vérifier si c'est un bot ES Module
            const isESModule = botContent.includes('import ') || 
                               botContent.includes('export ') ||
                               (fs.existsSync(path.join(__dirname, 'bot', 'package.json')) && 
                                require(path.join(__dirname, 'bot', 'package.json')).type === 'module');

            console.log(`📝 Type de bot: ${isESModule ? 'ES Module' : 'CommonJS'}`);

            // 🎯 DÉMARRER LE BOT DIRECTEMENT
            const nodeArgs = isESModule ? [
                '--experimental-modules',
                '--es-module-specifier-resolution=node'
            ] : [];

            const botProcess = spawn('node', [
                ...nodeArgs,
                botMainPath
            ], {
                cwd: path.join(__dirname, 'bot'),
                env: env,
                stdio: ['pipe', 'pipe', 'pipe'],
                detached: false
            });

            // Stocker les données du bot
            const botData = {
                process: botProcess,
                sessionId: sessionId,
                phoneNumber: phoneNumber || '',
                status: 'starting',
                startTime: Date.now(),
                logs: [],
                pairingCode: null,
                connected: false,
                lastUpdate: Date.now(),
                codeResolved: false,
                pairingAttempted: false,
                pairingCodeGenerated: false,
                connectionStatus: 'disconnected'
            };

            bots.set(sessionId, botData);

            // Gérer la sortie stdout
            botProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`[Bot ${sessionId}]: ${output}`);
                
                // Stocker le log
                const logEntry = { 
                    type: 'stdout', 
                    message: output, 
                    timestamp: Date.now() 
                };
                botData.logs.push(logEntry);
                botData.lastUpdate = Date.now();
                
                // Envoyer le log via WebSocket
                broadcastLog(sessionId, logEntry);
                
                // 🎯 DÉTECTION SPÉCIFIQUE DU PAIRING CODE
                let pairingCode = null;
                
                // Formats de détection améliorés
                const formats = [
                    /🎯🎯🎯 CODE DE PAIRING GÉNÉRÉ: ([A-Z0-9]{4}[-][A-Z0-9]{4}) 🎯🎯🎯/i,
                    /CODE DE PAIRING.*?([A-Z0-9]{4}[-][A-Z0-9]{4})/i,
                    /Pairing code.*?([A-Z0-9]{4}[-][A-Z0-9]{4})/i,
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
                        botData.pairingCodeGenerated = true;
                        botData.status = 'pairing';
                        botData.connectionStatus = 'pairing_code_generated';
                        console.log(`🎯 PAIRING CODE DÉTECTÉ pour ${sessionId}: ${cleanCode}`);
                        
                        // Envoyer le code via WebSocket
                        broadcastPairingCode(sessionId, cleanCode);
                        
                        if (!botData.codeResolved) {
                            botData.codeResolved = true;
                            resolve({
                                status: 'success',
                                sessionId: sessionId,
                                message: '✅ Code de pairing généré avec succès!',
                                pairingCode: cleanCode,
                                phoneNumber: phoneNumber,
                                immediateCode: true
                            });
                        }
                    }
                }
                
                // Détecter la connexion réussie
                if (output.includes('✅ Connecté à WhatsApp!') || 
                    output.includes('Authenticated') ||
                    output.includes('connection === "open"') ||
                    output.includes('connection update open')) {
                    botData.status = 'connected';
                    botData.connected = true;
                    botData.connectionStatus = 'connected';
                    botData.connectedAt = Date.now();
                    console.log(`✅ Bot ${sessionId} connecté à WhatsApp!`);
                    
                    // Envoyer la mise à jour via WebSocket
                    broadcastBotUpdate(sessionId);
                }
                
                // Détecter que le bot tente de générer un pairing code
                if (output.includes('Génération pairing code') ||
                    output.includes('pairing code') ||
                    output.includes('requestPairingCode')) {
                    botData.pairingAttempted = true;
                    botData.connectionStatus = 'generating_pairing_code';
                    broadcastBotUpdate(sessionId);
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
                
                const logEntry = { 
                    type: 'stderr', 
                    message: error, 
                    timestamp: Date.now() 
                };
                botData.logs.push(logEntry);
                botData.lastUpdate = Date.now();
                
                // Envoyer l'erreur via WebSocket
                broadcastLog(sessionId, logEntry);
                
                // Détecter les erreurs critiques
                if (error.includes('ERR_MODULE_NOT_FOUND') ||
                    error.includes('Cannot find module') ||
                    error.includes('Error: Cannot find')) {
                    botData.status = 'error';
                    botData.connectionStatus = 'error';
                    botData.error = error;
                    
                    console.error(`❌ Erreur de module pour ${sessionId}: ${error.substring(0, 200)}`);
                    
                    if (!botData.codeResolved) {
                        botData.codeResolved = true;
                        reject({ 
                            status: 'error', 
                            message: 'Erreur de dépendances dans le bot.',
                            details: error.substring(0, 200)
                        });
                    }
                    
                    broadcastBotUpdate(sessionId);
                }
            });

            // Gérer la fermeture du processus
            botProcess.on('close', (code) => {
                console.log(`[Bot ${sessionId}] Arrêté avec code: ${code}`);
                botData.status = 'stopped';
                botData.connected = false;
                botData.connectionStatus = 'stopped';
                botData.endTime = Date.now();
                
                // Envoyer la mise à jour via WebSocket
                broadcastBotUpdate(sessionId);
                
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
                botData.connectionStatus = 'error';
                botData.logs.push({ 
                    type: 'error', 
                    message: `Process error: ${err.message}`, 
                    timestamp: Date.now() 
                });
                
                // Envoyer l'erreur via WebSocket
                broadcastLog(sessionId, { type: 'error', message: err.message });
                broadcastBotUpdate(sessionId);
                
                if (!botData.codeResolved) {
                    botData.codeResolved = true;
                    reject({ 
                        status: 'error', 
                        message: `Erreur processus: ${err.message}` 
                    });
                }
            });

            // Timeout après 60 secondes
            setTimeout(() => {
                if (!botData.codeResolved && !botData.pairingCode) {
                    console.log(`⏰ Timeout pour ${sessionId} - Aucun code généré`);
                    botData.codeResolved = true;
                    
                    // Vérifier si le bot a démarré correctement
                    if (botData.status === 'starting' || botData.status === 'error') {
                        resolve({
                            status: 'error',
                            sessionId: sessionId,
                            message: 'Erreur: Le bot n\'a pas démarré correctement',
                            pairingCode: null,
                            phoneNumber: phoneNumber,
                            botStatus: botData.status
                        });
                    } else {
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
                }
            }, 60000);

        } catch (error) {
            console.error('Erreur démarrage bot:', error);
            reject({ 
                status: 'error', 
                message: error.message || 'Erreur inconnue lors du démarrage du bot' 
            });
        }
    });
}

// ============================================
// 🔧 FONCTIONS UTILITAIRES
// ============================================

// Diffuser les logs via WebSocket
function broadcastLog(sessionId, logEntry) {
    const connections = wsConnections.get(sessionId) || [];
    connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'log',
                data: logEntry,
                sessionId: sessionId
            }));
        }
    });
}

// Diffuser le code de pairing via WebSocket
function broadcastPairingCode(sessionId, pairingCode) {
    const connections = wsConnections.get(sessionId) || [];
    connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'pairing_code',
                pairingCode: pairingCode,
                sessionId: sessionId,
                timestamp: Date.now()
            }));
        }
    });
}

// Diffuser les mises à jour du bot via WebSocket
function broadcastBotUpdate(sessionId) {
    const botData = bots.get(sessionId);
    if (!botData) return;
    
    const connections = wsConnections.get(sessionId) || [];
    connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'bot_update',
                sessionId: sessionId,
                status: botData.status,
                connectionStatus: botData.connectionStatus,
                phoneNumber: botData.phoneNumber,
                pairingCode: botData.pairingCode,
                connected: botData.connected,
                uptime: Date.now() - botData.startTime
            }));
        }
    });
}

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
            botData.connectionStatus = 'stopped';
            botData.endTime = Date.now();
            
            // Envoyer la mise à jour via WebSocket
            broadcastBotUpdate(sessionId);
            
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
                connected: botData.connected || false,
                connectionStatus: botData.connectionStatus
            });
        } else {
            // Vérifier périodiquement pendant 30 secondes
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                if (botData.pairingCode) {
                    clearInterval(checkInterval);
                    resolve({ 
                        status: 'success', 
                        pairingCode: botData.pairingCode,
                        sessionId: sessionId,
                        phoneNumber: botData.phoneNumber
                    });
                } else if (Date.now() - startTime > 30000) {
                    clearInterval(checkInterval);
                    resolve({ 
                        status: 'error', 
                        message: 'Timeout: Pairing code non généré',
                        sessionId: sessionId
                    });
                }
            }, 1000);
        }
    });
}

async function sendPhoneNumberToBot(sessionId, phoneNumber) {
    return new Promise((resolve, reject) => {
        if (!bots.has(sessionId)) {
            return reject({ 
                status: 'error', 
                message: 'Bot non trouvé' 
            });
        }

        const botData = bots.get(sessionId);
        
        try {
            // Mettre à jour le numéro
            botData.phoneNumber = phoneNumber;
            
            // Envoyer le numéro au processus bot via stdin
            if (botData.process && botData.process.stdin.writable) {
                botData.process.stdin.write(`PHONE_NUMBER_INPUT:${phoneNumber}\n`);
                
                // Ajouter un log
                const logEntry = {
                    type: 'info',
                    message: `Numéro envoyé au bot: ${phoneNumber}`,
                    timestamp: Date.now()
                };
                botData.logs.push(logEntry);
                broadcastLog(sessionId, logEntry);
                
                resolve({
                    status: 'success',
                    message: 'Numéro envoyé avec succès au bot',
                    sessionId: sessionId,
                    phoneNumber: phoneNumber
                });
            } else {
                reject({
                    status: 'error',
                    message: 'Impossible d\'envoyer le numéro au bot (processus non disponible)'
                });
            }
        } catch (error) {
            reject({
                status: 'error',
                message: `Erreur lors de l'envoi du numéro: ${error.message}`
            });
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
// 📡 ROUTES API POUR L'INTERFACE HTML
// ============================================

// Route principale - sert index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// GET /api/status - Statut du serveur
app.get('/api/status', (req, res) => {
    const activeBots = Array.from(bots.values()).filter(bot => 
        bot.status === 'connected' || bot.status === 'running' || bot.status === 'pairing'
    ).length;

    const totalMemory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    
    res.json({
        success: true,
        platform: 'HexTech WhatsApp Bot Manager',
        version: '3.0',
        activeBots: activeBots,
        totalSessions: bots.size,
        serverTime: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memoryUsage: `${totalMemory}MB`,
        environment: IS_RENDER ? 'Render' : 'Local',
        url: req.protocol + '://' + req.get('host'),
        whatsapp: 'active',
        pairingSystem: 'active'
    });
});

// GET /api/bots - Liste tous les bots
app.get('/api/bots', (req, res) => {
    const botList = Array.from(bots.values()).map(bot => ({
        sessionId: bot.sessionId,
        status: bot.status,
        connectionStatus: bot.connectionStatus,
        phoneNumber: bot.phoneNumber,
        startTime: bot.startTime,
        pairingCode: bot.pairingCode,
        pairingCodeGenerated: bot.pairingCodeGenerated,
        connected: bot.connected || false,
        uptime: Date.now() - bot.startTime,
        logsCount: bot.logs.length
    }));

    res.json({
        success: true,
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
                success: false,
                message: 'Numéro de téléphone requis' 
            });
        }

        // Nettoyer le numéro
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        if (cleanNumber.length < 8) {
            return res.status(400).json({ 
                success: false,
                message: 'Numéro invalide (minimum 8 chiffres)' 
            });
        }

        // Vérifier si un bot existe déjà pour ce numéro
        const existingBot = Array.from(bots.values()).find(bot => 
            bot.phoneNumber === cleanNumber && 
            (bot.status === 'running' || bot.status === 'connected' || bot.status === 'pairing')
        );
        
        if (existingBot) {
            return res.json({
                success: true,
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
            success: result.status === 'success' || result.status === 'timeout',
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
            success: false,
            message: error.message || 'Erreur lors de la création du bot' 
        });
    }
});

// POST /api/bots/:sessionId/send-phone - Envoyer un numéro à un bot existant
app.post('/api/bots/:sessionId/send-phone', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ 
                success: false,
                message: 'Numéro de téléphone requis' 
            });
        }

        // Nettoyer le numéro
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        if (cleanNumber.length < 8) {
            return res.status(400).json({ 
                success: false,
                message: 'Numéro invalide (minimum 8 chiffres)' 
            });
        }

        // Envoyer le numéro au bot
        const result = await sendPhoneNumberToBot(sessionId, cleanNumber);
        
        res.json({
            success: result.status === 'success',
            status: result.status,
            message: result.message,
            sessionId: sessionId,
            phoneNumber: cleanNumber
        });

    } catch (error) {
        console.error('Erreur envoi numéro:', error);
        res.status(500).json({ 
            success: false,
            message: error.message || 'Erreur lors de l\'envoi du numéro' 
        });
    }
});

// POST /api/bots/:sessionId/add-phone - Ajouter/modifier un numéro pour un bot
app.post('/api/bots/:sessionId/add-phone', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ 
                success: false,
                message: 'Numéro de téléphone requis' 
            });
        }

        // Nettoyer le numéro
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        if (cleanNumber.length < 8) {
            return res.status(400).json({ 
                success: false,
                message: 'Numéro invalide (minimum 8 chiffres)' 
            });
        }

        // Vérifier si le bot existe
        if (!bots.has(sessionId)) {
            return res.status(404).json({ 
                success: false,
                message: 'Bot non trouvé' 
            });
        }

        const botData = bots.get(sessionId);
        
        // Mettre à jour le numéro du bot
        botData.phoneNumber = cleanNumber;
        
        // Arrêter l'ancien processus s'il existe
        if (botData.process && !botData.process.killed) {
            botData.process.kill('SIGTERM');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Démarrer un nouveau bot
        const result = await startBot(sessionId, cleanNumber);
        
        res.json({
            success: result.status === 'success',
            status: result.status,
            sessionId: sessionId,
            message: result.message || 'Bot redémarré avec le nouveau numéro',
            pairingCode: result.pairingCode,
            phoneNumber: cleanNumber
        });

    } catch (error) {
        console.error('Erreur ajout numéro:', error);
        res.status(500).json({ 
            success: false,
            message: error.message || 'Erreur lors de l\'ajout du numéro' 
        });
    }
});

// GET /api/bots/:sessionId/status - Statut d'un bot spécifique
app.get('/api/bots/:sessionId/status', (req, res) => {
    const { sessionId } = req.params;
    const botData = bots.get(sessionId);
    
    if (!botData) {
        return res.status(404).json({ 
            success: false,
            message: 'Bot non trouvé' 
        });
    }
    
    res.json({
        success: true,
        sessionId: sessionId,
        status: botData.status,
        connectionStatus: botData.connectionStatus,
        phoneNumber: botData.phoneNumber,
        connected: botData.connected || false,
        pairingCode: botData.pairingCode,
        pairingCodeGenerated: botData.pairingCodeGenerated,
        startTime: botData.startTime,
        uptime: Date.now() - botData.startTime,
        logsCount: botData.logs.length
    });
});

// GET /api/bots/:sessionId/logs - Récupérer les logs d'un bot
app.get('/api/bots/:sessionId/logs', (req, res) => {
    const { sessionId } = req.params;
    const botData = bots.get(sessionId);
    
    if (!botData) {
        return res.status(404).json({ 
            success: false,
            message: 'Bot non trouvé' 
        });
    }
    
    // Formater les logs pour l'affichage
    const formattedLogs = botData.logs.slice(-100).map(log => {
        const time = new Date(log.timestamp).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        return `[${time}] [${log.type.toUpperCase()}] ${log.message.trim()}`;
    });
    
    res.json({
        success: true,
        logs: formattedLogs,
        sessionId: sessionId,
        status: botData.status,
        pairingCode: botData.pairingCode || null,
        totalLogs: botData.logs.length
    });
});

// GET /api/pairing/:sessionId - Récupérer le code de pairing
app.get('/api/pairing/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await getPairingCode(sessionId);
        
        if (result.status === 'error') {
            return res.status(404).json({
                success: false,
                message: result.message
            });
        }
        
        res.json({
            success: true,
            pairingCode: result.pairingCode,
            sessionId: result.sessionId,
            phoneNumber: result.phoneNumber,
            botStatus: result.botStatus,
            connectionStatus: result.connectionStatus
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

// DELETE /api/bots/:sessionId - Arrêter un bot
app.delete('/api/bots/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await stopBot(sessionId);
        
        res.json({
            success: result.status === 'success',
            message: result.message,
            sessionId: sessionId
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false,
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
        timestamp: new Date().toISOString()
    });
});

// Route pour WebSocket (pour le client JS)
app.get('/ws', (req, res) => {
    res.json({
        success: true,
        message: 'WebSocket endpoint',
        wsUrl: `ws://${req.get('host')}/ws`
    });
});

// 404 handler pour les API
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint non trouvé'
    });
});

// Pour toutes les autres routes, servir index.html (pour le SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err);
    res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
    });
});

// ============================================
// 🚀 DÉMARRAGE DU SERVEUR ET WEBSOCKET
// ============================================
const server = http.createServer(app);

// Créer le serveur WebSocket
const wss = new WebSocket.Server({ server });

// Gérer les connexions WebSocket
wss.on('connection', (ws, req) => {
    console.log('🔗 Nouvelle connexion WebSocket');
    
    // Récupérer l'ID de session depuis l'URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');
    
    if (sessionId) {
        // Stocker la connexion
        if (!wsConnections.has(sessionId)) {
            wsConnections.set(sessionId, []);
        }
        wsConnections.get(sessionId).push(ws);
        
        // Envoyer l'état initial
        const botData = bots.get(sessionId);
        if (botData) {
            ws.send(JSON.stringify({
                type: 'initial_state',
                sessionId: sessionId,
                status: botData.status,
                phoneNumber: botData.phoneNumber,
                pairingCode: botData.pairingCode,
                connected: botData.connected,
                logs: botData.logs.slice(-50)
            }));
        }
        
        // Gérer la déconnexion
        ws.on('close', () => {
            console.log(`🔗 Déconnexion WebSocket pour session: ${sessionId}`);
            const connections = wsConnections.get(sessionId);
            if (connections) {
                const index = connections.indexOf(ws);
                if (index > -1) {
                    connections.splice(index, 1);
                }
                if (connections.length === 0) {
                    wsConnections.delete(sessionId);
                }
            }
        });
        
        // Gérer les messages du client
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                if (data.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                }
            } catch (error) {
                console.error('Erreur traitement message WebSocket:', error);
            }
        });
    }
});

// Démarrer le serveur
server.listen(PORT, '0.0.0.0', () => {
    const publicUrl = RENDER_URL || `http://localhost:${PORT}`;
    
    console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║                    HEXTECH WHATSAPP BOT MANAGER v3.0                    ║
╠══════════════════════════════════════════════════════════════════════════╣
║ 🌐 URL publique: ${publicUrl.padEnd(55)} ║
║ 📁 Port: ${PORT.toString().padEnd(58)} ║
║ 📱 Interface: ${publicUrl}${' '.repeat(50 - publicUrl.length)} ║
║ 🔗 WebSocket: ws://${publicUrl.replace('http://', '').replace('https://', '')}/ws ║
║ 🎯 Système: Pairing Code BaileyJS - Compatible ES Modules${' '.repeat(10)} ║
║ 👑 Propriétaire: 243816107573${' '.repeat(38)} ║
╚══════════════════════════════════════════════════════════════════════════╝
    `);
    
    // Créer les dossiers nécessaires
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
    
    // Vérifier les dépendances au démarrage
    checkAndInstallDependencies().then(() => {
        console.log('✅ Dépendances vérifiées avec succès');
    }).catch(error => {
        console.error('❌ Erreur vérification dépendances:', error);
    });
    
    console.log('\n🚀 SERVEUR PRÊT !');
    console.log(`👉 Accédez à l'interface: ${publicUrl}`);
    console.log(`👉 Créez des bots via l'interface web`);
    console.log(`👉 WebSocket disponible pour les mises à jour en temps réel`);
});

// Gestion arrêt
function shutdown() {
    console.log('\n🛑 Arrêt du serveur...');
    
    const promises = [];
    bots.forEach((bot, sessionId) => {
        promises.push(stopBot(sessionId).catch(() => {}));
    });
    
    // Fermer toutes les connexions WebSocket
    wss.clients.forEach(client => {
        client.close();
    });
    
    Promise.all(promises).then(() => {
        console.log('✅ Tous les bots arrêtés');
        console.log('✅ Connexions WebSocket fermées');
        process.exit(0);
    });
    
    setTimeout(() => {
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app, startBot, stopBot, getPairingCode, sendPhoneNumberToBot };
