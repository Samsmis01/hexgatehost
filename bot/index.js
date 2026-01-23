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
  if (fs.existsSync('./config.json')) {
    config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    console.log('✅ Configuration chargée depuis config.json');
  } else {
    console.log('⚠️ config.json non trouvé, création avec valeurs par défaut...');
    config = {
      prefix: ".",
      ownerNumber: "243983205767", // NUMÉRO MODIFIÉ
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
    ownerNumber: "243983205767", // NUMÉRO MODIFIÉ
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
let welcomeEnabled = false; // État initial de la commande
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

// Fonction pour gérer l'installation des modules manquants
async function installMissingModules() {
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
        // Charger à nouveau au lieu de return
        require('./index.js');
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
}

// Appeler la fonction d'installation
installMissingModules();

// Si des modules manquants, arrêter l'exécution
if (missingModules.length > 0) {
  // Attendre que l'installation se termine
  process.exit(0);
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

// ============================================
// 🆕 MODIFICATIONS POUR WEB
// ============================================

// ⚡ VARIABLES D'ENVIRONNEMENT POUR WEB
const SESSION_ID = process.env.SESSION_ID || 'hexgate-default';
const SESSION_PATH = process.env.SESSION_PATH || path.join(process.cwd(), 'sessions', SESSION_ID);
const TARGET_PHONE = process.env.PHONE_NUMBER || config.ownerNumber;

// Mettre à jour le numéro owner avec celui du web
const UPDATED_OWNER_NUMBER = `${TARGET_PHONE.replace(/\D/g, '')}@s.whatsapp.net`;

console.log('🌐 CONFIGURATION WEB:');
console.log(`  • Session ID: ${SESSION_ID}`);
console.log(`  • Chemin session: ${SESSION_PATH}`);
console.log(`  • Téléphone cible: ${TARGET_PHONE}`);
console.log(`  • Owner final: ${UPDATED_OWNER_NUMBER}`);

// Variables globales
let sock = null;
let botReady = false;
let pairingCodes = new Map();
let commandHandler = null;
let autoReact = true;

// 📁 Dossiers avec support session
const VV_FOLDER = path.join(SESSION_PATH, "./.VV");
const DELETED_MESSAGES_FOLDER = path.join(SESSION_PATH, "./deleted_messages");
const COMMANDS_FOLDER = path.join(SESSION_PATH, "./commands");
const VIEW_ONCE_FOLDER = path.join(SESSION_PATH, "./viewOnce");
const DELETED_IMAGES_FOLDER = path.join(SESSION_PATH, "./deleted_images");

// Vérification des dossiers
[SESSION_PATH, VV_FOLDER, DELETED_MESSAGES_FOLDER, COMMANDS_FOLDER, VIEW_ONCE_FOLDER, DELETED_IMAGES_FOLDER].forEach(folder => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    console.log(`✅ Dossier créé: ${folder}`);
  } else {
    console.log(`📁 Dossier ${folder} déjà existant`);
  }
});

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

// Emojis pour réactions aléatoires
const randomEmojis = ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"];

// Variables globales
let processingMessages = new Set();
let isProcessing = false;
let lastDeletedMessage = new Map();
let antiLinkCooldown = new Map();
let botMessages = new Set();

// Map pour stocker les messages en mémoire
const messageStore = new Map();

// Map pour stocker les vues uniques
const viewOnceStore = new Map();

// ============================================
// 🆕 FONCTION DE PAIRING POUR WEB
// ============================================
async function pairing(phoneNumber) {
  try {
    if (!sock) {
      console.log(`${colors.red}❌ Bot non connecté, impossible de générer pair code${colors.reset}`);
      return null;
    }

    // Nettoyer le numéro
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('243') ? cleanPhone : `243${cleanPhone}`;
    
    console.log(`${colors.cyan}📱 Génération pair code pour: ${phoneWithCountry}${colors.reset}`);
    
    // Vérifier si un code existe déjà
    const existingCode = pairingCodes.get(phoneWithCountry);
    if (existingCode && (Date.now() - existingCode.timestamp < 300000)) { // 5 minutes
      console.log(`${colors.yellow}⚠️ Code déjà généré récemment: ${existingCode.code}${colors.reset}`);
      return existingCode.code;
    }
    
    // Générer le code de pairing
    const code = await sock.requestPairingCode(phoneWithCountry);
    
    if (code) {
      // Stocker temporairement
      pairingCodes.set(phoneWithCountry, {
        code: code,
        timestamp: Date.now()
      });
      
      // Nettoyer après 5 minutes
      setTimeout(() => {
        pairingCodes.delete(phoneWithCountry);
      }, 300000);
      
      console.log(`${colors.green}✅ Pair code généré: ${code} pour ${phoneWithCountry}${colors.reset}`);
      
      // Envoyer un message de confirmation si le bot est connecté
      if (botReady && sock) {
        try {
          await sock.sendMessage(UPDATED_OWNER_NUMBER, { 
            text: `📱 *PAIRING CODE GÉNÉRÉ*\n\nCode: ${code}\nPour: ${phoneWithCountry}\n\nUtilisez ce code dans WhatsApp → Périphériques liés` 
          });
        } catch (sendError) {
          console.log(`${colors.yellow}⚠️ Impossible d'envoyer message de confirmation${colors.reset}`);
        }
      }
      
      return code;
    }
    
    return null;
  } catch (error) {
    console.log(`${colors.red}❌ Erreur génération pair code: ${error.message}${colors.reset}`);
    return null;
  }
}

// ============================================
// 🖼️ FONCTION DE FORMATAGE UNIFIÉE POUR TOUS LES MESSAGES
// ============================================
async function sendFormattedMessage(sock, jid, messageText) {
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
    // Essayer d'envoyer avec l'image - APPROCHE SÉCURISÉE
    try {
      // Vérifier si l'URL de l'image est valide
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

    // Tentative alternative avec une image locale ou sans image
    try {
      // Essayer avec une URL alternative simple
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
      
      // En dernier recours, envoyer en texte uniquement
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
      
      // Charger d'abord les commandes intégrées
      this.loadBuiltinCommands();
      
      // Ensuite essayer de charger depuis le dossier
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
      
      // En cas d'erreur, charger au moins les commandes intégrées
      this.loadBuiltinCommands();
      this.commandsLoaded = true;
    }
  }

  loadCommandsFromDirectory() {
    let count = 0;
    
    try {
      const commandsDir = path.join(SESSION_PATH, 'commands');
      
      if (!fs.existsSync(commandsDir)) {
        console.log(`${colors.yellow}⚠️ Dossier commands non trouvé${colors.reset}`);
        return count;
      }
      
      const items = fs.readdirSync(commandsDir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(commandsDir, item.name);
        
        try {
          if (item.isDirectory()) {
            // Charger les sous-dossiers
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

    // 🆕 COMMANDE PAIRING
    this.commands.set("pairing", {
      name: "pairing",
      description: "Génère un code de pairing pour un numéro WhatsApp",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;
        const sender = context?.sender || (msg.key.participant || msg.key.remoteJid);
        
        // Vérifier si l'expéditeur est le propriétaire
        if (!isOwner(sender)) {
          await sendFormattedMessage(sock, from, "❌ Commande réservée au propriétaire");
          return;
        }
        
        if (!args[0]) {
          await sendFormattedMessage(sock, from, "❌ Usage: .pairing [numéro]\nExemple: .pairing 243983205767");
          return;
        }
        
        const phoneNumber = args[0];
        
        // Générer le code de pairing
        const code = await pairing(phoneNumber);
        
        if (code) {
          await sendFormattedMessage(sock, from, `✅ *PAIRING CODE GÉNÉRÉ*\n\n📱 Pour: ${phoneNumber}\n🔑 Code: ${code}\n\n⚠️ Valide 5 minutes\nUtilisez-le dans WhatsApp → Périphériques liés`);
        } else {
          await sendFormattedMessage(sock, from, "❌ Impossible de générer le code de pairing");
        }
      }
    });

    this.commands.set("hack", {
      name: "hack",
      description: "Simulation réaliste de progression de hack",
      execute: async (sock, msg) => {
        const from = msg.key.remoteJid;

        try {
          // 🔹 Message initial (progression vide, sans cadre)
          let progress = 0;
          let bar = "░░░░░░░░░░ 0%";

          const sent = await sock.sendMessage(from, {
            text: bar
          });

          const messageKey = sent.key;

          // ⏳ Progression réelle sur ~8 secondes
          const interval = setInterval(async () => {
            progress += 5; // 5% x 20 = 100%
            if (progress > 100) progress = 100;

            const filled = Math.floor(progress / 10);
            const empty = 10 - filled;

            bar =
              "▓".repeat(filled) +
              "░".repeat(empty) +
              ` ${progress}%`;

            await sock.sendMessage(from, {
              text: bar
            }, { edit: messageKey });

            // ✅ FIN
            if (progress === 100) {
              clearInterval(interval);

              const finalText = `
┏━━❖ 💻 HACK MODULE ❖━━┓
┃
┃ 🔐 𝚒𝚗𝚓𝚎𝚌𝚝𝚒𝚘𝚗 :
┃
┃ 🟩▓▓▓▓▓▓▓▓▓▓ 100%
┃
┃ 📡 Connexion sécurisée…
┃ 🧠 Analyse des paquets…
┃
┗━━━━━━━━━━━━━━━━━━━┛`.trim();

              await sock.sendMessage(from, {
                image: {
                  url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTA6TqRKXfRK5IU-ixXQ8sd7o6rL_B5J9dfrawfoO8goQ&s=10"
                },
                caption: finalText
              });
            }

          }, 400); // 400ms × 20 ≈ 8 secondes

        } catch (err) {
          console.log("hack command error:", err);
          await sock.sendMessage(from, {
            text: "❌ Erreur lors de l'exécution du module hack"
          });
        }
      }
    });

    this.commands.set("setname", {
      name: "setname",
      description: "Change le nom du groupe",
      execute: async (sock, msg, args) => {
        const from = msg.key.remoteJid;

        // Groupe uniquement
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

          // Vérif admin utilisateur
          const isAdmin = participants.some(
            p => p.id === sender && (p.admin === "admin" || p.admin === "superadmin")
          );

          if (!isAdmin) {
            return sock.sendMessage(from, {
              text: "❌ Seuls les admins peuvent changer le nom du groupe"
            });
          }

          // Changer nom
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

    this.commands.set("revoke", {
      name: "revoke",
      description: "Révoque le lien du groupe (nouveau lien généré)",
      execute: async (sock, msg, args) => {
        const from = msg.key.remoteJid;

        // Groupe uniquement
        if (!from.endsWith("@g.us")) {
          return await sock.sendMessage(from, { text: "❌ Commande réservée aux groupes" });
        }

        try {
          const metadata = await sock.groupMetadata(from);
          const participants = metadata.participants;
          const sender = msg.key.participant || msg.key.remoteJid;

          // Vérif admin utilisateur
          const isAdmin = participants.some(
            p => p.id === sender && (p.admin === "admin" || p.admin === "superadmin")
          );
          if (!isAdmin) {
            return await sock.sendMessage(from, {
              text: "❌ Seuls les admins peuvent révoquer le lien du groupe"
            });
          }

          // Révoquer le lien (génère un nouveau lien)
          await sock.groupRevokeInvite(from);

          // Obtenir le nouveau lien
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

    this.commands.set("link", {
      name: "link",
      description: "Donne le lien d'invitation du groupe",
      execute: async (sock, msg, args) => {
        const from = msg.key.remoteJid;

        // Groupe uniquement
        if (!from.endsWith("@g.us")) {
          return await sock.sendMessage(from, { text: "❌ Commande réservée aux groupes" });
        }

        try {
          // Récupère le code d'invitation
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

    this.commands.set("stealpp", {
      name: "stealpp",
      description: "Récupère la photo de profil d'un utilisateur (Premium)",
      execute: async (sock, msg, args) => {
        const from = msg.key.remoteJid;

        try {
          // 🎯 Cible
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

          // 🖼️ Récupération PP
          let ppUrl;
          try {
            ppUrl = await sock.profilePictureUrl(targetJid, "image");
          } catch {
            return sock.sendMessage(from, {
              text: "❌ Photo de profil privée ou indisponible"
            });
          }

          // 📤 Envoi
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

    this.commands.set("welcome", {
      name: "welcome",
      description: "Active ou désactive le message de bienvenue et accueille un membre avec image et encadrement",
      execute: async (sock, msg, args) => {
        const from = msg.key.remoteJid;

        try {
          // ⚡ Activation/Désactivation
          if (args[0] === "on") {
            welcomeEnabled = true;
            return await sock.sendMessage(from, { text: "✅ Messages de bienvenue activés" });
          } else if (args[0] === "off") {
            welcomeEnabled = false;
            return await sock.sendMessage(from, { text: "❌ Messages de bienvenue désactivés" });
          }

          // Vérifie que les welcome sont activés
          if (!welcomeEnabled) {
            return await sock.sendMessage(from, {
              text: "❌ La fonctionnalité de bienvenue est désactivée. Tapez `.welcome on` pour l'activer."
            });
          }

          // Vérifie qu'il y a au moins une mention
          const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
          if (mentions.length === 0) {
            return await sock.sendMessage(from, {
              text: "❌ Veuillez mentionner la personne à accueillir\nExemple : .welcome @nom"
            });
          }

          const mentionJid = mentions[0];
          const mentionName = mentionJid.split("@")[0];

          // Message encadré
          const text = `
┏━━━❖ ＡＲＣＡＮＥ❖━━━━┓
┃ @${mentionName}
┃ 
┃ *BIENVENUE PAUVRE MORTEL*
┗━━━━━━━━━━━━━━━━━━┛
      `.trim();

          // Envoi avec image
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

          // Carte ASCII pour A-Z et espace
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

          // Envoi avec backticks triples pour alignement fixe
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

    this.commands.set("autokick", {
      name: "autokick",
      description: "Active ou désactive l'autokick pour les nouveaux membres",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;

        // Vérification : uniquement pour les groupes
        if (!from.endsWith("@g.us")) {
          return await sock.sendMessage(from, { text: "❌ Cette commande fonctionne uniquement dans les groupes" });
        }

        // Activer ou désactiver
        const option = args[0]?.toLowerCase();
        if (!option || !["on", "off"].includes(option)) {
          return await sock.sendMessage(from, { text: "❌ Usage : .autokick on/off" });
        }

        // Stockage du statut autokick dans un fichier JSON local
        const configPath = path.join(SESSION_PATH, 'autokick.json');
        let config = {};
        if (fs.existsSync(configPath)) {
          config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
        config[from] = option === 'on';
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        await sock.sendMessage(from, { text: `✅ Autokick ${option === 'on' ? 'activé' : 'désactivé'} pour ce groupe` });

        // Charger la liste des membres connus
        const metadata = await sock.groupMetadata(from);
        const knownMembers = new Set(metadata.participants.map(p => p.id));

        // Événement pour détecter les nouveaux membres
        sock.ev.on('group-participants.update', async (update) => {
          if (update.id !== from) return; // uniquement ce groupe

          if (update.action === 'add') {
            for (const p of update.participants) {
              if (!knownMembers.has(p)) {
                console.log("Nouveau membre détecté :", p);

                // Ajouter à la liste des membres connus
                knownMembers.add(p);

                // Kick si autokick activé
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

    this.commands.set("info", {
      name: "info",
      description: "Affiche les informations détaillées du groupe (premium)",
      execute: async (sock, msg, args) => {
        const from = msg.key.remoteJid;

        // Groupe uniquement
        if (!from.endsWith("@g.us")) {
          return await sock.sendMessage(from, { text: "❌ Commande réservée aux groupes" });
        }

        try {
          const metadata = await sock.groupMetadata(from);
          const participants = metadata.participants || [];

          // Nombre total de membres
          const total = participants.length;

          // Liste des admins
          const admins = participants
            .filter(p => p.admin === "admin" || p.admin === "superadmin")
            .map(p => `@${p.id.split("@")[0]}`)
            .join(", ");

          // Nom + description + id
          const groupName = metadata.subject || "Groupe sans nom";
          const groupDesc = metadata.desc?.toString() || "Aucune description";
          const groupId = metadata.id;

          // Création message stylé premium
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

          // Envoi avec mentions admins
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

        // 📢 Message d'annonce
        await sendFormattedMessage(sock, from, "♻️ *Mise à jour en cours...*\n\n• Rechargement des commandes\n• Nettoyage de la mémoire\n• Redémarrage du bot\n\n⏳ Veuillez patienter...");

        // ⏳ Petite attente pour laisser le message s'envoyer
        await new Promise(r => setTimeout(r, 2000));

        // 🔁 REDÉMARRAGE PROPRE
        console.log("🔄 UPDATE demandé, redémarrage du bot...");

        // Fermer proprement la connexion
        try {
          await sock.end();
        } catch (e) {}

        // Relancer le process
        process.exit(0);
      }
    });

    this.commands.set("tag", {
      name: "tag",
      description: "Mentionne tout le monde avec ton texte",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;

        if (!from.endsWith("@g.us")) {
          await sendFormattedMessage(sock, from, "❌ Commande utilisable uniquement dans un groupe");
          return;
        }

        const metadata = await sock.groupMetadata(from);
        const participants = metadata.participants || [];

        if (!args[0]) {
          await sendFormattedMessage(sock, from, "❌ Usage: .tag [texte]");
          return;
        }

        const text = args.join(" ");

        // Liste des JID à mentionner
        const mentions = participants.map(p => p.id);

        try {
          await sock.sendMessage(from, {
            text: text,
            mentions: mentions
          });
        } catch (error) {
          await sendFormattedMessage(sock, from, `❌ Erreur lors du tag: ${error.message}`);
        }
      }
    });

    this.commands.set("fakecall", {
      name: "fakecall",
      description: "Simule un appel WhatsApp entrant",
      execute: async (sock, msg, args) => {
        const from = msg.key.remoteJid;

        if (!args[0]) {
          return await sendFormattedMessage(
            sock,
            from,
            "❌ Usage : .fakecall @user\n\nExemple : .fakecall @243xxxxxxxx"
          );
        }

        try {
          // 🎯 Cible
          const target =
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
            args[0].replace(/\D/g, "") + "@s.whatsapp.net";

          // 🕒 Heure actuelle
          const time = new Date().toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit"
          });

          // 📞 Message FAUX APPEL (VISUEL)
          const fakeCallMessage = {
            key: {
              remoteJid: from,
              fromMe: false,
              id: "FAKECALL-" + Date.now()
            },
            message: {
              callLogMesssage: {
                isVideo: false,
                callOutcome: "missed", // missed | rejected | accepted
                durationSecs: 0,
                participants: [{ jid: target }]
              }
            }
          };

          // ⚠️ AVERTISSEMENT
          await sock.sendMessage(from, {
            image: { url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZ1i7XIDDTRn01oToPCdQ4e5oCgZex2Iw1xg&s" },
            caption: `📞 *APPEL ENTRANT*\n\n👤 Cible : @${target.split("@")[0]}\n🕒 Heure : ${time}\n\n⏳ Connexion...`,
            mentions: [target]
          });

          // ⏳ Délai réaliste
          await new Promise(r => setTimeout(r, 2000));

          // 📲 Injection appel (VISUEL)
          await sock.relayMessage(from, fakeCallMessage.message, {
            messageId: fakeCallMessage.key.id
          });

        } catch (err) {
          console.log("fakecall error:", err);
          await sendFormattedMessage(sock, from, "❌ Erreur fakecall");
        }
      }
    });
     
    this.commands.set("tagadmin", {
      name: "tagadmin",
      description: "Mentionne tous les admins du groupe",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;

        // Vérification : uniquement groupes
        if (!from.endsWith("@g.us")) {
          return await sendFormattedMessage(sock, from, "❌ Cette commande fonctionne uniquement dans les groupes");
        }

        try {
          const metadata = await sock.groupMetadata(from);
          const participants = metadata.participants || [];

          // Filtrer les admins
          const admins = participants.filter(p => p.admin === "admin" || p.admin === "superadmin");
          if (admins.length === 0) {
            return await sendFormattedMessage(sock, from, "❌ Aucun admin trouvé dans le groupe");
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
          await sendFormattedMessage(sock, from, "❌ Impossible de récupérer les admins");
        }
      },
    });

    this.commands.set("delowner", {
      name: "delowner",
      description: "Supprime un propriétaire du bot",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;

        // Vérifier si l'expéditeur est propriétaire
        const senderJid = msg.key.participant || msg.key.remoteJid;
        if (!ownerManager.isOwner(senderJid)) {
          await sendFormattedMessage(sock, from, "❌ Commande réservée aux propriétaires");
          return;
        }

        if (!args[0]) {
          await sendFormattedMessage(sock, from, "❌ Usage: .delowner 243XXXXXXXXX");
          return;
        }

        const number = args[0].replace(/\D/g, "");
        const jid = number + "@s.whatsapp.net";

        ownerManager.removeOwner(jid);

        await sendFormattedMessage(sock, from, `✅ Propriétaire supprimé :\n${jid}`);
      }
    });

    this.commands.set("vv", {
      name: "vv",
      description: "Affiche la dernière vue unique sauvegardée",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;
        const data = viewOnceStore.get(from);

        if (!data) {
          await sendFormattedMessage(sock, from, "❌ Aucune vue unique sauvegardée");
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
┃✰│➫ ${prefix}𝚊𝚍𝚍𝚘𝚠𝚗𝚎𝚛
┃✰│➫ ${prefix}𝚍𝚎𝚕𝚘𝚠𝚗𝚎𝚛
┃✰│➫ ${prefix}𝚌𝚘𝚗𝚏𝚒𝚐
┃✰│➫ ${prefix}𝚑𝚎𝚡𝚝𝚎𝚌𝚑
┃✰│➫ ${prefix}𝚏𝚊𝚔𝚎𝚌𝚊𝚕𝚕
┃✰│➫ ${prefix}𝚑𝚊𝚌𝚔
┃✰│➫ ${prefix}𝚜𝚊𝚟𝚎
┃✰│➫ ${prefix}𝚏𝚊𝚔𝚎𝚛𝚎𝚌𝚘𝚛𝚍𝚒𝚗𝚐 𝚘𝚗/𝚘𝚏
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
┃✰│➫ ${prefix}𝚚𝚞𝚒𝚣
┃✰│➫ ${prefix}𝚚𝚞𝚒𝚣 𝚘𝚏𝚏
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

        // Envoyer l'image avec le texte en légende
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
          // En cas d'erreur avec l'image, envoyer juste le texte
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
        
        await sendFormattedMessage(sock, from, `🏓 *PONG!*\n\n📡 Latence: ${latency}ms\n🤖 HEXGATE V1 - En ligne!\n👤 Envoyé par: ${context?.sender || 'Inconnu'}`);
      }
    });

    this.commands.set("help", {
      name: "help",
      description: "Affiche l'aide",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;
        const currentPrefix = context?.prefix || prefix;
        
        const helpText = `🛠️ *AIDE HEXGATE V3*\n\nPrefix: ${currentPrefix}\n\nCommandes principales:\n• ${currentPrefix}ping - Test du bot\n• ${currentPrefix}menu - Menu complet\n• ${currentPrefix}help - Cette aide\n• ${currentPrefix}hextech - Info HEX✦GATE\n• ${currentPrefix}tagall - Mention groupe\n• ${currentPrefix}purge - Purge groupe (admin)\n\n👑 Propriétaire: ${config.ownerNumber}\n👤 Vous: ${context?.sender || 'Inconnu'}`;
        
        await sendFormattedMessage(sock, from, helpText);
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
          await sendFormattedMessage(sock, msg.key.remoteJid, `❌ Commande "${cmd}" non reconnue. Tapez ${context?.prefix || prefix}menu pour voir la liste des commandes.`);
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
      
      // Réaction emoji (optionnel)
      try {
        if (autoReact) {
          const randomEmoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)];
          await sock.sendMessage(msg.key.remoteJid, {
            react: { text: randomEmoji, key: msg.key }
          });
          console.log(`${colors.magenta}🎯 Réaction emoji: ${randomEmoji} pour ${cmd}${colors.reset}`);
        }
      } catch (reactError) {
        // Ignorer les erreurs de réaction
      }
      
      await command.execute(sock, msg, args, context);
      
      console.log(`${colors.green}✅ Commande exécutée avec succès: ${cmd}${colors.reset}`);
      return true;
      
    } catch (error) {
      console.log(`${colors.red}❌ Erreur exécution ${cmd}: ${error.message}${colors.reset}`);
      console.error(error);
      
      try {
        await sendFormattedMessage(sock, msg.key.remoteJid, `❌ *ERREUR D'EXÉCUTION*\n\nCommande: ${cmd}\nErreur: ${error.message}\n\nContactez le développeur si le problème persiste.`);
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
      // Sauvegarder les commandes actuelles
      const currentCommands = new Map(this.commands);
      
      // Réinitialiser
      this.commands.clear();
      
      // Recharger
      this.initializeCommands();
      
      // Si le rechargement échoue, restaurer les anciennes commandes
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

// Fonction pour tracker l'activité
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
  const ownerJid = UPDATED_OWNER_NUMBER.split(":")[0];
  return normalizedJid === ownerJid;
}

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

// ============================================
// 🆕 FONCTIONS POUR WEB
// ============================================

// 📱 Affichage logo
function displayBanner() {
  console.clear();
  console.log(`
${colors.magenta}╔══════════════════════════════════════════════════╗
║${colors.bright}${colors.cyan}         WHATSAPP BOT - HEXGATE WEB EDITION         ${colors.reset}${colors.magenta}║
╠══════════════════════════════════════════════════╣
║${colors.green} ✅ BOT EN MODE WEB - SESSION: ${SESSION_ID.substring(0, 8)}${colors.magenta}║
║${colors.green} ✅ FAKE RECORDING: ${fakeRecording ? 'ACTIVÉ' : 'DÉSACTIVÉ'}${colors.magenta}║
║${colors.green} ✅ RESTAURATION MESSAGES & IMAGES ACTIVÉE      ${colors.magenta}║
║${colors.green} ✅ API PAIRING INTÉGRÉE                        ${colors.magenta}║
║${colors.green} ✅ Détection multiple messages                 ${colors.magenta}║
║${colors.green} ✅ Réactions emoji aléatoires                  ${colors.magenta}║
║${colors.green} ✅ Chargement complet commandes                ${colors.magenta}║
╚══════════════════════════════════════════════════╝${colors.reset}
`);
}

// 🆕 FONCTION D'AUTH POUR WEB
async function initWebAuth() {
  console.log(`🔐 Initialisation auth web dans: ${SESSION_PATH}`);
  
  // Utiliser le chemin de session pour l'auth
  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(SESSION_PATH, 'auth_info_baileys')
  );
  
  return { state, saveCreds };
}

// 🆕 FONCTION DE DÉMARRAGE POUR WEB
async function startBotForWeb(phoneNumber = null) {
  try {
    displayBanner();
    
    // Initialiser l'authentification
    const { state, saveCreds } = await initWebAuth();
    const { version } = await fetchLatestBaileysVersion();
    
    // Créer la socket
    sock = makeWASocket({
      version,
      logger: P({ level: logLevel }),
      printQRInTerminal: false,
      auth: state,
      browser: Browsers.ubuntu("Chrome"),
      markOnlineOnConnect: alwaysOnline,
      syncFullHistory: false,
    });

    // Initialiser le gestionnaire de commandes
    commandHandler = new CommandHandler();

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log('📱 QR Code disponible pour pairing');
        
        // Si un numéro est spécifié, utiliser le pairing code
        const targetPhone = phoneNumber || TARGET_PHONE;
        if (targetPhone) {
          try {
            console.log(`📱 Tentative de pairing avec: ${targetPhone}`);
            const code = await sock.requestPairingCode(targetPhone);
            console.log(`✅ Code de pairing: ${code}`);
            
            // Stocker le code
            pairingCodes.set(targetPhone, {
              code: code,
              timestamp: Date.now()
            });
            
            // Envoyer un message de confirmation
            try {
              await sock.sendMessage(UPDATED_OWNER_NUMBER, { 
                text: `✅ *HEXGATE V1 CONNECTÉ*\n\nCode de pairing: ${code}\n\nUtilisez ce code dans WhatsApp → Périphériques liés` 
              });
            } catch (sendError) {
              console.log('⚠️ Message non envoyé (peut-être pas encore connecté)');
            }
          } catch (pairError) {
            console.log(`❌ Erreur pairing: ${pairError.message}`);
            console.log('⚠️ QR Code requis - ouvrez WhatsApp et scannez');
          }
        }
      }
      
      if (connection === "close") {
        const reason = new Error(lastDisconnect?.error)?.output?.statusCode;
        if (reason === DisconnectReason.loggedOut) {
          console.log(`${colors.red}❌ Déconnecté, suppression des données d'authentification...${colors.reset}`);
          exec("rm -rf auth_info_baileys", () => {
            console.log(`${colors.yellow}🔄 Redémarrage du bot...${colors.reset}`);
            setTimeout(() => startBotForWeb(phoneNumber), 5000);
          });
        } else {
          console.log(`${colors.yellow}🔄 Reconnexion...${colors.reset}`);
          setTimeout(() => startBotForWeb(phoneNumber), 5000);
        }
      } else if (connection === "open") {
        console.log(`${colors.green}✅ Connecté à WhatsApp!${colors.reset}`);
        console.log(`${colors.cyan}🔓 Mode: ${botPublic ? 'PUBLIC' : 'PRIVÉ'}${colors.reset}`);
        console.log(`${colors.cyan}🎤 Fake Recording: ${fakeRecording ? 'ACTIVÉ' : 'DÉSACTIVÉ'}${colors.reset}`);
        
        // 🔴 MODIFICATION IMPORTANTE : ENVOI DE CONFIRMATION AU PROPRIÉTAIRE
        try {
          const confirmMessage = `✅ *HEX-GATE CONNECTEE*\n\n🚀 *HEXGATE V1* est en ligne!\n📊 *Commandes:* ${commandHandler.getCommandList().length}\n🔧 *Mode:* ${botPublic ? 'PUBLIC' : 'PRIVÉ'}\n🎤 *Fake Recording:* ${fakeRecording ? 'ACTIVÉ' : 'DÉSACTIVÉ'}\n🔓 *Restauration:* Messages & Images ACTIVÉE\n🔗 *systeme:* tapez menu`;
          
          await sock.sendMessage(UPDATED_OWNER_NUMBER, { text: confirmMessage });
          console.log(`${colors.green}✅ Confirmation envoyée au propriétaire: ${UPDATED_OWNER_NUMBER}${colors.reset}`);
        } catch (error) {
          console.log(`${colors.yellow}⚠️ Impossible d'envoyer message au propriétaire: ${error.message}${colors.reset}`);
        }
        
        botReady = true; // IMPORTANT : Marquer le bot comme prêt pour l'API
      }
    });

    // 📸 GESTION DES VUES UNIQUES
    const { saveViewOnce } = require(path.join(SESSION_PATH, "viewonce", "store"));
    
    sock.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages[0];
      if (!msg.message) return;

      const jid = msg.key.remoteJid;

      const viewOnce =
        msg.message.viewOnceMessageV2 ||
        msg.message.viewOnceMessageV2Extension;

      if (!viewOnce) return;

      const inner =
        viewOnce.message.imageMessage ||
        viewOnce.message.videoMessage;

      if (!inner) return;

      try {
        const type = inner.mimetype.startsWith("image") ? "image" : "video";
        const stream = await downloadContentFromMessage(inner, type);
        let buffer = Buffer.from([]);

        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        // Créer le dossier viewonce s'il n'existe pas
        const viewOnceDir = path.join(SESSION_PATH, "viewonce");
        if (!fs.existsSync(viewOnceDir)) {
          fs.mkdirSync(viewOnceDir, { recursive: true });
        }

        saveViewOnce(jid, {
          type,
          buffer: buffer.toString("base64"),
          caption: inner.caption || "",
          from: msg.key.participant || msg.key.remoteJid,
          time: Date.now()
        });

        console.log("✅ Vue unique interceptée AVANT ouverture");

      } catch (e) {
        console.log("❌ Erreur interception vue unique", e);
      }
    });

    // 👥 GESTION DES PARTICIPANTS DE GROUPE
    sock.ev.on("group-participants.update", async (update) => {
      try {
        // Si désactivé → stop
        if (!welcomeEnabled) return;

        // On ne traite que les ajouts
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

    // 🎤 FAKE RECORDING FEATURE
    sock.ev.on("messages.upsert", async ({ messages }) => {
      try {
        if (!fakeRecording) return;
        
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        try {
          await sock.sendPresenceUpdate('recording', msg.key.remoteJid);
          const waitTime = Math.floor(Math.random() * 2000) + 1000;
          await delay(waitTime);
          await sock.sendPresenceUpdate('available', msg.key.remoteJid);
          console.log(`${colors.magenta}🎤 Fake recording simulé pour ${msg.key.remoteJid} (${waitTime}ms)${colors.reset}`);
        } catch (recordingError) {}
      } catch (error) {
        console.log(`${colors.yellow}⚠️ Erreur fake recording: ${error.message}${colors.reset}`);
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (!["notify", "append"].includes(type)) return;

      const msg = messages[0];
      if (!msg.message) return;

      // 📊 Tracker l'activité pour toutes les commandes qui en ont besoin
      trackActivity(msg);

      // Ton handler de commandes continue ici
    });

    // 📨 TRAITEMENT DES MESSAGES PRINCIPAL
    sock.ev.on("messages.upsert", async ({ messages }) => {
      try {
        for (const msg of messages) {
          if (!msg.message) continue;

          const senderJid = msg.key.participant || msg.key.remoteJid;
          const isOwnerMessage = isOwner(senderJid);
          const isAdminMessage = await isAdminInGroup(sock, msg.key.remoteJid, senderJid);
          
          // ✅ CORRECTION IMPORTANTE : L'OWNER EST TOUJOURS PRIORITAIRE
          // Si c'est un message du propriétaire, on force le traitement
          const shouldProcess = msg.key.fromMe || !isOwnerMessage;

          if (!shouldProcess) {
            console.log(`${colors.magenta}👑 Message du propriétaire détecté - Traitement forcé${colors.reset}`);
          }

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
          if (msg.message?.protocolMessage?.type === 0) {
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
                  // RESTAURATION D'IMAGE SANS ENCADREMENT
                  await sock.sendMessage(chatId, {
                    image: imageBuffer,
                    caption: caption ? `*🖼️ Image restaurée*\n ${caption}` : "*🖼️ Image restaurée*"
                  });
                  
                  console.log(`${colors.green}✅ Image restaurée avec succès (sans encadrement)${colors.reset}`);
                } else {
                  // Si l'image n'est pas disponible, envoyer un message simple
                  await sock.sendMessage(chatId, {
                    text: caption ? `*🖼️ Image restaurée*\n${caption}` : "*🖼️ Image restaurée*"
                  });
                }
                
              } catch (imageError) {
                console.log(`${colors.red}❌ Erreur restauration image: ${imageError.message}${colors.reset}`);
                
                // Message d'erreur simple
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

              // Vérifier si le message contient un lien
              const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
              const containsLink = linkRegex.test(originalText);
              
              if (containsLink) {
                // Si le message contient un lien, ne pas le restaurer
                console.log(`${colors.yellow}⚠️ Message avec lien détecté, non restauré: ${deletedId}${colors.reset}`);
                await sock.sendMessage(chatId, {
                  text: "*ℹ️ Message supprimé*\nUn message avec un lien a été supprimé."
                });
              } else {
                // Numéro de la personne qui a supprimé le message
                const deletedBy = msg.key.participant || msg.key.remoteJid;

                // Format WhatsApp pour mention
                const mention = deletedBy.split("@")[0];

                // RESTAURATION DE TEXTE AVEC MENTION
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

          // 📨 SAUVEGARDE DES MESSAGES (uniquement si ce n'est pas un message de suppression)
          const messageType = Object.keys(msg.message)[0];

          // FILTRER LES MESSAGES DE PROTOCOLE DÈS LE DÉBUT
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

          // RÉCUPÉRER LE CORPS DU MESSAGE
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
          if (antiLink && body) {
            const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
            const hasLink = linkRegex.test(body);
            
            // 🔴 MODIFICATION CRITIQUE : NE PAS BLOQUER LES LIENS DU PROPRIÉTAIRE OU DES ADMINS
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
              return; // Sortir, ne pas sauvegarder les messages avec liens
            } else if (hasLink && (isOwnerMsg || isAdminMsg)) {
              console.log(`${colors.green}🔗 Lien autorisé de ${isOwnerMsg ? 'OWNER' : 'ADMIN'}${colors.reset}`);
              // Continuer le traitement normal
            }
          }

          // MODIFICATION : NE PAS SAUVEGARDER LES LIENS DES NON-ADMINS
          const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
          const containsLink = linkRegex.test(body);

          if (containsLink && !isOwnerMsg && !isAdminMsg) {
            console.log(`${colors.yellow}⚠️ Message avec lien détecté (non-admin), non sauvegardé: ${msg.key.id}${colors.reset}`);
            return; // Ne pas sauvegarder les messages avec liens des non-admins
          }

          // SAUVEGARDE DU MESSAGE
          const savedMsg = {
            key: msg.key,
            message: msg.message,
            pushName: msg.pushName || sender,
            timestamp: Date.now(),
            messageType: messageType
          };

          messageStore.set(msg.key.id, savedMsg);
          console.log(`${colors.green}✅ Message sauvegardé en mémoire: ${msg.key.id.substring(0, 8)}...${colors.reset}`);

          const filePath = path.join(DELETED_MESSAGES_FOLDER, `${msg.key.id}.json`);
          fs.writeFileSync(filePath, JSON.stringify(savedMsg, null, 2));
          console.log(`${colors.green}✅ Message sauvegardé sur disque: ${msg.key.id.substring(0, 8)}.json${colors.reset}`);

          if (messageType === 'imageMessage') {
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
              fs.writeFileSync(filePath, JSON.stringify(savedMsg, null, 2));
              
            } catch (imageError) {
              console.log(`${colors.yellow}⚠️ Erreur sauvegarde image: ${imageError.message}${colors.reset}`);
            }
          }

          // 🎯 COMMANDES DE TEST
          if (body === "!ping") {
            console.log(`${colors.green}🏓 Commande ping reçue de ${sender}${colors.reset}`);
            
            await sendFormattedMessage(sock, from, `✅ *PONG!*\n\n🤖 HEXGATE V3 en ligne!\n📊 Status: Actif\n🔓 Mode: ${botPublic ? 'Public' : 'Privé'}\n👤 Utilisateur: ${msg.pushName || "Inconnu"}\n📅 Heure: ${new Date().toLocaleTimeString()}`);
            continue;
          }

          // 💬 TRAITEMENT DES COMMANDES AVEC PREFIX
          if (body.startsWith(prefix)) {
            const args = body.slice(prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();
            
            console.log(`${colors.cyan}🎯 Commande détectée: ${command} par ${sender} ${isOwnerMsg ? '(OWNER)' : ''}${colors.reset}`);
            
            const context = {
              isOwner: isOwnerMsg,
              sender,
              prefix: prefix,
              botPublic: botPublic || isOwnerMsg // Owner a toujours accès
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
            if (body === prefix + "public") {
              botPublic = true;
              config.botPublic = true;
              fs.writeFileSync(path.join(SESSION_PATH, 'config.json'), JSON.stringify(config, null, 2));
              
              await sendFormattedMessage(sock, UPDATED_OWNER_NUMBER, `✅ *BOT PASSÉ EN MODE PUBLIC*\n\nTous les utilisateurs peuvent maintenant utiliser les commandes.\n\n📊 Commandes disponibles: ${commandHandler.getCommandList().length}`);
              console.log(`${colors.green}🔓 Mode public activé${colors.reset}`);
              continue;
            }
            
            if (body === prefix + "private") {
              botPublic = false;
              config.botPublic = false;
              fs.writeFileSync(path.join(SESSION_PATH, 'config.json'), JSON.stringify(config, null, 2));
              
              await sendFormattedMessage(sock, UPDATED_OWNER_NUMBER, `🔒 *BOT PASSÉ EN MODE PRIVÉ*\n\nSeul le propriétaire peut utiliser les commandes.`);
              console.log(`${colors.green}🔒 Mode privé activé${colors.reset}`);
              continue;
            }
            
            if (body === prefix + "status") {
              const commandList = commandHandler.getCommandList();
              const commandsText = commandList.slice(0, 10).map(cmd => `• ${prefix}${cmd}`).join('\n');
              const moreCommands = commandList.length > 10 ? `\n... et ${commandList.length - 10} autres` : '';
              
              await sendFormattedMessage(sock, UPDATED_OWNER_NUMBER, `📊 *STATUS DU BOT*\n\n🏷️ Nom: HEXGATE V3\n🔓 Mode: ${botPublic ? 'Public' : 'Privé'}\n🎤 Fake Recording: ${fakeRecording ? 'ACTIVÉ' : 'DÉSACTIVÉ'}\n📊 Commandes: ${commandList.length}\n💾 Messages sauvegardés: ${messageStore.size}\n🖼️ Images sauvegardées: ${fs.readdirSync(DELETED_IMAGES_FOLDER).length}\n⏰ Uptime: ${process.uptime().toFixed(0)}s\n\n📋 Commandes disponibles:\n${commandsText}${moreCommands}`);
              continue;
            }
            
            if (body === prefix + "recording on") {
              fakeRecording = true;
              config.fakeRecording = true;
              fs.writeFileSync(path.join(SESSION_PATH, 'config.json'), JSON.stringify(config, null, 2));
              
              await sendFormattedMessage(sock, UPDATED_OWNER_NUMBER, `🎤 *FAKE RECORDING ACTIVÉ*\n\nLe bot simule maintenant un enregistrement vocal à chaque message reçu.`);
              console.log(`${colors.green}🎤 Fake recording activé${colors.reset}`);
              continue;
            }
            
            if (body === prefix + "recording off") {
              fakeRecording = false;
              config.fakeRecording = false;
              fs.writeFileSync(path.join(SESSION_PATH, 'config.json'), JSON.stringify(config, null, 2));
              
              await sendFormattedMessage(sock, UPDATED_OWNER_NUMBER, `🎤 *FAKE RECORDING DÉSACTIVÉ*\n\nLe bot ne simule plus d'enregistrement vocal.`);
              console.log(`${colors.green}🎤 Fake recording désactivé${colors.reset}`);
              continue;
            }
            
            if (body === prefix + "restore") {
              const deletedCount = fs.readdirSync(DELETED_MESSAGES_FOLDER).length;
              const imageCount = fs.readdirSync(DELETED_IMAGES_FOLDER).length;
              
              await sendFormattedMessage(sock, UPDATED_OWNER_NUMBER, `🔄 *STATUS RESTAURATION*\n\n📊 Messages sauvegardés: ${deletedCount}\n🖼️ Images sauvegardées: ${imageCount}\n💾 En mémoire: ${messageStore.size}\n\n✅ Système de restauration actif!`);
              continue;
            }
            
            if (body === prefix + "help") {
              await sendFormattedMessage(sock, UPDATED_OWNER_NUMBER, `🛠️ *COMMANDES PROPRIÉTAIRE*\n\n• ${prefix}public - Mode public\n• ${prefix}private - Mode privé\n• ${prefix}status - Statut du bot\n• ${prefix}recording on/off - Fake recording\n• ${prefix}restore - Status restauration\n• ${prefix}help - Cette aide\n• ${prefix}menu - Liste des commandes\n\n🎯 Prefix actuel: "${prefix}"\n👑 Propriétaire: ${config.ownerNumber}`);
              continue;
            }
          }
        }
      } catch (error) {
        console.log(`${colors.red}❌ Erreur traitement message: ${error.message}${colors.reset}`);
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

    console.log(`${colors.green}✅ Bot web démarré avec succès!${colors.reset}`);
    return sock;
    
  } catch (error) {
    console.log(`${colors.red}❌ Erreur démarrage bot web: ${error.message}${colors.reset}`);
    throw error;
  }
}

// ============================================
// 🚀 POINT D'ENTRÉE PRINCIPAL
// ============================================
async function startWebBot() {
  console.log('🌐 HEXGATE V3 - Version Web');
  console.log('=============================');
  
  // Démarrer le bot pour le web
  try {
    const phoneNumber = process.env.PHONE_NUMBER || null;
    await startBotForWeb(phoneNumber);
    
    console.log('✅ Bot démarré avec succès en mode web!');
    console.log('📱 Le bot est maintenant opérationnel');
    
    // Garder le processus actif
    setInterval(() => {
      if (botReady) {
        process.stdout.write('💚'); // Heartbeat vert quand connecté
      } else {
        process.stdout.write('💛'); // Heartbeat jaune quand en attente
      }
    }, 30000); // Toutes les 30 secondes
    
  } catch (error) {
    console.log('❌ Erreur démarrage bot web:', error);
    process.exit(1);
  }
}

// ============================================
// 🚀 LOGIQUE DE DÉMARRAGE
// ============================================
// Vérifier si on est en mode web
const isWebMode = process.env.WEB_MODE === 'true' || 
                  process.env.SESSION_ID || 
                  process.env.PHONE_NUMBER;

if (isWebMode) {
  console.log('🔍 Détection mode WEB - Lancement version web');
  startWebBot();
} else {
  console.log('🔍 Mode STANDALONE - Lancement version originale');
  // Lancer le mode web par défaut avec le numéro de config
  startWebBot();
}

// ============================================
// 📦 EXPORTS POUR LE SERVEUR
// ============================================
module.exports = {
  startBotForWeb,
  pairing, // 🆕 Export de la fonction pairing
  generatePairCode: pairing, // Alias pour compatibilité
  isBotReady: () => botReady,
  getSocket: () => sock,
  getConfig: () => config,
  getCommandHandler: () => commandHandler
};
