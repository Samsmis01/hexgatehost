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
let  botPublic  =  config . botPublic  ||   true;let welcomeEnabled = false; // État initial de la commande
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
// Exemple de comment les commandes sont généralement chargées :
const commands = {
  // ... autres commandes ...
  close: require('./commands/close'),
  // ... autres commandes ...
};
const P = require("pino");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { exec } = require("child_process");
const { Buffer } = require("buffer");
// Dans votre configuration, assurez-vous d'avoir :
const OWNER = ["243816107573@s.whatsapp.net"];

function isOwner(sender) {
    return sender === "243816107573@s.whatsapp.net" || 
           sender.endsWith("243816107573@s.whatsapp.net");
}
// ==================== CONFIGURATION OWNER DYNAMIQUE ====================

// ⚡ VARIABLES POUR L'API (Nouveau)
let sock = null; // Socket accessible globalement
let botReady = false; // État du bot
let pairingCodes = new Map(); // Stockage des codes temporaires

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
    
    // Nettoyer le numéro
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('243') ? cleanPhone : `243${cleanPhone}`;
    
    console.log(`📱 Génération pair code pour: ${phoneWithCountry}`);
    
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
      
      console.log(`✅ Pair code généré: ${code} pour ${phoneWithCountry}`);
      return code;
    }
    
    return null;
  } catch (error) {
    console.log(`❌ Erreur génération pair code: ${error.message}`);
    return null;
  }
}

// Fonction pour trouver le bot dans les participants
function findBotParticipant(participants, botJid) {
  // Essayer plusieurs formats de JID
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
let autoReact = true; // Variable autoReact manquante

// Après avoir créé sock

// Map pour stocker les messages en mémoire
const messageStore = new Map();

// Map pour stocker les vues uniques
const viewOnceStore = new Map();

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
    this.initializeCommands(); // CHANGEMENT ICI : initialize au lieu de load
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
const fs = require('fs');
const path = require('path');

const SCORES_FILE = path.join(__dirname, 'quiz_scores.json');
const ADULT_SCORES_FILE = path.join(__dirname, 'adult_scores.json');
const WELCOME_IMAGE = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT1rSLNK-m4qdO7GttYGfS0NAtqk4U1i3_kTZ_Z-vAbyrTKMhY4Po11FqhM&s=10";
const THUMBNAIL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT1rSLNK-m4qdO7GttYGfS0NAtqk4U1i3_kTZ_Z-vAbyrTKMhY4Po11FqhM&s=10";

let scores = {};
let adultScores = {};
const MAX_PARTICIPANTS = 50;
let groupQuizzes = {};
let activeQuizzes = {};

// Charger les scores
if (fs.existsSync(SCORES_FILE)) {
    try { scores = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8')); } catch (e) { scores = {}; }
}
if (fs.existsSync(ADULT_SCORES_FILE)) {
    try { adultScores = JSON.parse(fs.readFileSync(ADULT_SCORES_FILE, 'utf8')); } catch (e) { adultScores = {}; }
}

function saveScores() {
    fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
    fs.writeFileSync(ADULT_SCORES_FILE, JSON.stringify(adultScores, null, 2));
}

const questions = {
 histoire: [
    {
        question: "Quand les premiers dinosaures sont-ils apparus ?",
        options: ["a. Il y a 65 millions d'années", "b. Il y a 230 millions d'années", "c. Il y a 500 millions d'années"],
        answer: 'b',
        explanation: "Trias supérieur. Bien avant que l'idée de Jésus traverse un cerveau humain."
    },
    {
        question: "Quelle était la plus ancienne civilisation d'Afrique ?",
        options: ["a. Égypte", "b. Nubie", "c. Empire du Mali"],
        answer: 'b',
        explanation: "La Nubie rivalisait avec l'Égypte. L'Afrique, c'est pas que des tribus, bande d'ignorants."
    },
    {
        question: "Quand l'univers est-il né selon le Big Bang ?",
        options: ["a. Il y a 6000 ans", "b. Il y a 13.8 milliards d'années", "c. Il a toujours existé"],
        answer: 'b',
        explanation: "Preuve : fond diffus cosmologique. Désolé pour les créationnistes, les chiffres sont têtus."
    },
    {
        question: "Lequel de ces ossements a révolutionné la paléoanthropologie ?",
        options: ["a. Lucy", "b. Néandertal de La Chapelle", "c. Toumaï"],
        answer: 'a',
        explanation: "Lucy (Australopithèque) a montré qu'on marchait debout avant que le cerveau grossisse."
    },
    {
        question: "Quelle était la première forme de vie sur Terre ?",
        options: ["a. Algues", "b. Bactéries", "c. Virus"],
        answer: 'b',
        explanation: "Stromatolites, il y a 3.5 milliards d'années. Pas d'âme, juste de la chimie qui se réplique."
    },
    {
        question: "Quand les humains ont-ils quitté l'Afrique ?",
        options: ["a. Il y a 1 million d'années", "b. Il y a 200 000 ans", "c. Il y a 70 000 ans"],
        answer: 'c',
        explanation: "Grande migration. Toute l'humanité est africaine, bande de racistes."
    },
    {
        question: "Quelle extinction massive a tué les dinosaures ?",
        options: ["a. Permien", "b. Crétacé", "c. Dévonien"],
        answer: 'b',
        explanation: "Astéroïde de Chicxulub. Un coup de bol cosmique qui a permis aux mammifères (nous) de prospérer."
    },
    {
        question: "L'âge de pierre a-t-il coexisté avec les pyramides ?",
        options: ["a. Oui, selon les régions", "b. Non, c'est bien avant", "c. Les deux, bordel de merde"],
        answer: 'a',
        explanation: "Pendant que les Égyptiens bâtissaient, certains peuples étaient encore au néolithique. Progrès inégal."
    },
    {
        question: "Quelle découverte a prouvé que les humains préhistoriques faisaient de l'art ?",
        options: ["a. Lascaux", "b. Vénus de Willendorf", "c. Les deux, bande d'incultes"],
        answer: 'c',
        explanation: "Il y a 40 000 ans, on dessinait déjà des bites sur les murs. Certaines choses ne changent pas."
    },
    {
        question: "Quand les premiers outils ont-ils été fabriqués ?",
        options: ["a. 2 millions d'années", "b. 500 000 ans", "c. 10 000 ans"],
        answer: 'a',
        explanation: "Homo habilis. Avant même qu'on soit vraiment humains, on savait déjà casser des cailloux."
    },
    {
        question: "Les Néandertaliens avaient-ils une culture ?",
        options: ["a. Non, des brutes", "b. Oui, enterrements et outils", "c. On s'en fout, ils sont morts"],
        answer: 'b',
        explanation: "Ils enterraient leurs morts, faisaient des bijoux. On les a probablement butés et baisés (ADN le prouve)."
    },
    {
        question: "Quand le feu a-t-il été domestiqué ?",
        options: ["a. 1 million d'années", "b. 400 000 ans", "c. Par Prométhée, connard"],
        answer: 'b',
        explanation: "Homo erectus. Le premier barbecue, et surtout, protection contre les prédateurs."
    },
    {
        question: "Quelle est la plus ancienne ville connue ?",
        options: ["a. Jéricho", "b. Çatal Höyük", "c. Ur"],
        answer: 'a',
        explanation: "Vers -9000. Les gens se sont dit 'Putain, marre de être nomades, construisons des murs'."
    },
    {
        question: "Les mammouths ont-ils connu les pyramides ?",
        options: ["a. Oui, certains survivants", "b. Non, extinction bien avant", "c. Seulement en Sibérie"],
        answer: 'a',
        explanation: "Derniers sur l'île Wrangel jusqu'à -1650. Donc oui, contemporains des Égyptiens. L'histoire est ouf."
    },
    {
        question: "Quand l'écriture est-elle née ?",
        options: ["a. -5000", "b. -3200", "c. -1000"],
        answer: 'b',
        explanation: "Sumer, Mésopotamie. D'abord pour compter le bétail (la bureaucratie, fléau éternel)."
    },
    {
        question: "Les Vikings ont-ils découvert l'Amérique avant Colomb ?",
        options: ["a. Oui, de 500 ans", "b. Non, mytho", "c. Peut-être, mais ils s'en sont tapé"],
        answer: 'a',
        explanation: "Leif Erikson vers l'an 1000. Vinland. Mais pas de putain d'or, donc ils ont laissé tomber."
    },
    {
        question: "Quelle civilisation a inventé le zéro ?",
        options: ["a. Grecs", "b. Indiens", "c. Mayas"],
        answer: 'b',
        explanation: "Inde, vers le Ve siècle. Révolution mathématique. Merci à ces génies qui comprenaient le néant."
    },
    {
        question: "L'âge de bronze a-t-il été une révolution ?",
        options: ["a. Oui, armes et outils", "b. Non, mineur", "c. Ça a surtout créé des empires belliqueux"],
        answer: 'c',
        explanation: "Qui contrôle le bronze contrôle l'armée. Début de la grosse merde : empires, esclavage, guerres."
    },
    {
        question: "Quand les humains ont-ils domestiqué le chien ?",
        options: ["a. -40 000", "b. -15 000", "c. -5000"],
        answer: 'a',
        explanation: "Du loup au toutou. Meilleure décision évolutive : compagnie + aide à la chasse."
    },
    {
        question: "Les pyramides ont-elles été construites par des esclaves ?",
        options: ["a. Oui, comme dans la Bible", "b. Non, ouvriers payés", "c. Des deux, bande de naïfs"],
        answer: 'b',
        explanation: "Preuves archéologiques : villages d'ouvriers avec soins médicaux et bière. Mythe biblique déconstruit."
    },
    {
        question: "Quelle pandémie a tué le tiers de l'Europe médiévale ?",
        options: ["a. Peste noire", "b. Variole", "c. Choléra"],
        answer: 'a',
        explanation: "1347-1351. Mort, désespoir, et montée des théories du complot (les juifs, bien sûr)."
    },
    {
        question: "L'empire romain a-t-il vraiment chuté en 476 ?",
        options: ["a. Oui", "b. Non, continuation à Byzance", "c. Chute lente sur des siècles"],
        answer: 'b',
        explanation: "Byzance = empire romain d'Orient jusqu'en 1453. L'Occident était juste la branche décadente."
    },
    {
        question: "Quand l'agriculture est-elle née ?",
        options: ["a. -12 000", "b. -8 000", "c. -5 000"],
        answer: 'a',
        explanation: "Révolution néolithique. On est passé de chasseurs-cueilleurs libres à paysans sédentaires et… taxes."
    },
    {
        question: "Les templiers étaient-ils hérétiques ?",
        options: ["a. Oui", "b. Non, victimes du roi", "c. Ils pratiquaient des trucs bizarres"],
        answer: 'b',
        explanation: "Philippe le Bel voulait leur fric. Accusations fabriquées. Le pouvoir et l'argent, éternelle histoire."
    },
    {
        question: "Quelle découverte a prouvé l'âge de la Terre ?",
        options: ["a. Fossiles", "b. Radioactivité", "c. Couches géologiques"],
        answer: 'b',
        explanation: "Datation uranium-plomb. 4.5 milliards d'années. Désolé créationnistes, vos 6000 ans c'est de la connerie."
    },
    {
        question: "Les femmes préhistoriques chassaient-elles ?",
        options: ["a. Non, cueillette", "b. Oui, preuves récentes", "c. Seulement les femmes enceintes"],
        answer: 'b',
        explanation: "Squelettes avec armes. Mythe de l'homme chasseur/femme cueilleuse : probablement de la merde patriarcale."
    },
    {
        question: "Quand la dernière période glaciaire s'est-elle terminée ?",
        options: ["a. -50 000 ans", "b. -12 000 ans", "c. -5 000 ans"],
        answer: 'b',
        explanation: "Holocène. Réchauffement qui a permis l'agriculture. Le changement climatique nous a créés."
    },
    {
        question: "L'Atlantide a-t-elle existé ?",
        options: ["a. Oui, Platon l'a dit", "b. Non, allégorie", "c. Basée sur la Crète minoenne"],
        answer: 'c',
        explanation: "Théorie : éruption de Santorin vers -1600 qui a détruit la civilisation minoenne. Réel transformé en mythe."
    }
],
sciences: [
    {
        question: "Si une IA devient consciente, devra-t-on lui donner des droits humains ?",
        options: ["a. Bien sûr, ce serait un être vivant", "b. Non, c'est juste du code", "c. Seulement si elle paie des impôts"],
        answer: 'a',
        explanation: "Putain, ça va devenir compliqué. Certains philosophes disent que la conscience artificielle mérite protection."
    },
    {
        question: "tu attends quoi pour donner ta vie à jesus christ",
        options: ["a. je me sens pas pret", "b. je ne crois pas en lui", "c. je l'ai deja reçu, est sa grâce me suffit "],
        answer: 'c',
        explanation: "suivante"
    },
    {
        question: "Combien de temps avant que l'humanité crève à cause du réchauffement ?",
        options: ["a. 50 ans", "b. 100 ans", "c. On survivra mais dans la merde"],
        answer: 'c',
        explanation: "On va pas s'éteindre comme des dinos, mais les guerres pour l'eau et la bouffe vont être hardcore."
    },
    {
        question: "Pourquoi les jeunes d'aujourd'hui préfèrent Netflix à Jésus ?",
        options: ["a. Netflix est plus fun", "b. cette generation on endurci leurs coeurs", "c. il se disent qu'ils ont encore du temps pour se repentir"],
        answer: 'b',
        explanation: "le royaume de cieux est proche repentez vous , donne ta vue a jesus"
    },
    {
        question: "Quelle molécule fait planer mieux que la prière ?",
        options: ["a. LSD", "b. DMT", "c. Les deux, selon Terence McKenna"],
        answer: 'c',
        explanation: "Des visions cosmiques comparables aux expériences mystiques, mais sans dieu."
    },
    {
        question: "Si on clone un humain, son âme sera-t-elle copiée aussi ?",
        options: ["a. Oui", "b. Non", "c. Quelle âme ? On est juste de la viande"],
        answer: 'c',
        explanation: "Science : c'est le même ADN. Religion : y'a qu'une âme. Conclusion : bordel métaphysique."
    },
  
    {
        question: "Pourquoi l'évolution a-t-elle créé l'orgasme féminin ?",
        options: ["a. Pour le plaisir", "b. Pour renforcer le couple", "c. Aucune putain d'idée"],
        answer: 'c',
        explanation: "Même Darwin était perplexe. Certains pensent que c'était utile jadis pour synchroniser l'ovulation."
    },
    {
        question: "Quelle drogue naturelle est la plus proche d'une expérience mystique ?",
        options: ["a. Psilocybine (champignons)", "b. Ayahuasca", "c. Les deux, elles ouvrent les portes de la perception"],
        answer: 'c',
        explanation: "Utilisées depuis des millénaires pour parler aux 'esprits'. Aujourd'hui étudiées en neurosciences."
    },
    {
        question: "pourquoi ne donne tu pas ta vie à jesus christ ?",
        options: ["a. je me sens pas pret", "b. je suis musulman", "c. je l'ai deja reçu est cette une grâce "],
        answer: 'a',
        explanation: "ohh!! génèration au cœur endurci et pervers ne voyez vous pas que la fin à deja commencer ?, soyez vigilant car la ww3 arrive repentez vous"
    },
    {
        question: "Pourquoi les gens croient aux horoscopes mais pas à la science ?",
        options: ["a. C'est plus rassurant", "b. La science est compliquée", "c. Notre cerveau adore les patterns même faux"],
        answer: 'c',
        explanation: "Biais cognitif de base : on voit des liens partout. Et Mercure en rétrograde explique tout, merde."
    },
    {
        question: "La réalité est-elle une simulation comme dans Matrix ?",
        options: ["a. Probable", "b. Impossible à prouver", "c. Et si on est les NPC de quelqu'un ?"],
        answer: 'b',
        explanation: "Elon Musk y croit. Mais si c'est vrai, les programmeurs sont sadiques avec toute cette souffrance."
    },
    {
        question: "Quel pourcentage de la population est trop con pour comprendre la science ?",
        options: ["a. 30%", "b. 50%", "c. Suffisamment pour élire des abrutis"],
        answer: 'c',
        explanation: "Désolé pour la vulgarité, mais regardez les statistiques sur la croyance à la Terre plate."
    },
    {
        question: "Les animaux ont-ils une âme selon la science ?",
        options: ["a. Non, c'est un concept religieux", "b. Oui, ils ont une conscience", "c. Mon chat en a une, c'est sûr"],
        answer: 'b',
        explanation: "Les éthologues prouvent qu'ils ont émotions, conscience de soi et même culture. Désolé Descartes."
    },
    {
        question: "Pourquoi le cerveau humain est-il si bon pour croire à de la merde ?",
        options: ["a. Évolution : mieux vaut croire à un faux danger", "b. Confort psychologique", "c. Les deux, bordel"],
        answer: 'c',
        explanation: "Mécanisme de survie devenu un bug dans la société moderne. Merci l'évolution."
    },
   
    {
        question: "La pornographie en ligne a-t-elle modifié notre cerveau ?",
        options: ["a. Oui, sa nous detruit ", "b. Non, c'est naturel", "c. On devient tous des addicts"],
        answer: 'a',
        explanation: "destruction physique et spirutuellement arrete de frapper ahoco"
    },
    {
        question: "Pourquoi les riches veulent-ils devenir immortels via la tech ?",
        options: ["a. Peur de la mort", "b. Ego surdimensionné", "c. Ils ont les moyens de jouer aux dieux"],
        answer: 'c',
        explanation: "Transhumanisme : le nouveau projet des milliardaires qui ne veulent pas lâcher leur fric."
    },
    {
        question: "Les réseaux sociaux sont-ils une expérience de contrôle mental ?",
        options: ["a. Non, c'est juste du business", "b. Oui, façon douce", "c. On est des rats dans leur labo"],
        answer: 'b',
        explanation: "Algorithmes qui exploitent nos biais + bulles de filtres = lavage de cerveau 2.0."
    },
    {
        question: "La méditation a-t-elle des effets prouvés scientifiquement ?",
        options: ["a. Oui, modification du cerveau", "b. Non, placebo", "c. Mieux que certains médicaments"],
        answer: 'a',
        explanation: "IRM le montre : plus de matière grise, moins de stress. Le cerveau se reconfigure, bande de sceptiques."
    },
    {
        question: "Pourquoi tant de scientifiques croient-ils en Dieu ?",
        options: ["a. Confort existentiel", "b. L'ordre de l'univers les impressionne", "c. Ils séparent science et foi"],
        answer: 'c',
        explanation: "Einstein croyait en un 'dieu' spinozien, pas personnel. La science n'a pas réponse à tout."
    },
    {
        question: "Le libre arbitre existe-t-il ou on suit juste notre programmation ?",
        options: ["a. Il existe", "b. Illusion utile", "c. Question de définition, merde"],
        answer: 'b',
        explanation: "Neurosciences : le cerveau décide avant qu'on en ait conscience. Désolé pour votre illusion d'autonomie."
    },
    {
        question: "Les psychédéliques devraient-ils remplacer les antidépresseurs ?",
        options: ["a. Oui, études prometteuses", "b. Non, trop dangereux", "c. Sous contrôle médical, pourquoi pas ?"],
        answer: 'c',
        explanation: "MDMA pour PTSD, psilocybine pour dépression résistante. La révolution psychédélique arrive."
    },
    {
        question: "Pourquoi l'univers a-t-il des lois si parfaites ?",
        options: ["a. Hasard", "b. Multivers : on est dans celui qui fonctionne", "c. Design intelligent (oups)"],
        answer: 'b',
        explanation: "Anthropique : si les constantes étaient différentes, on serait pas là pour en parler."
    },
    {
        question: "La morale peut-elle être expliquée par la biologie ?",
        options: ["a. Oui, évolution de la coopération", "b. Non, c'est divin", "c. C'est compliqué, comme d'hab"],
        answer: 'a',
        explanation: "Aider son groupe = meilleure survie. La morale : un putain de bon calcul évolutif."
    },
    {
        question: "Les rêves sont-ils des messages ou du cerveau qui décharge ?",
        options: ["a. Messages de l'inconscient", "b. Défragmentation cérébrale", "c. Les deux peuvent être vrais"],
        answer: 'b',
        explanation: "Théorie dominante : tri des infos + consolidation mémoire. Désolé Freud, c'est moins poétique."
    },
    {
        question: "Pourquoi certaines personnes aiment-elles la douleur ?",
        options: ["a. Libération d'endorphines", "b. Contrôle sur son corps", "c. Fétichisme de base"],
        answer: 'a',
        explanation: "Le BDSM, c'est de la chimie : douleur = endorphines = plaisir. Le cerveau est tordu."
    },
    {
        question: "La mort est-elle nécessaire biologiquement ?",
        options: ["a. Oui, pour l'évolution", "b. Non, on pourrait être immortels", "c. La nature s'en fout de nous"],
        answer: 'a',
        explanation: "Renouvellement des générations = adaptation. Sinon on serait toujours des bactéries."
    },
    {
        question: "Les émotions sont-elles utiles ou un bug évolutif ?",
        options: ["a. Utiles : guide de survie", "b. Bug qu'on devrait corriger", "c. Les deux, bordel"],
        answer: 'a',
        explanation: "Peur = fuir le danger. Amour = protéger la progéniture. Même la dépression aurait eu une fonction."
    },
    {
        question: "Pourquoi le cerveau crée-t-il des expériences de mort imminente ?",
        options: ["a. Dernier shoot de neurotransmetteurs", "b. Préparation à l'après", "c. Bug du système en shutdown"],
        answer: 'a',
        explanation: "DMT endogène + manque d'oxygène = trip cosmique final. Pas de ciel, juste de la chimie, désolé."
    }
],

maturite: [
    {
        question: "À quel âge moyen les filles connaissent-elles leurs premières règles ?",
        options: ["a. 10-12 ans", "b. 13-15 ans", "c. 16-18 ans"],
        answer: 'b',
        explanation: "La puberté survient généralement entre 13 et 15 ans, mais varie selon les individus."
    },
    {
        question: "Qu'est-ce que le consentement sexuel ?",
        options: ["a. Un accord tacite", "b. Un oui enthousiaste et réversible", "c. Une obligation légale"],
        answer: 'b',
        explanation: "Le consentement doit être clair, enthousiaste et peut être retiré à tout moment."
    },
    {
        question: "Comment gérer les déséquilibres dans un couple où l'homme reste au foyer ?",
        options: ["a. Ignorer les stéréotypes", "b. Établir une répartition claire des tâches", "c. Critiquer son choix"],
        answer: 'b',
        explanation: "La communication et la définition des rôles sont essentielles pour l'équilibre du couple."
    },
    {
        question: "Quelle zone érogène est souvent sous-estimée chez l'homme ?",
        options: ["a. Les lobes d'oreilles", "b. La nuque", "c. L'intérieur des cuisses"],
        answer: 'c',
        explanation: "L'intérieur des cuisses est très sensible et peut être source de plaisir intense."
    },
    {
        question: "Que signifie 'période d'éjaculation féminine' ?",
        options: ["a. Un mythe", "b. L'émission de liquide pendant l'orgasme", "c. La période fertile"],
        answer: 'b',
        explanation: "Certaines femmes émettent un liquide lors de l'orgasme, c'est un phénomène naturel."
    },
    {
        question: "Comment introduire des pratiques BDSM en douceur ?",
        options: ["a. Sans en parler", "b. Par une communication ouverte et progressive", "c. En forçant son partenaire"],
        answer: 'b',
        explanation: "Le dialogue et le respect des limites sont fondamentaux dans l'exploration sexuelle."
    },
    {
        question: "Qu'est-ce que la 'charge mentale' dans un couple ?",
        options: ["a. Le stress au travail", "b. La gestion invisible des tâches domestiques", "c. Les problèmes financiers"],
        answer: 'b',
        explanation: "C'est souvent la femme qui porte cette charge, même quand les tâches sont partagées."
    },
    {
        question: "Comment améliorer l'intimité après un accouchement ?",
        options: ["a. Attendre 6 mois minimum", "b. Parler de ses craintes et redécouvrir son corps", "c. Forcer la reprise"],
        answer: 'b',
        explanation: "La patience et la communication sont clés pour retrouver une sexualité épanouie."
    },
    {
        question: "Quel est le rôle des préliminaires ?",
        options: ["a. Une perte de temps", "b. Essentiels pour l'excitation et la lubrification", "c. Uniquement pour la femme"],
        answer: 'b',
        explanation: "Les préliminaires aident à l'excitation et au confort des deux partenaires."
    },
    {
        question: "Comment gérer la différence de libido dans un couple ?",
        options: ["a. S'adapter sans communiquer", "b. En parler et trouver des compromis", "c. Chercher ailleurs"],
        answer: 'b',
        explanation: "L'honnêteté et la créativité permettent de trouver un équilibre satisfaisant."
    },
    {
        question: "Que faire si on est gêné par les bruits pendant les rapports ?",
        options: ["a. Les ignorer", "b. En rire ensemble", "c. Arrêter immédiatement"],
        answer: 'b',
        explanation: "Dédramatiser les bruits corporels permet de se détendre et de profiter du moment."
    },
    {
        question: "Qu'est-ce que le point G ?",
        options: ["a. Une zone érogène vaginale", "b. Un mythe scientifique", "c. Une invention marketing"],
        answer: 'a',
        explanation: "Cette zone sensible peut procurer des orgasmes intenses chez certaines femmes."
    },
    {
        question: "Comment donner plus de plaisir à son partenaire oralement ?",
        options: ["a. Se précipiter", "b. Observer les réactions et varier les stimulations", "c. Imiter les scènes de films"],
        answer: 'b',
        explanation: "L'écoute du corps et la variété des techniques augmentent le plaisir."
    },
    {
        question: "À quoi sert la lubrification ?",
        options: ["a. Uniquement au plaisir", "b. Au confort et à la prévention des blessures", "c. C'est optionnel"],
        answer: 'b',
        explanation: "Un bon lubrifiant réduit les frictions et améliore les sensations pour tous."
    },
    {
        question: "Comment aborder ses fantasmes pervers ?",
        options: ["a. Les garder secrets", "b. En parler progressivement dans un moment intime", "c. Les imposer"],
        answer: 'b',
        explanation: "Partager ses désirs peut renforcer l'intimité si c'est fait avec respect."
    },
    {
        question: "Qu'est-ce que l'andropause ?",
        options: ["a. La ménopause masculine", "b. Une baisse progressive de testostérone", "c. Une maladie grave"],
        answer: 'b',
        explanation: "Vers 45-50 ans, l'homme peut connaître des changements hormonaux affectant sa sexualité."
    },
    {
        question: "Pourquoi utiliser des sextoys en couple ?",
        options: ["a. Pour remplacer le partenaire", "b. Pour explorer de nouvelles sensations ensemble", "c. C'est tabou"],
        answer: 'b',
        explanation: "Les accessoires peuvent pimenter la vie sexuelle quand ils sont utilisés mutuellement."
    },
    {
        question: "Comment maintenir la flamme après 10 ans de vie commune ?",
        options: ["a. Tout accepter", "b. Surprendre et communiquer régulièrement", "c. Faire comme au début"],
        answer: 'b',
        explanation: "L'innovation et la parole aident à garder une sexualité épanouie dans la durée."
    },
    {
        question: "Qu'est-ce que l'éjaculation féminine ?",
        options: ["a. Un signe d'orgasme intense", "b. Une urgence urinaire", "c. Une anomalie médicale"],
        answer: 'a',
        explanation: "Ce phénomène naturel et sain concerne certaines femmes lors de l'orgasme."
    },
    {
        question: "Comment gérer la jalousie dans un couple ouvert ?",
        options: ["a. La cacher", "b. En fixant des règles claires et en en parlant", "c. Rompre immédiatement"],
        answer: 'b',
        explanation: "La transparence et le respect des accords sont vitaux dans les relations non-monogames."
    },
    {
        question: "Quelle position permet une pénétration profonde ?",
        options: ["a. Le missionnaire", "b. L'andromaque (levrette)", "c. La cuillère"],
        answer: 'b',
        explanation: "La position de la levrette permet généralement une pénétration plus profonde."
    },
    {
        question: "Comment aborder la sexualité avec ses adolescents ?",
        options: ["a. Attendre qu'ils posent des questions", "b. En parler naturellement et sans tabou", "c. Leur donner un livre"],
        answer: 'b',
        explanation: "Un dialogue ouvert et bienveillant favorise une éducation sexuelle saine."
    },
    {
        question: "Que faire en cas d'érection tardive ?",
        options: ["a. Se moquer", "b. Ne pas mettre la pression et se concentrer sur d'autres plaisirs", "c. Insister"],
        answer: 'b',
        explanation: "Le stress étant l'ennemi numéro un, détourner l'attention réduit la pression."
    },
    {
        question: "Qu'est-ce que le aftercare ?",
        options: ["a. Les soins après un rapport BDSM", "b. La douche post-coïtale", "c. Un contraceptif"],
        answer: 'a',
        explanation: "Ces moments de réconfort après une pratique intense sont essentiels au bien-être."
    },
    {
        question: "Comment rendre un homme plus expressif pendant l'acte ?",
        options: ["a. Le critiquer", "b. L'encourager par des questions et montrer l'exemple", "c. L'ignorer"],
        answer: 'b',
        explanation: "Créer un espace sans jugement l'aide à se lâcher et à partager ses sensations."
    }
],
    histoire: [
        {
            question: "Qui était le premier président de la RDC ?",
            options: ["a. Joseph Kabila", "b. Mobutu Sese Seko", "c. Patrice Lumumba"],
            answer: 'c',
            explanation: "Patrice Lumumba fut le premier Premier ministre de la RDC indépendante."
        },
        {
            question: "En quelle année le Congo a-t-il obtenu son indépendance ?",
            options: ["a. 1958", "b. 1960", "c. 1965"],
            answer: 'b',
            explanation: "La RDC a obtenu son indépendance de la Belgique le 30 juin 1960."
        },
        {
            question: "Qui a découvert l'Amérique en 1492 ?",
            options: ["a. Christophe Colomb", "b. Vasco de Gama", "c. Magellan"],
            answer: 'a',
            explanation: "Christophe Colomb a découvert l'Amérique le 12 octobre 1492."
        }
    ],
    business: [
        {
            question: "Quelle stratégie est essentielle pour une startup ?",
            options: ["a. Avoir un produit parfait", "b. Valider le marché rapidement", "c. Lever beaucoup de fonds"],
            answer: 'b',
            explanation: "Valider le marché rapidement permet d'éviter de construire un produit dont personne ne veut."
        },
        {
            question: "Quel est le meilleur indicateur de santé d'une entreprise ?",
            options: ["a. Le chiffre d'affaires", "b. La trésorerie", "c. Le nombre d'employés"],
            answer: 'b',
            explanation: "La trésorerie est le sang de l'entreprise, sans elle l'entreprise ne peut survivre."
        },
        {
            question: "Comment fidéliser ses clients efficacement ?",
            options: ["a. Prix bas", "b. Service client exceptionnel", "c. Marketing agressif"],
            answer: 'b',
            explanation: "Un service client exceptionnel crée de la loyauté et des ambassadeurs de marque."
        },
        {
            question: "Quelle est la clé d'une bonne négociation ?",
            options: ["a. Parler beaucoup", "b. Savoir écouter", "c. Être agressif"],
            answer: 'b',
            explanation: "Écouter permet de comprendre les besoins réels de l'autre partie."
        },
        {
            question: "Quel est le plus grand risque pour un entrepreneur ?",
            options: ["a. La concurrence", "b. L'échec", "c. Ne pas essayer"],
            answer: 'c',
            explanation: "Le plus grand regret est souvent de ne pas avoir tenté sa chance."
        },
        {
            question: "Comment différencier son produit ?",
            options: ["a. Prix plus bas", "b. Innovation constante", "c. Copier les concurrents"],
            answer: 'b',
            explanation: "L'innovation crée une barrière à l'entrée et une valeur unique."
        },
        {
            question: "Quelle qualité est essentielle pour un leader ?",
            options: ["a. Charisme", "b. Empathie", "c. Autorité"],
            answer: 'b',
            explanation: "L'empathie permet de comprendre et motiver son équipe."
        },
        {
            question: "Comment gérer l'échec en business ?",
            options: ["a. Cacher ses erreurs", "b. En tirer des leçons", "c. Blâmer les autres"],
            answer: 'b',
            explanation: "Chaque échec est une opportunité d'apprentissage."
        },
        {
            question: "Quel est le meilleur investissement ?",
            options: ["a. Immobilier", "b. Bourse", "c. Soi-même"],
            answer: 'c',
            explanation: "Investir dans ses compétences rapporte toute une vie."
        },
        {
            question: "Comment créer une culture d'entreprise forte ?",
            options: ["a. Règles strictes", "b. Valeurs partagées", "c. Salaires élevés"],
            answer: 'b',
            explanation: "Des valeurs partagées créent un sentiment d'appartenance."
        }
    ],
    anime: [
        {
            question: "Acceptez-vous que Goku soit outerversal en forme de base ?",
            options: ["a. Oui, il est omnipotent", "b. Non, c'est exagéré", "c. Seulement en UI"],
            answer: 'a',
            explanation: "Goku transcende les dimensions et les concepts, c'est indéniable ! 🐉"
        },
        {
            question: "T'as déjà regardé Boku no Pico ?",
            options: ["a. Oui, c'est un classique", "b. Non, je suis pur", "c. J'ai survécu"],
            answer: 'a',
            explanation: "Un rite de passage pour tout vrai fan d'anime... 😅"
        },
        {
            question: "Quel est le meilleur arc de One Piece ?",
            options: ["a. Marine Ford", "b. Enies Lobby", "c. Whole Cake"],
            answer: 'a',
            explanation: "Marine Ford c'est l'apogée émotionnelle avec la mort d'Ace ⚓"
        },
        {
            question: "Naruto ou Sasuke, qui est le plus fort ?",
            options: ["a. Naruto, le hokage", "b. Sasuke, le dernier Uchiha", "c. Sakura (blague)"],
            answer: 'b',
            explanation: "Sasuke avec le Rinnegan est techniquement plus polyvalent 🔥👁️"
        },
        {
            question: "Quel studio produit les meilleurs animations ?",
            options: ["a. Ufotable", "b. MAPPA", "c. Kyoto Animation"],
            answer: 'a',
            explanation: "Ufotable avec Demon Slayer et Fate, c'est le top qualité 🎨"
        },
        {
            question: "Quel est le manga le plus vendu de tous temps ?",
            options: ["a. One Piece", "b. Dragon Ball", "c. Naruto"],
            answer: 'a',
            explanation: "One Piece dépasse les 500 millions d'exemplaires ! 📚"
        },
        {
            question: "Attack on Titan, fin satisfaisante ?",
            options: ["a. Oui, magistral", "b. Non, décevant", "c. Je pleure encore"],
            answer: 'c',
            explanation: "On en parle pas, ça fait encore mal... 😭"
        },
        {
            question: "Meilleur couple d'anime ?",
            options: ["a. Naruto x Hinata", "b. Zero Two x Hiro", "c. Kaguya x Miyuki"],
            answer: 'b',
            explanation: "Zero Two et Hiro c'est l'amour dans toute sa folie 💖"
        },
        {
            question: "Qui est le personnage le plus overpower ?",
            options: ["a. Saitama", "b. Goku", "c. Rimuru"],
            answer: 'a',
            explanation: "Saitama termine tout en un coup, c'est littéral 💥"
        },
        {
            question: "Anime à recommander à un débutant ?",
            options: ["a. Death Note", "b. Attack on Titan", "c. Fullmetal Alchemist"],
            answer: 'a',
            explanation: "Death Note c'est le meilleur point d'entrée, addictif ! 🍎"
        }
    ],
    adulte_celibataire: [
        {
            question: "Que préférez-vous faire un samedi soir seul(e) ?",
            options: ["a. Regarder un film érotique", "b. Parler à des inconnus en ligne", "c. Fantasmer sur votre crush"],
            answer: 'a',
            explanation: "Le cinéma érotique stimule l'imagination... 🎬"
        },
        {
            question: "Quel est votre fantasme secret ?",
            options: ["a. Une nuit torride avec un inconnu", "b. Être dominé(e) avec douceur", "c. Faire l'amour dans un lieu public"],
            answer: 'b',
            explanation: "La soumission contrôlée excite beaucoup de monde... 🔥"
        },
        {
            question: "Comment séduisez-vous quelqu'un qui vous plaît ?",
            options: ["a. Regards insistants et sourires", "b. Contacts 'accidentels'", "c. Messages suggestifs"],
            answer: 'c',
            explanation: "Les mots ont un pouvoir érotique puissant... 💋"
        },
        {
            question: "Quelle partie du corps attire le plus votre regard ?",
            options: ["a. Les lèvres", "b. Les mains", "c. La nuque"],
            answer: 'a',
            explanation: "Des lèvres pulpeuses promettent bien des plaisirs... 👄"
        },
        {
            question: "Quelle ambiance préférez-vous pour un moment intime ?",
            options: ["a. Bougies et musique douce", "b. Pluie contre la fenêtre", "c. Silence total"],
            answer: 'a',
            explanation: "La lumière des bougies caresse les corps... 🕯️"
        },
        {
            question: "Que feriez-vous avec une nuit entière de liberté ?",
            options: ["a. Explorer vos fantasmes", "b. Multiplier les plaisirs solitaires", "c. Tenter des expériences nouvelles"],
            answer: 'c',
            explanation: "L'audace est souvent récompensée... 🌙"
        },
        {
            question: "Quel est votre endroit préféré pour un rendez-vous galant ?",
            options: ["a. Un restaurant intimiste", "b. Un parc la nuit", "c. Chez vous avec un dîner"],
            answer: 'c',
            explanation: "L'intimité du domicile permet toutes les audaces... 🏠"
        },
        {
            question: "Comment gérez-vous la frustration sexuelle ?",
            options: ["a. Sports intensifs", "b. Créativité artistique", "c. Plaisir solitaire"],
            answer: 'c',
            explanation: "Le plaisir solitaire est une libération saine... ✨"
        },
        {
            question: "Quel type de vêtement vous fait vous sentir sexy ?",
            options: ["a. Tenue classe élégante", "b. Vêtements moulants", "c. Sous-vêtements suggestifs"],
            answer: 'b',
            explanation: "Les vêtements moulants soulignent les formes... 👗"
        },
        {
            question: "Qu'est-ce qui vous excite le plus intellectuellement ?",
            options: ["a. Une conversation profonde", "b. Un regard complice", "c. Des compliments osés"],
            answer: 'a',
            explanation: "L'intelligence est la plus grande des aphrodisiaques... 🧠"
        },
        {
            question: "Comment choisissez-vous un partenaire potentiel ?",
            options: ["a. Par le physique d'abord", "b. Par la personnalité", "c. Par l'énergie et la complicité"],
            answer: 'c',
            explanation: "L'alchimie entre deux personnes est mystérieuse... ⚡"
        },
        {
            question: "Quel est votre moment de la journée préféré ?",
            options: ["a. Le réveil, plein d'énergie", "b. La nuit, moment de liberté", "c. L'après-midi, pause détente"],
            answer: 'b',
            explanation: "La nuit libère les fantasmes les plus fous... 🌃"
        },
        {
            question: "Comment imaginez-vous la personne idéale ?",
            options: ["a. Quelqu'un de protecteur", "b. Quelqu'un de libre et fou", "c. Quelqu'un qui vous comprend sans mots"],
            answer: 'c',
            explanation: "La connexion silencieuse est la plus intense... 🤫"
        },
        {
            question: "Quelle qualité recherchez-vous avant tout ?",
            options: ["a. L'honnêteté", "b. L'audace", "c. La sensibilité"],
            answer: 'a',
            explanation: "Sans honnêteté, aucune relation ne peut être vraie... 💎"
        }
    ],
    adulte_couple: [
        {
            question: "Comment ravivez-vous la flamme ?",
            options: ["a. Week-end surprise", "b. Jeux érotiques", "c. Nouvelles positions"],
            answer: 'b',
            explanation: "Les jeux ouvrent de nouveaux horizons... 🎲"
        },
        {
            question: "Où aimez-vous faire l'amour le plus ?",
            options: ["a. Sous la douche", "b. Sur le canapé", "c. Dans la voiture"],
            answer: 'a',
            explanation: "L'eau qui ruisselle sur les corps... 🚿"
        },
        {
            question: "Quel est votre moment préféré pour l'intimité ?",
            options: ["a. Tôt le matin", "b. En pleine nuit", "c. L'après-midi surprise"],
            answer: 'c',
            explanation: "Les rendez-vous diurnes ont un charme particulier... ☀️"
        },
        {
            question: "Comment initiez-vous les rapports ?",
            options: ["a. Massages sensuels", "b. Baisers langoureux", "c. Mots cochons à l'oreille"],
            answer: 'c',
            explanation: "Les paroles impudiques excitent l'imagination... 👂"
        },
        {
            question: "Quel accessoire utilisez-vous pour pimenter ?",
            options: ["a. Des liens en soie", "b. Un bandeau sur les yeux", "c. Des glaçons"],
            answer: 'a',
            explanation: "La soie contre la peau est une sensation divine... 🎀"
        },
        {
            question: "Que faites-vous pour surprendre votre partenaire ?",
            options: ["a. Petits mots coquins", "b. Sous-vêtements sexy", "c. Initiations inattendues"],
            answer: 'c',
            explanation: "L'imprévu excite les sens... 💫"
        }
    ],
    mood: [
        {
            question: "Comment vous réveillez-vous le matin ?",
            options: ["a. En pleine forme", "b. Avec difficulté", "c. Déjà stressé"],
            answer: 'a',
            explanation: "Le matin donne le ton de toute la journée... ☀️"
        },
        {
            question: "Quelle est votre routine du soir ?",
            options: ["a. Relaxation et lecture", "b. Réseaux sociaux", "c. Travail jusqu'à tard"],
            answer: 'a',
            explanation: "Se déconnecter est essentiel pour un bon sommeil... 🌙"
        },
        {
            question: "Comment gérez-vous le stress ?",
            options: ["a. Méditation", "b. Sport", "c. Nourriture réconfort"],
            answer: 'b',
            explanation: "Le sport libère des endorphines, l'hormone du bonheur... 🏃‍♂️"
        },
        {
            question: "Quel est votre moment de bonheur simple ?",
            options: ["a. Un café chaud", "b. Un rayon de soleil", "c. Un rire partagé"],
            answer: 'c',
            explanation: "Le rire est contagieux et guérisseur... 😄"
        },
        {
            question: "Comment prenez-vous des décisions importantes ?",
            options: ["a. Avec le cœur", "b. Avec la tête", "c. Avec l'intuition"],
            answer: 'c',
            explanation: "L'intuition est souvent plus sage que la raison... 🔮"
        },
        {
            question: "Qu'est-ce qui vous motive au quotidien ?",
            options: ["a. Vos objectifs", "b. Vos proches", "c. La curiosité"],
            answer: 'b',
            explanation: "Les relations donnent un sens à nos efforts... 👨‍👩‍👧‍👦"
        },
        {
            question: "Comment rechargez-vous vos batteries ?",
            options: ["a. Solitude", "b. Socialisation", "c. Nature"],
            answer: 'c',
            explanation: "La nature nous reconnecte à l'essentiel... 🌳"
        },
        {
            question: "Quelle émotion domine chez vous ?",
            options: ["a. Joie", "b. Sérénité", "c. Curiosité"],
            answer: 'b',
            explanation: "La sérénité est la base du bien-être... 🧘"
        },
        {
            question: "Comment gérez-vous l'échec ?",
            options: ["a. Comme une leçon", "b. Comme une blessure", "c. Comme un défi"],
            answer: 'a',
            explanation: "Chaque échec contient une graine de succès... 🌱"
        },
        {
            question: "Qu'est-ce qui vous rend reconnaissant ?",
            options: ["a. La santé", "b. L'amour", "c. La liberté"],
            answer: 'a',
            explanation: "Sans santé, rien d'autre n'a d'importance... 💖"
        },
        {
            question: "Comment exprimez-vous vos émotions ?",
            options: ["a. Facilement", "b. Difficilement", "c. À travers l'art"],
            answer: 'a',
            explanation: "Exprimer ses émotions libère l'âme... 🎭"
        },
        {
            question: "Quel est votre besoin émotionnel principal ?",
            options: ["a. Sécurité", "b. Reconnaissance", "c. Liberté"],
            answer: 'c',
            explanation: "La liberté est l'oxygène de l'âme... 🕊️"
        },
        {
            question: "Comment trouvez-vous l'équilibre ?",
            options: ["a. Routine stricte", "b. Flexibilité", "c. Écoute de soi"],
            answer: 'c',
            explanation: "S'écouter soi-même est la première sagesse... 👂"
        },
        {
            question: "Quelle est votre philosophie de vie ?",
            options: ["a. Carpe Diem", "b. Tout arrive pour une raison", "c. Créer sa propre réalité"],
            answer: 'c',
            explanation: "Nous sommes les architectes de notre vie... 🏗️"
        }
    ],
    only18: [
        {
            question: "Quel est votre endroit fantasme pour un rapport ?",
            options: ["a. Dans un ascenseur", "b. Sur un toit d'immeuble", "c. Dans un dressing de magasin"],
            answer: 'b',
            explanation: "Le risque d'être vu ajoute du piquant... 🌃"
        },
        {
            question: "À quelle fréquence pensez-vous au sexe ?",
            options: ["a. Plusieurs fois par jour", "b. Une fois par jour", "c. Quand l'envie vient"],
            answer: 'a',
            explanation: "Le désir est un feu qui ne s'éteint jamais... 🔥"
        },
        {
            question: "Quel est votre tabou secret ?",
            options: ["a. Voyeurisme", "b. Exhibitionnisme", "c. Rôle playing"],
            answer: 'b',
            explanation: "Montrer son corps libère des inhibitions... 💃"
        },
        {
            question: "Comment aimez-vous être dominé(e) ?",
            options: ["a. Physiquement", "b. Verbalement", "c. Psychologiquement"],
            answer: 'b',
            explanation: "Les mots peuvent être plus puissants que les actes... 💬"
        },
        {
            question: "Quel est votre fantasme le plus osé ?",
            options: ["a. À plusieurs", "b. En public", "c. Avec un inconnu"],
            answer: 'a',
            explanation: "L'énergie de plusieurs personnes est électrisante... 👥"
        },
        {
            question: "Comment communiquez-vous vos désirs ?",
            options: ["a. Directement", "b. Par gestes", "c. Par écrit"],
            answer: 'c',
            explanation: "L'écrit permet d'exprimer ce qu'on n'ose dire... 📝"
        },
        {
            question: "Quelle partie du corps aimez-vous qu'on embrasse ?",
            options: ["a. La nuque", "b. L'intérieur des cuisses", "c. Le bas du dos"],
            answer: 'b',
            explanation: "Les zones sensibles réservent des surprises... 🦵"
        },
        {
            question: "À quel point êtes-vous expérimenté(e) ?",
            options: ["a. Très", "b. Moyennement", "c. Je découvre encore"],
            answer: 'c',
            explanation: "Chaque découverte est une nouvelle aventure... 🗺️"
        },
        {
            question: "Quel est votre moment sexuel préféré ?",
            options: ["a. L'anticipation", "b. L'acte lui-même", "c. L'après-coup"],
            answer: 'a',
            explanation: "L'attente peut être plus excitante que l'acte... ⏳"
        },
        {
            question: "Comment pimentez-vous une relation longue ?",
            options: ["a. Nouvelles positions", "b. Jeux de rôle", "c. Lieux insolites"],
            answer: 'b',
            explanation: "Devenir quelqu'un d'autre libère des désirs cachés... 🎭"
        },
        {
            question: "Qu'est-ce qui vous excite intellectuellement ?",
            options: ["a. La domination mentale", "b. La soumission consentie", "c. Les jeux de pouvoir"],
            answer: 'c',
            explanation: "Le pouvoir est l'aphrodisiaque ultime... 👑"
        },
        {
            question: "À quel point êtes-vous bruyant(e) ?",
            options: ["a. Très", "b. Modérément", "c. Je me retiens"],
            answer: 'a',
            explanation: "Exprimer son plaisir est libérateur... 🔊"
        }
    ],
    programmation: [
        {
            question: "Quelle est votre stack préférée ?",
            options: ["a. MERN", "b. MEAN", "c. LAMP"],
            answer: 'a',
            explanation: "MERN (MongoDB, Express, React, Node) est moderne et populaire... ⚛️"
        },
        {
            question: "Comment déboguez-vous ?",
            options: ["a. console.log() partout", "b. Débogueur intégré", "c. Tests unitaires"],
            answer: 'b',
            explanation: "Le débogueur est l'outil du développeur pro... 🔧"
        },
        {
            question: "Quel est votre langage de programmation favori ?",
            options: ["a. JavaScript", "b. Python", "c. Java"],
            answer: 'a',
            explanation: "JavaScript est partout, du front au back... 🌐"
        },
        {
            question: "Comment gérez-vous les deadlines ?",
            options: ["a. Agile/Scrum", "b. Je travaille vite", "c. Je fais des nuits blanches"],
            answer: 'a',
            explanation: "Les méthodologies agiles sauvent des projets... 📅"
        },
        {
            question: "Quelle est votre plus grande peur en codant ?",
            options: ["a. Les bugs en production", "b. Les revues de code", "c. Les mauvaises pratiques"],
            answer: 'a',
            explanation: "Un bug en production fait cauchemarder... 😱"
        },
        {
            question: "Comment apprenez-vous de nouvelles technologies ?",
            options: ["a. Cours en ligne", "b. Documentation", "c. Projets personnels"],
            answer: 'c',
            explanation: "Rien ne remplace la pratique réelle... 🛠️"
        },
        {
            question: "Quel est votre éditeur de code préféré ?",
            options: ["a. VS Code", "b. Sublime Text", "c. Vim/Neovim"],
            answer: 'a',
            explanation: "VS Code a conquis le monde du développement... 💻"
        },
        {
            question: "Comment gérez-vous le code legacy ?",
            options: ["a. Je le refactorise", "b. Je l'accepte", "c. Je le réécris"],
            answer: 'a',
            explanation: "Refactoriser petit à petit est la meilleure approche... ♻️"
        },
        {
            question: "Quelle est la compétence la plus importante ?",
            options: ["a. Résolution de problèmes", "b. Communication", "c. Apprentissage continu"],
            answer: 'a',
            explanation: "Un développeur résout des problèmes avant d'écrire du code... 🧩"
        },
        {
            question: "Comment restez-vous à jour ?",
            options: ["a. Twitter tech", "b. Blogs spécialisés", "c. Conférences"],
            answer: 'a',
            explanation: "Twitter est l'agrégateur d'actualités tech ultime... 🐦"
        },
        {
            question: "Quel est votre framework frontend préféré ?",
            options: ["a. React", "b. Vue", "c. Svelte"],
            answer: 'a',
            explanation: "React domine le marché avec sa flexibilité... ⚛️"
        },
        {
            question: "Comment documentez-vous votre code ?",
            options: ["a. Code auto-descriptif", "b. Commentaires", "c. Documentation séparée"],
            answer: 'a',
            explanation: "Le code bien écrit est sa propre documentation... 📖"
        },
        {
            question: "Quelle est votre philosophie de développement ?",
            options: ["a. KISS (Keep It Simple)", "b. DRY (Don't Repeat)", "c. YAGNI (You Ain't Gonna Need)"],
            answer: 'a',
            explanation: "La simplicité est la sophistication ultime... ✨"
        }
    ],
    religion: [
        {
            question: "Quelle est la base de la foi chrétienne ?",
            options: ["a. L'amour de Dieu", "b. Le sacrifice de Jésus", "c. La résurrection"],
            answer: 'b',
            explanation: "Le sacrifice de Jésus est le fondement du salut... ✝️"
        },
        {
            question: "Comment développer sa relation avec Dieu ?",
            options: ["a. Prière quotidienne", "b. Lecture de la Bible", "c. Service aux autres"],
            answer: 'a',
            explanation: "La prière est la respiration de l'âme... 🙏"
        },
        {
            question: "Qu'est-ce que signifie 'donner sa vie à Jésus' ?",
            options: ["a. Devenir missionnaire", "b. Lui remettre le contrôle", "c. Suivre ses commandements"],
            answer: 'b',
            explanation: "C'est faire de Jésus le Seigneur de sa vie... 👑"
        },
        {
            question: "Comment surmonter le doute ?",
            options: ["a. Par la foi", "b. Par l'étude", "c. Par la communion"],
            answer: 'a',
            explanation: "La foi est l'assurance des choses qu'on espère... ✨"
        },
        {
            question: "Quelle est la plus grande preuve d'amour ?",
            options: ["a. Le sacrifice", "b. Le pardon", "c. La fidélité"],
            answer: 'a',
            explanation: "Jésus a donné sa vie par amour pour nous... ❤️"
        },
        {
            question: "Comment être sûr de son salut ?",
            options: ["a. Par les œuvres", "b. Par la foi seule", "c. Par la grâce"],
            answer: 'c',
            explanation: "Le salut est un don gratuit de Dieu par grâce... 🎁"
        },
        {
            question: "Quelle est la mission du chrétien ?",
            options: ["a. Évangéliser", "b. Aimer son prochain", "c. Être sel de la terre"],
            answer: 'a',
            explanation: "Partager la bonne nouvelle est notre mission... 📢"
        },
        {
            question: "Comment interpréter la Bible ?",
            options: ["a. Littéralement", "b. Spirituellement", "c. Avec l'Esprit Saint"],
            answer: 'c',
            explanation: "L'Esprit Saint est notre guide et enseignant... 🕊️"
        },
        {
            question: "Qu'est-ce que la repentance ?",
            options: ["a. Regretter ses péchés", "b. Changer de direction", "c. Demander pardon"],
            answer: 'b',
            explanation: "C'est un changement radical de mentalité et de vie... 🔄"
        },
        {
            question: "Comment faire face à la persécution ?",
            options: ["a. Avec joie", "b. Avec courage", "c. Avec patience"],
            answer: 'a',
            explanation: "Être persécuté pour Christ est une grâce... 😊"
        },
        {
            question: "Quelle est la puissance de la prière ?",
            options: ["a. Elle change les choses", "b. Elle change Dieu", "c. Elle nous change"],
            answer: 'c',
            explanation: "La prière nous transforme d'abord nous-mêmes... 💫"
        },
        {
            question: "Comment discerner la volonté de Dieu ?",
            options: ["a. Par la Bible", "b. Par la prière", "c. Par la paix intérieure"],
            answer: 'c',
            explanation: "La paix de Dieu doit gouverner nos cœurs... 🕊️"
        },
        {
            question: "Qu'est-ce que la sanctification ?",
            options: ["a. Devenir parfait", "b. Être mis à part", "c. Croître en sainteté"],
            answer: 'c',
            explanation: "C'est un processus de croissance spirituelle... 🌱"
        },
        {
            question: "Comment vivre sa foi au quotidien ?",
            options: ["a. Par l'intégrité", "b. Par le témoignage", "c. Par la gratitude"],
            answer: 'a',
            explanation: "L'intégrité est la preuve de notre foi... 💎"
        },
        {
            question: "Quelle est la promesse de Dieu pour les siens ?",
            options: ["a. La prospérité", "b. La paix", "c. La vie éternelle"],
            answer: 'c',
            explanation: "La vie éternelle est l'espérance suprême... 🌅"
        },
        {
            question: "Comment surmonter la tentation ?",
            options: ["a. Par la fuite", "b. Par la résistance", "c. Par la Parole de Dieu"],
            answer: 'a',
            explanation: "Fuir est souvent la meilleure stratégie... 🏃‍♂️"
        },
        {
            question: "Quelle est l'importance de l'Église ?",
            options: ["a. Communauté de soutien", "b. Corps de Christ", "c. Famille spirituelle"],
            answer: 'b',
            explanation: "Nous sommes les membres d'un même corps... 👥"
        },
        {
            question: "Comment faire grandir sa foi ?",
            options: ["a. Par l'épreuve", "b. Par l'obéissance", "c. Par la confiance"],
            answer: 'a',
            explanation: "L'épreuve produit la persévérance et la maturité... 🔥"
        },
        {
            question: "Qu'est-ce que signifie 'naître de nouveau' ?",
            options: ["a. Recommencer à zéro", "b. Recevoir une nouvelle nature", "c. Changer de religion"],
            answer: 'b',
            explanation: "C'est une transformation spirituelle radicale... 🦋"
        },
        {
            question: "Comment aimer comme Dieu aime ?",
            options: ["a. Inconditionnellement", "b. Sacrificiellement", "c. Éternellement"],
            answer: 'b',
            explanation: "L'amour divin donne sans compter... 💝"
        },
        {
            question: "Quelle est la vraie liberté ?",
            options: ["a. Faire ce qu'on veut", "b. Être libéré du péché", "c. Suivre sa conscience"],
            answer: 'b',
            explanation: "La liberté en Christ est la seule vraie liberté... 🕊️"
        }
    ]
};

// Fonction pour envoyer l'image avec texte
async function sendImageMessage(sock, from, caption, title = "HEX✦QUIZ") {
    try {
        await sock.sendMessage(from, {
            image: { url: THUMBNAIL },
            caption: caption,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: "Quiz Game",
                    thumbnailUrl: THUMBNAIL,
                    mediaType: 1,
                    mediaUrl: THUMBNAIL,
                    sourceUrl: THUMBNAIL,
                    showAdAttribution: false
                }
            }
        });
    } catch (error) {
        console.error('Erreur envoi image:', error);
        // Fallback: envoyer juste le texte
        await sock.sendMessage(from, { text: caption });
    }
}

// Fonction pour afficher les scores en temps réel
async function showCurrentScores(sock, from, groupQuiz) {
    const players = Object.values(groupQuiz.players);
    
    if (players.length === 0) return;
    
    // Trier par score décroissant
    players.sort((a, b) => b.score - a.score);
    
    let content = "╭━━〔 🏆 CLASSEMENT 〕━━┈⊷\n";
    
    players.forEach((player, index) => {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "┃✰│➫";
        if (index < 3) {
            content += `┃${medal}│➫ @${player.name} : ${player.score} points\n`;
        } else {
            content += `${medal} @${player.name} : ${player.score} points\n`;
        }
    });
    
    content += `╰━━━━━━━━━━━━━━━━━━━━━━┈⊷\n\n`;
    content += `🎮 *En cours: Quiz ${groupQuiz.category}*\n`;
    content += `👥 Participants: ${players.length}\n\n`;
    content += `> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝚃𝙴𝙲𝙷🇨🇩`;
    
    await sendImageMessage(sock, from, content, "CLASSEMENT");
}

// Démarrer un quiz multijoueur dans un groupe
async function startGroupQuiz(sock, from, userId, userName, category) {
    const groupId = from;
    
    // Vérifier si un quiz est déjà en cours
    if (groupQuizzes[groupId]) {
        const content = `╭━━〔 ⚠️ QUIZ EN COURS 〕━━┈⊷\n` +
                       `┃✰│➫ Un quiz est déjà en cours !\n` +
                       `┃✰│➫ Tapez *.joint* pour rejoindre\n` +
                       `╰━━━━━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                       `> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝚃𝙴𝙲𝙷🇨🇩`;
        await sendImageMessage(sock, from, content, "HEX✦QUIZ");
        return;
    }
    
    console.log(`[QUIZ MULTI] Début quiz ${category} par ${userName} dans ${groupId}`);
    
    const isAdult = category.includes('adulte') || category === 'only18';
    
    // Créer le quiz de groupe
    groupQuizzes[groupId] = {
        hostId: userId,
        hostName: userName,
        category: category,
        currentQuestion: 0,
        players: {},
        startTime: Date.now(),
        isAdult: isAdult,
        questionAnswered: false,
        questionStartTime: Date.now(),
        correctAnswersCount: 0
    };
    
    // Ajouter l'hôte comme premier joueur
    groupQuizzes[groupId].players[userId] = {
        name: userName,
        score: 0,
        correct: 0,
        answered: false,
        lastAnswerTime: null
    };
    
    const categoryNames = {
        'sciences': 'Sciences 🔬',
        'histoire': 'Histoire 📜',
        'maturite': '🔞',
        'business': 'Business 💼',
        'anime': 'Anime 🐉',
        'adulte_celibataire': 'Adulte Célibataire 🔥',
        'adulte_couple': 'Adulte Couple 💑',
        'mood': 'Mood 😌',
        'only18': 'ONLY 18 🔞',
        'programmation': 'Programmation 💻',
        'religion': 'Religion ✝️'
    };
    
    const content = `╭━━〔 🎮 QUIZ MULTIJOUEUR 〕━━┈⊷\n` +
                   `┃✰│➫ Hôte: ${userName}\n` +
                   `┃✰│➫ Catégorie: ${categoryNames[category]}\n` +
                   `┃✰│➫ Questions: ${questions[category].length}\n` +
                   `┃✰│➫ Mode: Course contre la montre\n` +
                   `╰━━━━━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                   `📢 *Le quiz a commencé !*\n` +
                   `Tapez *.joint* pour rejoindre la partie\n` +
                   `et répondez avec a, b ou c le plus vite possible !\n\n` +
                   `🏆 *Le plus rapide gagne des points bonus !*\n\n` +
                   `> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝚃𝙴𝙲𝙷🇨🇩`;
    
    await sendImageMessage(sock, from, content, `QUIZ ${categoryNames[category]}`);
    
    // Démarrer la première question après 3 secondes
    setTimeout(() => askGroupQuestion(sock, from), 3000);
}

// Poser une question dans un quiz de groupe
async function askGroupQuestion(sock, from) {
    const groupId = from;
    const groupQuiz = groupQuizzes[groupId];
    
    if (!groupQuiz) return;
    
    const category = groupQuiz.category;
    const qIndex = groupQuiz.currentQuestion;
    
    if (qIndex >= questions[category].length) {
        // Fin du quiz
        await endGroupQuiz(sock, from);
        return;
    }
    
    const question = questions[category][qIndex];
    
    // Réinitialiser l'état de la question
    groupQuiz.questionAnswered = false;
    groupQuiz.questionStartTime = Date.now();
    groupQuiz.correctAnswersCount = 0;
    
    // Réinitialiser les réponses des joueurs
    Object.keys(groupQuiz.players).forEach(playerId => {
        groupQuiz.players[playerId].answered = false;
        groupQuiz.players[playerId].lastAnswerTime = null;
    });
    
    const content = `╭━━〔 ⚠️ QUESTION ${qIndex + 1}/${questions[category].length} 〕━━┈⊷\n` +
                   `┃✰│➫ ${question.question}\n` +
                   `╰━━━━━━━━━━━━━━━━━━━━━━┈⊷\n\n` +
                   `${question.options.join('\n')}\n\n` +
                   `➤ *Le premier à répondre gagne 11 points !*\n` +
                   `➤ *Bonne réponse: 10 points*\n` +
                   `➤ *Mauvaise réponse: -5 points*\n\n` +
                   `⏱️ *Répondez avec:* ⚙️ave prefix .a, .b ou c. \n\n` +
                   `> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝚃𝙴𝙲𝙷🇨🇩`;
    
    await sendImageMessage(sock, from, content, `QUESTION ${qIndex + 1}`);
}

// Traiter une réponse dans un quiz de groupe
async function processGroupAnswer(sock, from, msg, userId, userName, answer) {
    const groupId = from;
    const groupQuiz = groupQuizzes[groupId];
    
    if (!groupQuiz) return false;
    
    // Vérifier si le joueur est inscrit
    if (!groupQuiz.players[userId]) {
        // Auto-inscription si pas encore inscrit
        groupQuiz.players[userId] = {
            name: userName,
            score: 0,
            correct: 0,
            answered: false,
            lastAnswerTime: null
        };
    }
    
    const player = groupQuiz.players[userId];
    
    // Vérifier si le joueur a déjà répondu à cette question
    if (player.answered) {
        await sock.sendMessage(from, { 
            text: `@${userName} tu as déjà répondu à cette question ! Attends la suivante.`
        });
        return true;
    }
    
    // Vérifier si la question a déjà été résolue
    if (groupQuiz.questionAnswered) {
        await sock.sendMessage(from, { 
            text: `@${userName} question déjà résolue ! Prochaine question bientôt.`
        });
        return true;
    }
    
    const category = groupQuiz.category;
    const qIndex = groupQuiz.currentQuestion;
    const question = questions[category][qIndex];
    
    // Nettoyer la réponse
    const cleanAnswer = answer.replace('.', '').toLowerCase();
    const isCorrect = cleanAnswer === question.answer;
    
    // Calculer les points
    const answerTime = Date.now();
    const timeDiff = answerTime - groupQuiz.questionStartTime;
    let points = isCorrect ? 10 : -6;
    
    // Bonus pour le premier à répondre correctement
    if (isCorrect && groupQuiz.correctAnswersCount === 0) {
        points += 1; // Bonus de 5 points pour le premier
    }
    
    // Mettre à jour le score du joueur
    player.score += points;
    player.answered = true;
    player.lastAnswerTime = answerTime;
    
    if (isCorrect) {
        player.correct++;
        
        // Compter les bonnes réponses
        groupQuiz.correctAnswersCount++;
        
        // Si c'est la première bonne réponse, annoncer le gagnant
        if (groupQuiz.correctAnswersCount === 1) {
            await sock.sendMessage(from, {
                text: `🎉 @${userName} a trouvé la réponse en premier ! +${points} points !`
            });
        }
        
        // IMMÉDIATEMENT après une bonne réponse, passer à la question suivante
        groupQuiz.questionAnswered = true;
        
        // Annoncer la bonne réponse
        const correctOption = question.options.find(opt => opt.startsWith(`${question.answer}.`));
        await sock.sendMessage(from, {
            text: `✅ Réponse correcte: ${correctOption}\n💡 ${question.explanation}\n\nPassage à la question suivante dans 3 secondes...`
        });
        
        // Afficher les scores après la bonne réponse
        await showCurrentScores(sock, from, groupQuiz);
        
        // Passer à la question suivante après 3 secondes
        groupQuiz.currentQuestion++;
        setTimeout(() => askGroupQuestion(sock, from), 9000);
        
    } else {
        // Mauvaise réponse
        await sock.sendMessage(from, {
            text: `❌ @${userName} mauvaise réponse ! -5 points.`
        });
    }
    
    // Sauvegarder les scores permanents
    const targetScores = groupQuiz.isAdult ? adultScores : scores;
    
    if (!targetScores[userId]) {
        targetScores[userId] = {
            name: userName,
            correct: 0,
            total: 0,
            games: 0,
            joined: new Date().toISOString()
        };
    }
    
    targetScores[userId].games = (targetScores[userId].games || 0) + 1;
    targetScores[userId].correct = (targetScores[userId].correct || 0) + (isCorrect ? 1 : 0);
    targetScores[userId].total = (targetScores[userId].total || 0) + points;
    
    saveScores();
    
    return true;
}

// Terminer un quiz de groupe
async function endGroupQuiz(sock, from) {
    const groupId = from;
    const groupQuiz = groupQuizzes[groupId];
    
    if (!groupQuiz) return;
    
    const players = Object.values(groupQuiz.players);
    
    if (players.length === 0) {
        delete groupQuizzes[groupId];
        return;
    }
    
    // Trier par score
    players.sort((a, b) => b.score - a.score);
    
    let content = "╭━━〔 🏆 RÉSULTATS 〕━━┈⊷\n";
    
    players.forEach((player, index) => {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `┃✰│➫ ${index + 1}.`;
        if (index < 3) {
            content += `┃${medal}│➫ ${player.name}\n`;
        } else {
            content += `${medal} ${player.name}\n`;
        }
        content += `┃✰│➫ Score: ${player.score} points\n`;
        content += `┃✰│➫ Correct: ${player.correct}/${questions[groupQuiz.category].length}\n`;
        content += `┃✰│➫ ───────────────\n`;
    });
    
    content += `╰━━━━━━━━━━━━━━━━━┈⊷\n\n`;
    content += `🎉 *Félicitations aux gagnants !*\n`;
    content += `Merci à tous d'avoir participé !\n\n`;
    content += `> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝚃𝙴𝙲𝙷🇨🇩`;
    
    await sendImageMessage(sock, from, content, "QUIZ TERMINÉ");
    
    // Supprimer le quiz du groupe
    delete groupQuizzes[groupId];
}

// Handler pour les réponses dans les groupes
async function handleGroupAnswer(sock, msg, text) {
    const from = msg.key.remoteJid;
    const userId = msg.key.participant || msg.key.remoteJid;
    const userName = msg.pushName || "Joueur";
    
    // Vérifier si c'est un groupe
    if (!from.includes('@g.us')) return false;
    
    // Vérifier si un quiz est en cours dans ce groupe
    const groupQuiz = groupQuizzes[from];
    if (!groupQuiz) return false;
    
    // Vérifier si c'est une réponse a, b, c
    const cleanText = text.trim().toLowerCase();
    if (cleanText === 'a' || cleanText === '.a' || 
        cleanText === 'b' || cleanText === '.b' || 
        cleanText === 'c' || cleanText === '.c') {
        
        const answerLetter = cleanText.replace('.', '');
        return await processGroupAnswer(sock, from, msg, userId, userName, answerLetter);
    }
    
    return false;
}

// AJOUTER LES COMMANDES À THIS.COMMANDS
if (typeof this !== 'undefined' && this.commands) {
    // Commande .quiz pour démarrer un quiz multijoueur
    this.commands.set("quiz", {
        name: "quiz",
        description: "Démarrer un quiz multijoueur",
        execute: async (sock, msg, args) => {
            const from = msg.key.remoteJid;
            const userId = msg.key.participant || msg.key.remoteJid;
            const userName = msg.pushName || "Joueur";
            
            // Vérifier si c'est un groupe
            if (!from.includes('@g.us')) {
                await sock.sendMessage(from, {
                    text: "Cette commande fonctionne uniquement dans les groupes !"
                });
                return;
            }
            
            // .quiz off pour arrêter le quiz
            if (args[0] === 'off') {
                const groupQuiz = groupQuizzes[from];
                if (groupQuiz && groupQuiz.hostId === userId) {
                    await endGroupQuiz(sock, from);
                    await sock.sendMessage(from, {
                        text: "Quiz arrêté par l'hôte !"
                    });
                } else {
                    await sock.sendMessage(from, {
                        text: "Seul l'hôte du quiz peut l'arrêter !"
                    });
                }
                return;
            }
            
            // Si pas d'argument, afficher le menu avec WELCOME_IMAGE
            if (!args || args.length === 0 || args[0] === 'menu') {
                try {
                    await sock.sendMessage(from, {
                        image: { url: WELCOME_IMAGE },
                        caption: `╭━━〔 🎮 MENU  〕━━┈⊷
┃✰│➫ *QUIZ STANDARD*
┃✰│➫ .quiz sciences
┃✰│➫ .quiz histoire
┃✰│➫ .quiz business 
┃✰│➫ .quiz anime - Anime 🐉
┃✰│➫ .quiz mood - Mood 😌
┃✰│➫ .quiz prog 
┃✰│➫ .quiz religion 
┃✰│➫ 
┃✰│➫ *QUIZ ADULTE* (18+)
┃✰│➫ .quiz celib 
┃✰│➫ .quiz couple 
┃✰│➫ .quiz only18 
┃✰│➫ .quiz maturite🔞🧠
┃✰│➫ 
┃✰│➫ *AUTRES COMMANDES*
┃✰│➫ .joint - S'inscrire
┃✰│➫ .score - Classement
┃✰│➫ .quiz off - Quitter
╰━━━━━━━━━━━━━━━━━━┈⊷\n
📌 *Exemple:* .quiz sciences\n\n
> powered by HEX-TECH🇨🇩`
                    });
                } catch (error) {
                    await sock.sendMessage(from, {
                        text: `╭━━〔 🎮 MENU  〕━━┈⊷
┃✰│➫ *QUIZ STANDARD*
┃✰│➫ .quiz sciences
┃✰│➫ .quiz histoire 📜
┃✰│➫ .quiz business 
┃✰│➫ .quiz anime - Anime 🐉
┃✰│➫ .quiz mood - Mood 😌
┃✰│➫ .quiz prog 
┃✰│➫ .quiz religion 
┃✰│➫ 
┃✰│➫ *QUIZ ADULTE* (18+)
┃✰│➫ .quiz celib - 🔥
┃✰│➫ .quiz couple - 💑
┃✰│➫ .quiz only18 - 🔞
┃✰│➫ .quiz maturite 🔞🧠
┃✰│➫ 
┃✰│➫ *AUTRES COMMANDES*
┃✰│➫ .joint - S'inscrire
┃✰│➫ .score - Classement
┃✰│➫ .quiz off - Quitter
╰━━━━━━━━━━━━━━━━━━┈⊷\n
📌 *Exemple:* .quiz sciences\n\n
> powered by HEX-TECH🇨🇩`
                    });
                }
                return;
            }
            
            // Démarrer un quiz avec une catégorie
            const category = args[0].toLowerCase();
            const validCategories = [
                'sciences', 'histoire', 'business', 'anime','maturite',
                'mood', 'programmation', 'religion',
                'celib', 'couple', 'only18'
            ];
            
            if (!validCategories.includes(category)) {
                await sock.sendMessage(from, {
                    text: `❌ Catégorie invalide !\nUtilisez: .quiz sciences, .quiz histoire, etc.\nTapez .quiz menu pour voir toutes les catégories.`
                });
                return;
            }
            
            // Vérifier si c'est une catégorie adulte
            const isAdult = category.includes('celib') || category.includes('couple') || category === 'only18';
            
            if (isAdult && !adultScores[userId]) {
                adultScores[userId] = {
                    name: userName,
                    correct: 0,
                    total: 0,
                    games: 0,
                    joined: new Date().toISOString()
                };
                saveScores();
            } else if (!isAdult && !scores[userId]) {
                scores[userId] = {
                    name: userName,
                    correct: 0,
                    total: 0,
                    games: 0,
                    joined: new Date().toISOString()
                };
                saveScores();
            }
            
            await startGroupQuiz(sock, from, userId, userName, category);
        }
    });
    
    // Commande .joint pour rejoindre un quiz en cours
    this.commands.set("joint", {
        name: "joint",
        description: "Rejoindre un quiz multijoueur",
        execute: async (sock, msg, args) => {
            const from = msg.key.remoteJid;
            const userId = msg.key.participant || msg.key.remoteJid;
            const userName = msg.pushName || "Joueur";
            
            // Vérifier si c'est un groupe
            if (!from.includes('@g.us')) {
                await sock.sendMessage(from, {
                    text: "Cette commande fonctionne uniquement dans les groupes !"
                });
                return;
            }
            
            const groupQuiz = groupQuizzes[from];
            
            if (!groupQuiz) {
                await sock.sendMessage(from, {
                    text: "╭━━〔 ❌ PAS DE QUIZ 〕━━┈⊷\n┃✰│➫ Aucun quiz en cours !\n┃✰│➫ Tapez .quiz [catégorie]\n┃✰│➫ pour en démarrer un.\n╰━━━━━━━━━━━━━━━━━━━━━━┈⊷\n\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝚃𝙴𝙲𝙷🇨🇩"
                });
                return;
            }
            
            // Vérifier si le joueur est déjà inscrit
            if (groupQuiz.players[userId]) {
                await sock.sendMessage(from, {
                    text: `@${userName} tu es déjà dans le quiz !`
                });
                return;
            }
            
            // Ajouter le joueur
            groupQuiz.players[userId] = {
                name: userName,
                score: 0,
                correct: 0,
                answered: false,
                lastAnswerTime: null
            };
            
            await sock.sendMessage(from, {
                text: `╭━━〔 ✅ REJOINT 〕━━┈⊷\n┃✰│➫ @${userName} a rejoint !\n┃✰│➫ Catégorie: ${groupQuiz.category}\n┃✰│➫ Joueurs: ${Object.keys(groupQuiz.players).length}\n┃✰│➫ Hôte: @${groupQuiz.hostName}\n╰━━━━━━━━━━━━━━━━━━━━━━┈⊷\n\nRépondez avec a, b ou c le plus vite possible !`
            });
        }
    });
    
    // Commande .score pour voir le classement
    this.commands.set("score", {
        name: "score",
        description: "Voir le classement",
        execute: async (sock, msg, args) => {
            const from = msg.key.remoteJid;
            
            // Vérifier si c'est un groupe avec quiz en cours
            if (from.includes('@g.us') && groupQuizzes[from]) {
                await showCurrentScores(sock, from, groupQuizzes[from]);
                return;
            }
            
            // Sinon afficher le classement général
            const isAdult = args[0] === 'adulte';
            const targetScores = isAdult ? adultScores : scores;
            
            const participants = Object.keys(targetScores).length;
            
            if (participants === 0) {
                await sock.sendMessage(from, {
                    text: "╭━━〔 🏆 CLASSEMENT 〕━━┈⊷\n┃✰│➫ Aucun joueur inscrit\n┃✰│➫ Tapez *.joint* pour commencer\n╰━━━━━━━━━━━━━━━━━━━━━━┈⊷\n\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝚃𝙴𝙲𝙷🇨🇩"
                });
                return;
            }
            
            const sorted = Object.entries(targetScores)
                .sort(([,a], [,b]) => b.total - a.total)
                .slice(0, 10);
            
            let content = "╭━━〔 🏆 CLASSEMENT GÉNÉRAL 〕━━┈⊷\n";
            
            sorted.forEach(([id, data], i) => {
                const medal = i < 3 ? ["🥇","🥈","🥉"][i] : `┃✰│➫ ${i+1}.`;
                const name = data.name || id.split('@')[0];
                if (i < 3) {
                    content += `┃${medal}│➫ ${name}\n`;
                } else {
                    content += `${medal} ${name}\n`;
                }
                content += `┃✰│➫ Points: ${data.total}\n`;
                content += `┃✰│➫ Correct: ${data.correct}/${data.games}\n`;
                content += `┃✰│➫ ───────────────\n`;
            });
            
            content += `╰━━━━━━━━━━━━━━━━━━━━━━┈⊷\n\n`;
            content += `📊 *Statistiques:*\n`;
            content += `👥 Participants: ${participants}\n`;
            content += `🎮 Parties jouées: ${Object.values(targetScores).reduce((sum, d) => sum + (d.games || 0), 0)}\n\n`;
            content += `> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝚃𝙴𝙲𝙷🇨🇩`;
            
            await sock.sendMessage(from, { text: content });
        }
    });
    
    // Commandes de réponse directes
    this.commands.set("a", {
        name: "a",
        description: "Répondre A",
        execute: async (sock, msg, args) => {
            const from = msg.key.remoteJid;
            const userId = msg.key.participant || msg.key.remoteJid;
            const userName = msg.pushName || "Joueur";
            
            // Traiter comme réponse de groupe si dans un groupe avec quiz
            if (from.includes('@g.us') && groupQuizzes[from]) {
                await processGroupAnswer(sock, from, msg, userId, userName, 'a');
            } else {
                await sock.sendMessage(from, {
                    text: "╭━━〔 ❌ PAS DE QUIZ 〕━━┈⊷\n┃✰│➫ Aucun quiz en cours !\n┃✰│➫ Tapez .quiz [catégorie]\n╰━━━━━━━━━━━━━━━━━━━━━━┈⊷\n\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝚃𝙴𝙲𝙷🇨🇩"
                });
            }
        }
    });
    
    this.commands.set("b", {
        name: "b",
        description: "Répondre B",
        execute: async (sock, msg, args) => {
            const from = msg.key.remoteJid;
            const userId = msg.key.participant || msg.key.remoteJid;
            const userName = msg.pushName || "Joueur";
            
            if (from.includes('@g.us') && groupQuizzes[from]) {
                await processGroupAnswer(sock, from, msg, userId, userName, 'b');
            } else {
                await sock.sendMessage(from, {
                    text: "╭━━〔 ❌ PAS DE QUIZ 〕━━┈⊷\n┃✰│➫ Aucun quiz en cours !\n┃✰│➫ Tapez .quiz [catégorie]\n╰━━━━━━━━━━━━━━━━━━━━━━┈⊷\n\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝚃𝙴𝙲𝙷🇨🇩"
                });
            }
        }
    });
    
    this.commands.set("c", {
        name: "c",
        description: "Répondre C",
        execute: async (sock, msg, args) => {
            const from = msg.key.remoteJid;
            const userId = msg.key.participant || msg.key.remoteJid;
            const userName = msg.pushName || "Joueur";
            
            if (from.includes('@g.us') && groupQuizzes[from]) {
                await processGroupAnswer(sock, from, msg, userId, userName, 'c');
            } else {
                await sock.sendMessage(from, {
                    text: "╭━━〔 ❌ PAS DE QUIZ 〕━━┈⊷\n┃✰│➫ Aucun quiz en cours !\n┃✰│➫ Tapez .quiz [catégorie]\n╰━━━━━━━━━━━━━━━━━━━━━━┈⊷\n\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝚃𝙴𝙲𝙷🇨🇩"
                });
            }
        }
    });
}

// EXPORT POUR UTILISATION DANS INDEX.JS
module.exports = {
    // Fonction principale à appeler pour chaque message
    handleMessage: async function(sock, msg) {
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const from = msg.key.remoteJid;
        
        // 1. Vérifier les réponses dans les groupes (a, b, c)
        if (await handleGroupAnswer(sock, msg, text)) {
            return; // Réponse traitée
        }
        
        // 2. Le reste est géré par les commandes dans index.js
    },
    
    // Fonctions utilitaires accessibles
    groupQuizzes: groupQuizzes,
    scores: scores,
    adultScores: adultScores,
    saveScores: saveScores
};
// Liste de 90 mots interdits

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
    const configPath = path.join('./autokick.json');
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

    this.commands.set ( " delowner " , {
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
┃✰│➫ ${prefix}𝚍𝚎𝚕𝚎𝚝𝚐𝚛𝚙
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
  const ownerJid = OWNER_NUMBER.split(":")[0];
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
        console.log(`${colors.cyan}🎤 Fake Recording: ${fakeRecording ? 'ACTIVÉ' : 'DÉSACTIVÉ'}${colors.reset}`);
        
        // 🔴 MODIFICATION IMPORTANTE : ENVOI DE CONFIRMATION AU PROPRIÉTAIRE
        try {
          const confirmMessage = `✅ *HEX-GATE CONNECTEE*\n\n🚀 *HEXGATE V1* est en ligne!\n📊 *Commandes:* ${commandHandler.getCommandList().length}\n🔧 *Mode:* ${botPublic ? 'PUBLIC' : 'PRIVÉ'}\n🎤 *Fake Recording:* ${fakeRecording ? 'ACTIVÉ' : 'DÉSACTIVÉ'}\n🔓 *Restauration:* Messages & Images ACTIVÉE\n🔗 *systeme:* tapez menu`;
          
          await sock.sendMessage(OWNER_NUMBER, { text: confirmMessage });
          console.log(`${colors.green}✅ Confirmation envoyée au propriétaire: ${OWNER_NUMBER}${colors.reset}`);
        } catch (error) {
          console.log(`${colors.yellow}⚠️ Impossible d'envoyer message au propriétaire: ${error.message}${colors.reset}`);
        }
        
        botReady = true; // IMPORTANT : Marquer le bot comme prêt pour l'API
      }
    });

const { saveViewOnce } = require("./viewonce/store");

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
              fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
              
              await sendFormattedMessage(sock, OWNER_NUMBER, `✅ *BOT PASSÉ EN MODE PUBLIC*\n\nTous les utilisateurs peuvent maintenant utiliser les commandes.\n\n📊 Commandes disponibles: ${commandHandler.getCommandList().length}`);
              console.log(`${colors.green}🔓 Mode public activé${colors.reset}`);
              continue;
            }
            
            if (body === prefix + "private") {
              botPublic = false;
              config.botPublic = false;
              fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
              
              await sendFormattedMessage(sock, OWNER_NUMBER, `🔒 *BOT PASSÉ EN MODE PRIVÉ*\n\nSeul le propriétaire peut utiliser les commandes.`);
              console.log(`${colors.green}🔒 Mode privé activé${colors.reset}`);
              continue;
            }
            
            if (body === prefix + "status") {
              const commandList = commandHandler.getCommandList();
              const commandsText = commandList.slice(0, 10).map(cmd => `• ${prefix}${cmd}`).join('\n');
              const moreCommands = commandList.length > 10 ? `\n... et ${commandList.length - 10} autres` : '';
              
              await sendFormattedMessage(sock, OWNER_NUMBER, `📊 *STATUS DU BOT*\n\n🏷️ Nom: HEXGATE V3\n🔓 Mode: ${botPublic ? 'Public' : 'Privé'}\n🎤 Fake Recording: ${fakeRecording ? 'ACTIVÉ' : 'DÉSACTIVÉ'}\n📊 Commandes: ${commandList.length}\n💾 Messages sauvegardés: ${messageStore.size}\n🖼️ Images sauvegardées: ${fs.readdirSync(DELETED_IMAGES_FOLDER).length}\n⏰ Uptime: ${process.uptime().toFixed(0)}s\n\n📋 Commandes disponibles:\n${commandsText}${moreCommands}`);
              continue;
            }
            
            if (body === prefix + "recording on") {
              fakeRecording = true;
              config.fakeRecording = true;
              fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
              
              await sendFormattedMessage(sock, OWNER_NUMBER, `🎤 *FAKE RECORDING ACTIVÉ*\n\nLe bot simule maintenant un enregistrement vocal à chaque message reçu.`);
              console.log(`${colors.green}🎤 Fake recording activé${colors.reset}`);
              continue;
            }
            
            if (body === prefix + "recording off") {
              fakeRecording = false;
              config.fakeRecording = false;
              fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
              
              await sendFormattedMessage(sock, OWNER_NUMBER, `🎤 *FAKE RECORDING DÉSACTIVÉ*\n\nLe bot ne simule plus d'enregistrement vocal.`);
              console.log(`${colors.green}🎤 Fake recording désactivé${colors.reset}`);
              continue;
            }
            
            if (body === prefix + "restore") {
              const deletedCount = fs.readdirSync(DELETED_MESSAGES_FOLDER).length;
              const imageCount = fs.readdirSync(DELETED_IMAGES_FOLDER).length;
              
              await sendFormattedMessage(sock, OWNER_NUMBER, `🔄 *STATUS RESTAURATION*\n\n📊 Messages sauvegardés: ${deletedCount}\n🖼️ Images sauvegardées: ${imageCount}\n💾 En mémoire: ${messageStore.size}\n\n✅ Système de restauration actif!`);
              continue;
            }
            
            if (body === prefix + "help") {
              await sendFormattedMessage(sock, OWNER_NUMBER, `🛠️ *COMMANDES PROPRIÉTAIRE*\n\n• ${prefix}public - Mode public\n• ${prefix}private - Mode privé\n• ${prefix}status - Statut du bot\n• ${prefix}recording on/off - Fake recording\n• ${prefix}restore - Status restauration\n• ${prefix}help - Cette aide\n• ${prefix}menu - Liste des commandes\n\n🎯 Prefix actuel: "${prefix}"\n👑 Propriétaire: ${config.ownerNumber}`);
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
          
        case "recording":
          const state = args[0];
          if (state === "on") {
            fakeRecording = true;
            config.fakeRecording = true;
            fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
            console.log(`${colors.green}✅ Fake recording activé${colors.reset}`);
          } else if (state === "off") {
            fakeRecording = false;
            config.fakeRecording = false;
            fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
            console.log(`${colors.green}✅ Fake recording désactivé${colors.reset}`);
          }
          break;
          
        case "reload":
          commandHandler.reloadCommands();
          break;
          
        case "status":
          console.log(`${colors.cyan}📊 STATUT DU BOT${colors.reset}`);
          console.log(`${colors.yellow}• Mode: ${botPublic ? 'PUBLIC' : 'PRIVÉ'}${colors.reset}`);
          console.log(`${colors.yellow}• Fake Recording: ${fakeRecording ? 'ACTIVÉ' : 'DÉSACTIVÉ'}${colors.reset}`);
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
          console.log(`${colors.cyan}  • recording on/off - Fake recording${colors.reset}`);
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
// 🚀 DÉMARRAGE
// ============================================
console.log(`${colors.magenta}🚀 Démarrage de HEXGATE V3...${colors.reset}`);
startBot();

// ============================================
// 📦 EXPORTS POUR L'API
// ============================================
module.exports = {
  bot: sock,
  generatePairCode,
  isBotReady,
  config
};
