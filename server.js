const express = require('express');
const path = require('path');
const { bot, generatePairCode, isBotReady, config } = require('./index.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Variables pour l'interface web
const usersDB = new Map();

// Page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API pour vérifier le statut du bot
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        botReady: isBotReady(),
        botName: 'HEXGATE V3',
        owner: config.ownerNumber,
        prefix: config.prefix,
        public: config.botPublic,
        uptime: process.uptime()
    });
});

// API pour générer un code de pairing
app.post('/api/generate-paircode', async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({ error: 'Numéro WhatsApp requis' });
        }
        
        // Nettoyer le numéro
        const cleanPhone = phone.replace(/\D/g, '');
        
        if (cleanPhone.length < 9) {
            return res.status(400).json({ error: 'Numéro invalide' });
        }
        
        // Vérifier si le bot est prêt
        if (!isBotReady()) {
            return res.status(503).json({ error: 'Bot non connecté à WhatsApp' });
        }
        
        // Générer le code de pairing
        const code = await generatePairCode(cleanPhone);
        
        if (!code) {
            return res.status(500).json({ error: 'Impossible de générer le code' });
        }
        
        // Stocker l'information
        usersDB.set(cleanPhone, {
            code,
            timestamp: Date.now(),
            status: 'pending'
        });
        
        res.json({
            success: true,
            code,
            message: 'Code généré avec succès',
            instructions: 'Sur WhatsApp, allez dans Paramètres > Périphériques liés > Ajouter un périphérique'
        });
        
    } catch (error) {
        console.error('Erreur génération paircode:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// API pour vérifier un utilisateur
app.get('/api/check-user/:phone', (req, res) => {
    const { phone } = req.params;
    const cleanPhone = phone.replace(/\D/g, '');
    
    const userData = usersDB.get(cleanPhone);
    
    if (!userData) {
        return res.json({ exists: false });
    }
    
    res.json({
        exists: true,
        code: userData.code,
        timestamp: userData.timestamp,
        status: userData.status
    });
});

// Endpoint de santé pour Render.com
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        bot: isBotReady() ? 'connected' : 'disconnected'
    });
});

// Route 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur web démarré sur le port ${PORT}`);
    console.log(`🌐 Accédez à: http://localhost:${PORT}`);
    console.log(`🤖 Statut bot: ${isBotReady() ? '✅ Connecté' : '⏳ En attente'}`);
});

// Gérer la fermeture propre
process.on('SIGTERM', () => {
    console.log('🛑 Signal SIGTERM reçu, fermeture propre...');
    process.exit(0);
});
