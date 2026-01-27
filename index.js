console.log('🔧 HEXGATE V3 - Vérification des dépendances...');
console.log('📦 Version correcte: @whiskeysockets/baileys (avec un seul L)');

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

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

// Vérifier chaque module
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
// 📋 Ces fonctions sont appelées par server.js

/**
 * Vérifie si le bot est prêt
 * @returns {boolean} État du bot
 */
function isBotReady() {
  return botReady;
}

/**
 * Fonction utilitaire pour formater les numéros (partagée entre index.js et server.js)
 * @param {string} phone - Numéro à formater
 * @returns {string} Numéro formaté
 */
function formatPhoneNumber(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Liste des indicatifs pays courants
  const countryCodes = [
    '243', // RD Congo
    '224', // Guinée
    '225', // Côte d'Ivoire
    '226', // Burkina Faso
    '227', // Niger
    '228', // Togo
    '229', // Bénin
    '230', // Maurice
    '231', // Liberia
    '232', // Sierra Leone
    '233', // Ghana
    '234', // Nigeria
    '235', // Tchad
    '236', // République centrafricaine
    '237', // Cameroun
    '238', // Cap-Vert
    '239', // Sao Tomé-et-Principe
    '240', // Guinée équatoriale
    '241', // Gabon
    '242', // Congo
    '244', // Angola
    '245', // Guinée-Bissau
    '246', // Territoire britannique de l'océan Indien
    '247', // Ascension
    '248', // Seychelles
    '249', // Soudan
    '250', // Rwanda
    '251', // Éthiopie
    '252', // Somalie
    '253', // Djibouti
    '254', // Kenya
    '255', // Tanzanie
    '256', // Ouganda
    '257', // Burundi
    '258', // Mozambique
    '260', // Zambie
    '261', // Madagascar
    '262', // Réunion
    '263', // Zimbabwe
    '264', // Namibie
    '265', // Malawi
    '266', // Lesotho
    '267', // Botswana
    '268', // Eswatini
    '269', // Comores
    '290', // Sainte-Hélène
    '291', // Érythrée
    '211', // Soudan du Sud
    '212', // Maroc
    '213', // Algérie
    '216', // Tunisie
    '218', // Libye
    '220', // Gambie
    '221', // Sénégal
    '222', // Mauritanie
    '223'  // Mali
  ];
  
  // Vérifier si le numéro commence déjà par un indicatif connu
  for (const code of countryCodes) {
    if (cleanPhone.startsWith(code)) {
      return cleanPhone; // Garder tel quel
    }
  }
  
  // Vérifier les indicatifs à 2 chiffres pour l'Afrique
  const firstTwo = cleanPhone.substring(0, 2);
  if (['21', '22', '23', '24', '25', '26'].includes(firstTwo) && cleanPhone.length >= 10) {
    return cleanPhone; // Probablement déjà complet avec indicatif 2 chiffres
  }
  
  // Si le numéro commence par 0 (numéro local)
  if (cleanPhone.startsWith('0')) {
    return '243' + cleanPhone.substring(1); // RD Congo par défaut
  }
  
  // Numéro court sans indicatif
  if (cleanPhone.length < 9) {
    return '243' + cleanPhone; // RD Congo par défaut
  }
  
  // Numéro long sans 0 au début (peut-être déjà complet)
  if (cleanPhone.length >= 9) {
    return cleanPhone; // Garder tel quel
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
    
    // Formater le numéro de manière cohérente avec server.js
    const formattedPhone = formatPhoneNumber(phone);
    
    console.log(`📱 [API] Génération pair code pour: ${formattedPhone} (original: ${phone})`);
    
    // Vérifier si un code a déjà été généré récemment pour ce numéro
    const existingCode = pairingCodes.get(formattedPhone);
    if (existingCode && (Date.now() - existingCode.timestamp < 60000)) {
      console.log(`🔄 [API] Code déjà généré récemment pour ${formattedPhone}`);
      return existingCode.code;
    }
    
    // Générer le code via l'API WhatsApp
    const code = await sock.requestPairingCode(formattedPhone);
    
    if (code) {
      // Stocker le code dans la Map
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
      
      // Envoyer une notification au propriétaire si c'est un nouveau numéro
      const cleanOwnerNumber = config.ownerNumber.replace(/\D/g, '');
      const cleanUserNumber = formattedPhone.replace(/\D/g, '');
      
      if (cleanUserNumber !== cleanOwnerNumber) {
        try {
          await sock.sendMessage(OWNER_NUMBER, {
            text: `📱 *NOUVELLE DEMANDE DE PAIRING*\n\n👤 Numéro: ${formattedPhone}\n🔑 Code généré: ${code}\n⏰ Date: ${new Date().toLocaleString()}\n🌍 Indicatif détecté: ${formattedPhone.substring(0, 3)}`
          });
          console.log(`📨 Notification envoyée au propriétaire`);
        } catch (notifyError) {
          console.log(`⚠️ Impossible d'envoyer notification: ${notifyError.message}`);
        }
      }
      
      return code;
    }
    
    console.log(`❌ [API] Impossible de générer le code pour ${formattedPhone}`);
    return null;
    
  } catch (error) {
    console.log(`❌ [API] Erreur génération pair code: ${error.message}`);
    
    // Messages d'erreur plus informatifs
    if (error.message.includes('rate limit')) {
      console.log('⚠️ [API] Rate limit WhatsApp atteint, veuillez patienter');
    } else if (error.message.includes('invalid') || error.message.includes('Invalid')) {
      console.log(`⚠️ [API] Numéro invalide pour WhatsApp: ${phone}`);
    } else if (error.message.includes('not registered')) {
      console.log(`⚠️ [API] Numéro non enregistré sur WhatsApp: ${phone}`);
    }
    
    return null;
  }
}

// Autres fonctions utilitaires
function findBotParticipant(participants, botJid) {
  const possibleBotIds = [
    botJid,
    botJid.split(':')[0] + '@s.whatsapp.net',
    botJid.replace(/:\d+/, ''),
    botJid.split(':')[0] + ':' + botJid.split(':')[1],
    botJid.includes('@') ? botJid : botJid + '@s.whatsapp.net'
  ];
  
  return participants.find(p => 
    possibleBotIds.some(id => p.id === id || p.id.includes(id.split('@')[0]))
  );
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
  } else {
    console.log(`${colors.cyan}📁 Dossier ${folder} déjà existant${colors.reset}`);
  }
});

// Emojis pour réactions aléatoires
const randomEmojis = ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"];

// Variables globales
let processingMessages = new Set();
let isProcessing = false;
let lastDeletedMessage = new Map();
let antiLinkCooldown = new Map();
let botMessages = new Set();
let autoReact = true;

// Map pour stocker les messages en mémoire
const messageStore = new Map();

// Map pour stocker les vues uniques
const viewOnceStore = new Map();

// ============================================
// 🖼️ FONCTION DE FORMATAGE UNIFIÉE POUR TOUS LES MESSAGES
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
      console.log(`${colors.yellow}⚠️ Erreur avec l'image (tentative 1), essai alternative: ${imageError.message}${colors.reset}`);
    }

    try {
      const alternativeImage = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyERDdGHGjmXPv_6tCBIChmD-svWkJatQlpzfxY5WqFg&s";
      const sentMsg = await sock.sendMessage(jid, {
        image: { url: alternativeImage },
        caption: formattedMessage
      });
      
      if (sentMsg?.key?.id) {
        botMessages.add(sentMsg.key.id);
        setTimeout(() => botMessages.delete(sentMsg.key.id), 300000);
      }
    } catch (secondImageError) {
      console.log(`${colors.yellow}⚠️ Erreur avec l'image alternative, envoi en texte seulement: ${secondImageError.message}${colors.reset}`);
      
      const sentMsg = await sock.sendMessage(jid, { 
        text: formattedMessage 
      });
      
      if (sentMsg?.key?.id) {
        botMessages.add(sentMsg.key.id);
        setTimeout(() => botMessages.delete(sentMsg.key.id), 300000);
      }
    }
  } catch (finalError) {
    console.log(`${colors.red}❌ Échec complet de l'envoi du message: ${finalError.message}${colors.reset}`);
  }
}

// ============================================
// 📦 SYSTÈME DE COMMANDES AMÉLIORÉ
// ============================================
class CommandHandler {
  constructor() {
    this.commands = new Map();
    this.commandsLoaded = false;
    this.initializeCommands();
  }

  initializeCommands() {
    try {
      console.log(`${colors.cyan}📁 Initialisation des commandes...${colors.reset}`);
      
      this.loadBuiltinCommands();
      
      this.loadCommandsFromDirectory();
      
      this.commandsLoaded = true;
      console.log(`${colors.green}✅ ${this.commands.size} commandes chargées avec succès${colors.reset}`);
      
      console.log(`${colors.cyan}📋 Commandes disponibles:${colors.reset}`);
      this.commands.forEach((cmd, name) => {
        console.log(`  ${colors.green}•${colors.reset} ${name}${colors.cyan} - ${cmd.description || 'Pas de description'}${colors.reset}`);
      });
      
    } catch (error) {
      this.commandsLoaded = false;
      console.log(`${colors.red}❌ Erreur chargement commandes: ${error.message}${colors.reset}`);
      console.log(`${colors.yellow}⚠️ Utilisation des commandes intégrées uniquement${colors.reset}`);
      
      this.loadBuiltinCommands();
      this.commandsLoaded = true;
    }
  }

  loadCommandsFromDirectory() {
    let count = 0;
    
    try {
      const commandsDir = path.join(__dirname, 'commands');
      
      if (!fs.existsSync(commandsDir)) {
        console.log(`${colors.yellow}⚠️ Dossier commands non trouvé${colors.reset}`);
        return count;
      }
      
      const items = fs.readdirSync(commandsDir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(commandsDir, item.name);
        
        try {
          if (item.isDirectory()) {
            const subItems = fs.readdirSync(fullPath, { withFileTypes: true });
            for (const subItem of subItems) {
              if (subItem.isFile() && subItem.name.endsWith('.js')) {
                const subPath = path.join(fullPath, subItem.name);
                count += this.loadSingleCommand(subPath);
              }
            }
          } else if (item.isFile() && item.name.endsWith('.js')) {
            count += this.loadSingleCommand(fullPath);
          }
        } catch (error) {
          console.log(`${colors.yellow}⚠️ Erreur chargement ${item.name}: ${error.message}${colors.reset}`);
        }
      }
      
      return count;
      
    } catch (error) {
      console.log(`${colors.yellow}⚠️ Erreur scan dossier commands: ${error.message}${colors.reset}`);
      return count;
    }
  }

  loadSingleCommand(fullPath) {
    try {
      delete require.cache[require.resolve(fullPath)];
      const command = require(fullPath);
      
      if (command && command.name && typeof command.execute === 'function') {
        const commandName = command.name.toLowerCase();
        
        if (this.commands.has(commandName)) {
          console.log(`${colors.yellow}⚠️ Commande en doublon ignorée: ${commandName}${colors.reset}`);
          return 0;
        }
        
        this.commands.set(commandName, command);
        
        const relativePath = path.relative(process.cwd(), fullPath);
        console.log(`${colors.green}✅ Commande chargée: ${colors.cyan}${command.name}${colors.reset} (${relativePath})`);
        return 1;
      } else {
        console.log(`${colors.yellow}⚠️ Format invalide: ${path.basename(fullPath)} - manque name ou execute${colors.reset}`);
        return 0;
      }
      
    } catch (requireError) {
      if (!requireError.message.includes('Cannot find module')) {
        console.log(`${colors.yellow}⚠️ Erreur chargement ${path.basename(fullPath)}: ${requireError.message}${colors.reset}`);
      }
      return 0;
    }
  }

  loadBuiltinCommands() {
    const self = this;
    const fs = require('fs');
    const path = require('path');

    // NOUVEAU: Commandes pour activation/désactivation restauration
    this.commands.set("restore", {
      name: "restore",
      description: "Active ou désactive la restauration des messages et images",
      execute: async (sock, msg, args) => {
        const from = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        // Vérifier si c'est le propriétaire
        const isOwnerMsg = isOwner(senderJid);
        if (!isOwnerMsg) {
          await sendFormattedMessage(sock, from, "❌ Commande réservée au propriétaire", msg);
          return;
        }
        
        if (!args[0]) {
          const status = `
📊 *STATUS RESTAURATION*

✅ Restauration Messages: ${restoreMessages ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
🖼️ Restauration Images: ${restoreImages ? 'ACTIVÉ' : 'DÉSACTIVÉ'}

📁 Messages sauvegardés: ${fs.readdirSync(DELETED_MESSAGES_FOLDER).length}
📸 Images sauvegardées: ${fs.readdirSync(DELETED_IMAGES_FOLDER).length}

Utilisation:
• .restore on - Active tout
• .restore off - Désactive tout
• .restore messages on/off - Messages seulement
• .restore images on/off - Images seulement`;
          
          await sendFormattedMessage(sock, from, status, msg);
          return;
        }
        
        const action = args[0].toLowerCase();
        const target = args[1] ? args[1].toLowerCase() : 'all';
        
        let message = "";
        
        if (action === 'on' || action === 'off') {
          const state = action === 'on';
          
          if (target === 'all') {
            restoreMessages = state;
            restoreImages = state;
            message = `✅ Restauration ${state ? 'activée' : 'désactivée'} pour messages et images`;
          } else if (target === 'messages') {
            restoreMessages = state;
            message = `✅ Restauration messages ${state ? 'activée' : 'désactivée'}`;
          } else if (target === 'images') {
            restoreImages = state;
            message = `✅ Restauration images ${state ? 'activée' : 'désactivée'}`;
          } else {
            message = "❌ Usage: .restore [on/off] [all/messages/images]";
          }
          
          // Sauvegarder dans la config
          config.restoreMessages = restoreMessages;
          config.restoreImages = restoreImages;
          fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        } else {
          message = "❌ Usage: .restore [on/off] [all/messages/images]";
        }
        
        await sendFormattedMessage(sock, from, message, msg);
      }
    });

    // Commande .setname (gardée)
    this.commands.set("setname", {
      name: "setname",
      description: "Change le nom du groupe",
      execute: async (sock, msg, args) => {
        const from = msg.key.remoteJid;

        if (!from.endsWith("@g.us")) {
          return sock.sendMessage(from, { text: "❌ Commande réservée aux groupes" });
        }

        const newName = args.join(" ");
        if (!newName) {
          return sock.sendMessage(from, {
            text: "❌ Utilisation : .setname <nouveau nom>"
          });
        }

        try {
          const metadata = await sock.groupMetadata(from);
          const participants = metadata.participants;

          const sender = msg.key.participant || msg.key.remoteJid;

          const isAdmin = participants.some(
            p => p.id === sender && (p.admin === "admin" || p.admin === "superadmin")
          );

          if (!isAdmin) {
            return sock.sendMessage(from, {
              text: "❌ Seuls les admins peuvent changer le nom du groupe"
            });
          }

          await sock.groupUpdateSubject(from, newName);

          await sock.sendMessage(from, {
            text: `✅ Nom du groupe changé en : *${newName}*`
          });

        } catch (err) {
          console.log("setname error:", err);
          await sock.sendMessage(from, {
            text: "❌ Erreur lors du changement de nom du groupe"
          });
        }
      }
    });

    // Commande .revoke (gardée)
    this.commands.set("revoke", {
      name: "revoke",
      description: "Révoque le lien du groupe (nouveau lien généré)",
      execute: async (sock, msg, args) => {
        const from = msg.key.remoteJid;

        if (!from.endsWith("@g.us")) {
          return await sock.sendMessage(from, { text: "❌ Commande réservée aux groupes" });
        }

        try {
          const metadata = await sock.groupMetadata(from);
          const participants = metadata.participants;
          const sender = msg.key.participant || msg.key.remoteJid;

          const isAdmin = participants.some(
            p => p.id === sender && (p.admin === "admin" || p.admin === "superadmin")
          );
          if (!isAdmin) {
            return await sock.sendMessage(from, {
              text: "❌ Seuls les admins peuvent révoquer le lien du groupe"
            });
          }

          await sock.groupRevokeInvite(from);
          const newInvite = await sock.groupInviteCode(from);

          await sock.sendMessage(from, {
            text: `✅ Nouveau lien du groupe généré :\nhttps://chat.whatsapp.com/${newInvite}`
          });

        } catch (err) {
          console.log("revoke error:", err);
          await sock.sendMessage(from, {
            text: "❌ Erreur lors de la réinitialisation du lien du groupe"
          });
        }
      }
    });

    // Commande .link (gardée)
    this.commands.set("link", {
      name: "link",
      description: "Donne le lien d'invitation du groupe",
      execute: async (sock, msg, args) => {
        const from = msg.key.remoteJid;

        if (!from.endsWith("@g.us")) {
          return await sock.sendMessage(from, { text: "❌ Commande réservée aux groupes" });
        }

        try {
          const inviteCode = await sock.groupInviteCode(from);

          if (!inviteCode) {
            return await sock.sendMessage(from, {
              text: "❌ Impossible de récupérer le lien. Assurez-vous que le bot est admin."
            });
          }

          await sock.sendMessage(from, {
            text: `🔗 Lien du groupe :\nhttps://chat.whatsapp.com/${inviteCode}`
          });

        } catch (err) {
          console.log("link error:", err);
          await sock.sendMessage(from, { text: "❌ Erreur lors de la récupération du lien du groupe" });
        }
    });

    // Commande .stealpp (gardée)
    this.commands.set("stealpp", {
      name: "stealpp",
      description: "Récupère la photo de profil d'un utilisateur (Premium)",
      execute: async (sock, msg, args) => {
        const from = msg.key.remoteJid;

        try {
          let targetJid;

          if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
            targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
          } else if (args[0]) {
            const num = args[0].replace(/\D/g, "");
            if (!num) {
              return sock.sendMessage(from, { text: "❌ Numéro invalide" });
            }
            targetJid = num + "@s.whatsapp.net";
          } else {
            targetJid = msg.key.participant || msg.key.remoteJid;
          }

          let ppUrl;
          try {
            ppUrl = await sock.profilePictureUrl(targetJid, "image");
          } catch {
            return sock.sendMessage(from, {
              text: "❌ Photo de profil privée ou indisponible"
            });
          }

          await sock.sendMessage(from, {
            image: { url: ppUrl },
            caption: `🕵️ *STEAL PP*\n\n👤 @${targetJid.split("@")[0]}`,
            mentions: [targetJid]
          });

        } catch (err) {
          console.log("stealpp error:", err);
          await sock.sendMessage(from, {
            text: "❌ Erreur lors de la récupération de la photo"
          });
        }
      }
    });

    // Commande .welcome (gardée)
    this.commands.set("welcome", {
      name: "welcome",
      description: "Active ou désactive le message de bienvenue",
      execute: async (sock, msg, args) => {
        const from = msg.key.remoteJid;

        try {
          if (args[0] === "on") {
            welcomeEnabled = true;
            return await sock.sendMessage(from, { text: "✅ Messages de bienvenue activés" });
          } else if (args[0] === "off") {
            welcomeEnabled = false;
            return await sock.sendMessage(from, { text: "❌ Messages de bienvenue désactivés" });
          }

          if (!welcomeEnabled) {
            return await sock.sendMessage(from, {
              text: "❌ La fonctionnalité de bienvenue est désactivée. Tapez `.welcome on` pour l'activer."
            });
          }

          const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
          if (mentions.length === 0) {
            return await sock.sendMessage(from, {
              text: "❌ Veuillez mentionner la personne à accueillir\nExemple : .welcome @nom"
            });
          }

          const mentionJid = mentions[0];
          const mentionName = mentionJid.split("@")[0];

          const text = `
┏━━━❖ ＡＲＣＡＮＥ❖━━━━┓
┃ @${mentionName}
┃ 
┃ *BIENVENUE PAUVRE MORTEL*
┗━━━━━━━━━━━━━━━━━━┛
      `.trim();

          await sock.sendMessage(from, {
            image: { url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhoFTz9jVFxTVGAuh9RJIaNF0wH8WGvlOHM-q50RHZzg&s=10" },
            caption: text,
            mentions: [mentionJid]
          });

        } catch (err) {
          console.log("welcome command error:", err);
          await sock.sendMessage(from, { text: "❌ Une erreur est survenue lors de l'envoi du message de bienvenue" });
        }
      }
    });

    // Commande .ascii (gardée)
    this.commands.set("ascii", {
      name: "ascii",
      description: "Transforme un texte en ASCII art style ▓░",
      execute: async (sock, msg, args) => {
        const from = msg.key.remoteJid;

        try {
          if (!args || args.length === 0) {
            return await sock.sendMessage(from, {
              text: "❌ Usage : .ascii [texte]\nExemple : .ascii arcane"
            });
          }

          const inputText = args.join("").toUpperCase();

          const asciiMap = {
            "A": ["░▓▓░","▓░░▓","▓▓▓▓","▓░░▓","▓░░▓"],
            "B": ["▓▓▓░","▓░░▓","▓▓▓░","▓░░▓","▓▓▓░"],
            "C": ["░▓▓▓","▓░░░","▓░░░","▓░░░","░▓▓▓"],
            "D": ["▓▓▓░","▓░░▓","▓░░▓","▓░░▓","▓▓▓░"],
            "E": ["▓▓▓▓","▓░░░","▓▓▓░","▓░░░","▓▓▓▓"],
            "F": ["▓▓▓▓","▓░░░","▓▓▓░","▓░░░","▓░░░"],
            "G": ["░▓▓▓","▓░░░","▓░▓▓","▓░░▓","░▓▓▓"],
            "H": ["▓░░▓","▓░░▓","▓▓▓▓","▓░░▓","▓░░▓"],
            "I": ["▓▓▓","░▓░","░▓░","░▓░","▓▓▓"],
            "J": ["░░▓▓","░░░▓","░░░▓","▓░░▓","░▓▓░"],
            "K": ["▓░░▓","▓░▓░","▓▓░░","▓░▓░","▓░░▓"],
            "L": ["▓░░░","▓░░░","▓░░░","▓░░░","▓▓▓▓"],
            "M": ["▓░░▓","▓▓▓▓","▓▓▓▓","▓░░▓","▓░░▓"],
            "N": ["▓░░▓","▓▓░▓","▓░▓▓","▓░░▓","▓░░▓"],
            "O": ["░▓▓░","▓░░▓","▓░░▓","▓░░▓","░▓▓░"],
            "P": ["▓▓▓░","▓░░▓","▓▓▓░","▓░░░","▓░░░"],
            "Q": ["░▓▓░","▓░░▓","▓░░▓","▓░▓░","░▓▓▓"],
            "R": ["▓▓▓░","▓░░▓","▓▓▓░","▓░▓░","▓░░▓"],
            "S": ["░▓▓▓","▓░░░","░▓▓░","░░░▓","▓▓▓░"],
            "T": ["▓▓▓▓","░▓░░","░▓░░","░▓░░","░▓░░"],
            "U": ["▓░░▓","▓░░▓","▓░░▓","▓░░▓","░▓▓░"],
            "V": ["▓░░▓","▓░░▓","▓░░▓","░▓▓░","░░▓░"],
            "W": ["▓░░▓","▓░░▓","▓▓▓▓","▓▓▓▓","▓░░▓"],
            "X": ["▓░░▓","░▓▓░","░░░░","░▓▓░","▓░░▓"],
            "Y": ["▓░░▓","░▓▓░","░░░░","░▓▓░","▓░░▓"],
            "Z": ["▓▓▓▓","░░▓░","░▓░░","▓░░░","▓▓▓▓"],
            " ": ["░░░","░░░","░░░","░░░","░░░"]
          };

          const lines = ["", "", "", "", ""];

          for (const char of inputText) {
            const art = asciiMap[char] || ["░░░","░░░","░░░","░░░","░░░"];
            for (let i = 0; i < 5; i++) {
              lines[i] += art[i] + " ";
            }
          }

          const asciiResult = lines.join("\n");

          await sock.sendMessage(from, {
            text: "```\n" + asciiResult + "\n```"
          });

        } catch (err) {
          console.log("ascii command error:", err);
          await sock.sendMessage(from, {
            text: "❌ Erreur lors de la génération ASCII"
          });
        }
      }
    });

    // Commande .autokick (gardée)
    this.commands.set("autokick", {
      name: "autokick",
      description: "Active ou désactive l'autokick pour les nouveaux membres",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;

        if (!from.endsWith("@g.us")) {
          return await sock.sendMessage(from, { text: "❌ Cette commande fonctionne uniquement dans les groupes" });
        }

        const option = args[0]?.toLowerCase();
        if (!option || !["on", "off"].includes(option)) {
          return await sock.sendMessage(from, { text: "❌ Usage : .autokick on/off" });
        }

        const configPath = path.join('./autokick.json');
        let config = {};
        if (fs.existsSync(configPath)) {
          config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
        config[from] = option === 'on';
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        await sock.sendMessage(from, { text: `✅ Autokick ${option === 'on' ? 'activé' : 'désactivé'} pour ce groupe` });

        const metadata = await sock.groupMetadata(from);
        const knownMembers = new Set(metadata.participants.map(p => p.id));

        sock.ev.on('group-participants.update', async (update) => {
          if (update.id !== from) return;

          if (update.action === 'add') {
            for (const p of update.participants) {
              if (!knownMembers.has(p)) {
                console.log("Nouveau membre détecté :", p);
                knownMembers.add(p);

                if (config[from]) {
                  try {
                    await sock.groupParticipantsUpdate(from, [p], 'remove');
                    await sock.sendMessage(from, { text: `⚠️ Nouveau membre ${p.split('@')[0]} kické automatiquement` });
                  } catch (err) {
                    console.log("Erreur kick nouveau membre :", err);
                  }
                }
              }
            }
          }
        });
      }
    });

    // Commande .info (gardée)
    this.commands.set("info", {
      name: "info",
      description: "Affiche les informations détaillées du groupe",
      execute: async (sock, msg, args) => {
        const from = msg.key.remoteJid;

        if (!from.endsWith("@g.us")) {
          return await sock.sendMessage(from, { text: "❌ Commande réservée aux groupes" });
        }

        try {
          const metadata = await sock.groupMetadata(from);
          const participants = metadata.participants || [];

          const total = participants.length;

          const admins = participants
            .filter(p => p.admin === "admin" || p.admin === "superadmin")
            .map(p => `@${p.id.split("@")[0]}`)
            .join(", ");

          const groupName = metadata.subject || "Groupe sans nom";
          const groupDesc = metadata.desc?.toString() || "Aucune description";
          const groupId = metadata.id;

          const infoText = `
┏━━━❖ ＧＲＯＵＰ ＩＮＦＯ ❖━━━┓
┃ Nom : ${groupName}
┃ ID : ${groupId}
┃ Membres : ${total}
┃ Admins : ${admins || "Aucun"}
┃ Description : ${groupDesc}
┗━━━━━━━━━━━━━━━━━━━━━━┛
*powered by HEXTECH*
      `.trim();

          await sock.sendMessage(from, {
            text: infoText,
            mentions: participants
              .filter(p => p.admin === "admin" || p.admin === "superadmin")
              .map(p => p.id)
          });

        } catch (err) {
          console.log("info error:", err);
          await sock.sendMessage(from, { text: "❌ Impossible de récupérer les infos du groupe" });
        }
      }
    });

    this.commands.set("update", {
      name: "update",
      description: "Redémarre le bot et recharge toutes les commandes",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;

        await sendFormattedMessage(sock, from, "♻️ *Mise à jour en cours...*\n\n• Rechargement des commandes\n• Nettoyage de la mémoire\n• Redémarrage du bot\n\n⏳ Veuillez patienter...", msg);

        await new Promise(r => setTimeout(r, 2000));

        console.log("🔄 UPDATE demandé, redémarrage du bot...");

        try {
          await sock.end();
        } catch (e) {}

        process.exit(0);
      }
    });

    this.commands.set("tag", {
      name: "tag",
      description: "Mentionne tout le monde avec ton texte",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;

        if (!from.endsWith("@g.us")) {
          await sendFormattedMessage(sock, from, "❌ Commande utilisable uniquement dans un groupe", msg);
          return;
        }

        const metadata = await sock.groupMetadata(from);
        const participants = metadata.participants || [];

        if (!args[0]) {
          await sendFormattedMessage(sock, from, "❌ Usage: .tag [texte]", msg);
          return;
        }

        const text = args.join(" ");

        const mentions = participants.map(p => p.id);

        try {
          await sock.sendMessage(from, {
            text: text,
            mentions: mentions
          });
        } catch (error) {
          await sendFormattedMessage(sock, from, `❌ Erreur lors du tag: ${error.message}`, msg);
        }
      }
    });

    this.commands.set("tagadmin", {
      name: "tagadmin",
      description: "Mentionne tous les admins du groupe",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;

        if (!from.endsWith("@g.us")) {
          return await sendFormattedMessage(sock, from, "❌ Cette commande fonctionne uniquement dans les groupes", msg);
        }

        try {
          const metadata = await sock.groupMetadata(from);
          const participants = metadata.participants || [];

          const admins = participants.filter(p => p.admin === "admin" || p.admin === "superadmin");
          if (admins.length === 0) {
            return await sendFormattedMessage(sock, from, "❌ Aucun admin trouvé dans le groupe", msg);
          }

          let text = `📣 Mention des admins :\n\n`;
          const mentions = [];

          for (const admin of admins) {
            const name = admin.notify || admin.id.split("@")[0];
            text += `➤ @${admin.id.split("@")[0]} (${name})\n`;
            mentions.push(admin.id);
          }

          text += `\n> Powered by HEXTECH`;

          await sock.sendMessage(from, { text, mentions });

        } catch (err) {
          console.log("tagadmin error:", err);
          await sendFormattedMessage(sock, from, "❌ Impossible de récupérer les admins", msg);
        }
      },
    });

    this.commands.set("vv", {
      name: "vv",
      description: "Affiche la dernière vue unique sauvegardée",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;
        const data = viewOnceStore.get(from);

        if (!data) {
          await sendFormattedMessage(sock, from, "❌ Aucune vue unique sauvegardée", msg);
          return;
        }

        await sock.sendMessage(from, {
          image: fs.readFileSync(data.imagePath),
          caption: `👁️ *Vue unique restaurée*\n\n👤 Envoyé par : ${data.sender}\n📝 Caption : ${data.caption || "Aucune"}`
        });

        viewOnceStore.delete(from);
        try {
          fs.unlinkSync(data.imagePath);
        } catch (e) {
          console.log(`${colors.yellow}⚠️ Impossible de supprimer l'image: ${e.message}${colors.reset}`);
        }
      }
    });

    this.commands.set("menu", {
      name: "menu",
      description: "Affiche le menu des commandes",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;
        const currentPrefix = context?.prefix || prefix;

        const menuText = `
┏━━❖ ＡＲＣＡＮＥ ❖━━┓
┃ 🛡️ HEX✦GATE V1
┃ 👨‍💻 Dev : T.me/hextechcar
┃ 
┗━━━━━━━━━━━━━━━━

  【 ${msg.pushName}】
  
╭━━〔 𝚙𝚛𝚘𝚙𝚛𝚒𝚎́𝚝𝚊𝚒𝚛𝚎 〕━━┈⊷
┃✰│➫ ${prefix}𝚛𝚎𝚜𝚝𝚘𝚛𝚎
┃✰│➫ ${prefix}𝚊𝚍𝚍𝚘𝚠𝚗𝚎𝚛
┃✰│➫ ${prefix}𝚍𝚎𝚕𝚘𝚠𝚗𝚎𝚛
┃✰│➫ ${prefix}𝚌𝚘𝚗𝚏𝚒𝚐
┃✰│➫ ${prefix}𝚑𝚎𝚡𝚝𝚎𝚌𝚑
┃✰│➫ ${prefix}𝚜𝚊𝚟𝚎
┃✰│➫ ${prefix}𝚏𝚊𝚔𝚎𝚛𝚎𝚌𝚘𝚛𝚍𝚒𝚗𝚐 𝚘𝚗/𝚘𝚏𝚏
┃✰│➫ ${prefix}𝚊𝚞𝚝𝚑𝚘𝚛𝚒𝚝𝚢
┃✰│➫ ${prefix}𝚊𝚜𝚌𝚒𝚒
┃✰│➫ ${prefix}𝚜𝚝𝚎𝚕𝚕𝚊𝚙𝚙
┃✰│➫ .𝚔𝚒𝚌𝚔
┃✰│➫ .𝚍𝚎𝚕𝚎𝚝𝚎𝚐𝚛𝚙
┃✰│➫ ${prefix}𝚐𝚑𝚘𝚜𝚝𝚝𝚊𝚐
┃✰│➫ ${prefix}𝚍𝚎𝚕𝚎𝚝𝚎𝚐𝚛𝚙
┃✰│➫ ${prefix}𝚜𝚞𝚍𝚘𝚊𝚍𝚍
┃✰│➫ ${prefix}delsudo
┃✰│➫ ${prefix}promote @
┃✰│➫ ${prefix}delpromote @
┃✰│➫ ${prefix}𝚏𝚛𝚎𝚎𝚣
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 𝙶𝚁𝙾𝚄𝙿𝙴 〕━━┈⊷
┃✰│➫ ${prefix}𝚘𝚙𝚎𝚗
┃✰│➫ ${prefix}𝚊𝚛𝚌𝚊𝚗𝚎
┃✰│➫ ${prefix}𝚙𝚞𝚛𝚐𝚎
┃✰│➫ ${prefix}𝚌𝚕𝚘𝚜𝚎𝚝𝚒𝚖𝚎 (𝚖𝚒𝚗𝚞𝚝𝚎𝚜)
┃✰│➫ ${prefix}𝚜𝚑𝚒𝚖𝚖𝚎𝚛𝚜
┃✰│➫ ${prefix}𝚖𝚞𝚝𝚎
┃✰│➫ ${prefix}𝚕𝚒𝚗𝚔 -𝚞𝚛𝚕 𝚐𝚛𝚘𝚞𝚙
┃✰│➫ ${prefix}𝚝𝚊𝚐𝚊𝚕𝚕
┃✰│➫ ${prefix}𝚊𝚗𝚝𝚒𝚕𝚒𝚗𝚔
┃✰│➫ ${prefix}𝚒𝚗𝚏𝚘
┃✰│➫ ${prefix}𝚛𝚎𝚟𝚘𝚔𝚎
┃✰│➫ ${prefix}𝚙𝚞𝚛𝚐𝚎𝚐𝚑𝚘𝚜𝚝
┃✰│➫ ${prefix}𝚏𝚒𝚕𝚝𝚎𝚛 𝚌𝚘𝚗𝚏𝚒𝚐
┃✰│➫ ${prefix}𝚏𝚒𝚕𝚝𝚎𝚛 𝚊𝚍𝚍
┃✰│➫ ${prefix}𝚜𝚎𝚝𝚊𝚙𝚙
┃✰│➫ ${prefix}𝚜𝚝𝚎𝚕𝚊𝚙𝚙 @
┃✰│➫ ${prefix}𝚘𝚙𝚎𝚗𝚝𝚒𝚖𝚎
┃✰│➫ ${prefix}𝚑𝚒𝚍𝚎𝚝𝚊𝚐
┃✰│➫ ${prefix}.𝚟𝚟
┃✰│➫ ${prefix}𝚠𝚎𝚕𝚌𝚘𝚖𝚎 𝚘𝚗/𝚘𝚏𝚏
┃✰│➫ ${prefix}𝚝𝚊𝚐𝚊𝚍𝚖𝚒𝚗
┃✰│➫ ${prefix}𝚜𝚞𝚍𝚘
┃✰│➫ ${prefix}𝚊𝚞𝚝𝚘𝚔𝚒𝚌𝚔 𝚘𝚗/𝚘𝚏𝚏
┃✰│➫ ${prefix}𝚐𝚊𝚝𝚎 -vue unique owner
┃✰│➫ ${prefix}𝚜𝚊𝚞𝚟 -vue unique
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 𝚄𝚃𝙸𝙻𝙸𝚃𝙰𝙸𝚁𝙴 〕━━┈⊷
┃✰│➫ ${prefix}𝚙𝚒𝚗𝚐
┃✰│➫ ${prefix}𝚝𝚎𝚜𝚝
┃✰│➫ ${prefix}𝚑𝚎𝚕𝚙
┃✰│➫ ${prefix}𝚜𝚝𝚊𝚝𝚞𝚜
┃✰│➫ ${prefix}𝚏𝚊𝚔𝚎𝚛𝚎𝚌𝚘𝚛𝚍𝚒𝚗𝚐 𝚘𝚗/𝚘𝚏𝚏
╰━━━━━━━━━━━━━━━┈⊷
  
╭━━〔 𝙲𝙾𝙽𝙵𝙸𝙶 〕━━┈⊷
┃✰│➫ ${prefix}𝚘𝚗𝚕𝚒𝚗𝚎 𝚘𝚗/𝚘𝚏𝚏
┃✰│➫ ${prefix}𝚐𝚎𝚝𝚒𝚍
┃✰│➫ ${prefix}𝚊𝚞𝚝𝚘𝚛𝚎𝚌𝚘𝚛𝚍𝚒𝚗𝚐 𝚘𝚗/𝚘𝚏𝚏
┃✰│➫ ${prefix}𝚏𝚊𝚔𝚎𝚛𝚎𝚌𝚘𝚛𝚍𝚒𝚗𝚐 𝚘𝚗/𝚘𝚏𝚏
╰━━━━━━━━━━━━━━━┈⊷
  
╭━━〔 𝙳𝙾𝚆𝙽𝙻𝙾𝙰𝙳𝙴𝚁 〕━━┈⊷
┃✰│➫ ${prefix}𝚟𝚟
┃✰│➫ ${prefix}𝚜𝚝𝚒𝚌𝚔𝚎𝚛𝚜
┃✰│➫ ${prefix}𝚕𝚘𝚐𝚘
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 𝙼𝙴𝙳𝙸𝙰 〕━━┈⊷
┃✰│➫ ${prefix}𝚜𝚊𝚟𝚎
┃✰│➫ ${prefix}𝚐𝚊𝚝𝚎 -vue unique dans owner
┃✰│➫ ${prefix}𝚜𝚊𝚞𝚟 -vue unique
┃✰│➫ ${prefix}𝚙𝚕𝚊𝚢
┃✰│➫ ${prefix}𝚙𝚕𝚊𝚢2
┃✰│➫ ${prefix}𝚙𝚕𝚊𝚢3
┃✰│➫ ${prefix}𝚐𝚏𝚡3
┃✰│➫ ${prefix}𝚖𝚞𝚜𝚒𝚌
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 𝙲𝙰𝙽𝙰𝙻 𝚃𝙴𝙻𝙴𝙶𝚁𝙰𝙼 〕━━┈⊷
┃✰│➫ T.me/hextechcar
╰━━━━━━━━━━━━━━━┈⊷

  *powered by HEXTECH™*\n
`;

        try {
          await sock.sendMessage(from, {
            image: { url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRv53_O-g3xpl_VtrctVQ0HbSUMCJ3fUkfx6l1SiUc64ag4ypnPyBR5k0s&s=10" },
            caption: menuText,
            contextInfo: {
              externalAdReply: {
                title: "HEX✦GATE V1",
                body: "Menu des commandes",
                thumbnail: null,
                mediaType: 1,
                mediaUrl: 'https://whatsapp.com/channel/0029Vb6qRMk4dTnLruvwbJ0Q',
                sourceUrl: 'https://whatsapp.com/channel/0029Vb6qRMk4dTnLruvwbJ0Q',
                showAdAttribution: false
              }
            }
          });
        } catch (error) {
          console.error("Erreur lors de l'envoi de l'image:", error);
          await sock.sendMessage(from, { text: menuText });
        }
      }
    });

    this.commands.set("ping", {
      name: "ping",
      description: "Test de réponse du bot",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;
        const start = Date.now();
        const latency = Date.now() - start;
        
        await sendFormattedMessage(sock, from, `🏓 *PONG!*\n\n📡 Latence: ${latency}ms\n🤖 HEXGATE V1 - En ligne!\n👤 Envoyé par: ${context?.sender || 'Inconnu'}`, msg);
      }
    });

    this.commands.set("help", {
      name: "help",
      description: "Affiche l'aide",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;
        const currentPrefix = context?.prefix || prefix;
        
        const helpText = `🛠️ *AIDE HEXGATE V3*\n\nPrefix: ${currentPrefix}\n\nCommandes principales:\n• ${currentPrefix}ping - Test du bot\n• ${currentPrefix}menu - Menu complet\n• ${currentPrefix}help - Cette aide\n• ${currentPrefix}restore - Gérer la restauration\n• ${currentPrefix}tagall - Mention groupe\n• ${currentPrefix}purge - Purge groupe (admin)\n\n👑 Propriétaire: ${config.ownerNumber}\n👤 Vous: ${context?.sender || 'Inconnu'}`;
        
        await sendFormattedMessage(sock, from, helpText, msg);
      }
    });

    console.log(`${colors.green}✅ Commandes intégrées chargées${colors.reset}`);
  }

  async execute(commandName, sock, msg, args, context) {
    const cmd = commandName.toLowerCase();
    
    if (!this.commands.has(cmd)) {
      console.log(`${colors.yellow}⚠️ Commande inconnue: ${cmd}${colors.reset}`);
      
      if (context?.botPublic) {
        try {
          await sendFormattedMessage(sock, msg.key.remoteJid, `❌ Commande "${cmd}" non reconnue. Tapez ${context?.prefix || prefix}menu pour voir la liste des commandes.`, msg);
        } catch (error) {
          console.log(`${colors.yellow}⚠️ Impossible d'envoyer réponse${colors.reset}`);
        }
      }
      return false;
    }
    
    const command = this.commands.get(cmd);
    
    if (!command || typeof command.execute !== 'function') {
      console.log(`${colors.red}❌ Commande invalide: ${cmd}${colors.reset}`);
      return false;
    }
    
    try {
      console.log(`${colors.cyan}⚡ Exécution: ${cmd} par ${context?.sender || 'Inconnu'}${colors.reset}`);
      
      try {
        if (autoReact) {
          const randomEmoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)];
          await sock.sendMessage(msg.key.remoteJid, {
            react: { text: randomEmoji, key: msg.key }
          });
          console.log(`${colors.magenta}🎯 Réaction emoji: ${randomEmoji} pour ${cmd}${colors.reset}`);
        }
      } catch (reactError) {}
      
      await command.execute(sock, msg, args, context);
      
      console.log(`${colors.green}✅ Commande exécutée avec succès: ${cmd}${colors.reset}`);
      return true;
      
    } catch (error) {
      console.log(`${colors.red}❌ Erreur exécution ${cmd}: ${error.message}${colors.reset}`);
      console.error(error);
      
      try {
        await sendFormattedMessage(sock, msg.key.remoteJid, `❌ *ERREUR D'EXÉCUTION*\n\nCommande: ${cmd}\nErreur: ${error.message}\n\nContactez le développeur si le problème persiste.`, msg);
      } catch (sendError) {
        console.log(`${colors.yellow}⚠️ Impossible d'envoyer message d'erreur${colors.reset}`);
      }
      
      return false;
    }
  }

  getCommandList() {
    return Array.from(this.commands.keys());
  }

  reloadCommands() {
    console.log(`${colors.cyan}🔄 Rechargement des commandes...${colors.reset}`);
    
    try {
      const currentCommands = new Map(this.commands);
      
      this.commands.clear();
      
      this.initializeCommands();
      
      if (this.commands.size === 0) {
        console.log(`${colors.yellow}⚠️ Rechargement échoué, restauration des commandes précédentes${colors.reset}`);
        this.commands = currentCommands;
      }
      
      console.log(`${colors.green}✅ ${this.commands.size} commandes rechargées${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}❌ Erreur rechargement commandes: ${error.message}${colors.reset}`);
      console.log(`${colors.yellow}⚠️ Utilisation des commandes existantes${colors.reset}`);
    }
  }
}

// 📊 Tracker d'activité simple
global.activityTracker = global.activityTracker || new Map();

function trackActivity(msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!from.endsWith("@g.us")) return;

  const groupData = global.activityTracker.get(from) || {};
  groupData[sender] = Date.now();
  global.activityTracker.set(from, groupData);
}

// Fonction pour vérifier si un expéditeur est propriétaire
function isOwner(senderJid) {
  const normalizedJid = senderJid.split(":")[0];
  const ownerJid = OWNER_NUMBER.split(":")[0];
  return normalizedJid === ownerJid;
}

// Fonction pour vérifier si un expéditeur est admin dans un groupe
async function isAdmin
