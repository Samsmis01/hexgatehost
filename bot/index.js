// bot/index.js

console.log('🔧 HEXGATE V3 - Mode Web Interface');
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

// Variables d'environnement pour le mode web
const sessionId = process.env.SESSION_ID || 'default-session';
const phoneNumber = process.env.PHONE_NUMBER || '';
const webMode = process.env.WEB_MODE === 'true';
const isRender = process.env.IS_RENDER === 'true';

console.log('📋 Configuration chargée:');
console.log(`  • Prefix: ${prefix}`);
console.log(`  • Owner: ${OWNER_NUMBER}`);
console.log(`  • Mode: ${botPublic ? 'Public' : 'Privé'}`);
console.log(`  • Fake Recording: ${fakeRecording ? 'Activé' : 'Désactivé'}`);
console.log(`  • Session ID: ${sessionId}`);
console.log(`  • Phone: ${phoneNumber || 'ATTENTE DE PAIRING'}`);
console.log(`  • Web Mode: ${webMode ? 'OUI' : 'NON'}`);
console.log(`  • Render: ${isRender ? 'OUI' : 'NON'}`);

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

// ============================================
// 🎯 FONCTION PRINCIPALE POUR LE WEB
// ============================================
async function startBotForWeb(phone, pairingCode = null) {
    console.log('🎯 DÉMARRAGE BOT POUR WEB');
    console.log(`📱 Numéro: ${phone || 'ATTENTE DE PAIRING'}`);
    console.log(`🔑 Mode: ${pairingCode ? 'CODE FOURNI' : 'GÉNÉRATION DE CODE'}`);
    
    // Démarrer le bot normalement
    return await startBot();
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
      // En mode web, utiliser le numéro de l'environnement
      if (webMode && phoneNumber) {
        console.log(`${colors.cyan}📱 Utilisation du numéro depuis l'environnement: ${phoneNumber}${colors.reset}`);
        resolve(phoneNumber);
        return;
      }
      
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
    
    const sock = makeWASocket({
      version,
      logger: P({ level: logLevel }),
      printQRInTerminal: false,
      auth: state,
      browser: Browsers.ubuntu("Chrome"),
      markOnlineOnConnect: alwaysOnline,
      syncFullHistory: false,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr && !webMode) {
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
      }
    });

    // ⚡ AJOUTER CE BLOC POUR LE MODE WEB : GÉNÉRER UN PAIRING CODE AUTOMATIQUEMENT
    if (webMode && phoneNumber) {
        console.log(`${colors.cyan}🎯 MODE WEB ACTIVÉ - GÉNÉRATION DE PAIRING CODE${colors.reset}`);
        
        // Attendre que la connexion soit prête
        setTimeout(async () => {
            try {
                console.log(`${colors.cyan}🔑 Génération du pairing code pour: ${phoneNumber}${colors.reset}`);
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`${colors.green}✅ Code de pairing: ${code}${colors.reset}`);
                console.log(`${colors.yellow}📝 NOTE POUR LE SERVEUR WEB: Pairing code généré${colors.reset}`);
                
                // Ce message est détecté par server.js
                console.log(`🎯 PAIRING_CODE_GENERATED: ${code}`);
                
            } catch (pairError) {
                console.log(`${colors.red}❌ Erreur génération pairing code: ${pairError.message}${colors.reset}`);
            }
        }, 5000);
    }

    // ... [LE RESTE DE TON CODE INDEX.JS EXISTANT ICI] ...
    // Garde TOUTE la logique de ton bot (commandes, message handling, etc.)
    // Je ne modifie pas cette partie pour garder ton intégralité de code

  } catch (error) {
    console.log(`${colors.red}❌ Erreur démarrage bot: ${error.message}${colors.reset}`);
    console.error(error);
    process.exit(1);
  }
}

// ============================================
// 📦 EXPORTS POUR LE SERVEUR WEB
// ============================================
export { startBotForWeb };

// Démarrer automatiquement si exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
    startBot();
}
