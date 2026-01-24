// bot/index.js - VERSION DÉFINITIVE AVEC requestPairingCode() RÉEL
// C'est ICI que le pairing code BaileyJS est généré !

import { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import P from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration ES6 pour __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// 🔧 CONFIGURATION CRITIQUE POUR SERVER.JS
// ============================================
// Variables d'environnement ENVOYÉES PAR LE SERVEUR
const SESSION_ID = process.env.SESSION_ID || 'default-session';
const SESSION_PATH = process.env.SESSION_PATH || path.join(__dirname, '..', 'sessions', SESSION_ID);
const PHONE_NUMBER = process.env.PHONE_NUMBER || "243816107573"; // 💡 IMPORTANT: vient du serveur
const IS_RENDER = process.env.IS_RENDER === 'true';
const WEB_MODE = process.env.WEB_MODE === 'true';
const FORCE_PAIRING_MODE = process.env.FORCE_PAIRING_MODE === 'true';

console.log('\n🎯🎯🎯 CONFIGURATION BOT POUR SERVER.JS 🎯🎯🎯');
console.log('===========================================');
console.log(`📁 Session ID: ${SESSION_ID}`);
console.log(`📱 Numéro: ${PHONE_NUMBER} (ENV SERVER)`);
console.log(`📍 Session path: ${SESSION_PATH}`);
console.log(`🌍 Mode web: ${WEB_MODE}`);
console.log(`🎯 Pairing forcé: ${FORCE_PAIRING_MODE}`);
console.log('===========================================\n');

// ============================================
// 📁 CHARGEMENT DE LA CONFIGURATION
// ============================================
let config = {};
try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log('✅ Configuration chargée depuis config.json');
    } else {
        console.log('⚠️ config.json non trouvé, création avec valeurs par défaut...');
        config = {
            prefix: ".",
            ownerNumber: PHONE_NUMBER, // Utilise le numéro du serveur
            botPublic: true,
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
        ownerNumber: PHONE_NUMBER,
        botPublic: true,
        fakeRecording: false,
        antiLink: true,
        alwaysOnline: true,
        logLevel: "silent",
        telegramLink: "https://t.me/hextechcar",
        botImageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCIwiz88R6J5X8x1546iN-aFfGXxKtlUQDStbvnHV7sb-FHYTQKQd358M&s=10"
    };
}

// ============================================
// 🎯 CHARGEMENT DES COMMANDES (TON CODE COMPLET)
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

const VV_FOLDER = "./.VV";
const DELETED_MESSAGES_FOLDER = "./deleted_messages";
const COMMANDS_FOLDER = "./commands";
const VIEW_ONCE_FOLDER = "./viewOnce";
const DELETED_IMAGES_FOLDER = "./deleted_images";

// Vérification des dossiers
[VV_FOLDER, DELETED_MESSAGES_FOLDER, COMMANDS_FOLDER, VIEW_ONCE_FOLDER, DELETED_IMAGES_FOLDER].forEach(folder => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        console.log(`✅ Dossier ${folder} créé`);
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
// 🎯 FONCTION PRINCIPALE DE CONNEXION
// ============================================
async function startWhatsAppBot() {
    console.log('\n🚀 DÉMARRAGE DU BOT WHATSAPP');
    console.log('===============================');
    console.log(`📁 Session ID: ${SESSION_ID}`);
    console.log(`📱 Numéro cible: ${PHONE_NUMBER}`);
    console.log(`📍 Chemin session: ${SESSION_PATH}`);
    console.log(`🌍 Mode web: ${WEB_MODE}`);
    console.log(`🎯 Pairing forcé: ${FORCE_PAIRING_MODE}`);
    console.log('===============================\n');

    // Créer le dossier de session si nécessaire
    if (!fs.existsSync(SESSION_PATH)) {
        fs.mkdirSync(SESSION_PATH, { recursive: true });
        console.log(`✅ Dossier session créé: ${SESSION_PATH}`);
    }

    try {
        // 📁 État d'authentification multi-fichiers
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
        console.log(`✅ État d'authentification chargé depuis: ${SESSION_PATH}`);

        // 🔧 Configuration du socket WhatsApp AVEC PAIRING MODE
        const sock = makeWASocket({
            version: [2, 3000, 1017549512],
            printQRInTerminal: false, // 🎯 CRITIQUE: DÉSACTIVÉ pour pairing
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'fatal' })),
            },
            logger: P({ level: 'silent' }),
            browser: Browsers.ubuntu('Chrome'),
            syncFullHistory: true,
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            defaultQueryTimeoutMs: 60000,
            emitOwnEvents: true,
            mobile: false,
            keepAliveIntervalMs: 10000,
            connectTimeoutMs: 60000,
            retryRequestDelayMs: 5000
        });

        // 📂 Gestion des identifiants
        sock.ev.on('creds.update', saveCreds);

        // 🎯 GESTION DES ÉVÉNEMENTS DE CONNEXION
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            console.log(`🔄 État connexion: ${connection || 'unknown'}`);
            
            if (connection === 'close') {
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                console.log(`❌ Connexion fermée. Code: ${reason}`);
                
                if (reason === DisconnectReason.loggedOut || reason === 401) {
                    console.log(`🚨 Déconnecté! Suppression session...`);
                    try {
                        fs.rmSync(SESSION_PATH, { recursive: true, force: true });
                        console.log(`🧹 Session supprimée: ${SESSION_PATH}`);
                    } catch (err) {
                        console.log(`⚠️  Erreur suppression: ${err.message}`);
                    }
                }
                
                // Tentative de reconnexion
                console.log(`🔄 Tentative reconnexion dans 5 secondes...`);
                setTimeout(() => {
                    startWhatsAppBot().catch(console.error);
                }, 5000);
                
                return;
            }
            
            if (connection === 'connecting') {
                console.log(`🔗 Connexion en cours...`);
            }
            
            if (connection === 'open') {
                console.log(`✅✅✅ CONNECTÉ À WHATSAPP!`);
                console.log(`👤 Connecté en tant que: ${sock.user?.name || 'Inconnu'}`);
                console.log(`📱 Numéro: ${sock.user?.id?.split(':')[0] || 'Non défini'}`);
                console.log(`🆔 ID utilisateur: ${sock.user?.id || 'Non défini'}`);
                
                // Envoyer un message au propriétaire
                try {
                    if (config.ownerNumber) {
                        const ownerJid = `${config.ownerNumber.replace(/\D/g, '')}@s.whatsapp.net`;
                        await sock.sendMessage(ownerJid, {
                            text: `🤖 *Bot WhatsApp HexTech* connecté avec succès!\n\n📅 Date: ${new Date().toLocaleString()}\n🆔 Session: ${SESSION_ID}\n👤 Connecté en tant que: ${sock.user?.name || 'Inconnu'}\n📱 Numéro: ${PHONE_NUMBER}\n\n✅ Le bot est maintenant opérationnel!`
                        });
                        console.log(`📤 Message envoyé au propriétaire: ${config.ownerNumber}`);
                    }
                } catch (msgErr) {
                    console.log(`⚠️  Impossible d'envoyer message au propriétaire: ${msgErr.message}`);
                }
            }
        });

        // 📞 ÉVÉNEMENTS DES MESSAGES (TON CODE)
        sock.ev.on('messages.upsert', async (m) => {
            const message = m.messages[0];
            if (!message.message) return;
            
            const sender = message.key.remoteJid;
            const isGroup = sender.endsWith('@g.us');
            const text = message.message.conversation || 
                        message.message.extendedTextMessage?.text || 
                        message.message.imageMessage?.caption || '';
            
            console.log(`📩 Message de ${sender}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
            
            // 🔧 RESTAURATION DES MESSAGES SUPPRIMÉS
            if (message.message.protocolMessage && 
                message.message.protocolMessage.type === 0) {
                console.log(`🗑️ Message supprimé détecté de: ${sender}`);
                
                try {
                    if (isGroup && config.ownerNumber) {
                        await sock.sendMessage(sender, {
                            text: `⚠️ Un message a été supprimé dans ce groupe.`
                        });
                    }
                } catch (err) {
                    console.log(`❌ Erreur traitement message supprimé: ${err.message}`);
                }
                return;
            }
            
            // 📸 GESTION DES IMAGES
            if (message.message.imageMessage) {
                console.log(`📸 Image reçue de: ${sender}`);
                
                try {
                    if (isGroup && text.toLowerCase().includes('sticker')) {
                        await sock.sendMessage(sender, {
                            text: '🖼️ Image reçue! Tapez .sticker pour en faire un sticker.'
                        });
                    }
                } catch (err) {
                    console.log(`❌ Erreur traitement image: ${err.message}`);
                }
            }
            
            // 🔗 ANTILINK - DÉTECTION DE LIENS
            if (isGroup && config.antiLink) {
                const linkPatterns = [
                    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
                    /www\.[-a-zA-Z09@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
                    /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
                ];
                
                let hasLink = false;
                for (const pattern of linkPatterns) {
                    if (pattern.test(text)) {
                        hasLink = true;
                        break;
                    }
                }
                
                if (hasLink) {
                    console.log(`🔗 Lien détecté dans le groupe ${sender}`);
                    
                    try {
                        const metadata = await sock.groupMetadata(sender).catch(() => null);
                        const participant = message.key.participant || sender;
                        
                        if (metadata) {
                            const isAdmin = metadata.participants.find(p => 
                                p.id === participant && (p.admin === 'admin' || p.admin === 'superadmin')
                            );
                            
                            if (!isAdmin) {
                                await sock.sendMessage(sender, {
                                    delete: message.key
                                });
                                console.log(`🗑️ Message avec lien supprimé`);
                                
                                await sock.sendMessage(sender, {
                                    text: `@${participant.split('@')[0]} ⚠️ Les liens ne sont pas autorisés dans ce groupe!`,
                                    mentions: [participant]
                                });
                            }
                        }
                    } catch (err) {
                        console.log(`❌ Erreur suppression lien: ${err.message}`);
                    }
                    return;
                }
            }
            
            // 👋 WELCOME MESSAGE
            if (isGroup && message.message.groupInviteMessage && welcomeEnabled) {
                console.log(`👋 Invitation de groupe détectée`);
                
                try {
                    await sock.sendMessage(sender, {
                        text: `🌟 Bienvenue dans le groupe!\n\nJe suis HexTech Bot, votre assistant WhatsApp.\nUtilisez ${config.prefix}menu pour voir mes commandes.`
                    });
                } catch (err) {
                    console.log(`❌ Erreur message welcome: ${err.message}`);
                }
            }
            
            // 🎮 COMMANDES AVEC PRÉFIXE
            if (text.startsWith(config.prefix || '.')) {
                const args = text.slice(config.prefix.length).trim().split(/ +/);
                const commandName = args.shift().toLowerCase();
                
                console.log(`🎮 Commande détectée: ${commandName}`);
                
                // Charger les commandes dynamiquement
                await loadCommands();
                
                if (commands.has(commandName)) {
                    const command = commands.get(commandName);
                    try {
                        await command.execute(sock, message, args);
                        console.log(`✅ Commande exécutée: ${commandName}`);
                    } catch (err) {
                        console.error(`❌ Erreur exécution commande ${commandName}:`, err);
                        await sock.sendMessage(sender, {
                            text: `❌ Erreur lors de l'exécution de la commande ${commandName}`
                        });
                    }
                    return;
                }
                
                // Commandes intégrées de base
                switch (commandName) {
                    case 'ping':
                        await sock.sendMessage(sender, { text: '🏓 Pong!' });
                        break;
                    case 'menu':
                        await sock.sendMessage(sender, {
                            text: `🤖 *Menu Bot HexTech*\n\nUtilisez ${config.prefix} pour les commandes.\n\n🎯 Développé par HexTech | RDC 🇨🇩`
                        });
                        break;
                    case 'info':
                        await sock.sendMessage(sender, {
                            text: `📊 *Informations Bot*\n\n🆔 Session: ${SESSION_ID}\n📱 Connecté en tant que: ${sock.user?.name || 'Inconnu'}\n👨‍💻 Propriétaire: ${config.ownerNumber || 'Non défini'}\n📅 Démarrage: ${new Date().toLocaleString()}\n⚡ Préfixe: ${config.prefix || '.'}\n🌍 Mode: ${IS_RENDER ? 'Render' : 'Local'}\n\n✅ Bot opérationnel et prêt!`
                        });
                        break;
                    default:
                        await sock.sendMessage(sender, {
                            text: `❌ Commande inconnue: ${commandName}\n\nTapez ${config.prefix}menu pour voir les commandes disponibles.`
                        });
                }
            }
        });

        // ============================================
        // 🎯🎯🎯 CODE CRITIQUE : GÉNÉRATION DU PAIRING CODE
        // ============================================
        console.log('\n🎯🎯🎯 GÉNÉRATION DU PAIRING CODE BAILEYS');
        console.log('===========================================');
        console.log(`📱 Numéro cible: ${PHONE_NUMBER}`);
        console.log('🔑 Appel de sock.requestPairingCode()...');
        
        try {
            // 🎯🎯🎯 LIGNE LA PLUS IMPORTANTE : GÉNÉRATION RÉELLE DU CODE
            const pairingCode = await sock.requestPairingCode(PHONE_NUMBER);
            
            // 🎯 FORMAT CRITIQUE POUR SERVER.JS
            // Utilise EXACTEMENT ce format pour que server.js le détecte
            console.log(`🎯🎯🎯 CODE DE PAIRING GÉNÉRÉ: ${pairingCode} 🎯🎯🎯`);
            
            // 🔥 NE PAS UTILISER D'AUTRES FORMATS QUI POURRAIENT CONFONDRE LE REGEX
            // NE PAS FAIRE: console.log(code);
            // NE PAS FAIRE: console.log("Voici ton code 👉", code);
            // NE PAS FAIRE: console.log(`PAIR=${code}`);
            
            console.log(`🔑 Format: XXXX-XXXX (8 caractères BaileyJS)`);
            console.log(`📱 Pour le numéro: ${PHONE_NUMBER}`);
            console.log(`📋 Copiez ce code dans WhatsApp → Périphériques liés`);
            console.log('===========================================\n');
            
            // Enregistrer le code dans un fichier pour le serveur
            const codeFilePath = path.join(SESSION_PATH, 'pairing_code.txt');
            fs.writeFileSync(codeFilePath, `${pairingCode}|${Date.now()}|${PHONE_NUMBER}`);
            console.log(`💾 Code sauvegardé: ${codeFilePath}`);
            
            // Afficher des instructions claires
            console.log('\n📱 INSTRUCTIONS DE CONNEXION:');
            console.log('==============================');
            console.log('1. Ouvrez WhatsApp sur votre téléphone');
            console.log('2. Allez dans Paramètres → Périphériques liés');
            console.log('3. Cliquez sur "Connecter un appareil"');
            console.log('4. Sélectionnez "Connecter avec un numéro de téléphone"');
            console.log(`5. Entrez le code: ${pairingCode}`);
            console.log('6. Validez et attendez la connexion');
            console.log('==============================\n');
            
        } catch (pairingError) {
            console.error(`❌ ERREUR GÉNÉRATION PAIRING CODE: ${pairingError.message}`);
            console.log(`📋 Détails:`, pairingError);
            
            // Tentative de réessai
            setTimeout(async () => {
                console.log('🔄 Nouvelle tentative dans 10 secondes...');
                try {
                    const retryCode = await sock.requestPairingCode(PHONE_NUMBER);
                    console.log(`✅ Code généré (2ème tentative): ${retryCode}`);
                    console.log(`🎯🎯🎯 CODE DE PAIRING GÉNÉRÉ: ${retryCode} 🎯🎯🎯`);
                } catch (retryError) {
                    console.error(`❌ Échec tentative 2: ${retryError.message}`);
                }
            }, 10000);
        }

        // ============================================
        // 🔄 GESTION DES ÉVÉNEMENTS
        // ============================================
        sock.ev.on('call', async (call) => {
            console.log(`📞 Appel entrant de: ${call.from}`);
        });

        sock.ev.on('contacts.update', (updates) => {
            updates.forEach(update => {
                console.log(`👤 Contact mis à jour: ${update.id}`);
            });
        });

        // ============================================
        // 🕐 KEEP-ALIVE ET SURVIE
        // ============================================
        setInterval(async () => {
            if (sock.user) {
                try {
                    await sock.sendPresenceUpdate('available');
                } catch (e) {
                    console.log(`⚠️  Keep-alive erreur: ${e.message}`);
                }
            }
        }, 60000);

        console.log('🤖 Bot WhatsApp HexTech initialisé avec succès!');
        console.log('🎯 Attente de connexion via pairing code...');
        console.log('⏳ Le bot restera actif et gérera les messages automatiquement');

    } catch (error) {
        console.error(`❌ ERREUR CRITIQUE: ${error.message}`);
        console.error(`📋 Stack:`, error.stack);
        
        console.log('🔄 Redémarrage dans 10 secondes...');
        setTimeout(() => {
            startWhatsAppBot().catch(console.error);
        }, 10000);
    }
}

// ============================================
// 🚀 DÉMARRAGE
// ============================================
console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║            HEXTECH WHATSAPP BOT v4.0            ║');
console.log('╠══════════════════════════════════════════════════╣');
console.log('║ 🎯 Système: Pairing Code BaileyJS Réel          ║');
console.log('║ 📱 Numéro: ' + PHONE_NUMBER.padEnd(30) + '║');
console.log('║ 🆔 Session: ' + SESSION_ID.padEnd(30) + '║');
console.log('║ 🌍 Environnement: ' + (IS_RENDER ? 'Render 🌍'.padEnd(27) : 'Local 💻'.padEnd(27)) + '║');
console.log('║ ⚡ Version: BaileyJS avec requestPairingCode()  ║');
console.log('║ 🔧 Fonctions: Antilink, Welcome, Restauration   ║');
console.log('║ 📁 Commands: Chargement automatique des modules ║');
console.log('╚══════════════════════════════════════════════════╝\n');

// Démarrer le bot
startWhatsAppBot().catch(console.error);

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
    console.error(`⚠️  Erreur non capturée: ${error.message}`);
    console.error(`📋 Stack:`, error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`⚠️  Rejet non géré:`, reason);
});
