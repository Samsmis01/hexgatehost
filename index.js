console.log('🔧 HEXGATE V3 - Vérification des dépendances...');
console.log('📦 Version correcte: @whiskeysockets/baileys (avec un seul L)');

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
  // Déclarer fs ici pour l'utiliser avant le require
  const fs = require('fs');
  
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
      botImageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyERDdGHGjmXPv_6tCBIChmD-svWkJatQlpzfxY5WqFg&s=10"
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
      require('./index.js');
    }, 3000);
    
    return;
    
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
    
    return;
  }
}

const {
  default: makeWASocket,
  useMultiFileAuthState,
  downloadContentFromMessage,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  delay,
  getContentType
} = require("@whiskeysockets/baileys");
const P = require("pino");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { exec } = require("child_process");
const { Buffer } = require("buffer");

// Fonction pour vérifier si un expéditeur est propriétaire
function isOwner(senderJid) {
    const normalizedJid = senderJid.split(":")[0];
    const ownerJid = OWNER_NUMBER.split(":")[0];
    return normalizedJid === ownerJid;
}

// ⚡ VARIABLES POUR L'API (Nouveau)
let sock = null;
let botReady = false;
let pairingCodes = new Map();

// 📋 FONCTIONS POUR L'API
function isBotReady() {
  return botReady;
}

async function generatePairCode(phone) {
  try {
    if (!sock) {
      console.log('❌ Bot non initialisé pour générer pair code');
      return null;
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('243') ? cleanPhone : `243${cleanPhone}`;
    
    console.log(`📱 Génération pair code pour: ${phoneWithCountry}`);
    
    const code = await sock.requestPairingCode(phoneWithCountry);
    
    if (code) {
      pairingCodes.set(phoneWithCountry, {
        code: code,
        timestamp: Date.now()
      });
      
      setTimeout(() => {
        pairingCodes.delete(phoneWithCountry);
      }, 300000);
      
      console.log(`✅ Pair code généré: ${code} pour ${phoneWithCountry}`);
      return code;
    }
    
    return null;
  } catch (error) {
    console.log(`❌ Erreur génération pair code: ${error.message}`);
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
// 🖼️ FONCTION DE FORMATAGE UNIFIÉE POUR TOUS LES MESSAGES - CORRIGÉE DÉFINITIVEMENT
// ============================================
async function sendFormattedMessage(sock, jid, messageText, msgObject = null) {
  const pushName = msgObject?.pushName || 'Inconnu';
  
  const formattedMessage = `┏━━❖ ＡＲＣＡＮＥ❖━━┓
┃ 🛡️ 𝐇𝐄𝐗✦𝐆Ａ𝐓Ｅ 𝑽_1
┃
┃ 👨‍💻 𝙳𝙴𝚅 : ${pushName}
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
    console.log(`${colors.yellow}⚠️ Erreur avec l'image: ${imageError.message}${colors.reset}`);
    
    const alternativeImage = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyERDdGHGjmXPv_6tCBIChmD-svWkJatQlpzfxY5WqFg&s";
    
    try {
      const sentMsg = await sock.sendMessage(jid, {
        image: { url: alternativeImage },
        caption: formattedMessage
      });
      
      if (sentMsg?.key?.id) {
        botMessages.add(sentMsg.key.id);
        setTimeout(() => botMessages.delete(sentMsg.key.id), 300000);
      }
      return;
    } catch (secondImageError) {
      console.log(`${colors.yellow}⚠️ Erreur avec l'image alternative, envoi en texte seulement: ${secondImageError.message}${colors.reset}`);
    }
  }
  
  // Si on arrive ici, c'est qu'on n'a pas pu envoyer avec image
  try {
    const sentMsg = await sock.sendMessage(jid, { 
      text: formattedMessage 
    });
    
    if (sentMsg?.key?.id) {
      botMessages.add(sentMsg.key.id);
      setTimeout(() => botMessages.delete(sentMsg.key.id), 300000);
    }
  } catch (textError) {
    console.log(`${colors.red}❌ Échec complet de l'envoi du message: ${textError.message}${colors.reset}`);
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
    
    // ============================================
    // 🚫 COMMANDES SUPPRIMÉES : 
    // - quiz (toutes les variantes)
    // - hack
    // - ping
    // - vv
    // - ascii
    // ============================================
    
    // Commande setname
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

    // Commande revoke
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

    // Commande link
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
      }
    });

    // Commande stealpp
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

    // Commande welcome
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

    // Commande autokick
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

    // Commande info
    this.commands.set("info", {
      name: "info",
      description: "Affiche les informations détaillées du groupe (premium)",
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

    // Commande update
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

    // Commande tag
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

    // Commande fakecall
    this.commands.set("fakecall", {
      name: "fakecall",
      description: "Simule un appel WhatsApp entrant",
      execute: async (sock, msg, args) => {
        const from = msg.key.remoteJid;

        if (!args[0]) {
          return await sendFormattedMessage(
            sock,
            from,
            "❌ Usage : .fakecall @user\n\nExemple : .fakecall @243xxxxxxxx",
            msg
          );
        }

        try {
          const target =
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
            args[0].replace(/\D/g, "") + "@s.whatsapp.net";

          const time = new Date().toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit"
          });

          const fakeCallMessage = {
            key: {
              remoteJid: from,
              fromMe: false,
              id: "FAKECALL-" + Date.now()
            },
            message: {
              callLogMesssage: {
                isVideo: false,
                callOutcome: "missed",
                durationSecs: 0,
                participants: [{ jid: target }]
              }
            }
          };

          await sock.sendMessage(from, {
            image: { url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZ1i7XIDDTRn01oToPCdQ4e5oCgZex2Iw1xg&s" },
            caption: `📞 *APPEL ENTRANT*\n\n👤 Cible : @${target.split("@")[0]}\n🕒 Heure : ${time}\n\n⏳ Connexion...`,
            mentions: [target]
          });

          await new Promise(r => setTimeout(r, 2000));

          await sock.relayMessage(from, fakeCallMessage.message, {
            messageId: fakeCallMessage.key.id
          });

        } catch (err) {
          console.log("fakecall error:", err);
          await sendFormattedMessage(sock, from, "❌ Erreur fakecall", msg);
        }
      }
    });
    
    // Commande tagadmin
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
      }
    });

    // Commande delowner
    this.commands.set("delowner", {
      name: "delowner",
      description: "Supprime un propriétaire du bot",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        if (!isOwner(senderJid)) {
          await sendFormattedMessage(sock, from, "❌ Commande réservée aux propriétaires", msg);
          return;
        }

        if (!args[0]) {
          await sendFormattedMessage(sock, from, "❌ Usage: .delowner 243XXXXXXXXX", msg);
          return;
        }

        const number = args[0].replace(/\D/g, "");
        const jid = number + "@s.whatsapp.net";
        await sendFormattedMessage(sock, from, `✅ Propriétaire supprimé :\n${jid}`, msg);
      }
    });

    // Commande menu
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
┃✰│➫ ${prefix}𝚊𝚍𝚍𝚘𝚠𝚗𝚎𝚛
┃✰│➫ ${prefix}𝚍𝚎𝚕𝚘𝚠𝚗𝚎𝚛
┃✰│➫ ${prefix}𝚌𝚘𝚗𝚏𝚒𝚐
┃✰│➫ ${prefix}𝚑𝚎𝚡𝚝𝚎𝚌𝚑
┃✰│➫ ${prefix}𝚏𝚊𝚔𝚎𝚌𝚊𝚕𝚕
┃✰│➫ ${prefix}𝚜𝚊𝚟𝚎
┃✰│➫ ${prefix}𝚊𝚞𝚝𝚑𝚘𝚛𝚒𝚝𝚢
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
┃✰│➫ ${prefix}𝚠𝚎𝚕𝚌𝚘𝚖𝚎 𝚘𝚗/𝚘𝚏𝚏
┃✰│➫ ${prefix}𝚝𝚊𝚐𝚊𝚍𝚖𝚒𝚗
┃✰│➫ ${prefix}𝚜𝚞𝚍𝚘
┃✰│➫ ${prefix}𝚊𝚞𝚝𝚘𝚔𝚒𝚌𝚔 𝚘𝚗/𝚘𝚏𝚏
┃✰│➫ ${prefix}𝚐𝚊𝚝𝚎 -vue unique owner
┃✰│➫ ${prefix}𝚜𝚊𝚞𝚟 -vue unique
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 𝚄𝚃𝙸𝙻𝙸𝚃𝙰𝙸𝚁𝙴 〕━━┈⊷
┃✰│➫ ${prefix}𝚝𝚎𝚜𝚝
┃✰│➫ ${prefix}𝚑𝚎𝚕𝚙
┃✰│➫ ${prefix}𝚜𝚝𝚊𝚝𝚞𝚜
╰━━━━━━━━━━━━━━━┈⊷
  
╭━━〔 𝙲𝙾𝙽𝙵𝙸𝙶 〕━━┈⊷
┃✰│➫ ${prefix}𝚘𝚗𝚕𝚒𝚗𝚎 𝚘𝚗/𝚘𝚏𝚏
┃✰│➫ ${prefix}𝚐𝚎𝚝𝚒𝚍
┃✰│➫ ${prefix}𝚊𝚞𝚝𝚘𝚛𝚎𝚌𝚘𝚛𝚍𝚒𝚗𝚐 𝚘𝚗/𝚘𝚏𝚏
╰━━━━━━━━━━━━━━━┈⊷
  
╭━━〔 𝙳𝙾𝚆𝙽𝙻𝙾𝙰𝙳𝙴𝚁 〕━━┈⊷
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

    // Commande help
    this.commands.set("help", {
      name: "help",
      description: "Affiche l'aide",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;
        const currentPrefix = context?.prefix || prefix;
        
        const helpText = `🛠️ *AIDE HEXGATE V3*\n\nPrefix: ${currentPrefix}\n\nCommandes principales:\n• ${currentPrefix}menu - Menu complet\n• ${currentPrefix}help - Cette aide\n• ${currentPrefix}hextech - Info HEX✦GATE\n• ${currentPrefix}tagall - Mention groupe\n• ${currentPrefix}purge - Purge groupe (admin)\n\n👑 Propriétaire: ${config.ownerNumber}\n👤 Vous: ${context?.sender || 'Inconnu'}`;
        
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

// Variables de contrôle pour les fonctionnalités
let antiLinkEnabled = true;
let deleteRestoreEnabled = true;
let imageSaveEnabled = true;

// Fonction pour vérifier si un expéditeur est admin dans un groupe
async function isAdminInGroup(sock, jid, senderJid) {
  try {
    if (!jid.endsWith("@g.us")) return false;
    
    const metadata = await sock.groupMetadata(jid);
    const participant = metadata.participants.find(p => p.id === senderJid);
    
    if (!participant) return false;
    
    return participant.admin === "admin" || participant.admin === "superadmin";
  } catch (error) {
    console.log(`${colors.yellow}⚠️ Erreur vérification admin: ${error.message}${colors.reset}`);
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
║${colors.green} ✅ FAKE RECORDING ACTIVÉ                    ${colors.magenta}║
║${colors.green} ✅ RESTAURATION MESSAGES COMME SUR L'IMAGE   ${colors.magenta}║
║${colors.green} ✅ RESTAURATION IMAGES SUPPRIMÉES            ${colors.magenta}║
║${colors.green} ✅ Détection multiple messages              ${colors.magenta}║
║${colors.green} ✅ Réactions emoji aléatoires               ${colors.magenta}║
║${colors.green} ✅ Chargement complet commandes             ${colors.magenta}║
║${colors.green} ✅ API INTÉGRÉE POUR PAIRING                ${colors.magenta}║
╚══════════════════════════════════════════════════╝${colors.reset}
`);
}

// ============================================
// ⚡ FONCTION PRINCIPALE DU BOT OPTIMISÉE
// ============================================
async function startBot() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  async function askForPhoneNumber() {
    return new Promise((resolve) => {
      rl.question(`${colors.cyan}┏━━━━━━━━━━━━━━❖ ＡＲＣＡＮＥ ❖━━━━━━━━━━━━━━┓
┃                                              ┃
┃   _   _ _______  __   _____ _____ ____ _   _  ┃
┃  | | | | ____\ \/ /  |_   _| ____/ ___| | | | ┃
┃  | |_| |  _|  \  /_____| | |  _|| |   | |_| | ┃
┃  |  _  | |___ /  \_____| | | |__| |___|  _  | ┃
┃  |_| |_|_____/_/\_\    |_| |_____\____|_| |_| ┃
┃                                              ┃
┃  📱 INSÉREZ VOTRE NUMÉRO WHATSAPP :            ┃
┃                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━┛
${colors.reset}`, (phone) => {
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
          console.log(`${colors.cyan}📱 Appuyez sur les trois points > Périphériques liés > Ajouter un périphérique sur WhatsApp${colors.reset}`);
          await delay(3000);
        } catch (pairError) {
          console.log(`${colors.red}❌ Erreur pairing: ${pairError.message}${colors.reset}`);
          process.exit(1);
        }
      }
      
      if (connection === "close") {
        const reason = new Error(lastDisconnect?.error)?.output?.statusCode;
        if (reason === DisconnectReason.loggedOut) {
          console.log(`${colors.red}❌ Déconnecté, suppression des données d'authentification...${colors.reset}`);
          exec("rm -rf auth_info_baileys", () => {
            console.log(`${colors.yellow}🔄 Redémarrage du bot...${colors.reset}`);
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
          const confirmMessage = `✅ *HEX-GATE CONNECTEE*\n\n🚀 *HEXGATE V1* est en ligne!\n📊 *Commandes:* ${commandHandler.getCommandList().length}\n🔧 *Mode:* ${botPublic ? 'PUBLIC' : 'PRIVÉ'}\n🔓 *Restauration:* Messages & Images ACTIVÉE\n🔗 *systeme:* tapez menu`;
          
          await sock.sendMessage(OWNER_NUMBER, { text: confirmMessage });
          console.log(`${colors.green}✅ Confirmation envoyée au propriétaire: ${OWNER_NUMBER}${colors.reset}`);
        } catch (error) {
          console.log(`${colors.yellow}⚠️ Impossible d'envoyer message au propriétaire: ${error.message}${colors.reset}`);
        }
        
        botReady = true;
      }
    });

    // Vue unique
    sock.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages[0];
      if (!msg.message) return;

      const jid = msg.key.remoteJid;
      const viewOnce = msg.message.viewOnceMessageV2 || msg.message.viewOnceMessageV2Extension;

      if (!viewOnce) return;

      const inner = viewOnce.message.imageMessage || viewOnce.message.videoMessage;
      if (!inner) return;

      try {
        const type = inner.mimetype.startsWith("image") ? "image" : "video";
        const stream = await downloadContentFromMessage(inner, type);
        let buffer = Buffer.from([]);

        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        const imgPath = `${VIEW_ONCE_FOLDER}/${msg.key.id}.${type === 'image' ? 'jpg' : 'mp4'}`;
        fs.writeFileSync(imgPath, buffer);

        viewOnceStore.set(jid, {
          type,
          buffer: buffer.toString("base64"),
          caption: inner.caption || "",
          from: msg.key.participant || msg.key.remoteJid,
          time: Date.now(),
          filePath: imgPath
        });

        console.log("✅ Vue unique interceptée AVANT ouverture");

      } catch (e) {
        console.log("❌ Erreur interception vue unique", e);
      }
    });

    // Auto welcome
    sock.ev.on("group-participants.update", async (update) => {
      try {
        if (!welcomeEnabled) return;
        if (update.action !== "add") return;

        const groupJid = update.id;
        const newMemberJid = update.participants[0];
        const newMemberName = newMemberJid.split("@")[0];

        const text = `
┏━━━❖ ＡＲＣＡＮＥ❖━━━━┓
┃ @${newMemberName}
┃ 
┃ 𝙱𝚒𝚎𝚗𝚟𝚎𝚗𝚞𝚎 ! 𝚙𝚊𝚞𝚟𝚛𝚎 𝚖𝚘𝚛𝚝𝚎𝚕
┗━━━━━━━━━━━━━━━━━━┛
    `.trim();

        await sock.sendMessage(groupJid, {
          image: { url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhoFTz9jVFxTVGAuh9RJIaNF0wH8WGvlOHM-q50RHZzg&s=10" },
          caption: text,
          mentions: [newMemberJid]
        });

      } catch (err) {
        console.log("auto welcome error:", err);
      }
    });

    // 📨 TRAITEMENT DES MESSAGES PRINCIPAL AVEC RESTAURATION
    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            for (const msg of messages) {
                if (!msg.message) continue;

                const senderJid = msg.key.participant || msg.key.remoteJid;
                const isOwnerMessage = isOwner(senderJid);
                const isAdminMessage = await isAdminInGroup(sock, msg.key.remoteJid, senderJid);
                
                const shouldProcess = msg.key.fromMe || !isOwnerMessage;

                if (!shouldProcess) {
                    console.log(`${colors.magenta}👑 Message du propriétaire détecté - Traitement forcé${colors.reset}`);
                }

                // Vue unique
                const vo = msg.message?.viewOnceMessageV2 || msg.message?.viewOnceMessage;

                if (vo) {
                    const inner = vo.message;

                    if (!inner?.imageMessage) continue;

                    const msgId = msg.key.id;
                    const from = msg.key.remoteJid;

                    try {
                        const stream = await downloadContentFromMessage(inner.imageMessage, "image");
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) {
                            buffer = Buffer.concat([buffer, chunk]);
                        }

                        const imgPath = `${VIEW_ONCE_FOLDER}/${msgId}.jpg`;
                        fs.writeFileSync(imgPath, buffer);

                        viewOnceStore.set(from, {
                            imagePath: imgPath,
                            caption: inner.imageMessage.caption || "",
                            sender: msg.pushName || "Inconnu",
                            time: Date.now()
                        });

                        console.log(`👁️ Vue unique sauvegardée : ${msgId}`);
                    } catch (e) {
                        console.log("❌ Erreur vue unique:", e.message);
                    }
                }

                // 💬 TRAITEMENT DES MESSAGES SUPPRIMÉS
                if (deleteRestoreEnabled && msg.message?.protocolMessage?.type === 0) {
                    const deletedKey = msg.message.protocolMessage.key;
                    const deletedId = deletedKey.id;
                    const chatId = deletedKey.remoteJid || msg.key.remoteJid;

                    console.log(`${colors.magenta}🚨 SUPPRESSION DÉTECTÉE: ${deletedId} dans ${chatId}${colors.reset}`);

                    let originalMsg = messageStore.get(deletedId);
                    
                    if (!originalMsg) {
                        const filePath = path.join(DELETED_MESSAGES_FOLDER, `${deletedId}.json`);
                        if (fs.existsSync(filePath)) {
                            console.log(`${colors.green}✅ Fichier trouvé sur disque: ${deletedId}.json${colors.reset}`);
                            try {
                                originalMsg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                            } catch (parseError) {
                                console.log(`${colors.red}❌ Erreur lecture fichier JSON${colors.reset}`);
                                originalMsg = null;
                            }
                        } else {
                            console.log(`${colors.yellow}⚠️ Message original non trouvé: ${deletedId}${colors.reset}`);
                            return;
                        }
                    }

                    if (!originalMsg) {
                        console.log(`${colors.red}❌ Impossible de restaurer le message${colors.reset}`);
                        return;
                    }

                    const originalMessageType = originalMsg.messageType || Object.keys(originalMsg.message)[0];
                    
                    if (originalMessageType === 'imageMessage') {
                        try {
                            console.log(`${colors.cyan}🖼️ Restauration d'une image supprimée${colors.reset}`);
                            
                            let imageBuffer = null;
                            let caption = originalMsg.message?.imageMessage?.caption || "";
                            
                            const imagePath = path.join(DELETED_IMAGES_FOLDER, `${deletedId}.jpg`);
                            if (fs.existsSync(imagePath)) {
                                imageBuffer = fs.readFileSync(imagePath);
                                console.log(`${colors.green}✅ Image chargée depuis le dossier${colors.reset}`);
                            }
                            
                            if (imageBuffer) {
                                await sock.sendMessage(chatId, {
                                    image: imageBuffer,
                                    caption: caption ? `*🖼️ Image restaurée*\n ${caption}` : "*🖼️ Image restaurée*"
                                });
                                
                                console.log(`${colors.green}✅ Image restaurée avec succès${colors.reset}`);
                            } else {
                                await sock.sendMessage(chatId, {
                                    text: caption ? `*🖼️ Image restaurée*\n${caption}` : "*🖼️ Image restaurée*"
                                });
                            }
                            
                        } catch (imageError) {
                            console.log(`${colors.red}❌ Erreur restauration image: ${imageError.message}${colors.reset}`);
                            
                            await sock.sendMessage(chatId, {
                                text: "*❌ Erreur restauration*\nImpossible de restaurer l'image supprimée"
                            });
                        }
                    } else {
                        const originalText =
                            originalMsg.message?.conversation ||
                            originalMsg.message?.extendedTextMessage?.text ||
                            originalMsg.message?.imageMessage?.caption ||
                            originalMsg.message?.videoMessage?.caption ||
                            originalMsg.message?.audioMessage?.caption ||
                            "[Message non textuel]";

                        const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
                        const containsLink = linkRegex.test(originalText);
                        
                        if (containsLink) {
                            console.log(`${colors.yellow}⚠️ Message avec lien détecté, non restauré: ${deletedId}${colors.reset}`);
                            await sock.sendMessage(chatId, {
                                text: "*ℹ️ Message supprimé*\nUn message avec un lien a été supprimé."
                            });
                        } else {
                            const deletedBy = msg.key.participant || msg.key.remoteJid;
                            const mention = deletedBy.split("@")[0];

                            await sock.sendMessage(chatId, {
                                text: `*𝙼𝚎𝚜𝚜𝚊𝚐𝚎 𝚜𝚞𝚙𝚙𝚛𝚒𝚖𝚎𝚛 𝚍𝚎:*@${mention}\n\n*Message :* ${originalText}\n\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇𝚃𝙴𝙲𝙷`,
                                mentions: [deletedBy]
                            });

                            console.log(
                                `${colors.green}✅ Message restauré de @${mention} : "${originalText.substring(0, 50)}..."${colors.reset}`
                            );
                        }
                        
                        messageStore.delete(deletedId);
                        const filePath = path.join(DELETED_MESSAGES_FOLDER, `${deletedId}.json`);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                            console.log(`${colors.cyan}🗑️ Fichier JSON supprimé après restauration${colors.reset}`);
                        }
                        
                        const imagePath = path.join(DELETED_IMAGES_FOLDER, `${deletedId}.jpg`);
                        if (fs.existsSync(imagePath)) {
                            fs.unlinkSync(imagePath);
                            console.log(`${colors.cyan}🗑️ Fichier image supprimé après restauration${colors.reset}`);
                        }
                        
                        return;
                    }
                    return;
                }

                const messageType = Object.keys(msg.message)[0];

                if (messageType === "protocolMessage") {
                    return;
                }

                const from = msg.key.remoteJid;
                const sender = msg.key.participant || msg.key.remoteJid;
                const isOwnerMsg = isOwner(sender);
                const isAdminMsg = await isAdminInGroup(sock, from, sender);

                if (!msg.key.fromMe) {
                    console.log(`${colors.cyan}📥 NOUVEAU MESSAGE REÇU de ${sender} ${isOwnerMsg ? '(OWNER)' : ''} ${isAdminMsg ? '(ADMIN)' : ''}${colors.reset}`);
                    console.log(`${colors.yellow}🔍 Type de message: ${messageType}${colors.reset}`);
                }

                let body = "";
                if (messageType === "conversation") {
                    body = msg.message.conversation;
                } else if (messageType === "extendedTextMessage") {
                    body = msg.message.extendedTextMessage.text;
                } else if (messageType === "imageMessage") {
                    body = msg.message.imageMessage?.caption || "";
                } else if (messageType === "videoMessage") {
                    body = msg.message.videoMessage?.caption || "";
                } else if (messageType === "audioMessage") {
                    body = msg.message.audioMessage?.caption || "";
                } else {
                    return;
                }

                // 🚫 ANTI-LINK AMÉLIORÉ
                if (antiLinkEnabled && body) {
                    const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
                    const hasLink = linkRegex.test(body);
                    
                    if (hasLink && !isOwnerMsg && !isAdminMsg) {
                        console.log(`${colors.red}🚫 LIEN DÉTECTÉ par ${sender} (non-admin)${colors.reset}`);
                        
                        const now = Date.now();
                        const lastWarn = antiLinkCooldown.get(from) || 0;
                        
                        if (now - lastWarn > 60000) {
                            antiLinkCooldown.set(from, now);
                            
                            await sock.sendMessage(from, {
                                text: `*⚠️ ATTENTION*\nLes liens ne sont pas autorisés dans ce groupe!`
                            });
                            
                            try {
                                await sock.sendMessage(from, {
                                    delete: msg.key
                                });
                            } catch (deleteError) {
                                console.log(`${colors.yellow}⚠️ Impossible de supprimer le message: ${deleteError.message}${colors.reset}`);
                            }
                        }
                        return;
                    } else if (hasLink && (isOwnerMsg || isAdminMsg)) {
                        console.log(`${colors.green}🔗 Lien autorisé de ${isOwnerMsg ? 'OWNER' : 'ADMIN'}${colors.reset}`);
                    }
                }

                const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
                const containsLink = linkRegex.test(body);

                if (containsLink && !isOwnerMsg && !isAdminMsg) {
                    console.log(`${colors.yellow}⚠️ Message avec lien détecté (non-admin), non sauvegardé: ${msg.key.id}${colors.reset}`);
                    return;
                }

                // SAUVEGARDE DU MESSAGE
                if (deleteRestoreEnabled || imageSaveEnabled) {
                    const savedMsg = {
                        key: msg.key,
                        message: msg.message,
                        pushName: msg.pushName || sender,
                        timestamp: Date.now(),
                        messageType: messageType
                    };

                    if (deleteRestoreEnabled) {
                        messageStore.set(msg.key.id, savedMsg);
                        console.log(`${colors.green}✅ Message sauvegardé en mémoire: ${msg.key.id.substring(0, 8)}...${colors.reset}`);
                    }

                    if (deleteRestoreEnabled) {
                        const filePath = path.join(DELETED_MESSAGES_FOLDER, `${msg.key.id}.json`);
                        fs.writeFileSync(filePath, JSON.stringify(savedMsg, null, 2));
                        console.log(`${colors.green}✅ Message sauvegardé sur disque: ${msg.key.id.substring(0, 8)}.json${colors.reset}`);
                    }

                    if (imageSaveEnabled && messageType === 'imageMessage') {
                        try {
                            console.log(`${colors.cyan}🖼️ Sauvegarde de l'image...${colors.reset}`);
                            
                            const imageMsg = msg.message.imageMessage;
                            const stream = await downloadContentFromMessage(imageMsg, 'image');
                            let buffer = Buffer.from([]);
                            
                            for await (const chunk of stream) {
                                buffer = Buffer.concat([buffer, chunk]);
                            }
                            
                            const imagePath = path.join(DELETED_IMAGES_FOLDER, `${msg.key.id}.jpg`);
                            fs.writeFileSync(imagePath, buffer);
                            
                            console.log(`${colors.green}✅ Image sauvegardée: ${msg.key.id}.jpg${colors.reset}`);
                            
                            savedMsg.imagePath = imagePath;
                            if (deleteRestoreEnabled) {
                                const filePath = path.join(DELETED_MESSAGES_FOLDER, `${msg.key.id}.json`);
                                fs.writeFileSync(filePath, JSON.stringify(savedMsg, null, 2));
                            }
                            
                        } catch (imageError) {
                            console.log(`${colors.yellow}⚠️ Erreur sauvegarde image: ${imageError.message}${colors.reset}`);
                        }
                    }
                }

                // 🎯 COMMANDES AVEC PREFIX
                if (body.startsWith(prefix)) {
                    const args = body.slice(prefix.length).trim().split(/ +/);
                    const command = args.shift().toLowerCase();
                    
                    console.log(`${colors.cyan}🎯 Commande détectée: ${command} par ${sender} ${isOwnerMsg ? '(OWNER)' : ''}${colors.reset}`);
                    
                    const context = {
                      isOwner: isOwnerMsg,
                      sender,
                      prefix: prefix,
                      botPublic: botPublic || isOwnerMsg
                    };
                    
                    if (botPublic || isOwnerMsg) {
                      await commandHandler.execute(command, sock, msg, args, context);
                    } else {
                      console.log(`${colors.yellow}⚠️ Commande ignorée (mode privé): ${command} par ${sender}${colors.reset}`);
                    }
                    continue;
                }

                // 🔧 COMMANDES PROPRIÉTAIRE
                if (isOwnerMsg) {
                    // ============================================
                    // COMMANDES ON/OFF POUR LES FONCTIONNALITÉS
                    // ============================================
                    
                    if (body === prefix + "antilink on") {
                        antiLinkEnabled = true;
                        await sock.sendMessage(msg.key.remoteJid, { 
                            text: '✅ Anti-link activé ! Les liens seront bloqués pour les non-admins.' 
                        });
                        continue;
                    }
                    
                    if (body === prefix + "antilink off") {
                        antiLinkEnabled = false;
                        await sock.sendMessage(msg.key.remoteJid, { 
                            text: '❌ Anti-link désactivé ! Les liens ne seront plus bloqués.' 
                        });
                        continue;
                    }
                    
                    if (body === prefix + "restore on") {
                        deleteRestoreEnabled = true;
                        await sock.sendMessage(msg.key.remoteJid, { 
                            text: '✅ Restauration des messages activée ! Les messages supprimés seront restaurés.' 
                        });
                        continue;
                    }
                    
                    if (body === prefix + "restore off") {
                        deleteRestoreEnabled = false;
                        await sock.sendMessage(msg.key.remoteJid, { 
                            text: '❌ Restauration des messages désactivée !' 
                        });
                        continue;
                    }
                    
                    if (body === prefix + "imagesave on") {
                        imageSaveEnabled = true;
                        await sock.sendMessage(msg.key.remoteJid, { 
                            text: '✅ Sauvegarde des images activée ! Les images seront sauvegardées.' 
                        });
                        continue;
                    }
                    
                    if (body === prefix + "imagesave off") {
                        imageSaveEnabled = false;
                        await sock.sendMessage(msg.key.remoteJid, { 
                            text: '❌ Sauvegarde des images désactivée !' 
                        });
                        continue;
                    }
                    
                    if (body === prefix + "features") {
                        await sock.sendMessage(msg.key.remoteJid, { 
                            text: `*⚙️ ÉTAT DES FONCTIONNALITÉS*\n\n` +
                                  `🔗 *Anti-link:* ${antiLinkEnabled ? '✅ ON' : '❌ OFF'}\n` +
                                  `🗑️ *Restauration messages:* ${deleteRestoreEnabled ? '✅ ON' : '❌ OFF'}\n` +
                                  `🖼️ *Sauvegarde images:* ${imageSaveEnabled ? '✅ ON' : '❌ OFF'}\n\n` +
                                  `*Commandes:*\n` +
                                  `• ${prefix}antilink on/off\n` +
                                  `• ${prefix}restore on/off\n` +
                                  `• ${prefix}imagesave on/off\n` +
                                  `• ${prefix}features (voir cet état)`
                        });
                        continue;
                    }
                    
                    // ============================================
                    // AUTRES COMMANDES PROPRIÉTAIRE
                    // ============================================
                    
                    if (body === prefix + "public") {
                        botPublic = true;
                        config.botPublic = true;
                        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
                        
                        await sendFormattedMessage(sock, OWNER_NUMBER, `✅ *BOT PASSÉ EN MODE PUBLIC*\n\nTous les utilisateurs peuvent maintenant utiliser les commandes.\n\n📊 Commandes disponibles: ${commandHandler.getCommandList().length}`, msg);
                        console.log(`${colors.green}🔓 Mode public activé${colors.reset}`);
                        continue;
                    }
                    
                    if (body === prefix + "private") {
                        botPublic = false;
                        config.botPublic = false;
                        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
                        
                        await sendFormattedMessage(sock, OWNER_NUMBER, `🔒 *BOT PASSÉ EN MODE PRIVÉ*\n\nSeul le propriétaire peut utiliser les commandes.`, msg);
                        console.log(`${colors.green}🔒 Mode privé activé${colors.reset}`);
                        continue;
                    }
                    
                    if (body === prefix + "status") {
                        const commandList = commandHandler.getCommandList();
                        const commandsText = commandList.slice(0, 10).map(cmd => `• ${prefix}${cmd}`).join('\n');
                        const moreCommands = commandList.length > 10 ? `\n... et ${commandList.length - 10} autres` : '';
                        
                        await sendFormattedMessage(sock, OWNER_NUMBER, `📊 *STATUS DU BOT*\n\n🏷️ Nom: HEXGATE V3\n🔓 Mode: ${botPublic ? 'Public' : 'Privé'}\n📊 Commandes: ${commandList.length}\n💾 Messages sauvegardés: ${messageStore.size}\n🖼️ Images sauvegardées: ${fs.readdirSync(DELETED_IMAGES_FOLDER).length}\n⏰ Uptime: ${process.uptime().toFixed(0)}s\n\n📋 Commandes disponibles:\n${commandsText}${moreCommands}`, msg);
                        continue;
                    }
                    
                    if (body === prefix + "recording on") {
                        // Commenté car fakerecording est supprimé
                        await sock.sendMessage(OWNER_NUMBER, `🎤 *FAKE RECORDING NON DISPONIBLE*\n\nCette fonctionnalité a été supprimée.`);
                        console.log(`${colors.yellow}⚠️ Fake recording désactivé (supprimé)${colors.reset}`);
                        continue;
                    }
                    
                    if (body === prefix + "recording off") {
                        // Commenté car fakerecording est supprimé
                        await sock.sendMessage(OWNER_NUMBER, `🎤 *FAKE RECORDING NON DISPONIBLE*\n\nCette fonctionnalité a été supprimée.`);
                        console.log(`${colors.yellow}⚠️ Fake recording désactivé (supprimé)${colors.reset}`);
                        continue;
                    }
                    
                    if (body === prefix + "restore") {
                        const deletedCount = fs.readdirSync(DELETED_MESSAGES_FOLDER).length;
                        const imageCount = fs.readdirSync(DELETED_IMAGES_FOLDER).length;
                        
                        await sendFormattedMessage(sock, OWNER_NUMBER, `🔄 *STATUS RESTAURATION*\n\n📊 Messages sauvegardés: ${deletedCount}\n🖼️ Images sauvegardées: ${imageCount}\n💾 En mémoire: ${messageStore.size}\n\n✅ Système de restauration actif!`, msg);
                        continue;
                    }
                    
                    if (body === prefix + "help") {
                        await sendFormattedMessage(sock, OWNER_NUMBER, `🛠️ *COMMANDES PROPRIÉTAIRE*\n\n• ${prefix}public - Mode public\n• ${prefix}private - Mode privé\n• ${prefix}status - Statut du bot\n• ${prefix}restore - Status restauration\n• ${prefix}help - Cette aide\n• ${prefix}menu - Liste des commandes\n\n🎯 Prefix actuel: "${prefix}"\n👑 Propriétaire: ${config.ownerNumber}`, msg);
                        continue;
                    }
                }
            }
        } catch (error) {
            console.error(`${colors.red}❌ Erreur dans le traitement des messages: ${error.message}${colors.reset}`);
        }
    });

    // 🎭 GESTION DES RÉACTIONS
    sock.ev.on("messages.reaction", async (reactions) => {
      try {
        for (const reaction of reactions) {
          console.log(`${colors.magenta}🎭 Réaction reçue: ${reaction.reaction.text} sur ${reaction.key.id}${colors.reset}`);
        }
      } catch (error) {
        console.log(`${colors.red}❌ Erreur traitement réaction: ${error.message}${colors.reset}`);
      }
    });

    // 🚀 INTERFACE CONSOLE
    rl.on("line", async (input) => {
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
          
        case "reload":
          commandHandler.reloadCommands();
          break;
          
        case "status":
          console.log(`${colors.cyan}📊 STATUT DU BOT${colors.reset}`);
          console.log(`${colors.yellow}• Mode: ${botPublic ? 'PUBLIC' : 'PRIVÉ'}${colors.reset}`);
          console.log(`${colors.yellow}• Commandes chargées: ${commandHandler.getCommandList().length}${colors.reset}`);
          console.log(`${colors.yellow}• Messages en mémoire: ${messageStore.size}${colors.reset}`);
          console.log(`${colors.yellow}• Images sauvegardées: ${fs.readdirSync(DELETED_IMAGES_FOLDER).length}${colors.reset}`);
          console.log(`${colors.yellow}• Prefix: "${prefix}"${colors.reset}`);
          console.log(`${colors.yellow}• Propriétaire: ${config.ownerNumber}${colors.reset}`);
          console.log(`${colors.yellow}• Telegram: ${telegramLink}${colors.reset}`);
          console.log(`${colors.yellow}• Bot prêt pour API: ${botReady ? 'OUI' : 'NON'}${colors.reset}`);
          break;
          
        case "clear":
          console.clear();
          displayBanner();
          break;
          
        case "prefix":
          if (args[0]) {
            config.prefix = args[0];
            fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
            console.log(`${colors.green}✅ Nouveau prefix: "${config.prefix}"${colors.reset}`);
          } else {
            console.log(`${colors.yellow}⚠️ Usage: prefix [nouveau_prefix]${colors.reset}`);
          }
          break;
          
        case "exit":
          console.log(`${colors.yellow}👋 Arrêt du bot...${colors.reset}`);
          rl.close();
          process.exit(0);
          break;
          
        default:
          console.log(`${colors.yellow}⚠️ Commandes console disponibles:${colors.reset}`);
          console.log(`${colors.cyan}  • public - Mode public${colors.reset}`);
          console.log(`${colors.cyan}  • private - Mode privé${colors.reset}`);
          console.log(`${colors.cyan}  • reload - Recharger commandes${colors.reset}`);
          console.log(`${colors.cyan}  • status - Afficher statut${colors.reset}`);
          console.log(`${colors.cyan}  • prefix [x] - Changer prefix${colors.reset}`);
          console.log(`${colors.cyan}  • clear - Nettoyer console${colors.reset}`);
          console.log(`${colors.cyan}  • exit - Quitter${colors.reset}`);
      }
    });

  } catch (error) {
    console.log(`${colors.red}❌ Erreur démarrage bot: ${error.message}${colors.reset}`);
    console.error(error);
    process.exit(1);
  }
}

// ============================================
// 🚀 DÉMARRAGE AUTOMATIQUE DU BOT
// ============================================
console.log(`${colors.magenta}🚀 Démarrage de HEXGATE V3...${colors.reset}`);

// Démarrer le bot automatiquement
setTimeout(() => {
  startBot();
}, 1000);

// ============================================
// 📦 EXPORTS POUR L'API WEB
// ============================================
module.exports = {
  bot: () => sock,
  generatePairCode,
  isBotReady: () => botReady,
  config,
  startBot
};
