import express from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Définir __dirname pour ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 📱 Route principale - page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🔧 Route pour générer un code de pairing - CORRIGÉE
app.post('/api/pair', async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({ error: 'Numéro requis' });
        }
        
        // Nettoyer le numéro (garder seulement les chiffres)
        const cleanPhone = phone.replace(/\D/g, '');
        
        // VÉRIFICATION ET CORRECTION DU NUMÉRO
        let phoneWithCountry;
        
        // Liste des indicatifs pays courants en Afrique (peut être étendue)
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
            '243', // RD Congo (déjà)
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
            '297', // Aruba
            '298', // Îles Féroé
            '299', // Groenland
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
        
        // Vérifier si le numéro commence déjà par un indicatif pays connu
        let hasCountryCode = false;
        let detectedCode = '';
        
        for (const code of countryCodes) {
            if (cleanPhone.startsWith(code)) {
                hasCountryCode = true;
                detectedCode = code;
                break;
            }
        }
        
        if (hasCountryCode) {
            // Cas 1: Le numéro a déjà un indicatif pays valide
            phoneWithCountry = cleanPhone;
            console.log(`✅ Numéro avec indicatif ${detectedCode} détecté`);
        } else {
            // Cas 2: Le numéro n'a pas d'indicatif pays détectable
            // On vérifie s'il commence par un 0 (numéro local)
            if (cleanPhone.startsWith('0')) {
                // Enlever le 0 initial et ajouter 243 (RD Congo) par défaut
                phoneWithCountry = '243' + cleanPhone.substring(1);
                console.log(`🔧 Numéro local détecté, ajout indicatif 243`);
            } else {
                // Numéro sans 0 initial, on ajoute 243 par défaut
                phoneWithCountry = '243' + cleanPhone;
                console.log(`🔧 Aucun indicatif détecté, ajout 243 par défaut`);
            }
        }
        
        // VÉRIFICATION FINALE de la longueur du numéro
        if (phoneWithCountry.length < 10 || phoneWithCountry.length > 15) {
            console.warn(`⚠️ Numéro de longueur suspecte: ${phoneWithCountry} (${phoneWithCountry.length} chiffres)`);
        }
        
        console.log(`📱 Demande de pair code pour: ${phoneWithCountry}`);
        
        // Importer dynamiquement le module du bot
        const { generatePairCode, isBotReady } = await import('./index.js');
        
        if (!isBotReady()) {
            return res.status(503).json({ error: 'Bot non prêt, veuillez patienter...' });
        }
        
        const pairCode = await generatePairCode(phoneWithCountry);
        
        if (!pairCode) {
            return res.status(500).json({ error: 'Impossible de générer le code' });
        }
        
        // Sauvegarder les informations (optionnel)
        const logsDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        const logEntry = {
            originalPhone: phone,
            cleanPhone: cleanPhone,
            processedPhone: phoneWithCountry,
            code: pairCode,
            timestamp: new Date().toISOString(),
            ip: req.ip,
            countryCode: detectedCode || '243 (défaut)'
        };
        
        fs.appendFileSync(
            path.join(logsDir, 'pairing_logs.json'),
            JSON.stringify(logEntry) + '\n'
        );
        
        res.json({
            success: true,
            original: phone,
            phone: phoneWithCountry,
            code: pairCode,
            countryCode: detectedCode || '243',
            instructions: '1. Ouvrez WhatsApp sur votre téléphone\n2. Allez dans Paramètres > Périphériques liés > Lier un périphérique\n3. Scannez le QR code ou entrez le code'
        });
        
    } catch (error) {
        console.error('❌ Erreur API pair:', error);
        res.status(500).json({ error: error.message });
    }
});

// 📊 Route de statut
app.get('/api/status', async (req, res) => {
    try {
        const { isBotReady } = await import('./index.js');
        
        // Lire config.json
        const configPath = path.join(__dirname, 'config.json');
        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        
        res.json({
            botReady: isBotReady(),
            owner: config.ownerNumber || 'Non configuré',
            prefix: config.prefix || '.',
            mode: config.botPublic ? 'Public' : 'Privé',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📥 Route pour démarrer l'installation
app.post('/api/install', (req, res) => {
    const { phone, action } = req.body;
    
    if (action === 'check') {
        // Vérifier si les fichiers existent
        const files = {
            'index.js': fs.existsSync(path.join(__dirname, 'index.js')),
            'config.json': fs.existsSync(path.join(__dirname, 'config.json')),
            'package.json': fs.existsSync(path.join(__dirname, 'package.json')),
            'commands/': fs.existsSync(path.join(__dirname, 'commands'))
        };
        
        res.json({
            files,
            ready: files['index.js'] && files['config.json']
        });
    } else if (action === 'start') {
        // Démarrer le bot (pour utilisation future)
        res.json({ message: 'Bot démarré' });
    } else {
        res.status(400).json({ error: 'Action invalide' });
    }
});

// 🛠️ Route pour générer le code d'installation
app.post('/api/generate-code', (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({ error: 'Numéro requis' });
        }
        
        // Code d'installation simple
        const cleanedPhone = phone.replace(/\D/g, '');
        
        const installationCode = `// 🔧 CODE D'INSTALLATION HEXGATE V3
// 📱 Pour le numéro: ${phone}

const fs = require('fs');
const config = {
    prefix: ".",
    ownerNumber: "${cleanedPhone}",
    botPublic: true,
    fakeRecording: false,
    antiLink: true,
    alwaysOnline: true,
    logLevel: "silent",
    telegramLink: "https://t.me/hextechcar",
    botImageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyERDdGHGjmXPv_6tCBIChmD-svWkJatQlpzfxY5WqFg&s=10"
};

// Créer config.json
fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
console.log('✅ Configuration créée pour ${phone}');

// Instructions:
// 1. npm install @whiskeysockets/baileys pino
// 2. node index.js
// 3. Suivez les instructions dans le terminal

// 💡 Le bot vous demandera de saisir le code de pairing
// 💡 Utilisez le code obtenu sur le site web`;
        
        res.json({
            success: true,
            code: installationCode,
            filename: `install_${Date.now()}.js`
        });
        
    } catch (error) {
        console.error('❌ Erreur génération code:', error);
        res.status(500).json({ error: error.message });
    }
});

// 🚀 Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🌐 Serveur web démarré sur le port ${PORT}`);
    console.log(`📱 Accédez à: http://localhost:${PORT}`);
    
    // Démarrer le bot automatiquement
    console.log('🤖 Démarrage du bot WhatsApp...');
    import('./index.js').catch(error => {
        console.error('❌ Erreur démarrage bot:', error);
    });
});
