// bot/index.js - VERSION CORRIGÉE DÉFINITIVE

// ============================================
// 📦 IMPORTS CORRIGÉS POUR RENDER
// ============================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import readline from 'readline';
import { exec } from 'child_process';
import { Buffer } from 'buffer';
import { pino } from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

console.log('🔧 HEXGATE V3 - Mode Web Interface');

// ============================================
// 🎯 VARIABLES D'ENVIRONNEMENT
// ============================================
const sessionId = process.env.SESSION_ID || 'default-session';
const phoneNumber = process.env.PHONE_NUMBER || '';
const webMode = process.env.WEB_MODE === 'true';
const isRender = process.env.IS_RENDER === 'true';

console.log('📋 Configuration:');
console.log(`  • Session ID: ${sessionId}`);
console.log(`  • Phone: ${phoneNumber || 'ATTENTE DE PAIRING'}`);
console.log(`  • Web Mode: ${webMode ? 'OUI' : 'NON'}`);
console.log(`  • Render: ${isRender ? 'OUI' : 'NON'}`);

// ============================================
// 🌈 COULEURS POUR LE TERMINAL
// ============================================
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

// ============================================
// 🎯 FONCTION PRINCIPALE DU BOT
// ============================================
async function startBot() {
    try {
        // IMPORT DYNAMIQUE DE BAILEYS (CORRECTION DÉFINITIVE)
        console.log('📥 Chargement de BaileyJS...');
        
        // Méthode 1: Import dynamique
        const baileysModule = await import('@whiskeysockets/baileys');
        
        console.log(`${colors.green}✅ BaileyJS importé avec succès${colors.reset}`);
        console.log(`🔧 Version disponible`);
        
        // CORRECTION CRITIQUE: Accès correct aux fonctions
        // Utilisons les noms exacts des exports de BaileyJS
        const makeWASocket = baileysModule.default?.default || baileysModule.default;
        
        // Récupérer les autres fonctions correctement
        const useMultiFileAuthState = baileysModule.useMultiFileAuthState;
        const downloadContentFromMessage = baileysModule.downloadContentFromMessage;
        const DisconnectReason = baileysModule.DisconnectReason;
        const fetchLatestBaileysVersion = baileysModule.fetchLatestBaileysVersion;
        const Browsers = baileysModule.Browsers;
        const delay = baileysModule.delay;
        const getContentType = baileysModule.getContentType;
        
        // Vérifier que makeWASocket est bien une fonction
        if (typeof makeWASocket !== 'function') {
            console.log(`${colors.red}❌ makeWASocket n'est pas une fonction, vérification des exports...${colors.reset}`);
            console.log('Exports disponibles:', Object.keys(baileysModule));
            
            // Tentative alternative
            const makeWASocketAlt = baileysModule.makeWASocket || baileysModule.makeWASocket;
            if (typeof makeWASocketAlt === 'function') {
                console.log(`${colors.green}✅ makeWASocket trouvé via makeWASocket${colors.reset}`);
                return await initializeBot(makeWASocketAlt, {
                    useMultiFileAuthState,
                    downloadContentFromMessage,
                    DisconnectReason,
                    fetchLatestBaileysVersion,
                    Browsers,
                    delay,
                    getContentType
                });
            } else {
                throw new Error('makeWASocket non disponible dans BaileyJS');
            }
        }
        
        return await initializeBot(makeWASocket, {
            useMultiFileAuthState,
            downloadContentFromMessage,
            DisconnectReason,
            fetchLatestBaileysVersion,
            Browsers,
            delay,
            getContentType
        });
        
    } catch (error) {
        console.log(`${colors.red}❌ ERREUR CRITIQUE DÉMARRAGE: ${error.message}${colors.reset}`);
        console.log(`${colors.yellow}🔄 Redémarrage dans 10 secondes...${colors.reset}`);
        
        setTimeout(() => {
            startBot().catch(err => {
                console.log(`${colors.red}❌ Échec redémarrage: ${err.message}${colors.reset}`);
                process.exit(1);
            });
        }, 10000);
    }
}

// ============================================
// 🔧 FONCTION D'INITIALISATION DU BOT
// ============================================
async function initializeBot(makeWASocket, baileysFunctions) {
    const {
        useMultiFileAuthState,
        downloadContentFromMessage,
        DisconnectReason,
        fetchLatestBaileysVersion,
        Browsers,
        delay,
        getContentType
    } = baileysFunctions;
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Bannière d'affichage
    console.log(`
${colors.magenta}╔══════════════════════════════════════════════════╗
║${colors.cyan}         WHATSAPP BOT - HEXGATE EDITION          ${colors.reset}${colors.magenta}║
╠══════════════════════════════════════════════════╣
║${colors.green} ✅ MODE WEB ACTIVÉ - PAIRING CODE SYSTÈME      ${colors.magenta}║
║${colors.green} ✅ NUMÉRO: ${phoneNumber || 'PAIRING SEUL'}     ${' '.repeat(23 - (phoneNumber?.length || 0))}${colors.magenta}║
║${colors.green} ✅ SESSION: ${sessionId}${' '.repeat(38 - sessionId.length)}${colors.magenta}║
╚══════════════════════════════════════════════════╝${colors.reset}
`);

    try {
        const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
        const { version } = await fetchLatestBaileysVersion();
        
        // Créer le logger
        const logger = pino({ level: 'error' }); // Réduire les logs pour Render
        
        const sock = makeWASocket({
            version,
            logger: logger,
            printQRInTerminal: false,
            auth: state,
            browser: Browsers.ubuntu("Chrome"),
            markOnlineOnConnect: true,
            syncFullHistory: false,
        });

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            
            console.log(`${colors.cyan}📡 État de connexion: ${connection || 'inconnu'}${colors.reset}`);
            
            // 🎯 MODE WEB : Générer pairing code automatiquement
            if (webMode && phoneNumber && connection === "open") {
                console.log(`${colors.cyan}🎯 MODE WEB - Génération pairing code pour: ${phoneNumber}${colors.reset}`);
                
                setTimeout(async () => {
                    try {
                        console.log(`${colors.cyan}🔑 Appel à requestPairingCode...${colors.reset}`);
                        
                        // Utiliser la fonction requestPairingCode
                        const code = await sock.requestPairingCode(phoneNumber);
                        
                        console.log(`${colors.green}✅✅✅ CODE DE PAIRING GÉNÉRÉ: ${code}${colors.reset}`);
                        
                        // Message spécial pour le serveur web (TRÈS IMPORTANT)
                        console.log(`🎯🎯🎯 PAIRING_CODE_GENERATED: ${code} 🎯🎯🎯`);
                        console.log(`📱 Numéro: ${phoneNumber}`);
                        console.log(`🔑 Code: ${code}`);
                        console.log(`🌐 Session: ${sessionId}`);
                        console.log(`🎯 Format: XXXX-XXXX (8 caractères)`);
                        
                        // Message informatif
                        console.log(`📱 Instructions: Allez dans WhatsApp → Paramètres → Périphériques liés → Connecter un appareil`);
                        console.log(`🔗 Entrez le code: ${code}`);
                        
                    } catch (pairError) {
                        console.log(`${colors.red}❌ Erreur pairing: ${pairError.message}${colors.reset}`);
                        console.log(`${colors.yellow}⚠️ Détails: ${JSON.stringify(pairError)}${colors.reset}`);
                    }
                }, 3000);
            }
            
            if (connection === "close") {
                const reason = new Error(lastDisconnect?.error)?.output?.statusCode;
                console.log(`${colors.red}🔌 Déconnexion détectée${colors.reset}`);
                
                if (reason === DisconnectReason.loggedOut) {
                    console.log(`${colors.red}❌ Déconnecté, nettoyage...${colors.reset}`);
                    try {
                        if (fs.existsSync("auth_info_baileys")) {
                            exec("rm -rf auth_info_baileys", () => {
                                console.log(`${colors.yellow}🔄 Redémarrage dans 5 secondes...${colors.reset}`);
                                setTimeout(() => {
                                    initializeBot(makeWASocket, baileysFunctions);
                                }, 5000);
                            });
                        }
                    } catch (error) {
                        console.log(`${colors.red}❌ Erreur nettoyage: ${error.message}${colors.reset}`);
                    }
                } else {
                    console.log(`${colors.yellow}🔄 Reconnexion automatique...${colors.reset}`);
                    setTimeout(() => {
                        initializeBot(makeWASocket, baileysFunctions);
                    }, 5000);
                }
            } else if (connection === "open") {
                console.log(`${colors.green}✅✅✅ CONNECTÉ À WHATSAPP!${colors.reset}`);
            }
        });

        // ============================================
        // 📨 GESTION DES MESSAGES
        // ============================================
        sock.ev.on("messages.upsert", async ({ messages }) => {
            try {
                for (const msg of messages) {
                    if (!msg.message) continue;
                    
                    const from = msg.key.remoteJid;
                    const messageType = Object.keys(msg.message)[0];
                    const body = msg.message.conversation ||
                               msg.message.extendedTextMessage?.text ||
                               msg.message.imageMessage?.caption ||
                               "";
                    
                    console.log(`${colors.cyan}📨 Message reçu de ${from}${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.red}❌ Erreur traitement message: ${error.message}${colors.reset}`);
            }
        });

        console.log(`${colors.green}🤖 Bot WhatsApp démarré avec succès!${colors.reset}`);
        console.log(`${colors.cyan}⏳ Attente de la connexion et du pairing code...${colors.reset}`);

        // Console interactive
        rl.on("line", (input) => {
            const args = input.trim().split(/ +/);
            const command = args.shift().toLowerCase();
            
            switch (command) {
                case "status":
                    console.log(`${colors.cyan}📊 STATUT BOT${colors.reset}`);
                    console.log(`${colors.yellow}• Session: ${sessionId}${colors.reset}`);
                    console.log(`${colors.yellow}• Numéro: ${phoneNumber || 'En attente'}${colors.reset}`);
                    console.log(`${colors.yellow}• Mode: ${webMode ? 'WEB' : 'TERMINAL'}${colors.reset}`);
                    break;
                case "code":
                    console.log(`${colors.cyan}🔑 Pour générer un code:${colors.reset}`);
                    console.log(`${colors.yellow}• Attendez que le bot soit connecté (état: open)${colors.reset}`);
                    console.log(`${colors.yellow}• Le code sera généré automatiquement${colors.reset}`);
                    break;
                case "exit":
                    console.log(`${colors.yellow}👋 Arrêt...${colors.reset}`);
                    rl.close();
                    process.exit(0);
                    break;
                default:
                    console.log(`${colors.yellow}Commandes: status, code, exit${colors.reset}`);
            }
        });

        return sock;

    } catch (error) {
        console.log(`${colors.red}❌ Erreur initialisation: ${error.message}${colors.reset}`);
        throw error;
    }
}

// ============================================
// 🎯 FONCTION POUR LE WEB
// ============================================
async function startBotForWeb(phone, pairingCode = null) {
    console.log('🎯 DÉMARRAGE BOT POUR WEB');
    console.log(`📱 Numéro: ${phone || 'ATTENTE DE PAIRING'}`);
    console.log(`🔑 Mode: ${pairingCode ? 'CODE FOURNI' : 'GÉNÉRATION DE CODE'}`);
    
    return await startBot();
}

// Démarrer immédiatement si exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
    startBot().catch(error => {
        console.log(`${colors.red}❌ Échec démarrage: ${error.message}${colors.reset}`);
        process.exit(1);
    });
}

// ============================================
// 📦 EXPORT POUR SERVEUR WEB
// ============================================
export { startBotForWeb };
