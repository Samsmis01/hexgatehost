console.log('🔧 HEXGATE V3 - Vérification des dépendances...');
console.log('📦 Version correcte: @whiskeysockets/baileys (avec un seul L)');

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// 📁 CHARGEMENT DE LA CONFIGURATION
let config = {};
try {
  if (fs.existsSync('./config.json')) {
    config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
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
      botImageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyERDdGHGjmXPv_6tCBIChmD-svWkJatQlpzfxY5WqFg&s=10",
      restoreMessages: true,
      restoreImages: true
    };
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
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
    botImageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCIwiz88R6J5X8x1546iN-aFfGXxKtlUQDStbvnHV7sb-FHYTQKQd358M&s=10",
    restoreMessages: true,
    restoreImages: true
  };
}

// Variables globales depuis config.json
const prefix = config.prefix || ".";
let botPublic = config.botPublic || true;
let welcomeEnabled = false;
let fakeRecording = config.fakeRecording || false;
const antiLink = config.antiLink || true;
const alwaysOnline = config.alwaysOnline || true;
let restoreMessages = config.restoreMessages !== undefined ? config.restoreMessages : true;
let restoreImages = config.restoreImages !== undefined ? config.restoreImages : true;
const OWNER_NUMBER = `${config.ownerNumber.replace(/\D/g, '')}@s.whatsapp.net`;
const telegramLink = config.telegramLink || "https://t.me/hextechcar";
const botImageUrl = config.botImageUrl || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyERDdGHGjmXPv_6tCBIChmD-svWkJatQlpzfxY5WqFg&s=10";
const logLevel = config.logLevel || "silent";

console.log('📋 Configuration chargée:');
console.log(`  • Prefix: ${prefix}`);
console.log(`  • Owner: ${OWNER_NUMBER}`);
console.log(`  • Mode: ${botPublic ? 'Public' : 'Privé'}`);
console.log(`  • Fake Recording: ${fakeRecording ? 'Activé' : 'Désactivé'}`);
console.log(`  • Restauration Messages: ${restoreMessages ? 'Activé' : 'Désactivé'}`);
console.log(`  • Restauration Images: ${restoreImages ? 'Activé' : 'Désactivé'}`);

// Vérification des modules
const requiredModules = [
  '@whiskeysockets/baileys',
  'pino',
  'fs',
  'path',
  'child_process',
  'readline',
  'buffer'
];

const missingModules = [];

for (const module of requiredModules) {
  try {
    if (['fs', 'path', 'child_process', 'readline', 'buffer'].includes(module)) {
      require(module);
      console.log(`✅ ${module} - PRÉSENT (Node.js)`);
    } else {
      require.resolve(module);
      console.log(`✅ ${module} - PRÉSENT`);
    }
  } catch (error) {
    if (!['fs', 'path', 'child_process', 'readline', 'buffer'].includes(module)) {
      missingModules.push(module);
      console.log(`❌ ${module} - MANQUANT`);
    }
  }
}

// Installation automatique si modules manquants
if (missingModules.length > 0) {
  console.log('\n📥 Installation automatique des modules manquants...');
  
  try {
    const { execSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    
    const modulesToInstall = {
      '@whiskeysockets/baileys': '^6.5.0',
      'pino': '^8.19.0'
    };
    
    console.log('📄 Création/MAJ package.json...');
    
    let packageJson = {
      name: 'hexgate-bot',
      version: '5.2.0',
      description: 'HEXGATE WhatsApp Bot',
      main: 'index.js',
      scripts: {
        start: 'node index.js',
        install: 'echo "Installation des dépendances..."'
      },
      dependencies: {}
    };
    
    if (fs.existsSync('package.json')) {
      try {
        const existing = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        packageJson = { ...packageJson, ...existing };
      } catch (e) {
        console.log('⚠️ package.json existant invalide, création nouveau');
      }
    }
    
    Object.keys(modulesToInstall).forEach(mod => {
      packageJson.dependencies[mod] = modulesToInstall[mod];
    });
    
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    
    console.log('🚀 Installation via npm...');
    
    for (const module of missingModules) {
      if (modulesToInstall[module]) {
        console.log(`📦 Installation de ${module}@${modulesToInstall[module]}...`);
        try {
          execSync(`npm install ${module}@${modulesToInstall[module]}`, { 
            stdio: 'inherit',
            cwd: process.cwd()
          });
        } catch (installError) {
          console.log(`⚠️ Tentative alternative pour ${module}...`);
          try {
            execSync(`npm install ${module}`, { 
              stdio: 'pipe',
              cwd: process.cwd() 
            });
          } catch (e) {
            console.log(`❌ Échec installation ${module}: ${e.message}`);
          }
        }
      }
    }
    
    console.log('\n✅ Installation terminée !');
    console.log('🔄 Redémarrage dans 3 secondes...');
    
    setTimeout(() => {
      console.clear();
      console.log('🚀 REDÉMARRAGE DU BOT HEXGATE...\n');
      import('./index.js');
    }, 3000);
    
  } catch (error) {
    console.log('❌ Erreur installation automatique:', error.message);
    console.log('\n🛠️ INSTALLEZ MANUELLEMENT:');
    console.log('npm install @whiskeysockets/baileys@^6.5.0 pino@^8.19.0');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('\nVoulez-vous essayer l\'installation manuelle? (o/n): ', (answer) => {
      if (answer.toLowerCase() === 'o') {
        console.log('Exécutez cette commande:');
        console.log('npm install @whiskeysockets/baileys@^6.5.0 pino@^8.19.0');
      }
      rl.close();
      process.exit(1);
    });
  }
}

// IMPORTATION CORRIGÉE
import makeWASocket, {
  useMultiFileAuthState,
  downloadContentFromMessage,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  delay,
  getContentType
} from "@whiskeysockets/baileys";
import P from "pino";
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { exec } = require("child_process");
const { Buffer } = require("buffer");

// ==================== CONFIGURATION OWNER DYNAMIQUE ====================

// ⚡ VARIABLES POUR L'API
let sock = null;
let botReady = false;
let pairingCodes = new Map();

// ==================== FONCTIONS POUR L'API ====================

/**
 * Vérifie si le bot est prêt
 * @returns {boolean} État du bot
 */
function isBotReady() {
  return botReady;
}

/**
 * Fonction utilitaire pour formater les numéros
 * @param {string} phone - Numéro à formater
 * @returns {string} Numéro formaté
 */
function formatPhoneNumber(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Liste des indicatifs pays courants
  const countryCodes = [
    '243', '224', '225', '226', '227', '228', '229',
    '230', '231', '232', '233', '234', '235', '236',
    '237', '238', '239', '240', '241', '242', '244',
    '245', '246', '247', '248', '249', '250', '251',
    '252', '253', '254', '255', '256', '257', '258',
    '260', '261', '262', '263', '264', '265', '266',
    '267', '268', '269', '290', '291', '211', '212',
    '213', '216', '218', '220', '221', '222', '223'
  ];
  
  // Vérifier si le numéro commence déjà par un indicatif connu
  for (const code of countryCodes) {
    if (cleanPhone.startsWith(code)) {
      return cleanPhone;
    }
  }
  
  // Vérifier les indicatifs à 2 chiffres
  const firstTwo = cleanPhone.substring(0, 2);
  if (['21', '22', '23', '24', '25', '26'].includes(firstTwo) && cleanPhone.length >= 10) {
    return cleanPhone;
  }
  
  // Si le numéro commence par 0 (numéro local)
  if (cleanPhone.startsWith('0')) {
    return '243' + cleanPhone.substring(1);
  }
  
  // Numéro court sans indicatif
  if (cleanPhone.length < 9) {
    return '243' + cleanPhone;
  }
  
  // Numéro long sans 0 au début
  if (cleanPhone.length >= 9) {
    return cleanPhone;
  }
  
  // Par défaut, ajouter 243
  return '243' + cleanPhone;
}

/**
 * Génére un code de pairing pour un numéro WhatsApp
 * @param {string} phone - Numéro WhatsApp
 * @returns {Promise<string|null>} Code de pairing ou null en cas d'erreur
 */
async function generatePairCode(phone) {
  try {
    if (!sock) {
      console.log('❌ Bot non initialisé pour générer pair code');
      return null;
    }
    
    // Formater le numéro
    const formattedPhone = formatPhoneNumber(phone);
    
    console.log(`📱 [API] Génération pair code pour: ${formattedPhone} (original: ${phone})`);
    
    // Vérifier si un code a déjà été généré récemment
    const existingCode = pairingCodes.get(formattedPhone);
    if (existingCode && (Date.now() - existingCode.timestamp < 60000)) {
      console.log(`🔄 [API] Code déjà généré récemment pour ${formattedPhone}`);
      return existingCode.code;
    }
    
    // Générer le code via WhatsApp
    const code = await sock.requestPairingCode(formattedPhone);
    
    if (code) {
      // Stocker le code
      pairingCodes.set(formattedPhone, {
        code: code,
        timestamp: Date.now()
      });
      
      // Nettoyer après 5 minutes
      setTimeout(() => {
        pairingCodes.delete(formattedPhone);
        console.log(`🧹 [API] Code expiré pour ${formattedPhone}`);
      }, 300000);
      
      console.log(`✅ [API] Pair code généré: ${code} pour ${formattedPhone}`);
      
      // Envoyer notification au propriétaire
      const cleanOwnerNumber = config.ownerNumber.replace(/\D/g, '');
      const cleanUserNumber = formattedPhone.replace(/\D/g, '');
      
      if (cleanUserNumber !== cleanOwnerNumber) {
        try {
          await sock.sendMessage(OWNER_NUMBER, {
            text: `📱 *NOUVELLE DEMANDE DE PAIRING*\n\n👤 Numéro: ${formattedPhone}\n🔑 Code: ${code}\n⏰ Date: ${new Date().toLocaleString()}`
          });
        } catch (notifyError) {}
      }
      
      return code;
    }
    
    return null;
    
  } catch (error) {
    console.log(`❌ [API] Erreur génération pair code: ${error.message}`);
    return null;
  }
}

// 🌈 COULEURS POUR LE TERMINAL
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

// 📁 Dossiers
const VV_FOLDER = "./.VV";
const DELETED_MESSAGES_FOLDER = "./deleted_messages";
const COMMANDS_FOLDER = "./commands";
const VIEW_ONCE_FOLDER = "./viewOnce";
const DELETED_IMAGES_FOLDER = "./deleted_images";

// Vérification des dossiers
[VV_FOLDER, DELETED_MESSAGES_FOLDER, COMMANDS_FOLDER, VIEW_ONCE_FOLDER, DELETED_IMAGES_FOLDER].forEach(folder => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    console.log(`${colors.green}✅ Dossier ${folder} créé${colors.reset}`);
  }
});

// Emojis pour réactions
const randomEmojis = ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"];

// Variables globales
let processingMessages = new Set();
let isProcessing = false;
let lastDeletedMessage = new Map();
let antiLinkCooldown = new Map();
let botMessages = new Set();
let autoReact = true;

// Map pour stocker les messages
const messageStore = new Map();
const viewOnceStore = new Map();

// ============================================
// 🖼️ FONCTION DE FORMATAGE
// ============================================
async function sendFormattedMessage(sock, jid, messageText, msg) {
  const formattedMessage = `┏━━❖ ＡＲＣＡＮＥ❖━━┓
┃ 🛡️ 𝐇𝐄𝐗✦𝐆Ａ𝐓Ｅ 𝑽_1
┃
┃ 👨‍💻 𝙳𝙴𝚅 : ${msg.pushName || 'Inconnu'}
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
    try {
      const sentMsg = await sock.sendMessage(jid, { 
        text: formattedMessage 
      });
      
      if (sentMsg?.key?.id) {
        botMessages.add(sentMsg.key.id);
        setTimeout(() => botMessages.delete(sentMsg.key.id), 300000);
      }
    } catch (finalError) {
      console.log(`${colors.red}❌ Échec envoi message: ${finalError.message}${colors.reset}`);
    }
  }
}

// ============================================
// 📦 SYSTÈME DE COMMANDES
// ============================================
class CommandHandler {
  constructor() {
    this.commands = new Map();
    this.initializeCommands();
  }

  initializeCommands() {
    try {
      console.log(`${colors.cyan}📁 Initialisation des commandes...${colors.reset}`);
      
      // Commandes de base
      this.commands.set("ping", {
        name: "ping",
        description: "Test de réponse du bot",
        execute: async (sock, msg, args, context) => {
          const from = msg.key.remoteJid;
          await sendFormattedMessage(sock, from, `🏓 *PONG!*\n\n🤖 HEXGATE V1 - En ligne!`, msg);
        }
      });

      this.commands.set("menu", {
        name: "menu",
        description: "Affiche le menu",
        execute: async (sock, msg, args, context) => {
          const from = msg.key.remoteJid;
          const menuText = `┏━━❖ ＡＲＣＡＮＥ ❖━━┓
┃ 🛡️ HEX✦GATE V1
┃ 👨‍💻 Dev : T.me/hextechcar
┃ 
┗━━━━━━━━━━━━━━━━

Commandes disponibles:
• ${prefix}ping - Test du bot
• ${prefix}menu - Ce menu
• ${prefix}restore - Gérer restauration
• ${prefix}status - Statut du bot

*powered by HEXTECH™*`;
          
          await sock.sendMessage(from, { text: menuText });
        }
      });

      this.commands.set("restore", {
        name: "restore",
        description: "Gérer la restauration",
        execute: async (sock, msg, args) => {
          const from = msg.key.remoteJid;
          const senderJid = msg.key.participant || msg.key.remoteJid;
          
          if (!isOwner(senderJid)) {
            await sendFormattedMessage(sock, from, "❌ Commande réservée au propriétaire", msg);
            return;
          }
          
          if (!args[0]) {
            const status = `📊 *STATUS RESTAURATION*\n\n✅ Messages: ${restoreMessages ? 'ACTIVÉ' : 'DÉSACTIVÉ'}\n🖼️ Images: ${restoreImages ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`;
            await sendFormattedMessage(sock, from, status, msg);
            return;
          }
          
          const action = args[0].toLowerCase();
          if (action === 'on') {
            restoreMessages = true;
            restoreImages = true;
            config.restoreMessages = true;
            config.restoreImages = true;
            fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
            await sendFormattedMessage(sock, from, "✅ Restauration activée", msg);
          } else if (action === 'off') {
            restoreMessages = false;
            restoreImages = false;
            config.restoreMessages = false;
            config.restoreImages = false;
            fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
            await sendFormattedMessage(sock, from, "🔒 Restauration désactivée", msg);
          }
        }
      });

      this.commands.set("status", {
        name: "status",
        description: "Statut du bot",
        execute: async (sock, msg, args) => {
          const from = msg.key.remoteJid;
          const statusText = `📊 *STATUT HEXGATE*\n\n🤖 Version: V3\n🔓 Mode: ${botPublic ? 'Public' : 'Privé'}\n🎤 Fake Recording: ${fakeRecording ? 'ACTIVÉ' : 'DÉSACTIVÉ'}\n🔄 Restauration: ${restoreMessages ? 'ACTIVÉ' : 'DÉSACTIVÉ'}\n👑 Propriétaire: ${config.ownerNumber}\n🔗 API: ${botReady ? 'PRÊTE' : 'NON PRÊTE'}`;
          await sendFormattedMessage(sock, from, statusText, msg);
        }
      });

      console.log(`${colors.green}✅ ${this.commands.size} commandes chargées${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}❌ Erreur chargement commandes: ${error.message}${colors.reset}`);
    }
  }

  async execute(commandName, sock, msg, args, context) {
    const cmd = commandName.toLowerCase();
    
    if (!this.commands.has(cmd)) {
      return false;
    }
    
    const command = this.commands.get(cmd);
    
    try {
      console.log(`${colors.cyan}⚡ Exécution: ${cmd}${colors.reset}`);
      await command.execute(sock, msg, args, context);
      return true;
    } catch (error) {
      console.log(`${colors.red}❌ Erreur exécution ${cmd}: ${error.message}${colors.reset}`);
      return false;
    }
  }

  getCommandList() {
    return Array.from(this.commands.keys());
  }
}

// Fonction pour vérifier si c'est le propriétaire
function isOwner(senderJid) {
  const normalizedJid = senderJid.split(":")[0];
  const ownerJid = OWNER_NUMBER.split(":")[0];
  return normalizedJid === ownerJid;
}

// Fonction pour vérifier si admin
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

// 📱 Affichage logo
function displayBanner() {
  console.clear();
  console.log(`
${colors.magenta}╔══════════════════════════════════════════════════╗
║${colors.bright}${colors.cyan}         WHATSAPP BOT - HEXGATE EDITION          ${colors.reset}${colors.magenta}║
╠══════════════════════════════════════════════════╣
║${colors.green} ✅ BOT EN MODE PUBLIC - TOUS ACCÈS AUTORISÉS${colors.magenta}║
║${colors.green} ✅ API PAIRING INTÉGRÉE                      ${colors.magenta}║
║${colors.green} ✅ RESTAURATION MESSAGES/IMAGES             ${colors.magenta}║
╚══════════════════════════════════════════════════╝${colors.reset}
`);
}

// ============================================
// ⚡ FONCTION PRINCIPALE DU BOT
// ============================================
async function startBot() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  async function askForPhoneNumber() {
    return new Promise((resolve) => {
      rl.question(`${colors.cyan}📱 INSÉREZ VOTRE NUMÉRO WHATSAPP : ${colors.reset}`, (phone) => {
        resolve(phone.trim());
      });
    });
  }

  try {
    displayBanner();
    
    const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
      version,
      logger: P({ level: logLevel }),
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
      
      if (qr) {
        const phoneNumber = await askForPhoneNumber();
        if (!phoneNumber || phoneNumber.length < 9) {
          console.log(`${colors.red}❌ Numéro invalide${colors.reset}`);
          process.exit(1);
        }

        try {
          const code = await sock.requestPairingCode(phoneNumber);
          console.log(`${colors.green}✅ Code de pairing: ${code}${colors.reset}`);
          console.log(`${colors.cyan}📱 Allez sur WhatsApp > Périphériques liés > Ajouter un périphérique${colors.reset}`);
          await delay(3000);
        } catch (pairError) {
          console.log(`${colors.red}❌ Erreur pairing: ${pairError.message}${colors.reset}`);
          process.exit(1);
        }
      }
      
      if (connection === "close") {
        const reason = new Error(lastDisconnect?.error)?.output?.statusCode;
        if (reason === DisconnectReason.loggedOut) {
          console.log(`${colors.red}❌ Déconnecté, nettoyage...${colors.reset}`);
          exec("rm -rf auth_info_baileys", () => {
            console.log(`${colors.yellow}🔄 Redémarrage...${colors.reset}`);
            startBot();
          });
        } else {
          console.log(`${colors.yellow}🔄 Reconnexion...${colors.reset}`);
          startBot();
        }
      } else if (connection === "open") {
        console.log(`${colors.green}✅ Connecté à WhatsApp!${colors.reset}`);
        console.log(`${colors.cyan}🔓 Mode: ${botPublic ? 'PUBLIC' : 'PRIVÉ'}${colors.reset}`);
        
        try {
          await sock.sendMessage(OWNER_NUMBER, { 
            text: `✅ *HEX-GATE CONNECTÉE*\n\n🚀 *HEXGATE V1* est en ligne!\n🔗 *API Pairing:* PRÊTE\n👑 Propriétaire: ${config.ownerNumber}` 
          });
        } catch (error) {}
        
        botReady = true;
      }
    });

    // Gestion des messages
    sock.ev.on("messages.upsert", async ({ messages }) => {
      try {
        const msg = messages[0];
        if (!msg.message) return;

        const senderJid = msg.key.participant || msg.key.remoteJid;
        const isOwnerMsg = isOwner(senderJid);
        
        const messageType = Object.keys(msg.message)[0];
        
        if (messageType === "protocolMessage") {
          return;
        }

        let body = "";
        if (messageType === "conversation") {
          body = msg.message.conversation;
        } else if (messageType === "extendedTextMessage") {
          body = msg.message.extendedTextMessage.text;
        } else if (messageType === "imageMessage") {
          body = msg.message.imageMessage?.caption || "";
        } else {
          return;
        }

        const from = msg.key.remoteJid;

        // Traitement des commandes
        if (body.startsWith(prefix)) {
          const args = body.slice(prefix.length).trim().split(/ +/);
          const command = args.shift().toLowerCase();
          
          console.log(`${colors.cyan}🎯 Commande: ${command} par ${senderJid}${colors.reset}`);
          
          const context = {
            isOwner: isOwnerMsg,
            sender: senderJid,
            prefix: prefix,
            botPublic: botPublic || isOwnerMsg
          };
          
          if (botPublic || isOwnerMsg) {
            await commandHandler.execute(command, sock, msg, args, context);
          }
        }

        // Fake recording
        if (fakeRecording && !msg.key.fromMe) {
          try {
            await sock.sendPresenceUpdate('recording', from);
            await delay(1000);
            await sock.sendPresenceUpdate('available', from);
          } catch {}
        }

      } catch (error) {
        console.log(`${colors.red}❌ Erreur traitement: ${error.message}${colors.reset}`);
      }
    });

    // Interface console
    rl.on("line", (input) => {
      const args = input.trim().split(/ +/);
      const command = args.shift().toLowerCase();
      
      switch (command) {
        case "public":
          botPublic = true;
          config.botPublic = true;
          fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
          console.log(`${colors.green}✅ Mode public activé${colors.reset}`);
          break;
          
        case "private":
          botPublic = false;
          config.botPublic = false;
          fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
          console.log(`${colors.green}✅ Mode privé activé${colors.reset}`);
          break;
          
        case "status":
          console.log(`${colors.cyan}📊 STATUT${colors.reset}`);
          console.log(`${colors.yellow}• Mode: ${botPublic ? 'PUBLIC' : 'PRIVÉ'}${colors.reset}`);
          console.log(`${colors.yellow}• Fake Recording: ${fakeRecording ? 'ACTIVÉ' : 'DÉSACTIVÉ'}${colors.reset}`);
          console.log(`${colors.yellow}• Restauration: ${restoreMessages ? 'ACTIVÉ' : 'DÉSACTIVÉ'}${colors.reset}`);
          console.log(`${colors.yellow}• API Ready: ${botReady ? 'OUI' : 'NON'}${colors.reset}`);
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
// 🚀 DÉMARRAGE
// ============================================
console.log(`${colors.magenta}🚀 Démarrage HEXGATE V3...${colors.reset}`);
startBot();

// ============================================
// 📦 EXPORTS POUR L'API
// ============================================
export {
  sock as bot,
  generatePairCode,
  isBotReady,
  config
};
