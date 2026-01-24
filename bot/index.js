// bot/index.js - VERSION COMPLÈTE AVEC CHARGEMENT COMMANDES - CORRECTION DÉFINITIVE
import { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import P from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// 🔧 CONFIGURATION
// ============================================
const SESSION_ID = process.env.SESSION_ID || 'default-session';
const SESSION_PATH = process.env.SESSION_PATH || path.join(__dirname, '..', 'sessions', SESSION_ID);
const PHONE_NUMBER = process.env.PHONE_NUMBER || "243816107573";
const IS_RENDER = process.env.IS_RENDER === 'true';
const FORCE_PAIRING_MODE = process.env.FORCE_PAIRING_MODE === 'true';

console.log('\n🎯 BOT HEX-TECH - CHARGEMENT COMPLET 🎯');
console.log('========================================');

// ============================================
// 📁 CHARGEMENT CONFIGURATION
// ============================================
let config = {};
try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log('✅ Configuration chargée');
    } else {
        config = {
            prefix: ".",
            ownerNumber: PHONE_NUMBER,
            botPublic: true,
            fakeRecording: false,
            antiLink: true,
            alwaysOnline: true,
            logLevel: "silent",
            telegramLink: "https://t.me/hextechcar",
            botImageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyERDdGHGjmXPv_6tCBIChmD-svWkJatQlpzfxY5WqFg&s=10"
        };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
} catch (error) {
    console.log('❌ Erreur config:', error.message);
    config = { prefix: ".", ownerNumber: PHONE_NUMBER, botPublic: true };
}

// ============================================
// 🎯 CHARGEMENT DES COMMANDES (TON SYSTÈME)
// ============================================
const commands = new Map();

async function loadCommands() {
    try {
        const commandsDir = path.join(__dirname, 'commands');
        if (!fs.existsSync(commandsDir)) {
            console.log(`📁 Création dossier commands: ${commandsDir}`);
            fs.mkdirSync(commandsDir, { recursive: true });
            
            // Créer des exemples de commandes
            const exampleCommands = [
                {
                    name: 'antilink.js',
                    content: `// Commande antilink`
                },
                {
                    name: 'welcome.js',
                    content: `// Commande welcome`
                }
            ];
            
            for (const cmd of exampleCommands) {
                fs.writeFileSync(path.join(commandsDir, cmd.name), cmd.content);
            }
        }
        
        const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
        console.log(`📂 Chargement de ${commandFiles.length} commandes...`);
        
        for (const file of commandFiles) {
            try {
                const modulePath = path.join(commandsDir, file);
                const commandModule = await import(`file://${modulePath}`);
                
                if (commandModule) {
                    const commandName = Object.keys(commandModule)[0];
                    const command = commandModule[commandName];
                    
                    if (command && command.name && command.execute) {
                        commands.set(command.name, command);
                        console.log(`✅ Commande chargée: ${command.name}`);
                    }
                }
            } catch (err) {
                console.error(`❌ Erreur chargement commande ${file}:`, err.message);
            }
        }
        
        console.log(`✅ ${commands.size} commandes chargées avec succès`);
        return commands;
    } catch (error) {
        console.error('❌ Erreur chargement commandes:', error);
        return commands;
    }
}

// ============================================
// 🔧 FONCTIONS UTILITAIRES (TON CODE)
// ============================================
const randomEmojis = ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"];

// Créer les dossiers nécessaires
const folders = ['./.VV', './deleted_messages', './commands', './viewOnce', './deleted_images'];
folders.forEach(folder => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        console.log(`✅ Dossier créé: ${folder}`);
    }
});

let processingMessages = new Set();
let isProcessing = false;
let lastDeletedMessage = new Map();
let antiLinkCooldown = new Map();
let botMessages = new Set();
let autoReact = true;
let welcomeEnabled = false;

const messageStore = new Map();
const viewOnceStore = new Map();

// ============================================
// 📨 FONCTION DE FORMATAGE UNIFIÉE
// ============================================
async function sendFormattedMessage(sock, jid, messageText) {
    const formattedMessage = `┏━━❖ ＡＲＣＡＮＥ❖━━┓
┃ 🛡️ 𝐇𝐄𝐗✦𝐆Ａ𝐓Ｅ 𝑽_1
┃
┃ 👨‍💻 𝙳𝙴𝚅 : HEX-TECH
┗━━━━━━━━━━━━━━━┛

┏━━【𝙷𝙴𝚇𝙶𝙰𝚃𝙴_𝐕1】━━┓
┃
┃ ${messageText}
┗━━━━━━━━━━━━━━━┛

 ┏━━【𝚃𝙴𝙻𝙴𝙶𝚁𝙰𝙼 】━━┓
┃
┃ ${config.telegramLink || "https://t.me/hextechcar"}
┃
┗━━━━━━━━━━━━━━━┛`;

    try {
        if (config.botImageUrl && config.botImageUrl.startsWith('http')) {
            await sock.sendMessage(jid, {
                image: { url: config.botImageUrl },
                caption: formattedMessage
            });
        } else {
            await sock.sendMessage(jid, { 
                text: formattedMessage 
            });
        }
    } catch (error) {
        console.log(`❌ Échec envoi message: ${error.message}`);
    }
}

// ============================================
// 🔥 FONCTION POUR GÉNÉRER VRAI PAIRING CODE - CORRECTION DÉFINITIVE
// ============================================
async function generateRealPairingCode(phoneNumber) {
    console.log('\n🎯 GÉNÉRATION AUTOMATIQUE PAIRING CODE');
    console.log('==========================================');
    
    try {
        // Nettoyer le numéro
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('243') ? cleanPhone : `243${cleanPhone}`;
        
        console.log(`📱 Numéro formaté: ${formattedPhone}`);
        
        // Créer un socket temporaire
        const { state } = await useMultiFileAuthState(SESSION_PATH);
        
        const tempSock = makeWASocket({
            version: [2, 3000, 1017549512],
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'fatal' })),
            },
            logger: P({ level: 'silent' }),
            browser: Browsers.ubuntu('Chrome'),
            connectTimeoutMs: 30000,
            retryRequestDelayMs: 1000
        });
        
        // 🎯 GÉNÉRATION AUTOMATIQUE DU CODE
        console.log('🔑 Appel à requestPairingCode()...');
        const pairingCode = await tempSock.requestPairingCode(formattedPhone);
        
        console.log(`✅ Code généré: ${pairingCode}`);
        
        // Formater si nécessaire
        let formattedCode = pairingCode;
        
        if (!pairingCode.includes('-') && pairingCode.length >= 8) {
            formattedCode = pairingCode.substring(0, 4) + '-' + pairingCode.substring(4, 8);
            console.log(`🔄 Code formaté: ${formattedCode}`);
        }
        
        // Vérification du format
        if (formattedCode.match(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
            console.log(`✅ Format correct: ${formattedCode}`);
        } else {
            console.log(`⚠️  Format inhabituel: ${formattedCode}`);
        }
        
        // ============================================
        // 🎯🎯🎯 CORRECTION DÉFINITIVE : AFFICHAGE POUR LE SERVEUR
        // ============================================
        console.log('\n🎯🎯🎯 CODE DE PAIRING GÉNÉRÉ: ' + formattedCode + ' 🎯🎯🎯');
        console.log(`📱 Pour: ${phoneNumber}`);
        console.log(`⏰ ${new Date().toISOString()}`);
        
        // Fermeture du socket temporaire
        await tempSock.end();
        
        return formattedCode;
        
    } catch (error) {
        console.error(`❌ ERREUR GÉNÉRATION: ${error.message}`);
        
        // RELANCER AUTOMATIQUEMENT - PAS DE CODE MANUEL
        console.log('🔄 Nouvelle tentative dans 3 secondes...');
        
        // Attente
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // RÉESSAYER AUTOMATIQUEMENT
        return await generateRealPairingCode(phoneNumber);
    }
}

// ============================================
// 🎯 FONCTION PRINCIPALE DU BOT - CORRECTION DÉFINITIVE
// ============================================
async function startWhatsAppBot() {
    console.log('\n🚀 DÉMARRAGE BOT HEX-TECH');
    console.log('==========================');
    
    // Créer dossier session
    if (!fs.existsSync(SESSION_PATH)) {
        fs.mkdirSync(SESSION_PATH, { recursive: true });
        console.log(`✅ Dossier session: ${SESSION_PATH}`);
    }
    
    // ============================================
    // 🎯🎯🎯 GÉNÉRATION DU PAIRING CODE - CORRECTION DÉFINITIVE
    // ============================================
    console.log('\n🎯🎯🎯 GÉNÉRATION DU PAIRING CODE');
    console.log('===================================');
    
    let pairingCode;
    let attempts = 0;
    const maxAttempts = 3;
    
    // Boucle de tentatives automatiques
    while (attempts < maxAttempts && !pairingCode) {
        attempts++;
        console.log(`\n🔄 Tentative ${attempts}/${maxAttempts}`);
        
        try {
            pairingCode = await generateRealPairingCode(PHONE_NUMBER);
            
            // 🎯 AFFICHAGE DÉFINITIF POUR LE SERVEUR
            console.log(`\n🎯🎯🎯 CODE DE PAIRING GÉNÉRÉ: ${pairingCode} 🎯🎯🎯`);
            console.log(`🔑 Code: ${pairingCode}`);
            console.log(`📱 Pour: ${PHONE_NUMBER}`);
            console.log(`🆔 Session: ${SESSION_ID}`);
            console.log('===========================================\n');
            
            // Sauvegarder le code
            const codeFile = path.join(SESSION_PATH, 'pairing_code.txt');
            fs.writeFileSync(codeFile, pairingCode);
            console.log(`💾 Code sauvegardé: ${codeFile}`);
            
            break; // Sortir de la boucle si succès
            
        } catch (error) {
            console.error(`❌ Échec tentative ${attempts}: ${error.message}`);
            
            if (attempts >= maxAttempts) {
                console.error('🚨 Échec après 3 tentatives');
                throw new Error('Impossible de générer le pairing code');
            }
            
            // Attente avant prochaine tentative
            const waitTime = attempts * 2000;
            console.log(`⏳ Attente de ${waitTime/1000}s avant nouvelle tentative...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
    
    if (!pairingCode) {
        throw new Error('Échec de la génération du pairing code');
    }
    
    // Instructions
    console.log('\n📱 INSTRUCTIONS DE CONNEXION:');
    console.log('==============================');
    console.log('1. WhatsApp → Paramètres → Périphériques liés');
    console.log('2. "CONNECTER UN APPAREIL"');
    console.log('3. "Connecter avec un numéro de téléphone"');
    console.log(`4. Entrez: ${pairingCode}`);
    console.log('5. Validez et attendez');
    console.log('==============================\n');
    
    // ============================================
    // 🔧 CONNEXION AU BOT
    // ============================================
    try {
        // 📁 État d'authentification
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
        
        // 🔧 Configuration socket
        const sock = makeWASocket({
            version: [2, 3000, 1017549512],
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'fatal' })),
            },
            logger: P({ level: 'silent' }),
            browser: Browsers.ubuntu('Chrome'),
            syncFullHistory: true,
            markOnlineOnConnect: true,
            emitOwnEvents: true,
            mobile: false,
            connectTimeoutMs: 60000
        });
        
        // Gestion identifiants
        sock.ev.on('creds.update', saveCreds);
        
        // Gestion connexion
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                console.log(`❌ Déconnecté: ${reason}`);
                
                if (reason === DisconnectReason.loggedOut) {
                    try {
                        fs.rmSync(SESSION_PATH, { recursive: true });
                        console.log(`🧹 Session supprimée`);
                    } catch (err) {}
                }
                
                setTimeout(() => startWhatsAppBot(), 5000);
                return;
            }
            
            if (connection === 'open') {
                console.log(`✅✅✅ CONNECTÉ À WHATSAPP!`);
                
                // Envoyer message au propriétaire
                try {
                    const ownerJid = `${config.ownerNumber.replace(/\D/g, '')}@s.whatsapp.net`;
                    await sock.sendMessage(ownerJid, {
                        text: `🤖 *HexTech Bot* connecté!\n🆔 ${SESSION_ID}\n📱 ${PHONE_NUMBER}\n🎯 Code utilisé: ${pairingCode}\n📅 ${new Date().toLocaleString()}`
                    });
                } catch (e) {}
                
                // CHARGER LES COMMANDES APRÈS CONNEXION
                console.log('\n📁 Chargement des commandes après connexion...');
                await loadCommands();
                console.log(`✅ ${commands.size} commandes disponibles`);
            }
        });
        
        // ============================================
        // 📨 GESTION DES MESSAGES AVEC COMMANDES
        // ============================================
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;
            
            const text = msg.message.conversation || 
                        msg.message.extendedTextMessage?.text || 
                        msg.message.imageMessage?.caption || '';
            const from = msg.key.remoteJid;
            const sender = msg.key.participant || from;
            const isGroup = from.endsWith('@g.us');
            
            console.log(`📩 Message de ${sender}: ${text.substring(0, 50)}...`);
            
            // 🔧 RESTAURATION MESSAGES SUPPRIMÉS (ton code)
            if (msg.message.protocolMessage?.type === 0) {
                console.log(`🗑️ Message supprimé détecté`);
                // Ton code de restauration ici...
                return;
            }
            
            // 📸 GESTION IMAGES
            if (msg.message.imageMessage) {
                console.log(`📸 Image reçue`);
                // Ton code images ici...
            }
            
            // 🔗 ANTILINK
            if (isGroup && config.antiLink) {
                const linkPatterns = [
                    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
                    /www\.[-a-zA-Z09@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([    -a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
                    /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
                ];
                
                let hasLink = linkPatterns.some(pattern => pattern.test(text));
                
                if (hasLink) {
                    console.log(`🔗 Lien détecté`);
                    // Ton code antilink ici...
                    return;
                }
            }
            
            // 👋 WELCOME MESSAGE
            if (isGroup && msg.message.groupInviteMessage && welcomeEnabled) {
                console.log(`👋 Nouveau membre`);
                // Ton code welcome ici...
            }
            
            // 🎮 COMMANDES AVEC PRÉFIXE
            if (text.startsWith(config.prefix || '.')) {
                const args = text.slice(config.prefix.length).trim().split(/ +/);
                const commandName = args.shift().toLowerCase();
                
                console.log(`🎮 Commande détectée: ${commandName}`);
                
                // 🔥 CHARGER/RECHARGER COMMANDES SI NÉCESSAIRE
                if (commands.size === 0) {
                    console.log('🔄 Chargement des commandes...');
                    await loadCommands();
                }
                
                // Exécuter commande si elle existe
                if (commands.has(commandName)) {
                    const command = commands.get(commandName);
                    try {
                        await command.execute(sock, msg, args);
                        console.log(`✅ Commande exécutée: ${commandName}`);
                    } catch (err) {
                        console.error(`❌ Erreur commande ${commandName}:`, err);
                        await sock.sendMessage(from, {
                            text: `❌ Erreur commande ${commandName}`
                        });
                    }
                    return;
                }
                
                // Commandes intégrées de base
                switch (commandName) {
                    case 'ping':
                        await sock.sendMessage(from, { text: '🏓 Pong! HexTech Bot' });
                        break;
                    case 'menu':
                        let menuText = `🤖 *Menu Bot HexTech*\n\n`;
                        
                        // Ajouter les commandes chargées
                        commands.forEach((cmd, name) => {
                            menuText += `• ${config.prefix}${name} - ${cmd.description || 'Pas de description'}\n`;
                        });
                        
                        menuText += `\n🎯 ${commands.size} commandes disponibles`;
                        menuText += `\n👑 Propriétaire: ${config.ownerNumber}`;
                        
                        await sock.sendMessage(from, { text: menuText });
                        break;
                    case 'info':
                        await sock.sendMessage(from, {
                            text: `📊 *Informations Bot*\n\n🆔 Session: ${SESSION_ID}\n📱 Numéro: ${PHONE_NUMBER}\n⚡ Préfixe: ${config.prefix}\n📁 Commandes: ${commands.size}\n🎯 Développé par HEX-TECH\n🔑 Code pairing utilisé: ${pairingCode}`
                        });
                        break;
                    case 'reload':
                        console.log('🔄 Rechargement des commandes...');
                        await loadCommands();
                        await sock.sendMessage(from, {
                            text: `✅ ${commands.size} commandes rechargées`
                        });
                        break;
                    default:
                        await sock.sendMessage(from, {
                            text: `❌ Commande inconnue: ${commandName}\nTapez ${config.prefix}menu pour la liste`
                        });
                }
            }
        });
        
        // Keep-alive
        setInterval(async () => {
            try {
                await sock.sendPresenceUpdate('available');
            } catch (e) {}
        }, 60000);
        
        console.log('✅ Bot HexTech opérationnel!');
        console.log(`📁 Commandes: ${commands.size} disponibles`);
        console.log(`🔑 Pairing Code généré: ${pairingCode}`);
        console.log('⏳ Attente connexion via pairing code...');
        
    } catch (error) {
        console.error(`❌ ERREUR BOT: ${error.message}`);
        setTimeout(() => startWhatsAppBot(), 10000);
    }
}

// ============================================
// 🚀 DÉMARRAGE
// ============================================
console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║            HEXTECH WHATSAPP BOT v4.0            ║');
console.log('╠══════════════════════════════════════════════════╣');
console.log('║ 🎯 Système: VRAI Pairing Code BaileyJS          ║');
console.log('║ 📱 Numéro: ' + PHONE_NUMBER.padEnd(30) + '║');
console.log('║ 🆔 Session: ' + SESSION_ID.padEnd(30) + '║');
console.log('║ 📁 Commandes: Chargement automatique activé     ║');
console.log('║ 🔥 Génération: sock.requestPairingCode() réel   ║');
console.log('║ ⚡ CORRECTION: Format serveur optimisé          ║');
console.log('║ 🔄 Tentatives: 3 tentatives automatiques        ║');
console.log('╚══════════════════════════════════════════════════╝\n');

// Charger les commandes au démarrage
console.log('📁 Chargement initial des commandes...');
loadCommands().then(() => {
    console.log(`✅ ${commands.size} commandes chargées`);
    startWhatsAppBot();
}).catch(err => {
    console.error('❌ Erreur chargement commandes:', err);
    startWhatsAppBot();
});

// Gestion erreurs
process.on('uncaughtException', (error) => {
    console.error(`⚠️ Erreur: ${error.message}`);
});

process.on('unhandledRejection', (reason) => {
    console.error(`⚠️ Rejet: ${reason}`);
});
