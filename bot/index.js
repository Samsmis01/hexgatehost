// server.js - VERSION DÉFINITIVE ORCHESTRATEUR
// Le serveur NE GÉNÈRE PAS de pairing code, il orchestre seulement le bot

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
            botConfig.ownerNumber = phoneNumber || "243816107573";
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
                botConfig: botConfig,
                stdinBuffer: '', // Buffer pour stdin
                lastPhoneNumberSent: null // Dernier numéro envoyé
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
                // Le bot DOIT afficher: 🎯🎯🎯 CODE DE PAIRING GÉNÉRÉ: XXXX-XXXX 🎯🎯🎯
                let pairingCode = null;
                
                // Formats de détection pour le bot corrigé
                const formats = [
                    // Format exact attendu du bot corrigé
                    /🎯🎯🎯 CODE DE PAIRING GÉNÉRÉ: ([A-Z0-9]{4}[-][A-Z0-9]{4}) 🎯🎯🎯/i,
                    /🎯🎯🎯 PAIRING_CODE_GENERATED: ([A-Z0-9]{4}[-][A-Z0-9]{4}) 🎯🎯🎯/i,
                    
                    // Formats alternatifs si le bot change légèrement
                    /CODE DE PAIRING.*?([A-Z0-9]{4}[-][A-Z0-9]{4})/i,
                    /PAIRING.*?([A-Z0-9]{4}[-][A-Z0-9]{4})/i,
                    
                    // Format avec tiret: XXXX-XXXX (le vrai format Bailey)
                    /([A-Z0-9]{4}[-][A-Z0-9]{4})/,
                    
                    // Format sans tiret: 8 caractères
                    /\b([A-Z0-9]{8})\b/
                ];
                
                // Essayer tous les formats
                for (const regex of formats) {
                    const match = output.match(regex);
                    if (match && match[1]) {
                        pairingCode = match[1];
                        break;
                    }
                }
                
                // Si trouvé, formater proprement
                if (pairingCode) {
                    // Normaliser le code
                    let cleanCode = pairingCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    
                    // Vérifier que c'est bien 8 caractères (format Bailey)
                    if (cleanCode.length === 8) {
                        // Ajouter un tiret au milieu si absent
                        if (!pairingCode.includes('-')) {
                            cleanCode = cleanCode.substring(0, 4) + '-' + cleanCode.substring(4);
                        }
                        
                        botData.pairingCode = cleanCode;
                        botData.status = 'pairing';
                        console.log(`🎯🎯🎯 PAIRING CODE BAILEYS TROUVÉ pour ${sessionId}: ${cleanCode} 🎯🎯🎯`);
                        console.log(`📱 Numéro: ${phoneNumber}`);
                        console.log(`🔑 Code: ${cleanCode} (format: XXXX-XXXX)`);
                        
                        if (!botData.codeResolved) {
                            botData.codeResolved = true;
                            resolve({
                                status: 'success',
                                sessionId: sessionId,
                                message: '✅ Code de pairing généré avec succès!',
                                pairingCode: cleanCode,
                                phoneNumber: phoneNumber,
                                immediateCode: true,
                                note: `Utilisez ce code dans WhatsApp → Périphériques liés : ${cleanCode}`,
                                format: 'XXXX-XXXX',
                                instructions: 'Allez dans WhatsApp → Paramètres → Périphériques liés → Connecter un appareil'
                            });
                        }
                    }
                }
                
                // Détecter la connexion réussie
                if (output.includes('✅✅✅ CONNECTÉ À WHATSAPP!') || 
                    output.includes('✅ Connecté à WhatsApp') || 
                    output.includes('CONNECTÉ À WHATSAPP') ||
                    output.includes('connection.open') ||
                    output.includes('Authenticated')) {
                    botData.status = 'connected';
                    botData.connected = true;
                    botData.connectedAt = Date.now();
                    console.log(`✅ Bot ${sessionId} connecté à WhatsApp!`);
                }
                
                // Détecter que le bot tente de générer un pairing code
                if (output.includes('Génération pairing code') || 
                    output.includes('requestPairingCode') ||
                    output.includes('Appel à requestPairingCode')) {
                    botData.pairingAttempted = true;
                    console.log(`🔄 Bot ${sessionId} tente de générer un pairing code...`);
                }
                
                // Détecter la réception d'un numéro dans les logs
                if (output.includes('NUMERO_RECU:') || 
                    output.includes('PHONE_NUMBER_RECEIVED:')) {
                    const phoneMatch = output.match(/NUMERO_RECU:\s*([\d+]+)/) || 
                                      output.match(/PHONE_NUMBER_RECEIVED:\s*([\d+]+)/);
                    if (phoneMatch && phoneMatch[1]) {
                        botData.lastPhoneNumberSent = phoneMatch[1];
                        console.log(`📱 Numéro reçu par le bot ${sessionId}: ${phoneMatch[1]}`);
                    }
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
                    error.includes('ERR_MODULE_NOT_FOUND') ||
                    error.includes('Cannot find module')) {
                    botData.status = 'error';
                    botData.error = error;
                    
                    if (!botData.codeResolved) {
                        botData.codeResolved = true;
                        reject({ 
                            status: 'error', 
                            message: 'Erreur critique dans le bot. Vérifiez bot/index.js',
                            details: error.substring(0, 200)
                        });
                    }
                }
            });

            // Gérer l'entrée stdin (pour recevoir des commandes)
            botProcess.stdin.on('error', (err) => {
                console.error(`[Bot ${sessionId} STDIN ERROR]: ${err.message}`);
            });

            botProcess.stdin.on('close', () => {
                console.log(`[Bot ${sessionId}] stdin fermé`);
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

            // Timeout après 90 secondes si pas de code
            setTimeout(() => {
                if (!botData.codeResolved && !botData.pairingCode) {
                    console.log(`⏰ Timeout pour ${sessionId}, code non généré après 90 secondes`);
                    
                    // Vérifier les logs pour debug
                    const recentLogs = botData.logs.slice(-10).map(l => l.message).join('\n');
                    console.log(`📋 Derniers logs du bot ${sessionId}:`);
                    console.log(recentLogs);
                    
                    botData.codeResolved = true;
                    resolve({
                        status: 'timeout',
                        sessionId: sessionId,
                        message: 'Timeout: Le bot a démarré mais aucun pairing code n\'a été généré',
                        pairingCode: null,
                        phoneNumber: phoneNumber,
                        botStatus: botData.status,
                        pairingAttempted: botData.pairingAttempted,
                        suggestion: 'Vérifiez que votre bot/index.js appelle bien sock.requestPairingCode()',
                        recentLogs: recentLogs
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

// Fonction pour arrêter un bot
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
            reject({ 
                status: 'error', 
                message: error.message 
            });
        }
    });
}

// Fonction pour obtenir le pairing code d'un bot
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
                generatedAt: botData.startTime,
                botStatus: botData.status,
                connected: botData.connected || false,
                immediateCode: true,
                format: 'XXXX-XXXX'
            });
        } else {
            // Si pas encore de code, vérifier périodiquement
            const checkCode = () => {
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
                    // Réessayer dans 2 secondes
                    setTimeout(() => {
                        if (Date.now() - botData.startTime > 120000) {
                            // Timeout après 120 secondes
                            resolve({ 
                                status: 'error', 
                                message: 'Timeout: Pairing code non généré après 2 minutes',
                                sessionId: sessionId,
                                botStatus: botData.status
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

// Fonction pour envoyer un numéro au bot depuis l'interface
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
                message: 'Numéro de téléphone invalide (minimum 8 chiffres)' 
            });
        }

        try {
            // Envoyer le numéro via stdin du bot
            if (botData.process.stdin.writable) {
                // Format du message pour le bot
                const message = `PHONE_NUMBER_INPUT:${cleanNumber}\n`;
                botData.process.stdin.write(message);
                
                console.log(`📤 Numéro envoyé au bot ${sessionId}: ${cleanNumber}`);
                
                // Mettre à jour le numéro dans les données du bot
                botData.phoneNumber = cleanNumber;
                botData.lastPhoneNumberSent = cleanNumber;
                botData.lastUpdate = Date.now();
                
                // Ajouter un log
                botData.logs.push({
                    type: 'stdin',
                    message: `Numéro envoyé depuis l'interface: ${cleanNumber}`,
                    timestamp: Date.now()
                });
                
                resolve({
                    status: 'success',
                    message: 'Numéro envoyé au bot avec succès',
                    sessionId: sessionId,
                    phoneNumber: cleanNumber,
                    timestamp: Date.now(),
                    note: 'Le bot va tenter de générer un pairing code avec ce numéro'
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

// Nettoyage périodique des sessions
function cleanupSessions() {
    const now = Date.now();
    let cleaned = 0;
    
    bots.forEach((bot, sessionId) => {
        // Nettoyer les bots arrêtés depuis plus de 10 minutes
        if (bot.status === 'stopped' && bot.endTime && (now - bot.endTime) > 600000) {
            bots.delete(sessionId);
            cleaned++;
        }
        // Nettoyer les bots inactifs depuis plus de 30 minutes
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

// GET /api/status - Statut général du serveur
app.get('/api/status', (req, res) => {
    const activeBots = Array.from(bots.values()).filter(bot => 
        bot.status === 'connected' || bot.status === 'running' || bot.status === 'pairing'
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
        version: '4.0',
        pairingSystem: 'BAILEYS_REAL_PAIRING_CODE',
        pairingFormat: 'XXXX-XXXX (8 caractères via requestPairingCode())',
        maxSessions: 20,
        status: 'healthy',
        botEndpoint: '/api/bots/create',
        phoneInputEndpoint: '/api/bots/:sessionId/send-phone',
        note: 'Le serveur orchestre uniquement. Le bot génère réellement le pairing code.',
        features: {
            phoneInputFromLogs: true,
            realTimeLogs: true,
            autoCleanup: true,
            webInterface: true
        }
    });
});

// GET /api/bots - Liste de tous les bots
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
        lastUpdate: bot.lastUpdate,
        codeFormat: bot.pairingCode ? 'XXXX-XXXX' : null,
        pairingAttempted: bot.pairingAttempted || false,
        lastPhoneNumberSent: bot.lastPhoneNumberSent
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
                message: 'Numéro de téléphone invalide (minimum 8 chiffres)' 
            });
        }

        // Vérifier si un bot existe déjà pour ce numéro
        const existingBot = Array.from(bots.values()).find(bot => 
            bot.phoneNumber === cleanNumber && 
            (bot.status === 'running' || bot.status === 'connected' || bot.status === 'pairing')
        );
        
        if (existingBot) {
            return res.json({
                status: 'exists',
                sessionId: existingBot.sessionId,
                message: 'Un bot existe déjà pour ce numéro',
                pairingCode: existingBot.pairingCode,
                botStatus: existingBot.status,
                immediateCode: true,
                format: 'XXXX-XXXX'
            });
        }

        // Générer un ID de session unique
        const sessionId = 'hexgate-' + uuidv4().replace(/-/g, '').substring(0, 12);
        
        console.log(`📱 Création bot pour: ${cleanNumber} (${sessionId})`);
        
        // Démarrer le bot
        const result = await startBot(sessionId, cleanNumber);
        
        res.json({
            status: result.status,
            sessionId: sessionId,
            message: result.message,
            botStatus: result.botStatus || 'starting',
            pairingCode: result.pairingCode,
            phoneNumber: cleanNumber,
            immediateCode: !!result.pairingCode,
            note: result.pairingCode ? 
                `Code disponible! Utilisez-le dans WhatsApp → Périphériques liés : ${result.pairingCode}` :
                'Le bot démarre... Le code sera généré dans quelques secondes.',
            format: result.pairingCode ? 'XXXX-XXXX' : 'En attente',
            instructions: result.pairingCode ? 'Allez dans WhatsApp → Paramètres → Périphériques liés → Connecter un appareil → Entrer le code' : null,
            whatsappSteps: [
                '1. Ouvrez WhatsApp sur votre téléphone',
                '2. Paramètres → Périphériques liés → Connecter un appareil',
                '3. Sélectionnez "Connecter avec un numéro de téléphone"',
                '4. Entrez le code affiché',
                '5. Validez et attendez la connexion'
            ],
            recentLogs: result.recentLogs || []
        });

    } catch (error) {
        console.error('Erreur création bot:', error);
        res.status(500).json({ 
            status: 'error', 
            message: error.message || 'Erreur lors de la création du bot' 
        });
    }
});

// DELETE /api/bots/:sessionId - Arrêter un bot
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

// GET /api/bots/:sessionId/logs - Logs d'un bot spécifique
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
        pairingCode: botData.pairingCode || 'En attente',
        format: botData.pairingCode ? 'XXXX-XXXX' : null,
        pairingAttempted: botData.pairingAttempted || false,
        uptime: Date.now() - botData.startTime,
        phoneNumber: botData.phoneNumber,
        lastPhoneNumberSent: botData.lastPhoneNumberSent,
        supportsPhoneInput: true
    });
});

// GET /api/bots/:sessionId/status - Statut d'un bot spécifique
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
        lastUpdate: botData.lastUpdate,
        format: botData.pairingCode ? 'XXXX-XXXX' : null,
        pairingAttempted: botData.pairingAttempted || false,
        lastPhoneNumberSent: botData.lastPhoneNumberSent,
        supportsPhoneInput: true
    });
});

// GET /api/pairing/:sessionId - Récupérer le pairing code
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

// NOUVELLE ROUTE : POST /api/bots/:sessionId/send-phone - Envoyer un numéro depuis le modal de logs
app.post('/api/bots/:sessionId/send-phone', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Numéro de téléphone requis' 
            });
        }
        
        console.log(`📤 Envoi numéro depuis logs pour ${sessionId}: ${phoneNumber}`);
        
        // Envoyer le numéro au bot
        const result = await sendPhoneNumberToBot(sessionId, phoneNumber);
        
        res.json({
            status: 'success',
            message: result.message,
            sessionId: sessionId,
            phoneNumber: result.phoneNumber,
            timestamp: result.timestamp,
            botStatus: bots.get(sessionId)?.status || 'unknown',
            note: 'Le numéro a été envoyé au bot via stdin. Le bot devrait tenter de générer un pairing code.',
            nextSteps: [
                '1. Le bot va traiter le numéro',
                '2. Si configuré, il générera un pairing code',
                '3. Rafraîchissez les logs pour voir le résultat',
                '4. Utilisez le code dans WhatsApp si généré'
            ],
            whatHappens: 'Le bot reçoit le numéro et tente de démarrer une session WhatsApp avec celui-ci.'
        });
        
    } catch (error) {
        console.error('Erreur envoi numéro depuis logs:', error);
        res.status(500).json({ 
            status: 'error', 
            message: error.message || 'Erreur lors de l\'envoi du numéro' 
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
        timestamp: new Date().toISOString(),
        bots: bots.size,
        activeBots: activeBots,
        uptime: process.uptime(),
        environment: IS_RENDER ? 'Render' : 'Local',
        owner: '243816107573',
        pairingSystem: 'BAILEYS_REAL_PAIRING_CODE',
        pairingFormat: 'XXXX-XXXX (8 caractères via requestPairingCode())',
        whatsappStatus: 'ready',
        apiVersion: '4.0',
        features: {
            phoneInputFromLogs: true,
            realPairingCode: true,
            webInterface: true,
            autoCleanup: true
        },
        note: 'Server orchestre uniquement. Le bot génère le code réel.'
    });
});

// Route pour tester directement un numéro
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
        
        // Créer une session temporaire
        const tempSessionId = 'test-' + uuidv4().replace(/-/g, '').substring(0, 8);
        
        console.log(`🧪 Test pairing pour: ${cleanNumber} (${tempSessionId})`);
        
        // Démarrer le bot en mode test
        const result = await startBot(tempSessionId, cleanNumber);
        
        if (result.pairingCode) {
            // Arrêter le bot après avoir obtenu le code
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
                    body { 
                        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; 
                        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); 
                        color: #f1f5f9; 
                        text-align: center; 
                        padding: 50px; 
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .container { 
                        max-width: 800px; 
                        margin: 0 auto; 
                        background: rgba(30, 41, 59, 0.9); 
                        padding: 40px; 
                        border-radius: 20px; 
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
                        border: 1px solid #334155;
                        backdrop-filter: blur(10px);
                    }
                    h1 { 
                        font-size: 2.5em; 
                        margin-bottom: 20px; 
                        background: linear-gradient(135deg, #6366f1, #8b5cf6);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                    }
                    .status { 
                        background: linear-gradient(135deg, #10b981, #34d399); 
                        padding: 15px 30px; 
                        border-radius: 10px; 
                        display: inline-block; 
                        margin: 20px 0; 
                        font-weight: 600;
                        box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);
                    }
                    .info {
                        margin-top: 30px;
                        color: #94a3b8;
                        font-size: 14px;
                    }
                    .code-box {
                        background: #1e293b;
                        border: 2px solid #334155;
                        border-radius: 10px;
                        padding: 20px;
                        margin: 20px 0;
                        font-family: monospace;
                        font-size: 1.2em;
                        letter-spacing: 2px;
                    }
                    .feature {
                        background: rgba(59, 130, 246, 0.1);
                        border: 1px solid rgba(59, 130, 246, 0.3);
                        border-radius: 10px;
                        padding: 15px;
                        margin: 10px 0;
                        text-align: left;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🤖 HexTech WhatsApp Bot Manager</h1>
                    <div class="status">✅ Serveur en ligne - SYSTÈME PAIRING CODE RÉEL ACTIF</div>
                    
                    <p>Interface HTML non trouvée. Placez votre fichier index.html dans le dossier "public/"</p>
                    
                    <div class="feature">
                        <h3>✨ NOUVELLE FONCTIONNALITÉ ✨</h3>
                        <p><strong>Envoi de numéro depuis les logs :</strong> Maintenant, vous pouvez envoyer un numéro directement au bot depuis le modal de logs !</p>
                        <p>👉 Ouvrez les logs d'un bot</p>
                        <p>👉 Utilisez le champ "Envoyer un numéro directement au bot"</p>
                        <p>👉 Le bot reçoit le numéro via stdin</p>
                    </div>
                    
                    <div class="info">
                        <p>👨‍💻 Développé par <strong>HexTech</strong> | 🇨🇩 RDC | 📞 Owner: 243816107573</p>
                        <p>🚀 Version 4.0 | Mode: ${IS_RENDER ? 'Render 🌍' : 'Local 💻'}</p>
                        <p>🔗 <strong>Système de pairing réel BaileyJS</strong></p>
                        <p>⚡ Le bot génère réellement le code via <code>sock.requestPairingCode()</code></p>
                        <p>🎯 Format: <strong>XXXX-XXXX</strong> (8 caractères)</p>
                        <p>🎯 Serveur: <strong>Orchestre seulement</strong></p>
                    </div>
                    
                    <h3>📡 API Endpoints:</h3>
                    <div style="text-align: left; background: #0f172a; padding: 15px; border-radius: 10px; margin: 20px 0;">
                        <code>POST /api/bots/create</code> - Créer un bot<br>
                        <code>POST /api/bots/:id/send-phone</code> - <strong>NOUVEAU : Envoyer numéro depuis logs</strong><br>
                        <code>GET /api/pairing/:sessionId</code> - Récupérer code<br>
                        <code>GET /api/status</code> - Statut serveur<br>
                        <code>GET /health</code> - Santé serveur
                    </div>
                    
                    <h3>📱 Utilisation:</h3>
                    <div style="text-align: left; background: #0f172a; padding: 15px; border-radius: 10px;">
                        1. Envoyez votre numéro WhatsApp via API<br>
                        2. Le serveur démarre bot/index.js<br>
                        3. Le bot génère un vrai code BaileyJS<br>
                        4. Utilisez le code dans WhatsApp → Périphériques liés<br>
                        5. <strong>OU :</strong> Envoyez un numéro depuis les logs<br>
                        6. Le bot se connecte automatiquement
                    </div>
                </div>
            </body>
            </html>
        `);
    }
});

// Documentation API
app.get('/api/docs', (req, res) => {
    const publicUrl = RENDER_URL || `http://localhost:${PORT}`;
    
    res.json({
        name: 'HexTech WhatsApp Bot API',
        version: '4.0',
        environment: IS_RENDER ? 'Render' : 'Local',
        url: publicUrl,
        owner: '243816107573',
        pairingSystem: 'BAILEYS_REAL_PAIRING_CODE',
        pairingFormat: 'XXXX-XXXX (8 caractères via sock.requestPairingCode())',
        architecture: 'Orchestrateur → Bot → WhatsApp',
        serverRole: 'Orchestre seulement. Ne génère PAS de code.',
        botRole: 'Génère réellement le pairing code via requestPairingCode()',
        whatsappLinkingInstructions: [
            '1. Allez dans WhatsApp sur votre téléphone',
            '2. Paramètres → Périphériques liés → Connecter un appareil',
            '3. Sélectionnez "Connecter avec un numéro de téléphone"',
            '4. Entrez le code affiché (format XXXX-XXXX)',
            '5. Validez et attendez la connexion'
        ],
        endpoints: {
            'GET /api/status': 'Statut général du serveur',
            'GET /api/bots': 'Liste de tous les bots',
            'POST /api/bots/create': 'Créer un nouveau bot WhatsApp (avec numéro)',
            'POST /api/bots/:sessionId/send-phone': 'NOUVEAU: Envoyer un numéro depuis les logs',
            'DELETE /api/bots/:sessionId': 'Arrêter un bot spécifique',
            'GET /api/bots/:sessionId/logs': 'Logs d\'un bot spécifique',
            'GET /api/bots/:sessionId/status': 'Statut d\'un bot spécifique',
            'GET /api/pairing/:sessionId': 'Récupérer le pairing code',
            'POST /api/test-pairing': 'Tester directement un numéro',
            'GET /health': 'Santé du serveur',
            'GET /': 'Interface web'
        },
        example: {
            createBot: 'POST /api/bots/create { "phoneNumber": "243816107573" }',
            sendPhoneFromLogs: 'POST /api/bots/hexgate-abc123/send-phone { "phoneNumber": "243810000000" }',
            getStatus: 'GET /api/bots/hexgate-abc123/status',
            getLogs: 'GET /api/bots/hexgate-abc123/logs'
        },
        notes: [
            'Le serveur orchestre seulement, ne génère PAS de code',
            'Le bot utilise la fonction réelle requestPairingCode() de BaileyJS',
            'Le code généré est un vrai code WhatsApp de 8 caractères (XXXX-XXXX)',
            'Nouveau : Envoyez des numéros depuis le modal de logs !',
            'Le bot continue de fonctionner après la connexion',
            'Toutes les fonctionnalités (restauration messages, quiz, etc.) sont actives'
        ]
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route non trouvée',
        path: req.path,
        method: req.method,
        availableRoutes: [
            'GET /',
            'GET /api/status',
            'GET /api/bots',
            'POST /api/bots/create',
            'POST /api/bots/:id/send-phone',
            'GET /api/docs',
            'GET /health'
        ]
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err);
    res.status(500).json({
        status: 'error',
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
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
║ 🤖 Environnement: ${(IS_RENDER ? 'Render 🌍' : 'Local 💻').padEnd(37)} ║
║ 🎯 Owner fixe: 243816107573${' '.repeat(26)} ║
║ 🔗 API: ${publicUrl}/api/*${' '.repeat(28)} ║
║ 🚀 Interface: ${publicUrl}${' '.repeat(29)} ║
║ ✨ NOUVEAU: Envoi numéro depuis logs !${' '.repeat(13)} ║
║ 🎯 RÔLE: ORCHESTRATEUR SEULEMENT${' '.repeat(19)} ║
║ ⚡ LE BOT GÉNÈRE LE VRAI CODE BAILEYS${' '.repeat(13)} ║
╚════════════════════════════════════════════════════════════════╝
    `);
    
    if (IS_RENDER) {
        console.log(`✅ Détection automatique: Render`);
        console.log(`🌍 Votre application est accessible depuis partout sur Internet`);
        console.log(`🔒 HTTPS activé automatiquement`);
    }
    
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
    
    // Vérifier l'HTML
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(htmlPath)) {
        console.log(`✅ Interface HTML trouvée: ${path.relative(__dirname, htmlPath)}`);
    } else {
        console.log(`⚠️  Interface HTML non trouvée`);
        console.log(`👉 Placez votre index.html dans: public/index.html`);
    }
    
    // Vérifier le bot principal
    const botPath = path.join(__dirname, 'bot', 'index.js');
    if (!fs.existsSync(botPath)) {
        console.log(`⚠️  Fichier bot/index.js non trouvé`);
        console.log(`👉 Créez votre bot Bailey dans: bot/index.js`);
        console.log(`👉 IMPORTANT: Le bot doit appeler sock.requestPairingCode()`);
        console.log(`👉 IMPORTANT: Le bot doit afficher: 🎯🎯🎯 CODE DE PAIRING GÉNÉRÉ: XXXX-XXXX 🎯🎯🎯`);
    } else {
        console.log(`✅ Bot principal trouvé: ${path.relative(__dirname, botPath)}`);
        console.log(`🎯 Format pairing code attendu: XXXX-XXXX (8 caractères)`);
        console.log(`🎯 Format console attendu: 🎯🎯🎯 CODE DE PAIRING GÉNÉRÉ: XXXX-XXXX 🎯🎯🎯`);
        console.log(`⚡ Rôle serveur: Orchestrateur seulement`);
        console.log(`⚡ Rôle bot: Génération réelle du code via requestPairingCode()`);
        console.log(`✨ NOUVEAU: Accepte les numéros via stdin (format: PHONE_NUMBER_INPUT:243810000000)`);
    }
    
    // Vérifier les commandes
    const commandsPath = path.join(__dirname, 'bot', 'commands');
    if (fs.existsSync(commandsPath)) {
        const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
        console.log(`✅ ${commandFiles.length} fichiers de commandes trouvés`);
    } else {
        console.log(`📁 Dossier commands créé: bot/commands/`);
    }
    
    // Nettoyage périodique
    setInterval(cleanupSessions, 60000);
    console.log('🔄 Nettoyage automatique activé (toutes les minutes)');
    
    console.log('\n🚀 PRÊT À UTILISER !');
    console.log(`📱 Allez sur: ${publicUrl}`);
    console.log('👉 Entrez un numéro WhatsApp');
    console.log('👉 OU: Ouvrez les logs d\'un bot et envoyez un numéro depuis là !');
    console.log('👉 LE SERVEUR ORCHESTRE, LE BOT GÉNÈRE LE VRAI CODE BAILEYS !');
    console.log('\n🎯 ARCHITECTURE:');
    console.log('   Serveur → Orchestre seulement');
    console.log('   ↓');
    console.log('   Bot/index.js → GÉNÈRE le code via sock.requestPairingCode()');
    console.log('   ↓');
    console.log('   WhatsApp → Accepte le code');
    console.log('\n✨ NOUVELLE FONCTIONNALITÉ:');
    console.log('   Interface logs → Envoi numéro → Bot stdin → Génération code');
    console.log('\n📊 API Documentation:');
    console.log(`   ${publicUrl}/api/docs`);
    console.log(`   ${publicUrl}/health`);
    console.log('\n🎯 TEST RAPIDE:');
    console.log(`   curl -X POST ${publicUrl}/api/bots/create \\`);
    console.log(`        -H "Content-Type: application/json" \\`);
    console.log(`        -d '{"phoneNumber": "243816107573"}'`);
    console.log('\n📤 TEST ENVOI NUMÉRO DEPUIS LOGS:');
    console.log(`   curl -X POST ${publicUrl}/api/bots/hexgate-abc123/send-phone \\`);
    console.log(`        -H "Content-Type: application/json" \\`);
    console.log(`        -d '{"phoneNumber": "243810000000"}'`);
});

// ============================================
// 🛑 GESTION D'ARRÊT PROPRE
// ============================================
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
    
    // Timeout après 10 secondes
    setTimeout(() => {
        console.log('⏰ Timeout, arrêt forcé');
        process.exit(1);
    }, 10000);
}

// Capture des signaux d'arrêt
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGUSR2', shutdown);

// Export pour les tests
export { app, startBot, stopBot, getPairingCode, sendPhoneNumberToBot };
