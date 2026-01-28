const express = require('express');
const path = require('path');
const fs = require('fs');

// Créer l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Variables pour l'interface web
const usersDB = new Map();

// Variable pour stocker le module bot
let botModule = null;
let botStarted = false;

// Fonction pour initialiser le bot
async function initializeBot() {
    try {
        if (botModule || botStarted) return true;
        
        console.log('🤖 Initialisation du bot WhatsApp...');
        
        // Charger le module bot
        botModule = require('./index.js');
        console.log('✅ Module bot chargé');
        
        // Démarrer le bot si la fonction existe
        if (botModule.startBot && typeof botModule.startBot === 'function') {
            console.log('🚀 Démarrage du bot...');
            await botModule.startBot();
            botStarted = true;
            console.log('✅ Bot démarré avec succès');
        } else {
            console.log('⚠️ Bot auto-démarrable ou déjà démarré');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Erreur initialisation bot:', error.message);
        return false;
    }
}

// Page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Page QR code (alternative)
app.get('/qr', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>QR Code WhatsApp - HEXGATE V3</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
                .container { background: rgba(255, 255, 255, 0.95); border-radius: 20px; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2); width: 100%; max-width: 500px; overflow: hidden; padding: 30px; }
                .header { background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%); color: white; padding: 20px; text-align: center; border-radius: 15px; margin-bottom: 30px; }
                .logo { width: 60px; height: 60px; background: white; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 28px; color: #25D366; }
                .title { font-size: 24px; font-weight: 700; margin-bottom: 5px; }
                .subtitle { font-size: 14px; opacity: 0.9; font-weight: 300; }
                .instructions { background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #25D366; }
                .instructions h3 { color: #333; margin-bottom: 10px; }
                .instructions ol { margin-left: 20px; margin-top: 10px; }
                .instructions li { margin-bottom: 8px; color: #555; }
                .btn { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #25D366 0%, #1DA851 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 700; margin-top: 20px; transition: all 0.3s; border: none; cursor: pointer; font-size: 16px; width: 100%; text-align: center; }
                .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 211, 102, 0.3); }
                .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
                .status { background: #e8f5e9; padding: 15px; border-radius: 10px; margin: 20px 0; text-align: center; border: 1px solid #c8e6c9; }
                .status.online { background: #e8f5e9; border-color: #c8e6c9; }
                .status.offline { background: #ffebee; border-color: #ffcdd2; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">📱</div>
                    <h1 class="title">HEXGATE V3</h1>
                    <p class="subtitle">CONNEXION WHATSAPP</p>
                </div>

                <div class="instructions">
                    <h3>📱 Instructions de connexion :</h3>
                    <ol>
                        <li>Retournez à la page d'accueil</li>
                        <li>Entrez votre numéro WhatsApp (ex: 243983205767)</li>
                        <li>Cliquez sur "OBTENIR LE CODE"</li>
                        <li>Sur WhatsApp mobile : <strong>Paramètres → Périphériques liés → Ajouter un périphérique</strong></li>
                        <li>Saisissez le code à 6 chiffres généré</li>
                        <li>Votre compte sera lié au bot automatiquement</li>
                    </ol>
                </div>

                <div class="status" id="serverStatus">
                    <strong>⏳ Vérification du statut...</strong>
                    <p>Chargement en cours</p>
                </div>

                <a href="/" class="btn">← RETOUR À L'ACCUEIL</a>

                <div class="footer">PROPULSÉ PAR HEXTECH | HEXGATE V3</div>
            </div>

            <script>
                async function checkServerStatus() {
                    try {
                        const response = await fetch('/api/status');
                        const data = await response.json();
                        
                        const statusElement = document.getElementById('serverStatus');
                        if (data.botReady) {
                            statusElement.className = 'status online';
                            statusElement.innerHTML = '<strong>✅ Bot WhatsApp Connecté</strong><p>Prêt à générer des codes de pairing</p>';
                        } else {
                            statusElement.className = 'status offline';
                            statusElement.innerHTML = '<strong>⏳ Bot en démarrage</strong><p>Le bot WhatsApp est en cours de connexion...</p>';
                        }
                    } catch (error) {
                        console.log('Statut non disponible');
                    }
                }

                checkServerStatus();
                setInterval(checkServerStatus, 10000);
            </script>
        </body>
        </html>
    `);
});

// API pour vérifier le statut du bot
app.get('/api/status', (req, res) => {
    try {
        let botReady = false;
        let config = {};
        
        if (botModule) {
            try {
                botReady = botModule.isBotReady ? botModule.isBotReady() : false;
                config = botModule.config || {};
            } catch (botError) {
                console.log('Bot erreur:', botError.message);
            }
        }
        
        res.json({
            status: 'online',
            botReady: botReady,
            botName: 'HEXGATE V3',
            owner: config.ownerNumber || '243983205767',
            prefix: config.prefix || '.',
            public: config.botPublic || false,
            uptime: process.uptime(),
            serverTime: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            port: PORT,
            renderUrl: process.env.RENDER_EXTERNAL_URL || null
        });
    } catch (error) {
        console.error('Erreur API status:', error);
        res.status(500).json({
            status: 'error',
            error: error.message,
            serverTime: new Date().toISOString()
        });
    }
});

// API pour générer un code de pairing
app.post('/api/generate-paircode', async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({ 
                success: false,
                error: 'Numéro WhatsApp requis' 
            });
        }
        
        // Nettoyer le numéro
        const cleanPhone = phone.replace(/\D/g, '');
        
        if (cleanPhone.length < 9) {
            return res.status(400).json({ 
                success: false,
                error: 'Numéro invalide (minimum 9 chiffres)' 
            });
        }
        
        console.log(`📱 Demande de code pour: ${cleanPhone}`);
        
        // Initialiser le bot si pas encore fait
        if (!botModule) {
            const initialized = await initializeBot();
            if (!initialized) {
                return res.status(503).json({
                    success: false,
                    error: 'Bot non disponible',
                    message: 'Le bot WhatsApp est en cours de démarrage. Veuillez réessayer dans quelques instants.'
                });
            }
        }
        
        const { isBotReady, generatePairCode } = botModule;
        
        if (!isBotReady || !isBotReady()) {
            return res.status(503).json({ 
                success: false,
                error: 'Bot non connecté à WhatsApp',
                message: 'Le bot est en cours de connexion à WhatsApp. Veuillez patienter...'
            });
        }
        
        if (!generatePairCode || typeof generatePairCode !== 'function') {
            return res.status(500).json({
                success: false,
                error: 'Fonction de génération non disponible'
            });
        }
        
        // Générer le code de pairing
        console.log(`🔑 Génération du code pour ${cleanPhone}...`);
        const code = await generatePairCode(cleanPhone);
        
        if (!code) {
            return res.status(500).json({ 
                success: false,
                error: 'Impossible de générer le code',
                message: 'Assurez-vous que le numéro est valide et que le bot est correctement configuré.'
            });
        }
        
        // Stocker l'information
        usersDB.set(cleanPhone, {
            code: code,
            timestamp: Date.now(),
            status: 'pending',
            ip: req.ip
        });
        
        console.log(`✅ Code généré pour ${cleanPhone}: ${code}`);
        
        res.json({
            success: true,
            code: code,
            phone: cleanPhone,
            message: 'Code généré avec succès',
            instructions: 'Sur WhatsApp : Paramètres > Périphériques liés > Ajouter un périphérique',
            expiresIn: '5 minutes',
            timestamp: Date.now()
        });
        
    } catch (error) {
        console.error('❌ Erreur génération paircode:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur interne du serveur',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API pour vérifier un utilisateur
app.get('/api/check-user/:phone', (req, res) => {
    try {
        const { phone } = req.params;
        const cleanPhone = phone.replace(/\D/g, '');
        
        const userData = usersDB.get(cleanPhone);
        
        if (!userData) {
            return res.json({ 
                exists: false,
                message: 'Aucun code généré pour ce numéro'
            });
        }
        
        // Vérifier si le code a expiré (5 minutes)
        const now = Date.now();
        const expiresAt = userData.timestamp + (5 * 60 * 1000);
        const isExpired = now > expiresAt;
        
        if (isExpired) {
            usersDB.delete(cleanPhone);
            return res.json({ 
                exists: false, 
                expired: true,
                message: 'Le code a expiré. Veuillez en générer un nouveau.'
            });
        }
        
        res.json({
            exists: true,
            code: userData.code,
            phone: cleanPhone,
            timestamp: userData.timestamp,
            expiresAt: expiresAt,
            status: userData.status,
            timeRemaining: Math.max(0, Math.floor((expiresAt - now) / 1000)),
            timeRemainingFormatted: formatTimeRemaining(expiresAt - now)
        });
    } catch (error) {
        console.error('Erreur vérification utilisateur:', error);
        res.status(500).json({ 
            error: 'Erreur interne du serveur',
            message: error.message 
        });
    }
});

// Fonction pour formater le temps restant
function formatTimeRemaining(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Endpoint de santé pour Render.com
app.get('/health', (req, res) => {
    try {
        let botStatus = 'unknown';
        if (botModule) {
            try {
                const { isBotReady } = botModule;
                botStatus = isBotReady ? (isBotReady() ? 'connected' : 'disconnected') : 'not_loaded';
            } catch (error) {
                botStatus = 'error';
            }
        }
        
        res.json({ 
            status: 'healthy',
            timestamp: new Date().toISOString(),
            serverUptime: process.uptime(),
            bot: botStatus,
            memory: {
                rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
                heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
                heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
            },
            nodeVersion: process.version,
            platform: process.platform,
            port: PORT,
            users: usersDB.size
        });
    } catch (error) {
        res.status(500).json({
            status: 'degraded',
            timestamp: new Date().toISOString(),
            error: error.message,
            serverUptime: process.uptime()
        });
    }
});

// Route pour afficher les infos du serveur
app.get('/info', (req, res) => {
    res.json({
        name: 'HEXGATE V3 WhatsApp Bot',
        version: '3.0.0',
        description: 'Interface web pour la connexion au bot WhatsApp',
        author: 'HEXTECH',
        endpoints: {
            home: '/',
            qrAlternative: '/qr',
            status: 'GET /api/status',
            generateCode: 'POST /api/generate-paircode',
            checkUser: 'GET /api/check-user/:phone',
            health: '/health',
            info: '/info'
        },
        features: [
            'Génération de codes de pairing WhatsApp',
            'Interface web responsive',
            'Connexion multi-appareils',
            'Bot WhatsApp avec commandes',
            'Déploiement sur Render.com'
        ],
        environment: {
            port: PORT,
            nodeEnv: process.env.NODE_ENV || 'development',
            platform: process.platform,
            renderExternalUrl: process.env.RENDER_EXTERNAL_URL || 'localhost'
        },
        statistics: {
            activeUsers: usersDB.size,
            serverUptime: process.uptime()
        }
    });
});

// Route pour démarrer le bot manuellement
app.post('/api/start-bot', async (req, res) => {
    try {
        if (botStarted) {
            return res.json({ success: true, message: 'Bot déjà démarré' });
        }
        
        const initialized = await initializeBot();
        
        if (initialized) {
            res.json({ success: true, message: 'Bot démarré avec succès' });
        } else {
            res.status(500).json({ success: false, error: 'Échec du démarrage du bot' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Route non trouvée',
        path: req.path,
        method: req.method,
        availableRoutes: [
            { path: '/', method: 'GET', description: 'Page d\'accueil' },
            { path: '/qr', method: 'GET', description: 'Page QR code alternative' },
            { path: '/api/status', method: 'GET', description: 'Statut du serveur et du bot' },
            { path: '/api/generate-paircode', method: 'POST', description: 'Générer un code de pairing' },
            { path: '/api/check-user/:phone', method: 'GET', description: 'Vérifier un code utilisateur' },
            { path: '/health', method: 'GET', description: 'Santé du serveur' },
            { path: '/info', method: 'GET', description: 'Informations du serveur' },
            { path: '/api/start-bot', method: 'POST', description: 'Démarrer le bot manuellement' }
        ]
    });
});

// Middleware de gestion d'erreurs global
app.use((err, req, res, next) => {
    console.error('❌ Erreur serveur:', err.stack);
    res.status(500).json({
        error: 'Erreur interne du serveur',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue',
        timestamp: new Date().toISOString()
    });
});

// Démarrer le serveur
const server = app.listen(PORT, () => {
    console.log(`🚀 Serveur web démarré sur le port ${PORT}`);
    console.log(`🌐 Accédez à: http://localhost:${PORT}`);
    
    if (process.env.RENDER_EXTERNAL_URL) {
        console.log(`🌍 URL Render: ${process.env.RENDER_EXTERNAL_URL}`);
    }
    
    console.log(`🤖 Environnement: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🖥️  Plateforme: ${process.platform}`);
    console.log(`⚡ Node.js: ${process.version}`);
    console.log(`📊 Mémoire: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
    
    // Vérifier si le dossier public existe
    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
        console.log(`✅ Dossier public créé`);
        
        // Créer une page index.html par défaut
        const defaultHtml = `<!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>HEXGATE V3 WhatsApp Bot</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; text-align: center; }
                .container { background: #f5f5f5; padding: 30px; border-radius: 10px; margin-top: 50px; }
                .btn { display: inline-block; padding: 15px 30px; background: #25D366; color: white; text-decoration: none; border-radius: 8px; margin: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>HEXGATE V3 WhatsApp Bot</h1>
                <p>Serveur web en ligne. Pour utiliser l'interface complète :</p>
                <a href="/qr" class="btn">📱 Interface de Connexion WhatsApp</a>
                <br>
                <a href="/api/status" class="btn">📊 Statut du Serveur</a>
                <a href="/info" class="btn">ℹ️ Informations</a>
            </div>
        </body>
        </html>`;
        
        fs.writeFileSync(path.join(publicDir, 'index.html'), defaultHtml);
        console.log(`📄 Page index.html par défaut créée`);
    }
    
    // Initialiser le bot après un délai
    console.log(`⏳ Initialisation du bot WhatsApp dans 3 secondes...`);
    setTimeout(async () => {
        try {
            await initializeBot();
        } catch (error) {
            console.error(`❌ Échec initialisation bot: ${error.message}`);
        }
    }, 3000);
});

// Gestion des erreurs du serveur
server.on('error', (error) => {
    console.error(`❌ Erreur serveur: ${error.message}`);
    if (error.code === 'EADDRINUSE') {
        console.log(`⚠️ Le port ${PORT} est déjà utilisé.`);
        process.exit(1);
    } else if (error.code === 'EACCES') {
        console.log(`⚠️ Permission refusée sur le port ${PORT}.`);
        process.exit(1);
    }
});

// Gérer la fermeture propre
process.on('SIGTERM', () => {
    console.log('🛑 Signal SIGTERM reçu, fermeture propre...');
    server.close(() => {
        console.log('✅ Serveur web fermé proprement');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 Signal SIGINT (Ctrl+C) reçu, fermeture...');
    server.close(() => {
        console.log('✅ Serveur web fermé proprement');
        process.exit(0);
    });
});

// Nettoyage périodique des codes expirés
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [phone, data] of usersDB.entries()) {
        if (now > data.timestamp + (5 * 60 * 1000)) {
            usersDB.delete(phone);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`🧹 Nettoyage: ${cleaned} codes expirés supprimés`);
    }
}, 60000);

// Exporter l'application
module.exports = app;
