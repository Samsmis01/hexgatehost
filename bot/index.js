// bot/index.js - VERSION CORRIGÉE POUR RENDER (UTILISE PHONE_NUMBER DE L'ENVIRONNEMENT)
import { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
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
const PHONE_NUMBER = process.env.PHONE_NUMBER || ""; // 🎯 PREND LE NUMÉRO DEPUIS L'ENVIRONNEMENT

console.log('\n🎯 BOT HEX-TECH - VERSION CORRIGÉE 🎯');
console.log('=====================================');
console.log(`📱 Numéro reçu: ${PHONE_NUMBER ? '********' + PHONE_NUMBER.slice(-4) : 'Aucun (attente saisie HTML)'}`);
console.log(`🆔 Session: ${SESSION_ID}`);

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
            ownerNumber: PHONE_NUMBER || "", // Utilise le numéro de l'environnement
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
    config = { prefix: ".", ownerNumber: PHONE_NUMBER || "", botPublic: true };
}

// ============================================
// 🎯 CHARGEMENT DES COMMANDES
// ============================================
const commands = new Map();

async function loadCommands() {
    try {
        const commandsDir = path.join(__dirname, 'commands');
        if (!fs.existsSync(commandsDir)) {
            console.log(`📁 Création dossier commands: ${commandsDir}`);
            fs.mkdirSync(commandsDir, { recursive: true });
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
// 🔧 FONCTIONS UTILITAIRES
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

// Fonction pour attendre
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// 🎯 FONCTION PRINCIPALE DU BOT - CORRIGÉE
// ============================================
async function startWhatsAppBot() {
    console.log('\n🚀 DÉMARRAGE BOT HEX-TECH');
    console.log('==========================\n');

    // Vérifier et nettoyer la session si nécessaire
    if (fs.existsSync(SESSION_PATH)) {
        console.log('📁 Session existante détectée...');
        try {
            const sessionFiles = fs.readdirSync(SESSION_PATH);
            const hasCreds = sessionFiles.some(file => file.includes('creds'));
            
            if (hasCreds) {
                console.log('✅ Session valide trouvée, tentative de connexion...');
            } else {
                console.log('⚠️ Session incomplète, nettoyage...');
                fs.rmSync(SESSION_PATH, { recursive: true });
                fs.mkdirSync(SESSION_PATH, { recursive: true });
            }
        } catch (err) {
            console.log('🧹 Nettoyage session...');
            fs.rmSync(SESSION_PATH, { recursive: true });
            fs.mkdirSync(SESSION_PATH, { recursive: true });
        }
    } else {
        fs.mkdirSync(SESSION_PATH, { recursive: true });
        console.log(`✅ Dossier session créé: ${SESSION_PATH}`);
    }

    try {
        // Récupérer la dernière version de Bailey
        const { version } = await fetchLatestBaileysVersion();
        
        // 📁 État d'authentification
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
        
        // 🔧 Configuration socket
        const sock = makeWASocket({
            version,
            logger: P({ level: 'silent' }),
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'fatal' })),
            },
            browser: Browsers.ubuntu("Chrome"),
            markOnlineOnConnect: config.alwaysOnline,
            syncFullHistory: false,
            connectTimeoutMs: 60000
        });
        
        // Gestion identifiants
        sock.ev.on("creds.update", saveCreds);
        
        let pairingCode = null;
        
        // ============================================
        // 🎯 GESTION CONNEXION - CORRIGÉE
        // ============================================
        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            // 🎯 DÉTECTION QR CODE → GÉNÉRATION PAIRING (AVEC NUMÉRO DE L'ENVIRONNEMENT)
            if (qr) {
                console.log('\n📱 QR Code détecté!');
                console.log('===================\n');
                
                // 🎯🎯🎯 UTILISER LE NUMÉRO DEPUIS LA VARIABLE D'ENVIRONNEMENT (ENVOYÉ PAR SERVER.JS)
                const phoneNumber = PHONE_NUMBER;
                
                if (!phoneNumber || phoneNumber.length < 8) {
                    console.log('❌ ERREUR: Numéro WhatsApp non fourni');
                    console.log('ℹ️  Le numéro doit être envoyé via variable d\'environnement PHONE_NUMBER');
                    console.log('🔄 Le bot attendra qu\'un numéro soit fourni...');
                    return;
                }
                
                // Nettoyer et valider le numéro
                const cleanNumber = phoneNumber.replace(/\D/g, '');
                if (cleanNumber.length < 8) {
                    console.log('❌ Numéro invalide. Format attendu: 243XXXXXXXXX ou votre code pays');
                    return;
                }
                
                console.log(`🔑 Génération pairing code pour: ${cleanNumber}`);
                
                try {
                    // 🎯 GÉNÉRATION DU PAIRING CODE
                    const code = await sock.requestPairingCode(cleanNumber);
                    
                    // Formater le code (XXXX-XXXX)
                    let formattedCode = code;
                    if (!code.includes('-') && code.length >= 8) {
                        formattedCode = code.substring(0, 4) + '-' + code.substring(4, 8);
                    }
                    
                    // ============================================
                    // 🎯🎯🎯 AFFICHAGE DU CODE - FORMAT EXACT ATTENDU PAR SERVER.JS
                    // ============================================
                    console.log(`\n🎯🎯🎯 CODE DE PAIRING GÉNÉRÉ: ${formattedCode} 🎯🎯🎯`);
                    console.log(`🔑 Code: ${formattedCode}`);
                    console.log(`📱 Pour: ${cleanNumber}`);
                    console.log(`🆔 Session: ${SESSION_ID}`);
                    console.log('===========================================\n');
                    
                    pairingCode = formattedCode;
                    
                    // Mettre à jour le propriétaire dans la config
                    config.ownerNumber = cleanNumber;
                    
                    // Sauvegarder la config
                    try {
                        const configPath = path.join(__dirname, 'config.json');
                        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                        console.log('✅ Configuration mise à jour avec le numéro');
                    } catch (e) {
                        console.log('⚠️ Impossible de sauvegarder la configuration');
                    }
                    
                    // Instructions (pour les logs)
                    console.log('📱 INSTRUCTIONS DE CONNEXION:');
                    console.log('==============================');
                    console.log('1. WhatsApp → Paramètres → Périphériques liés');
                    console.log('2. "CONNECTER UN APPAREIL"');
                    console.log('3. "Connecter avec un numéro de téléphone"');
                    console.log(`4. Entrez: ${formattedCode}`);
                    console.log('5. Validez et attendez la connexion');
                    console.log('==============================\n');
                    
                } catch (pairError) {
                    console.error(`\n❌ ERREUR PAIRING: ${pairError.message}`);
                    console.log('🔄 Redémarrage dans 5 secondes...');
                    setTimeout(() => startWhatsAppBot(), 5000);
                }
            }
            
            // 🚫 GESTION DÉCONNEXION
            if (connection === "close") {
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                console.log(`\n❌ Déconnecté (code: ${reason})`);
                
                if (reason === DisconnectReason.loggedOut) {
                    console.log('🧹 Session expirée, nettoyage...');
                    try {
                        fs.rmSync(SESSION_PATH, { recursive: true });
                    } catch (err) {}
                    
                    console.log('🔄 Redémarrage du bot...');
                    setTimeout(() => startWhatsAppBot(), 3000);
                } else {
                    console.log('🔄 Reconnexion...');
                    setTimeout(() => startWhatsAppBot(), 5000);
                }
                return;
            }
            
            // ✅ CONNEXION RÉUSSIE
            if (connection === "open") {
                console.log('\n' + '✅'.repeat(10));
                console.log('✅✅✅ BOT CONNECTÉ À WHATSAPP!');
                console.log('✅'.repeat(10) + '\n');
                
                // Envoyer message de bienvenue au propriétaire
                try {
                    if (config.ownerNumber) {
                        const ownerJid = `${config.ownerNumber.replace(/\D/g, '')}@s.whatsapp.net`;
                        await sock.sendMessage(ownerJid, {
                            text: `🤖 *HexTech Bot* connecté!\n📱 Votre numéro: ${config.ownerNumber}\n🔑 Code pairing: ${pairingCode || 'N/A'}\n📅 ${new Date().toLocaleString()}\n\nTapez ${config.prefix}menu pour les commandes`
                        });
                        console.log('✅ Message de bienvenue envoyé au propriétaire');
                    }
                } catch (e) {
                    console.log('⚠️ Impossible d\'envoyer le message de bienvenue');
                }
                
                // Charger les commandes
                console.log('📁 Chargement des commandes...');
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
            
            console.log(`📩 ${isGroup ? '[GROUPE]' : '[PRIVÉ]'} ${sender.split('@')[0]}: ${text.substring(0, 50)}...`);
            
            // 🔗 ANTILINK (si activé)
            if (isGroup && config.antiLink) {
                const linkPatterns = [
                    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
                    /www\.[-a-zA-Z09@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
                    /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
                ];
                
                let hasLink = linkPatterns.some(pattern => pattern.test(text));
                
                if (hasLink) {
                    console.log(`🔗 Lien détecté dans le groupe`);
                    // Ton code antilink ici...
                    return;
                }
            }
            
            // 🎮 COMMANDES AVEC PRÉFIXE
            if (text.startsWith(config.prefix || '.')) {
                const args = text.slice(config.prefix.length).trim().split(/ +/);
                const commandName = args.shift().toLowerCase();
                
                console.log(`🎮 Commande détectée: ${commandName}`);
                
                // Recharger les commandes si nécessaire
                if (commands.size === 0) {
                    await loadCommands();
                }
                
                // Commandes intégrées
                switch (commandName) {
                    case 'ping':
                        await sock.sendMessage(from, { text: '🏓 Pong! HexTech Bot' });
                        break;
                    case 'menu':
                        let menuText = `🤖 *Menu Bot HexTech*\n\n`;
                        menuText += `• ${config.prefix}ping - Test de réponse\n`;
                        menuText += `• ${config.prefix}info - Informations du bot\n`;
                        menuText += `• ${config.prefix}reload - Recharger commandes\n\n`;
                        
                        // Ajouter les commandes chargées
                        commands.forEach((cmd, name) => {
                            menuText += `• ${config.prefix}${name} - ${cmd.description || 'Commande'}\n`;
                        });
                        
                        menuText += `\n🎯 ${commands.size + 3} commandes disponibles`;
                        menuText += `\n👑 Propriétaire: ${config.ownerNumber || 'Non défini'}`;
                        menuText += pairingCode ? `\n🔑 Code pairing: ${pairingCode}` : '';
                        
                        await sock.sendMessage(from, { text: menuText });
                        break;
                    case 'info':
                        await sock.sendMessage(from, {
                            text: `📊 *Informations Bot*\n\n🆔 Session: ${SESSION_ID}\n📱 Propriétaire: ${config.ownerNumber || 'Non défini'}\n⚡ Préfixe: ${config.prefix}\n📁 Commandes: ${commands.size}\n🎯 Développé par HEX-TECH\n📅 Connecté le: ${new Date().toLocaleString()}`
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
                        // Vérifier les commandes chargées
                        if (commands.has(commandName)) {
                            const command = commands.get(commandName);
                            try {
                                await command.execute(sock, msg, args);
                            } catch (err) {
                                console.error(`❌ Erreur commande ${commandName}:`, err);
                                await sock.sendMessage(from, {
                                    text: `❌ Erreur lors de l'exécution de ${commandName}`
                                });
                            }
                        } else {
                            await sock.sendMessage(from, {
                                text: `❌ Commande inconnue: ${commandName}\nTapez ${config.prefix}menu pour la liste`
                            });
                        }
                }
            }
        });
        
        console.log('✅ Bot HexTech prêt!');
        console.log('⏳ Attente QR code pour générer pairing code...');
        
    } catch (error) {
        console.error(`❌ ERREUR BOT: ${error.message}`);
        console.log('🔄 Redémarrage dans 10 secondes...');
        setTimeout(() => startWhatsAppBot(), 10000);
    }
}

// ============================================
// 🚀 DÉMARRAGE
// ============================================
console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║            HEXTECH WHATSAPP BOT v6.0            ║');
console.log('╠══════════════════════════════════════════════════╣');
console.log('║ 🎯 Système: Pairing Code via Environnement      ║');
console.log('║ 📱 Numéro: Variable PHONE_NUMBER                ║');
console.log('║ 🆔 Session: ' + SESSION_ID.padEnd(30) + '║');
console.log('║ 📁 Commandes: Chargement automatique            ║');
console.log('║ 🔥 Format: XXXX-XXXX (exact pour server.js)    ║');
console.log('║ 👤 Source: HTML → server.js → bot/index.js     ║');
console.log('╚══════════════════════════════════════════════════╝\n');

// Charger les commandes
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
    console.error(`⚠️ Erreur non capturée: ${error.message}`);
});

process.on('unhandledRejection', (reason) => {
    console.error(`⚠️ Promesse rejetée: ${reason}`);
});
