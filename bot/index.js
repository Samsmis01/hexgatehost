// bot/index.js - VERSION COMPLÈTE QUI CHARGE VOS COMMANDES
// Import dynamique des commandes depuis le dossier commands/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

console.log('🔧 HEXGATE V3 - Mode Web avec Pairing Code BaileyJS');

// ============================================
// 🌈 COULEURS POUR LE TERMINAL
// ============================================
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bright: '\x1b[1m',
    dim: '\x1b[2m'
};

// ============================================
// 📦 IMPORTS BAILEYS
// ============================================
console.log('📥 Chargement des dépendances...');

// Variables globales pour le bot
let sock = null;
let botReady = false;

// ============================================
// 🔧 FONCTIONS POUR L'API SERVER.JS
// ============================================
export function isBotReady() {
    return botReady;
}

export async function generatePairCode(phone) {
    try {
        if (!sock || !botReady) {
            console.log(`${colors.red}❌ Bot non initialisé pour générer pair code${colors.reset}`);
            return null;
        }
        
        // Nettoyer le numéro
        const cleanPhone = phone.replace(/\D/g, '');
        const phoneWithCountry = cleanPhone.startsWith('243') ? cleanPhone : `243${cleanPhone}`;
        
        console.log(`${colors.cyan}📱 Génération pair code pour: ${phoneWithCountry}${colors.reset}`);
        
        // Générer le code de pairing
        const code = await sock.requestPairingCode(phoneWithCountry);
        
        if (code) {
            console.log(`${colors.green}✅ Pair code généré: ${code} pour ${phoneWithCountry}${colors.reset}`);
            console.log(`${colors.magenta}🎯🎯🎯 CODE DE PAIRING GÉNÉRÉ: ${code} 🎯🎯🎯${colors.reset}`);
            
            return code;
        }
        
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Erreur génération pair code: ${error.message}${colors.reset}`);
        return null;
    }
}

// ============================================
// 📁 CONFIGURATION
// ============================================
console.log('📦 Chargement configuration...');

let config = {};
try {
  if (fs.existsSync('./config.json')) {
    config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    console.log(`${colors.green}✅ Configuration chargée depuis config.json${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️ config.json non trouvé, création avec valeurs par défaut...${colors.reset}`);
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
    console.log(`${colors.green}✅ config.json créé avec valeurs par défaut${colors.reset}`);
  }
} catch (error) {
  console.log(`${colors.red}❌ Erreur chargement config.json: ${error.message}${colors.reset}`);
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

console.log(`${colors.cyan}📋 Configuration chargée:${colors.reset}`);
console.log(`  ${colors.green}•${colors.reset} Prefix: ${prefix}`);
console.log(`  ${colors.green}•${colors.reset} Owner: ${OWNER_NUMBER}`);
console.log(`  ${colors.green}•${colors.reset} Mode: ${botPublic ? 'Public' : 'Privé'}`);
console.log(`  ${colors.green}•${colors.reset} Fake Recording: ${fakeRecording ? 'Activé' : 'Désactivé'}`);

// ============================================
// 🎯 IMPORTS BAILEYS
// ============================================
let baileysModule;
try {
  baileysModule = await import('@whiskeysockets/baileys');
  console.log(`${colors.green}✅ BaileyJS chargé${colors.reset}`);
} catch (error) {
  console.log(`${colors.red}❌ Erreur chargement BaileyJS: ${error.message}${colors.reset}`);
  process.exit(1);
}

const {
  default: makeWASocket,
  useMultiFileAuthState,
  downloadContentFromMessage,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  delay
} = baileysModule;

const P = require("pino");
const { exec } = require("child_process");
const { Buffer } = require("buffer");

// Emojis pour réactions aléatoires
const randomEmojis = ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"];

// Variables globales
let processingMessages = new Set();
let lastDeletedMessage = new Map();
let antiLinkCooldown = new Map();
let botMessages = new Set();
let autoReact = true;

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

// Map pour stocker les messages en mémoire
const messageStore = new Map();

// Map pour stocker les vues uniques
const viewOnceStore = new Map();

// ============================================
// 🖼️ FONCTION DE FORMATAGE DES MESSAGES
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
// 📦 SYSTÈME DE COMMANDES - CORRIGÉ POUR ES6
// ============================================
class CommandHandler {
  constructor() {
    this.commands = new Map();
    this.commandsLoaded = false;
    this.loadBuiltinCommands(); // Commandes intégrées
    this.loadCommandsFromDirectory().then(() => {
      this.commandsLoaded = true;
      console.log(`${colors.green}✅ ${this.commands.size} commandes chargées${colors.reset}`);
    });
  }

  // CHARGEMENT DYNAMIQUE DES COMMANDES DEPUIS LE DOSSIER
  async loadCommandsFromDirectory() {
    const commandsDir = path.join(__dirname, 'commands');
    
    if (!fs.existsSync(commandsDir)) {
      console.log(`${colors.yellow}⚠️ Dossier commands non trouvé${colors.reset}`);
      return;
    }

    try {
      const files = fs.readdirSync(commandsDir);
      let loadedCount = 0;

      for (const file of files) {
        if (file.endsWith('.js')) {
          const commandPath = path.join(commandsDir, file);
          try {
            // IMPORT DYNAMIQUE pour ES6
            const commandModule = await import(`file://${commandPath}`);
            const command = commandModule.default || commandModule;
            
            if (command && command.name && typeof command.execute === 'function') {
              const commandName = command.name.toLowerCase();
              
              if (!this.commands.has(commandName)) {
                this.commands.set(commandName, command);
                console.log(`${colors.green}✅ Commande chargée: ${colors.cyan}${command.name}${colors.reset} (${file})`);
                loadedCount++;
              } else {
                console.log(`${colors.yellow}⚠️ Commande en doublon: ${command.name}${colors.reset}`);
              }
            }
          } catch (loadError) {
            console.log(`${colors.yellow}⚠️ Erreur chargement ${file}: ${loadError.message}${colors.reset}`);
          }
        }
      }
      
      console.log(`${colors.green}✅ ${loadedCount} commandes externes chargées${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}❌ Erreur scan dossier commands: ${error.message}${colors.reset}`);
    }
  }

  // COMMANDES INTÉGRÉES (votre code original)
  loadBuiltinCommands() {
    console.log(`${colors.cyan}📦 Chargement commandes intégrées...${colors.reset}`);
    
    // ===== HACK COMMAND =====
    this.commands.set("hack", {
      name: "hack",
      description: "Simulation réaliste de progression de hack",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;
        
        try {
          let progress = 0;
          let bar = "░░░░░░░░░░ 0%";
          
          const sent = await sock.sendMessage(from, { text: bar });
          const messageKey = sent.key;
          
          const interval = setInterval(async () => {
            progress += 5;
            if (progress > 100) progress = 100;
            
            const filled = Math.floor(progress / 10);
            const empty = 10 - filled;
            
            bar = "▓".repeat(filled) + "░".repeat(empty) + ` ${progress}%`;
            
            await sock.sendMessage(from, { text: bar }, { edit: messageKey });
            
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
          }, 400);
          
        } catch (err) {
          console.log("hack command error:", err);
          await sock.sendMessage(from, {
            text: "❌ Erreur lors de l'exécution du module hack"
          });
        }
      }
    });
    
    // ===== PING COMMAND =====
    this.commands.set("ping", {
      name: "ping",
      description: "Test de réponse du bot",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;
        const start = Date.now();
        const latency = Date.now() - start;
        
        await sendFormattedMessage(sock, from, `🏓 *PONG!*\n\n📡 Latence: ${latency}ms\n🤖 HEXGATE V1 - En ligne!\n👤 Envoyé par: ${msg.pushName || 'Inconnu'}`);
      }
    });
    
    // ===== MENU COMMAND =====
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
┃✰│➫ ${prefix}𝚊𝚍𝚍𝚘𝚠𝚗𝚎𝚛
┃✰│➫ ${prefix}𝚍𝚎𝚕𝚘𝚠𝚗𝚎𝚛
┃✰│➫ ${prefix}𝚌𝚘𝚗𝚏𝚒𝚐
┃✰│➫ ${prefix}𝚑𝚎𝚡𝚝𝚎𝚌𝚑
┃✰│➫ ${prefix}𝚏𝚊𝚔𝚎𝚌𝚊𝚕𝚕
┃✰│➫ ${prefix}𝚑𝚊𝚌𝚔
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

  *powered by HEXTECH™*\n
`;
        
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
    
    // ===== TAGALL COMMAND =====
    this.commands.set("tagall", {
      name: "tagall",
      description: "Mentionne tout le monde",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;
        
        if (!from.endsWith("@g.us")) {
          await sendFormattedMessage(sock, from, "❌ Commande utilisable uniquement dans un groupe");
          return;
        }
        
        try {
          const metadata = await sock.groupMetadata(from);
          const participants = metadata.participants || [];
          const mentions = participants.map(p => p.id);
          
          const text = args.length > 0 ? args.join(" ") : "📢 Mention à tous!";
          
          await sock.sendMessage(from, {
            text: text,
            mentions: mentions
          });
        } catch (error) {
          await sendFormattedMessage(sock, from, `❌ Erreur: ${error.message}`);
        }
      }
    });
    
    // ===== STATUS COMMAND =====
    this.commands.set("status", {
      name: "status",
      description: "Affiche le statut du bot",
      execute: async (sock, msg, args, context) => {
        const from = msg.key.remoteJid;
        
        await sendFormattedMessage(sock, from, `📊 *STATUT BOT*\n\n🤖 HEXGATE V1\n🔓 Mode: ${botPublic ? 'Public' : 'Privé'}\n🎤 Fake Recording: ${fakeRecording ? 'ACTIVÉ' : 'DÉSACTIVÉ'}\n📂 Messages sauvegardés: ${messageStore.size}\n📁 Commandes chargées: ${this.commands.size}`);
      }
    });
    
    console.log(`${colors.green}✅ Commandes intégrées chargées${colors.reset}`);
  }

  async execute(commandName, sock, msg, args, context) {
    const cmd = commandName.toLowerCase();
    
    if (!this.commands.has(cmd)) {
      console.log(`${colors.yellow}⚠️ Commande inconnue: ${cmd}${colors.reset}`);
      return false;
    }
    
    const command = this.commands.get(cmd);
    
    try {
      console.log(`${colors.cyan}⚡ Exécution: ${cmd} par ${msg.pushName || 'Inconnu'}${colors.reset}`);
      
      // Réaction emoji
      if (autoReact) {
        try {
          const randomEmoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)];
          await sock.sendMessage(msg.key.remoteJid, {
            react: { text: randomEmoji, key: msg.key }
          });
        } catch (e) {}
      }
      
      await command.execute(sock, msg, args, context);
      console.log(`${colors.green}✅ Commande exécutée: ${cmd}${colors.reset}`);
      return true;
      
    } catch (error) {
      console.log(`${colors.red}❌ Erreur ${cmd}: ${error.message}${colors.reset}`);
      
      try {
        await sendFormattedMessage(sock, msg.key.remoteJid, `❌ *ERREUR*\n\nCommande: ${cmd}\nErreur: ${error.message}`);
      } catch (e) {}
      
      return false;
    }
  }

  getCommandList() {
    return Array.from(this.commands.keys());
  }
}

// ============================================
// 🚀 FONCTION PRINCIPALE DU BOT
// ============================================
async function startBot() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    // 📊 Affichage banner
    console.log(`
${colors.magenta}╔══════════════════════════════════════════════════╗
║${colors.bright}${colors.cyan}         WHATSAPP BOT - HEXGATE WEB MODE          ${colors.reset}${colors.magenta}║
╠══════════════════════════════════════════════════╣
║${colors.green} ✅ MODE WEB - PAIRING CODE SERVER.JS           ${colors.magenta}║
║${colors.green} ✅ RESTAURATION MESSAGES SUPPRIMÉS             ${colors.magenta}║
║${colors.green} ✅ SYSTEME DE COMMANDES COMPLET                ${colors.magenta}║
╚══════════════════════════════════════════════════╝${colors.reset}
`);

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
      
      // 🎯 MODE WEB : Détection QR = Génération Pairing Code
      if (qr) {
        console.log(`${colors.yellow}📱 QR Code détecté (mode pairing)${colors.reset}`);
        
        let phoneNumber = process.env.PHONE_NUMBER || '';
        
        if (!phoneNumber || phoneNumber.length < 8) {
          console.log(`${colors.red}❌ Numéro non fourni dans PHONE_NUMBER${colors.reset}`);
          return;
        }

        // 🎯 GÉNÉRATION DU PAIRING CODE
        try {
          console.log(`${colors.yellow}🔄 Génération pairing code pour ${phoneNumber}...${colors.reset}`);
          
          const code = await sock.requestPairingCode(phoneNumber);
          
          console.log(`\n${colors.magenta}╔══════════════════════════════════════════════════╗${colors.reset}`);
          console.log(`${colors.magenta}║${colors.green}          PAIRING CODE GÉNÉRÉ !              ${colors.magenta}║${colors.reset}`);
          console.log(`${colors.magenta}╠══════════════════════════════════════════════════╣${colors.reset}`);
          console.log(`${colors.magenta}║${colors.cyan} 📱 Numéro: ${phoneNumber.padEnd(30)} ${colors.magenta}║${colors.reset}`);
          console.log(`${colors.magenta}║${colors.yellow} 🔑 Code: ${code.padEnd(31)} ${colors.magenta}║${colors.reset}`);
          console.log(`${colors.magenta}╚══════════════════════════════════════════════════╝${colors.reset}`);
          
          // 🔥 FORMAT DÉTECTÉ PAR SERVER.JS
          console.log(`\n${colors.green}🎯🎯🎯 CODE DE PAIRING GÉNÉRÉ: ${code} 🎯🎯🎯${colors.reset}`);
          
          await delay(3000);
          
        } catch (pairError) {
          console.log(`${colors.red}❌ Erreur pairing: ${pairError.message}${colors.reset}`);
        }
      }
      
      if (connection === "close") {
        const reason = new Error(lastDisconnect?.error)?.output?.statusCode;
        if (reason === DisconnectReason.loggedOut) {
          console.log(`${colors.red}❌ Déconnecté, suppression auth...${colors.reset}`);
          exec("rm -rf auth_info_baileys", () => {
            console.log(`${colors.yellow}🔄 Redémarrage...${colors.reset}`);
            setTimeout(startBot, 3000);
          });
        } else {
          console.log(`${colors.yellow}🔄 Reconnexion...${colors.reset}`);
          setTimeout(startBot, 5000);
        }
      } else if (connection === "open") {
        console.log(`${colors.green}✅✅✅ CONNECTÉ À WHATSAPP!${colors.reset}`);
        botReady = true;
        
        // Envoyer confirmation
        try {
          await sock.sendMessage(OWNER_NUMBER, { 
            text: `✅ *HEX-GATE CONNECTÉE*\n\n🚀 Bot en ligne!\n📊 Commandes: ${commandHandler.getCommandList().length}\n🔧 Mode: ${botPublic ? 'PUBLIC' : 'PRIVÉ'}`
          });
        } catch (error) {}
      }
    });

    // ============================================
    // 📨 TRAITEMENT DES MESSAGES SUPPRIMÉS
    // ============================================
    sock.ev.on("messages.upsert", async ({ messages }) => {
      try {
        for (const msg of messages) {
          if (!msg.message) continue;

          // 🔍 DÉTECTION MESSAGE SUPPRIMÉ
          if (msg.message?.protocolMessage?.type === 0) {
            const deletedKey = msg.message.protocolMessage.key;
            const deletedId = deletedKey.id;
            const chatId = deletedKey.remoteJid || msg.key.remoteJid;

            console.log(`${colors.magenta}🚨 SUPPRESSION DÉTECTÉE: ${deletedId}${colors.reset}`);

            let originalMsg = messageStore.get(deletedId);
            
            if (!originalMsg) {
              const filePath = path.join(DELETED_MESSAGES_FOLDER, `${deletedId}.json`);
              if (fs.existsSync(filePath)) {
                try {
                  originalMsg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                } catch (e) {
                  originalMsg = null;
                }
              }
            }

            if (originalMsg) {
              const messageType = originalMsg.messageType || Object.keys(originalMsg.message)[0];
              
              // 🖼️ RESTAURATION D'IMAGE
              if (messageType === 'imageMessage') {
                try {
                  let imageBuffer = null;
                  let caption = originalMsg.message?.imageMessage?.caption || "";
                  
                  const imagePath = path.join(DELETED_IMAGES_FOLDER, `${deletedId}.jpg`);
                  if (fs.existsSync(imagePath)) {
                    imageBuffer = fs.readFileSync(imagePath);
                  }
                  
                  if (imageBuffer) {
                    await sock.sendMessage(chatId, {
                      image: imageBuffer,
                      caption: caption ? `*🖼️ Image restaurée*\n ${caption}` : "*🖼️ Image restaurée*"
                    });
                  }
                } catch (imageError) {}
              } else {
                // 📝 RESTAURATION DE TEXTE
                const originalText =
                  originalMsg.message?.conversation ||
                  originalMsg.message?.extendedTextMessage?.text ||
                  originalMsg.message?.imageMessage?.caption ||
                  "[Message]";

                const deletedBy = msg.key.participant || msg.key.remoteJid;
                const mention = deletedBy.split("@")[0];

                await sock.sendMessage(chatId, {
                  text: `*𝙼𝚎𝚜𝚜𝚊𝚐𝚎 𝚜𝚞𝚙𝚙𝚛𝚒𝚖𝚎𝚛 𝚍𝚎:*@${mention}\n\n${originalText}`,
                  mentions: [deletedBy]
                });
              }
            }
            return;
          }

          // 💾 SAUVEGARDE DU MESSAGE
          const messageType = Object.keys(msg.message)[0];
          if (messageType === "protocolMessage") return;

          const from = msg.key.remoteJid;
          const sender = msg.key.participant || msg.key.remoteJid;

          // Récupérer le texte
          let body = "";
          if (messageType === "conversation") {
            body = msg.message.conversation;
          } else if (messageType === "extendedTextMessage") {
            body = msg.message.extendedTextMessage.text;
          } else if (messageType === "imageMessage") {
            body = msg.message.imageMessage?.caption || "";
          } else {
            continue;
          }

          // SAUVEGARDE
          const savedMsg = {
            key: msg.key,
            message: msg.message,
            pushName: msg.pushName || sender,
            timestamp: Date.now(),
            messageType: messageType
          };

          messageStore.set(msg.key.id, savedMsg);
          
          const filePath = path.join(DELETED_MESSAGES_FOLDER, `${msg.key.id}.json`);
          fs.writeFileSync(filePath, JSON.stringify(savedMsg, null, 2));

          // SAUVEGARDE IMAGE
          if (messageType === 'imageMessage') {
            try {
              const imageMsg = msg.message.imageMessage;
              const stream = await downloadContentFromMessage(imageMsg, 'image');
              let buffer = Buffer.from([]);
              
              for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
              }
              
              const imagePath = path.join(DELETED_IMAGES_FOLDER, `${msg.key.id}.jpg`);
              fs.writeFileSync(imagePath, buffer);
              
            } catch (e) {}
          }

          // 🎯 TRAITEMENT DES COMMANDES
          if (body.startsWith(prefix)) {
            const args = body.slice(prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();
            
            const context = {
              isOwner: sender === OWNER_NUMBER,
              sender,
              prefix: prefix,
              botPublic: botPublic || (sender === OWNER_NUMBER)
            };
            
            if (botPublic || sender === OWNER_NUMBER) {
              await commandHandler.execute(command, sock, msg, args, context);
            }
          }
        }
      } catch (error) {
        console.log(`${colors.red}❌ Erreur traitement: ${error.message}${colors.reset}`);
      }
    });

    // 🎤 FAKE RECORDING
    sock.ev.on("messages.upsert", async ({ messages }) => {
      if (!fakeRecording) return;
      
      const msg = messages[0];
      if (!msg.message || msg.key.fromMe) return;

      try {
        await sock.sendPresenceUpdate('recording', msg.key.remoteJid);
        await delay(Math.random() * 2000 + 1000);
        await sock.sendPresenceUpdate('available', msg.key.remoteJid);
      } catch (e) {}
    });

  } catch (error) {
    console.log(`${colors.red}❌ Erreur démarrage: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// ============================================
// 🚀 DÉMARRAGE
// ============================================
startBot().catch(error => {
  console.log(`${colors.red}❌ Échec démarrage: ${error.message}${colors.reset}`);
  process.exit(1);
});

// ============================================
// 📦 EXPORTS POUR SERVER.JS
// ============================================
export { 
  startBot, 
  generatePairCode, 
  isBotReady, 
  sock as botSocket,
  config 
};
