// bot/index.js

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

console.log('🔧 HEXGATE V3 - Mode Web Interface');
console.log('📦 Version correcte: @whiskeysockets/baileys (avec un seul L)');

// ============================================
// 🎯 VARIABLES D'ENVIRONNEMENT
// ============================================
const sessionId = process.env.SESSION_ID || 'default-session';
const phoneNumber = process.env.PHONE_NUMBER || '';
const webMode = process.env.WEB_MODE === 'true';
const isRender = process.env.IS_RENDER === 'true';

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
// 📦 IMPORTS DES MODULES BAILEY
// ============================================
let makeWASocket, useMultiFileAuthState, downloadContentFromMessage, DisconnectReason, fetchLatestBaileysVersion, Browsers, delay, getContentType;

(async () => {
    try {
        const baileysImport = await import('@whiskeysockets/baileys');
        makeWASocket = baileysImport.default;
        useMultiFileAuthState = baileysImport.useMultiFileAuthState;
        downloadContentFromMessage = baileysImport.downloadContentFromMessage;
        DisconnectReason = baileysImport.DisconnectReason;
        fetchLatestBaileysVersion = baileysImport.fetchLatestBaileysVersion;
        Browsers = baileysImport.Browsers;
        delay = baileysImport.delay;
        getContentType = baileysImport.getContentType;
        
        console.log(`${colors.green}✅ BaileyJS importé avec succès${colors.reset}`);
        
        // Démarrer le bot après l'import
        startBot().catch(error => {
            console.log(`${colors.red}❌ Erreur démarrage bot: ${error.message}${colors.reset}`);
            process.exit(1);
        });
    } catch (error) {
        console.log(`${colors.red}❌ Erreur import BaileyJS: ${error.message}${colors.reset}`);
        console.log('📥 Installation automatique en cours...');
        
        try {
            const { execSync } = require('child_process');
            console.log('🚀 Installation de @whiskeysockets/baileys...');
            execSync('npm install @whiskeysockets/baileys@^6.5.0', { stdio: 'inherit' });
            
            console.log('🔄 Redémarrage dans 3 secondes...');
            setTimeout(() => {
                process.exit(0);
            }, 3000);
        } catch (installError) {
            console.log(`${colors.red}❌ Échec installation: ${installError.message}${colors.reset}`);
            process.exit(1);
        }
    }
})();

// ============================================
// 🛡️ FONCTIONS UTILITAIRES
// ============================================

// Emojis pour réactions
const randomEmojis = ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"];

// Map pour stocker les messages en mémoire
const messageStore = new Map();
const viewOnceStore = new Map();
let processingMessages = new Set();
let isProcessing = false;
let lastDeletedMessage = new Map();
let antiLinkCooldown = new Map();
let botMessages = new Set();
let autoReact = true;

// Fonction pour envoyer des messages formatés
async function sendFormattedMessage(sock, jid, messageText, context = null) {
    const formattedMessage = `┏━━❖ ＡＲＣＡＮＥ❖━━┓
┃ 🛡️ 𝐇𝐄𝐗✦𝐆Ａ𝐓Ｅ 𝑽_1
┃
┃ 👨‍💻 𝙳𝙴𝚅 : ${context?.pushName || 'Inconnu'}
┗━━━━━━━━━━━━━━━┛

┏━━【𝙷𝙴𝚇𝙶𝙰𝚃𝙴_𝐕1】━━┓
┃
┃ ${messageText}
┗━━━━━━━━━━━━━━━┛

 ┏━━【𝚃𝙴𝙻𝙴𝙶𝚁𝙰𝙼 】━━┓
┃
┃ ${telegramLink}
┃
┗━━━━━━━━━━━━━━━┛`;

    try {
        if (botImageUrl && botImageUrl.startsWith('http')) {
            const sentMsg = await sock.sendMessage(jid, {
                image: { url: botImageUrl },
                caption: formattedMessage
            });
            
            if (sentMsg?.key?.id) {
                botMessages.add(sentMsg.key.id);
                setTimeout(() => botMessages.delete(sentMsg.key.id), 300000);
            }
            return;
        }
    } catch (imageError) {
        console.log(`${colors.yellow}⚠️ Erreur avec l'image, envoi texte seulement${colors.reset}`);
    }

    const sentMsg = await sock.sendMessage(jid, { 
        text: formattedMessage 
    });
    
    if (sentMsg?.key?.id) {
        botMessages.add(sentMsg.key.id);
        setTimeout(() => botMessages.delete(sentMsg.key.id), 300000);
    }
}

// ============================================
// 🎮 SYSTÈME DE COMMANDES
// ============================================
class CommandHandler {
    constructor() {
        this.commands = new Map();
        this.initializeCommands();
    }

    initializeCommands() {
        console.log(`${colors.cyan}📁 Initialisation des commandes...${colors.reset}`);
        
        // Commandes intégrées de base
        this.loadBuiltinCommands();
        
        // Charger les commandes du dossier
        this.loadCommandsFromDirectory();
        
        console.log(`${colors.green}✅ ${this.commands.size} commandes chargées${colors.reset}`);
    }

    loadCommandsFromDirectory() {
        try {
            if (!fs.existsSync(COMMANDS_FOLDER)) {
                console.log(`${colors.yellow}⚠️ Dossier commands non trouvé${colors.reset}`);
                return;
            }

            const files = fs.readdirSync(COMMANDS_FOLDER);
            for (const file of files) {
                if (file.endsWith('.js')) {
                    try {
                        const commandPath = path.join(COMMANDS_FOLDER, file);
                        const command = require(commandPath);
                        
                        if (command && command.name && command.execute) {
                            this.commands.set(command.name.toLowerCase(), command);
                            console.log(`${colors.green}✅ Commande: ${command.name}${colors.reset}`);
                        }
                    } catch (error) {
                        console.log(`${colors.yellow}⚠️ Erreur chargement ${file}: ${error.message}${colors.reset}`);
                    }
                }
            }
        } catch (error) {
            console.log(`${colors.red}❌ Erreur scan commands: ${error.message}${colors.reset}`);
        }
    }

    loadBuiltinCommands() {
        // Commande PING
        this.commands.set("ping", {
            name: "ping",
            description: "Test de réponse du bot",
            execute: async (sock, msg, args, context) => {
                const from = msg.key.remoteJid;
                await sendFormattedMessage(sock, from, `🏓 *PONG!*\n\n🤖 HEXGATE V1 - En ligne!\n👤 Envoyé par: ${msg.pushName || 'Inconnu'}`, { pushName: msg.pushName });
            }
        });

        // Commande MENU
        this.commands.set("menu", {
            name: "menu",
            description: "Affiche le menu des commandes",
            execute: async (sock, msg, args, context) => {
                const from = msg.key.remoteJid;
                const menuText = `
┏━━❖ ＡＲＣＡＮＥ ❖━━┓
┃ 🛡️ HEX✦GATE V1
┃ 👨‍💻 Dev : T.me/hextechcar
┃ 
┗━━━━━━━━━━━━━━━━

  【 ${msg.pushName}】
  
╭━━〔 𝚙𝚛𝚘𝚙𝚛𝚒𝚎́𝚝𝚊𝚒𝚛𝚎 〕━━┈⊷
┃✰│➫ ${prefix}𝚙𝚒𝚗𝚐
┃✰│➫ ${prefix}𝚖𝚎𝚗𝚞
┃✰│➫ ${prefix}𝚑𝚎𝚕𝚙
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 𝙶𝚁𝙾𝚄𝙿𝙴 〕━━┈⊷
┃✰│➫ ${prefix}𝚒𝚗𝚏𝚘
┃✰│➫ ${prefix}𝚕𝚒𝚗𝚔
┃✰│➫ ${prefix}𝚝𝚊𝚐𝚊𝚕𝚕
╰━━━━━━━━━━━━━━━┈⊷

  *powered by HEXTECH™*`;

                try {
                    await sock.sendMessage(from, {
                        image: { url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRv53_O-g3xpl_VtrctVQ0HbSUMCJ3fUkfx6l1SiUc64ag4ypnPyBR5k0s&s=10" },
                        caption: menuText
                    });
                } catch (error) {
                    await sock.sendMessage(from, { text: menuText });
                }
            }
        });

        // Commande HELP
        this.commands.set("help", {
            name: "help",
            description: "Affiche l'aide",
            execute: async (sock, msg, args, context) => {
                const from = msg.key.remoteJid;
                await sendFormattedMessage(sock, from, `🛠️ *AIDE HEXGATE*\n\nPrefix: ${prefix}\n\nCommandes:\n• ${prefix}ping - Test\n• ${prefix}menu - Menu complet\n• ${prefix}help - Aide\n• ${prefix}info - Info groupe\n• ${prefix}link - Lien groupe\n\n👑 Propriétaire: ${config.ownerNumber}`, { pushName: msg.pushName });
            }
        });

        // Commande INFO (groupe)
        this.commands.set("info", {
            name: "info",
            description: "Info du groupe",
            execute: async (sock, msg, args) => {
                const from = msg.key.remoteJid;
                if (!from.endsWith('@g.us')) {
                    return await sock.sendMessage(from, { text: "❌ Commande groupe uniquement" });
                }

                try {
                    const metadata = await sock.groupMetadata(from);
                    const participants = metadata.participants || [];
                    
                    const infoText = `
┏━━━❖ ＧＲＯＵＰ ＩＮＦＯ ❖━━━┓
┃ Nom : ${metadata.subject || "Groupe sans nom"}
┃ ID : ${metadata.id}
┃ Membres : ${participants.length}
┃ Création : ${new Date(metadata.creation * 1000).toLocaleDateString()}
┗━━━━━━━━━━━━━━━━━━━━━━┛
*powered by HEXTECH*`;

                    await sock.sendMessage(from, { text: infoText });
                } catch (err) {
                    await sock.sendMessage(from, { text: "❌ Impossible de récupérer les infos" });
                }
            }
        });

        // Commande LINK
        this.commands.set("link", {
            name: "link",
            description: "Lien du groupe",
            execute: async (sock, msg, args) => {
                const from = msg.key.remoteJid;
                if (!from.endsWith('@g.us')) {
                    return await sock.sendMessage(from, { text: "❌ Commande groupe uniquement" });
                }

                try {
                    const inviteCode = await sock.groupInviteCode(from);
                    await sock.sendMessage(from, {
                        text: `🔗 Lien du groupe :\nhttps://chat.whatsapp.com/${inviteCode}`
                    });
                } catch (err) {
                    await sock.sendMessage(from, { text: "❌ Impossible de récupérer le lien" });
                }
            }
        });

        // Commande TAGALL
        this.commands.set("tagall", {
            name: "tagall",
            description: "Mentionne tout le monde",
            execute: async (sock, msg, args) => {
                const from = msg.key.remoteJid;
                if (!from.endsWith('@g.us')) {
                    return await sock.sendMessage(from, { text: "❌ Commande groupe uniquement" });
                }

                try {
                    const metadata = await sock.groupMetadata(from);
                    const participants = metadata.participants || [];
                    
                    const mentions = participants.map(p => p.id);
                    const text = args.join(" ") || "📢 Mention générale !";
                    
                    await sock.sendMessage(from, {
                        text: text,
                        mentions: mentions
                    });
                } catch (err) {
                    await sock.sendMessage(from, { text: "❌ Erreur lors du tagall" });
                }
            }
        });

        // Commande SAVE
        this.commands.set("save", {
            name: "save",
            description: "Sauvegarde un message",
            execute: async (sock, msg, args) => {
                const from = msg.key.remoteJid;
                await sock.sendMessage(from, { text: "✅ Message sauvegardé pour restauration" });
            }
        });

        // Commande VV (vue unique)
        this.commands.set("vv", {
            name: "vv",
            description: "Voir vue unique sauvegardée",
            execute: async (sock, msg, args) => {
                const from = msg.key.remoteJid;
                const data = viewOnceStore.get(from);

                if (!data) {
                    return await sock.sendMessage(from, { text: "❌ Aucune vue unique sauvegardée" });
                }

                try {
                    await sock.sendMessage(from, {
                        image: fs.readFileSync(data.imagePath),
                        caption: `👁️ *Vue unique restaurée*\n👤 Par: ${data.sender}`
                    });
                    
                    viewOnceStore.delete(from);
                    fs.unlinkSync(data.imagePath);
                } catch (error) {
                    await sock.sendMessage(from, { text: "❌ Erreur restauration" });
                }
            }
        });

        console.log(`${colors.green}✅ ${this.commands.size} commandes intégrées chargées${colors.reset}`);
    }

    async execute(commandName, sock, msg, args, context) {
        const cmd = commandName.toLowerCase();
        
        if (!this.commands.has(cmd)) {
            if (context?.botPublic) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `❌ Commande "${cmd}" non reconnue. Tapez ${prefix}menu`
                });
            }
            return false;
        }
        
        const command = this.commands.get(cmd);
        
        try {
            if (autoReact) {
                const randomEmoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)];
                await sock.sendMessage(msg.key.remoteJid, {
                    react: { text: randomEmoji, key: msg.key }
                });
            }
            
            await command.execute(sock, msg, args, context);
            return true;
        } catch (error) {
            console.log(`${colors.red}❌ Erreur commande ${cmd}: ${error.message}${colors.reset}`);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Erreur: ${error.message}`
            });
            return false;
        }
    }
}

// ============================================
// 🔧 FONCTIONS UTILITAIRES
// ============================================

// Vérifier si propriétaire
function isOwner(senderJid) {
    const normalizedJid = senderJid.split(":")[0];
    const ownerJid = OWNER_NUMBER.split(":")[0];
    return normalizedJid === ownerJid;
}

// Vérifier si admin
async function isAdminInGroup(sock, jid, senderJid) {
    try {
        if (!jid.endsWith("@g.us")) return false;
        
        const metadata = await sock.groupMetadata(jid);
        const participant = metadata.participants.find(p => p.id === senderJid);
        
        if (!participant) return false;
        return participant.admin === "admin" || participant.admin === "superadmin";
    } catch (error) {
        return false;
    }
}

// ============================================
// 🎯 FONCTION PRINCIPALE DU BOT
// ============================================
async function startBot() {
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
║${colors.green} ✅ RESTAURATION MESSAGES & IMAGES              ${colors.magenta}║
║${colors.green} ✅ ANTI-LINK PROTECTION                        ${colors.magenta}║
║${colors.green} ✅ COMMANDES COMPLÈTES                         ${colors.magenta}║
╚══════════════════════════════════════════════════╝${colors.reset}
`);

    async function askForPhoneNumber() {
        return new Promise((resolve) => {
            if (webMode && phoneNumber) {
                console.log(`${colors.cyan}📱 Numéro web: ${phoneNumber}${colors.reset}`);
                resolve(phoneNumber);
                return;
            }
            
            rl.question(`${colors.cyan}📱 INSÉREZ VOTRE NUMÉRO WHATSAPP : ${colors.reset}`, (phone) => {
                resolve(phone.trim());
            });
        });
    }

    try {
        const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
        const { version } = await fetchLatestBaileysVersion();
        
        const sock = makeWASocket({
            version,
            logger: require("pino")({ level: logLevel }),
            printQRInTerminal: false,
            auth: state,
            browser: Browsers.ubuntu("Chrome"),
            markOnlineOnConnect: alwaysOnline,
            syncFullHistory: false,
        });

        const commandHandler = new CommandHandler();

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            // 🎯 MODE WEB : Générer pairing code automatiquement
            if (webMode && phoneNumber && connection === "open") {
                console.log(`${colors.cyan}🎯 MODE WEB - Génération pairing code...${colors.reset}`);
                
                setTimeout(async () => {
                    try {
                        console.log(`${colors.cyan}🔑 Génération code pour: ${phoneNumber}${colors.reset}`);
                        const code = await sock.requestPairingCode(phoneNumber);
                        console.log(`${colors.green}✅ Code de pairing: ${code}${colors.reset}`);
                        
                        // Message spécial détecté par server.js
                        console.log(`🎯 PAIRING_CODE_GENERATED: ${code}`);
                        
                        // Message au propriétaire
                        await sock.sendMessage(OWNER_NUMBER, {
                            text: `✅ *BOT WEB CONNECTÉ*\n\n📱 Numéro: ${phoneNumber}\n🔑 Code: ${code}\n🌐 Session: ${sessionId}`
                        });
                    } catch (pairError) {
                        console.log(`${colors.red}❌ Erreur pairing: ${pairError.message}${colors.reset}`);
                    }
                }, 3000);
            }
            
            if (connection === "close") {
                const reason = new Error(lastDisconnect?.error)?.output?.statusCode;
                if (reason === DisconnectReason.loggedOut) {
                    console.log(`${colors.red}❌ Déconnecté, nettoyage...${colors.reset}`);
                    exec("rm -rf auth_info_baileys", () => {
                        startBot();
                    });
                } else {
                    startBot();
                }
            } else if (connection === "open") {
                console.log(`${colors.green}✅ Connecté à WhatsApp!${colors.reset}`);
                
                try {
                    await sock.sendMessage(OWNER_NUMBER, {
                        text: `✅ *HEX-GATE CONNECTEE*\n\n🚀 HEXGATE V1 en ligne!\n📊 Commandes: ${commandHandler.commands.size}\n🔧 Mode: ${botPublic ? 'PUBLIC' : 'PRIVÉ'}`
                    });
                } catch (error) {
                    console.log(`${colors.yellow}⚠️ Impossible message owner${colors.reset}`);
                }
            }
        });

        // ============================================
        // 🎯 GESTION DES MESSAGES SUPPRIMÉS
        // ============================================
        sock.ev.on("messages.upsert", async ({ messages }) => {
            try {
                for (const msg of messages) {
                    if (!msg.message) continue;

                    const from = msg.key.remoteJid;
                    const sender = msg.key.participant || msg.key.remoteJid;
                    const isOwnerMsg = isOwner(sender);
                    const isAdminMsg = await isAdminInGroup(sock, from, sender);

                    // 📨 DÉTECTION MESSAGES SUPPRIMÉS
                    if (msg.message?.protocolMessage?.type === 0) {
                        const deletedKey = msg.message.protocolMessage.key;
                        const deletedId = deletedKey.id;
                        const chatId = deletedKey.remoteJid || from;

                        console.log(`${colors.magenta}🚨 SUPPRESSION DÉTECTÉE: ${deletedId}${colors.reset}`);

                        let originalMsg = messageStore.get(deletedId);
                        
                        if (!originalMsg) {
                            const filePath = path.join(DELETED_MESSAGES_FOLDER, `${deletedId}.json`);
                            if (fs.existsSync(filePath)) {
                                originalMsg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                            }
                        }

                        if (originalMsg) {
                            const originalText = originalMsg.message?.conversation ||
                                                originalMsg.message?.extendedTextMessage?.text ||
                                                originalMsg.message?.imageMessage?.caption ||
                                                "[Message non textuel]";

                            // 🚫 ANTI-LINK : Vérifier si le message contient un lien
                            const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
                            const containsLink = linkRegex.test(originalText);
                            
                            if (containsLink && !isOwnerMsg && !isAdminMsg) {
                                console.log(`${colors.yellow}⚠️ Message avec lien, non restauré${colors.reset}`);
                                continue;
                            }

                            // 🔥 RESTAURATION DU MESSAGE
                            const deletedBy = msg.key.participant || msg.key.remoteJid;
                            const mention = deletedBy.split("@")[0];

                            await sock.sendMessage(chatId, {
                                text: `*𝙼𝚎𝚜𝚜𝚊𝚐𝚎 𝚜𝚞𝚙𝚙𝚛𝚒𝚖𝚎́ 𝚍𝚎:* @${mention}\n\n*Message :* ${originalText}\n\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇𝚃𝙴𝙲𝙷`,
                                mentions: [deletedBy]
                            });

                            console.log(`${colors.green}✅ Message restauré de @${mention}${colors.reset}`);
                            
                            messageStore.delete(deletedId);
                            const filePath = path.join(DELETED_MESSAGES_FOLDER, `${deletedId}.json`);
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                            }
                        }
                        continue;
                    }

                    // 📸 SAUVEGARDE VUE UNIQUE
                    const vo = msg.message?.viewOnceMessageV2 || msg.message?.viewOnceMessage;
                    if (vo) {
                        const inner = vo.message;
                        if (inner?.imageMessage) {
                            try {
                                const msgId = msg.key.id;
                                const stream = await downloadContentFromMessage(inner.imageMessage, "image");
                                let buffer = Buffer.from([]);
                                for await (const chunk of stream) {
                                    buffer = Buffer.concat([buffer, chunk]);
                                }

                                const imgPath = path.join(VIEW_ONCE_FOLDER, `${msgId}.jpg`);
                                fs.writeFileSync(imgPath, buffer);

                                viewOnceStore.set(from, {
                                    imagePath: imgPath,
                                    sender: msg.pushName || "Inconnu",
                                    time: Date.now()
                                });

                                console.log(`${colors.cyan}👁️ Vue unique sauvegardée${colors.reset}`);
                            } catch (error) {}
                        }
                    }

                    // 💾 SAUVEGARDE MESSAGES POUR RESTAURATION
                    const msgType = Object.keys(msg.message)[0];
                    if (msgType !== "protocolMessage" && !msg.key.fromMe) {
                        const body = msg.message.conversation ||
                                     msg.message.extendedTextMessage?.text ||
                                     msg.message.imageMessage?.caption ||
                                     "";
                        
                        // 🚫 ANTI-LINK : Vérifier avant sauvegarde
                        const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
                        const containsLink = linkRegex.test(body);
                        
                        if (containsLink && !isOwnerMsg && !isAdminMsg) {
                            console.log(`${colors.red}🚫 LIEN BLOQUÉ de ${sender} (non-admin)${colors.reset}`);
                            
                            const now = Date.now();
                            const lastWarn = antiLinkCooldown.get(from) || 0;
                            
                            if (now - lastWarn > 60000) {
                                antiLinkCooldown.set(from, now);
                                await sock.sendMessage(from, {
                                    text: `*⚠️ ATTENTION*\nLes liens ne sont pas autorisés!`
                                });
                            }
                            
                            try {
                                await sock.sendMessage(from, { delete: msg.key });
                            } catch (deleteError) {}
                            continue;
                        }

                        // SAUVEGARDE NORMALE
                        const savedMsg = {
                            key: msg.key,
                            message: msg.message,
                            pushName: msg.pushName || sender,
                            timestamp: Date.now(),
                            messageType: msgType
                        };

                        messageStore.set(msg.key.id, savedMsg);
                        
                        const filePath = path.join(DELETED_MESSAGES_FOLDER, `${msg.key.id}.json`);
                        fs.writeFileSync(filePath, JSON.stringify(savedMsg, null, 2));

                        // Sauvegarde image si présente
                        if (msgType === 'imageMessage') {
                            try {
                                const imageMsg = msg.message.imageMessage;
                                const stream = await downloadContentFromMessage(imageMsg, 'image');
                                let buffer = Buffer.from([]);
                                
                                for await (const chunk of stream) {
                                    buffer = Buffer.concat([buffer, chunk]);
                                }
                                
                                const imagePath = path.join(DELETED_IMAGES_FOLDER, `${msg.key.id}.jpg`);
                                fs.writeFileSync(imagePath, buffer);
                            } catch (imageError) {}
                        }
                    }

                    // 🎯 TRAITEMENT DES COMMANDES
                    const messageType = Object.keys(msg.message)[0];
                    let body = "";
                    
                    if (messageType === "conversation") {
                        body = msg.message.conversation;
                    } else if (messageType === "extendedTextMessage") {
                        body = msg.message.extendedTextMessage.text;
                    } else if (messageType === "imageMessage") {
                        body = msg.message.imageMessage?.caption || "";
                    }
                    
                    if (body.startsWith(prefix)) {
                        const args = body.slice(prefix.length).trim().split(/ +/);
                        const command = args.shift().toLowerCase();
                        
                        const context = {
                            isOwner: isOwnerMsg,
                            sender: sender,
                            prefix: prefix,
                            botPublic: botPublic || isOwnerMsg,
                            pushName: msg.pushName
                        };
                        
                        if (botPublic || isOwnerMsg) {
                            await commandHandler.execute(command, sock, msg, args, context);
                        }
                    }
                }
            } catch (error) {
                console.log(`${colors.red}❌ Erreur traitement: ${error.message}${colors.reset}`);
            }
        });

        // 🎭 GESTION RÉACTIONS
        sock.ev.on("messages.reaction", async (reactions) => {
            for (const reaction of reactions) {
                console.log(`${colors.magenta}🎭 Réaction: ${reaction.reaction.text}${colors.reset}`);
            }
        });

        // 👥 BIENVENUE AUTO
        sock.ev.on("group-participants.update", async (update) => {
            if (welcomeEnabled && update.action === "add") {
                try {
                    const groupJid = update.id;
                    const newMemberJid = update.participants[0];
                    
                    await sock.sendMessage(groupJid, {
                        image: { url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhoFTz9jVFxTVGAuh9RJIaNF0wH8WGvlOHM-q50RHZzg&s=10" },
                        caption: `┏━━━❖ ＡＲＣＡＮＥ❖━━━━┓\n┃ @${newMemberJid.split("@")[0]}\n┃ \n┃ 𝙱𝚒𝚎𝚗𝚟𝚎𝚗𝚞𝚎 !\n┗━━━━━━━━━━━━━━━━━━┛`,
                        mentions: [newMemberJid]
                    });
                } catch (err) {}
            }
        });

        // 🎤 FAKE RECORDING
        if (fakeRecording) {
            sock.ev.on("messages.upsert", async ({ messages }) => {
                const msg = messages[0];
                if (msg.message && !msg.key.fromMe) {
                    try {
                        await sock.sendPresenceUpdate('recording', msg.key.remoteJid);
                        await delay(Math.random() * 2000 + 1000);
                        await sock.sendPresenceUpdate('available', msg.key.remoteJid);
                    } catch (error) {}
                }
            });
        }

        // 🎮 CONSOLE INTERACTIVE
        rl.on("line", (input) => {
            const args = input.trim().split(/ +/);
            const command = args.shift().toLowerCase();
            
            switch (command) {
                case "public":
                    botPublic = true;
                    console.log(`${colors.green}✅ Mode public activé${colors.reset}`);
                    break;
                case "private":
                    botPublic = false;
                    console.log(`${colors.green}✅ Mode privé activé${colors.reset}`);
                    break;
                case "status":
                    console.log(`${colors.cyan}📊 STATUT${colors.reset}`);
                    console.log(`${colors.yellow}• Mode: ${botPublic ? 'PUBLIC' : 'PRIVÉ'}${colors.reset}`);
                    console.log(`${colors.yellow}• Commandes: ${commandHandler.commands.size}${colors.reset}`);
                    console.log(`${colors.yellow}• Messages sauvegardés: ${messageStore.size}${colors.reset}`);
                    console.log(`${colors.yellow}• Propriétaire: ${config.ownerNumber}${colors.reset}`);
                    break;
                case "exit":
                    console.log(`${colors.yellow}👋 Arrêt...${colors.reset}`);
                    rl.close();
                    process.exit(0);
                    break;
                default:
                    console.log(`${colors.yellow}Commandes: public, private, status, exit${colors.reset}`);
            }
        });

    } catch (error) {
        console.log(`${colors.red}❌ Erreur démarrage: ${error.message}${colors.reset}`);
        process.exit(1);
    }
}

// ============================================
// 📦 EXPORT POUR SERVEUR WEB
// ============================================
export { startBotForWeb };
