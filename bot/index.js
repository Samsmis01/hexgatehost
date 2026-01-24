// bot/index.js - VERSION CORRIGÉE

// ============================================
// 📦 IMPORTS ES6 CORRIGÉS
// ============================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import readline from 'readline';
import { exec } from 'child_process';
import { Buffer } from 'buffer';
import pkg from 'pino';
const { pino } = pkg;

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
const forcePairing = process.env.FORCE_PAIRING_MODE === 'true';

// ============================================
// 📁 CONFIGURATION
// ============================================
let config = {};
try {
    const configPath = path.join(__dirname, '..', 'config.json');
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log('✅ Configuration chargée depuis config.json');
    } else {
        console.log('⚠️ config.json non trouvé, création avec valeurs par défaut...');
        config = {
            prefix: ".",
            ownerNumber: "243983205767",
            botPublic: false,
            fakeRecording: false,
            antiLink: true,
            alwaysOnline: true,
            logLevel: "silent",
            telegramLink: "https://t.me/hextechcar",
            botImageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyERDdGHGjmXPv_6tCBIChmD-svWkJatQlpzfxY5WqFg&s=10"
        };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log('✅ config.json créé avec valeurs par défaut');
    }
} catch (error) {
    console.log('❌ Erreur chargement config.json:', error.message);
    config = {
        prefix: ".",
        ownerNumber: "243983205767",
        botPublic: false,
        fakeRecording: false,
        antiLink: true,
        alwaysOnline: true,
        logLevel: "silent",
        telegramLink: "https://t.me/hextechcar",
        botImageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCIwiz88R6J5X8x1546iN-aFfGXxKtlUQDStbvnHV7sb-FHYTQKQd358M&s=10"
    };
}

// Variables globales depuis config.json
const prefix = config.prefix || ".";
let botPublic = config.botPublic || true;
let welcomeEnabled = false;
let fakeRecording = config.fakeRecording || false;
const antiLink = config.antiLink || true;
const alwaysOnline = config.alwaysOnline || true;
const OWNER_NUMBER = `${config.ownerNumber.replace(/\D/g, '')}@s.whatsapp.net`;
const telegramLink = config.telegramLink || "https://t.me/hextechcar";
const botImageUrl = config.botImageUrl || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyERDdGHGjmXPv_6tCBIChmD-svWkJatQlpzfxY5WqFg&s=10";
const logLevel = config.logLevel || "silent";

console.log('📋 Configuration chargée:');
console.log(`  • Prefix: ${prefix}`);
console.log(`  • Owner: ${OWNER_NUMBER}`);
console.log(`  • Mode: ${botPublic ? 'Public' : 'Privé'}`);
console.log(`  • Fake Recording: ${fakeRecording ? 'Activé' : 'Désactivé'}`);
console.log(`  • Session ID: ${sessionId}`);
console.log(`  • Phone: ${phoneNumber || 'ATTENTE DE PAIRING'}`);
console.log(`  • Web Mode: ${webMode ? 'OUI' : 'NON'}`);
console.log(`  • Render: ${isRender ? 'OUI' : 'NON'}`);
console.log(`  • Force Pairing: ${forcePairing ? 'OUI' : 'NON'}`);

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
// 📁 DOSSIERS
// ============================================
const VV_FOLDER = path.join(__dirname, '.VV');
const DELETED_MESSAGES_FOLDER = path.join(__dirname, 'deleted_messages');
const COMMANDS_FOLDER = path.join(__dirname, 'commands');
const VIEW_ONCE_FOLDER = path.join(__dirname, 'viewOnce');
const DELETED_IMAGES_FOLDER = path.join(__dirname, 'deleted_images');

// Vérification des dossiers
(() => {
    [VV_FOLDER, DELETED_MESSAGES_FOLDER, COMMANDS_FOLDER, VIEW_ONCE_FOLDER, DELETED_IMAGES_FOLDER].forEach(folder => {
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
            console.log(`${colors.green}✅ Dossier ${path.basename(folder)} créé${colors.reset}`);
        } else {
            console.log(`${colors.cyan}📁 Dossier ${path.basename(folder)} déjà existant${colors.reset}`);
        }
    });
})();

// ============================================
// 🎯 FONCTION POUR LE WEB
// ============================================
async function startBotForWeb(phone, pairingCode = null) {
    console.log('🎯 DÉMARRAGE BOT POUR WEB');
    console.log(`📱 Numéro: ${phone || 'ATTENTE DE PAIRING'}`);
    console.log(`🔑 Mode: ${pairingCode ? 'CODE FOURNI' : 'GÉNÉRATION DE CODE'}`);
    
    return await startBot();
}

// ============================================
// 🎯 FONCTION PRINCIPALE DU BOT
// ============================================
async function startBot() {
    try {
        // IMPORT DYNAMIQUE DE BAILEYS (CORRECTION)
        console.log('📥 Chargement de BaileyJS...');
        
        const baileysModule = await import('@whiskeysockets/baileys');
        
        // Accéder aux exports correctement
        const { 
            default: makeWASocket,
            useMultiFileAuthState,
            downloadContentFromMessage,
            DisconnectReason,
            fetchLatestBaileysVersion,
            Browsers,
            delay,
            getContentType
        } = baileysModule;
        
        console.log(`${colors.green}✅ BaileyJS importé avec succès${colors.reset}`);
        console.log(`🔧 Version: ${baileysModule.version || '6.5.0'}`);
        
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

        // Créer le logger
        const logger = pino({ level: logLevel });

        async function initializeBot() {
            try {
                const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
                const { version } = await fetchLatestBaileysVersion();
                
                const sock = makeWASocket({
                    version,
                    logger: logger,
                    printQRInTerminal: false,
                    auth: state,
                    browser: Browsers.ubuntu("Chrome"),
                    markOnlineOnConnect: alwaysOnline,
                    syncFullHistory: false,
                });

                sock.ev.on("creds.update", saveCreds);

                sock.ev.on("connection.update", async (update) => {
                    const { connection, lastDisconnect, qr } = update;
                    
                    console.log(`${colors.cyan}📡 État de connexion: ${connection || 'inconnu'}${colors.reset}`);
                    
                    // 🎯 MODE WEB : Générer pairing code automatiquement
                    if (webMode && phoneNumber && connection === "open") {
                        console.log(`${colors.cyan}🎯 MODE WEB - Génération pairing code pour: ${phoneNumber}${colors.reset}`);
                        
                        setTimeout(async () => {
                            try {
                                console.log(`${colors.cyan}🔑 Génération du pairing code...${colors.reset}`);
                                const code = await sock.requestPairingCode(phoneNumber);
                                console.log(`${colors.green}✅✅✅ CODE DE PAIRING: ${code}${colors.reset}`);
                                
                                // Message spécial pour le serveur web (IMPORTANT)
                                console.log(`🎯🎯🎯 PAIRING_CODE_GENERATED: ${code} 🎯🎯🎯`);
                                console.log(`📱 Numéro: ${phoneNumber}`);
                                console.log(`🔑 Code: ${code}`);
                                console.log(`🌐 Session: ${sessionId}`);
                                
                                // Message au propriétaire
                                try {
                                    await sock.sendMessage(OWNER_NUMBER, {
                                        text: `✅ *BOT WEB CONNECTÉ*\n\n📱 Numéro: ${phoneNumber}\n🔑 Code: ${code}\n🌐 Session: ${sessionId}\n\n🔗 Utilisez ce code dans WhatsApp → Périphériques liés`
                                    });
                                } catch (ownerError) {
                                    console.log(`${colors.yellow}⚠️ Impossible message owner${colors.reset}`);
                                }
                            } catch (pairError) {
                                console.log(`${colors.red}❌ Erreur pairing: ${pairError.message}${colors.reset}`);
                            }
                        }, 3000);
                    }
                    
                    if (connection === "close") {
                        const reason = new Error(lastDisconnect?.error)?.output?.statusCode;
                        console.log(`${colors.red}🔌 Déconnexion détectée (${reason || 'unknown'})${colors.reset}`);
                        
                        if (reason === DisconnectReason.loggedOut) {
                            console.log(`${colors.red}❌ Déconnecté, nettoyage...${colors.reset}`);
                            try {
                                if (fs.existsSync("auth_info_baileys")) {
                                    exec("rm -rf auth_info_baileys", () => {
                                        console.log(`${colors.yellow}🔄 Redémarrage dans 5 secondes...${colors.reset}`);
                                        setTimeout(() => {
                                            initializeBot();
                                        }, 5000);
                                    });
                                }
                            } catch (error) {
                                console.log(`${colors.red}❌ Erreur nettoyage: ${error.message}${colors.reset}`);
                            }
                        } else {
                            console.log(`${colors.yellow}🔄 Reconnexion automatique...${colors.reset}`);
                            setTimeout(() => {
                                initializeBot();
                            }, 5000);
                        }
                    } else if (connection === "open") {
                        console.log(`${colors.green}✅✅✅ CONNECTÉ À WHATSAPP!${colors.reset}`);
                        
                        try {
                            await sock.sendMessage(OWNER_NUMBER, {
                                text: `✅ *HEX-GATE CONNECTÉE*\n\n🚀 HEXGATE V3 en ligne!\n📱 Session: ${sessionId}\n📊 Numéro: ${phoneNumber || 'PAIRING MODE'}\n🔧 Mode: ${botPublic ? 'PUBLIC' : 'PRIVÉ'}`
                            });
                        } catch (error) {
                            console.log(`${colors.yellow}⚠️ Impossible message owner${colors.reset}`);
                        }
                    }
                    
                    // Si QR disponible (fallback)
                    if (qr) {
                        console.log(`${colors.yellow}📱 QR Code disponible (mode fallback)${colors.reset}`);
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
                            
                            console.log(`${colors.cyan}📨 Message de ${from}: ${body.substring(0, 50)}...${colors.reset}`);
                            
                            // Traitement des commandes simples
                            if (body.startsWith(prefix)) {
                                const args = body.slice(prefix.length).trim().split(/ +/);
                                const command = args.shift().toLowerCase();
                                
                                if (command === 'ping') {
                                    await sock.sendMessage(from, {
                                        text: `🏓 PONG!\n\n🤖 HEXGATE V3\n📱 Session: ${sessionId}\n🕐 ${new Date().toLocaleTimeString()}`
                                    });
                                }
                                
                                if (command === 'menu') {
                                    await sock.sendMessage(from, {
                                        text: `┏━━❖ ＨＥＸＧＡＴＥ ❖━━┓
┃ 🛡️ HEX✦GATE V3
┃ 📱 Session: ${sessionId}
┃ 👨‍💻 Dev: T.me/hextechcar
┃ 
┃ Commandes disponibles:
┃ • ${prefix}ping - Test de réponse
┃ • ${prefix}menu - Ce menu
┃ • ${prefix}info - Info bot
┃ 
┗━━━━━━━━━━━━━━━━━━┛
*powered by HEXTECH™*`
                                    });
                                }
                            }
                        }
                    } catch (error) {
                        console.log(`${colors.red}❌ Erreur traitement message: ${error.message}${colors.reset}`);
                    }
                });

                // Gestion des erreurs
                sock.ev.on("connection.update", (update) => {
                    if (update.connection === "close") {
                        console.log(`${colors.red}❌ Connexion fermée${colors.reset}`);
                    }
                });

                console.log(`${colors.green}🤖 Bot WhatsApp démarré avec succès!${colors.reset}`);
                console.log(`${colors.cyan}⏳ Attente du pairing code...${colors.reset}`);

                return sock;

            } catch (error) {
                console.log(`${colors.red}❌ Erreur initialisation: ${error.message}${colors.reset}`);
                throw error;
            }
        }

        // Démarrer l'initialisation
        await initializeBot();

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
                    console.log(`${colors.yellow}• Render: ${isRender ? 'OUI' : 'NON'}${colors.reset}`);
                    break;
                case "exit":
                    console.log(`${colors.yellow}👋 Arrêt...${colors.reset}`);
                    rl.close();
                    process.exit(0);
                    break;
                default:
                    console.log(`${colors.yellow}Commandes: status, exit${colors.reset}`);
            }
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
