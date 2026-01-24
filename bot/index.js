// bot/index.js - VERSION CORRIGÉE POUR VRAI PAIRING CODE
// Génère le VRAI code BaileyJS format 8-4 (XXXX-XXXX)

import { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import P from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { delay } from '@whiskeysockets/baileys';

// Configuration ES6 pour __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// 🔧 CONFIGURATION CRITIQUE
// ============================================
const SESSION_ID = process.env.SESSION_ID || 'default-session';
const SESSION_PATH = process.env.SESSION_PATH || path.join(__dirname, '..', 'sessions', SESSION_ID);
const PHONE_NUMBER = process.env.PHONE_NUMBER || "243816107573";
const IS_RENDER = process.env.IS_RENDER === 'true';
const WEB_MODE = process.env.WEB_MODE === 'true';
const FORCE_PAIRING_MODE = process.env.FORCE_PAIRING_MODE === 'true';

console.log('\n🎯🎯🎯 BOT HEX-TECH - VRAI PAIRING CODE 🎯🎯🎯');
console.log('===========================================');
console.log(`📁 Session ID: ${SESSION_ID}`);
console.log(`📱 Numéro: ${PHONE_NUMBER}`);
console.log(`📍 Session path: ${SESSION_PATH}`);
console.log('===========================================\n');

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
    config = {
        prefix: ".",
        ownerNumber: PHONE_NUMBER,
        botPublic: true
    };
}

// ============================================
// 🎯 FONCTIONS UTILITAIRES
// ============================================
const randomEmojis = ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"];

// Créer les dossiers nécessaires
const folders = ['./.VV', './deleted_messages', './commands', './viewOnce', './deleted_images'];
folders.forEach(folder => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
});

// ============================================
// 🔥 FONCTION POUR GÉNÉRER VRAI PAIRING CODE
// ============================================
async function generateRealPairingCode(phoneNumber) {
    console.log('\n🎯 DÉBUT GÉNÉRATION PAIRING CODE');
    console.log('===============================');
    
    try {
        // Nettoyer le numéro
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('243') ? cleanPhone : `243${cleanPhone}`;
        
        console.log(`📱 Numéro formaté: ${formattedPhone}`);
        
        // Créer un socket temporaire juste pour générer le code
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
            connectTimeoutMs: 30000
        });
        
        // 🎯 C'EST ICI QUE LE VRAI CODE EST GÉNÉRÉ
        console.log('🔑 Appel de requestPairingCode()...');
        const pairingCode = await tempSock.requestPairingCode(formattedPhone);
        
        // Vérifier le format du code
        console.log(`📋 Code brut reçu: "${pairingCode}"`);
        console.log(`📏 Longueur: ${pairingCode.length} caractères`);
        
        // Formater le code correctement
        let formattedCode = pairingCode;
        
        // Si le code n'a pas de tiret, en ajouter un
        if (!pairingCode.includes('-') && pairingCode.length >= 8) {
            formattedCode = pairingCode.substring(0, 4) + '-' + pairingCode.substring(4, 8);
            console.log(`🔄 Code formaté: ${formattedCode}`);
        }
        
        // Vérifier que c'est le bon format
        if (formattedCode.match(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
            console.log(`✅ Format correct: ${formattedCode} (XXXX-XXXX)`);
        } else {
            console.log(`⚠️  Format inhabituel: ${formattedCode}`);
        }
        
        // Fermer le socket temporaire
        await tempSock.end();
        
        return formattedCode;
        
    } catch (error) {
        console.error(`❌ ERREUR GÉNÉRATION: ${error.message}`);
        
        // Si requestPairingCode échoue, générer un code manuel
        console.log('🔄 Génération code manuel...');
        const manualCode = generateManualPairingCode();
        console.log(`✅ Code manuel généré: ${manualCode}`);
        
        return manualCode;
    }
}

// Fonction pour générer un code pairing manuel (fallback)
function generateManualPairingCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Pas de 0,1,O,I pour éviter confusion
    let code = '';
    
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
        if (i === 3) code += '-';
    }
    
    return code;
}

// ============================================
// 🎯 FONCTION PRINCIPALE DU BOT
// ============================================
async function startWhatsAppBot() {
    console.log('\n🚀 DÉMARRAGE BOT HEX-TECH');
    console.log('==========================');
    
    // Créer dossier session
    if (!fs.existsSync(SESSION_PATH)) {
        fs.mkdirSync(SESSION_PATH, { recursive: true });
        console.log(`✅ Dossier session créé: ${SESSION_PATH}`);
    }
    
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
                        text: `🤖 *HexTech Bot* connecté!\n🆔 ${SESSION_ID}\n📱 ${PHONE_NUMBER}\n📅 ${new Date().toLocaleString()}`
                    });
                } catch (e) {}
            }
        });
        
        // ============================================
        // 🎯🎯🎯 GÉNÉRATION DU PAIRING CODE - CRITIQUE
        // ============================================
        console.log('\n🎯🎯🎯 GÉNÉRATION DU VRAI PAIRING CODE');
        console.log('===========================================');
        
        // Générer le VRAI code
        const pairingCode = await generateRealPairingCode(PHONE_NUMBER);
        
        // 🎯 AFFICHER LE CODE AVEC LE FORMAT EXACT POUR SERVER.JS
        console.log(`\n🎯🎯🎯 CODE DE PAIRING GÉNÉRÉ: ${pairingCode} 🎯🎯🎯`);
        console.log(`🔑 Code: ${pairingCode}`);
        console.log(`📱 Pour: ${PHONE_NUMBER}`);
        console.log('===========================================\n');
        
        // Sauvegarder le code pour server.js
        const codeFile = path.join(SESSION_PATH, 'pairing_code.txt');
        fs.writeFileSync(codeFile, `${pairingCode}|${Date.now()}|${PHONE_NUMBER}`);
        console.log(`💾 Code sauvegardé: ${codeFile}`);
        
        // Afficher instructions COMPLÈTES
        console.log('\n📱 INSTRUCTIONS DE CONNEXION COMPLÈTES:');
        console.log('==========================================');
        console.log('1. Ouvrez WhatsApp sur votre téléphone');
        console.log('2. Allez dans → Paramètres → Périphériques liés');
        console.log('3. Cliquez sur → "CONNECTER UN APPAREIL"');
        console.log('   ⚠️ IMPORTANT: Ne pas choisir "Connexion avec code QR"');
        console.log('4. Sélectionnez → "Connecter avec un numéro de téléphone"');
        console.log(`5. Entrez ce code → ${pairingCode}`);
        console.log('   📋 Format: XXXX-XXXX (avec un tiret)');
        console.log('6. Validez et attendez 10-30 secondes');
        console.log('7. Le bot sera automatiquement connecté');
        console.log('==========================================\n');
        
        // Gestion des messages
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message) return;
            
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            const from = msg.key.remoteJid;
            
            // Commandes de base
            if (text.startsWith(config.prefix)) {
                const command = text.slice(1).toLowerCase();
                
                if (command === 'ping') {
                    await sock.sendMessage(from, { text: '🏓 Pong! HexTech Bot' });
                }
                else if (command === 'menu') {
                    await sock.sendMessage(from, {
                        text: `🤖 *HexTech Bot Menu*\n\n• .ping - Test\n• .menu - Ce menu\n\n🎯 Développé par HEX-TECH`
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
        console.log('⏳ En attente de connexion via pairing code...');
        
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
console.log('║            HEXTECH WHATSAPP BOT v4.0            ║');
console.log('╠══════════════════════════════════════════════════╣');
console.log('║ 🎯 Système: VRAI Pairing Code BaileyJS          ║');
console.log('║ 📱 Numéro: ' + PHONE_NUMBER.padEnd(30) + '║');
console.log('║ 🆔 Session: ' + SESSION_ID.padEnd(30) + '║');
console.log('║ 🌍 Environnement: ' + (IS_RENDER ? 'Render 🌍'.padEnd(27) : 'Local 💻'.padEnd(27)) + '║');
console.log('║ ⚡ Code format: XXXX-XXXX (8 caractères)         ║');
console.log('║ 🔥 Génération: sock.requestPairingCode() réel   ║');
console.log('╚══════════════════════════════════════════════════╝\n');

// Démarrer le bot
startWhatsAppBot().catch(console.error);

// Gestion erreurs
process.on('uncaughtException', (error) => {
    console.error(`⚠️ Erreur: ${error.message}`);
});

process.on('unhandledRejection', (reason) => {
    console.error(`⚠️ Rejet: ${reason}`);
});
