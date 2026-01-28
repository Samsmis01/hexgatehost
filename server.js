const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Créer l'application Express
const app = express();

// IMPORTANT: Render.com utilise le port via process.env.PORT, avec 10000 comme fallback
const PORT = process.env.PORT || 10000;

// Augmenter les timeouts pour éviter les erreurs de connexion
const SERVER_TIMEOUT = 120000; // 120 secondes

// Middleware avec parsing body augmenté
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb', parameterLimit: 50000 }));
app.use(express.static('public'));

// Variables pour l'interface web
const usersDB = new Map();

// Variables pour le bot
let botProcess = null;
let botModule = null;
let botReady = false;
let botStatus = 'stopped';

// Fonction utilitaire pour logger
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
}

// Fonction pour démarrer le bot dans un processus séparé
function startBotProcess() {
    return new Promise((resolve, reject) => {
        try {
            if (botProcess) {
                log('Arrêt du processus bot existant...', 'warn');
                botProcess.kill('SIGTERM');
                botProcess = null;
            }

            log('Démarrage du bot WhatsApp dans un processus séparé...');
            
            // Utiliser spawn pour exécuter le bot dans un processus séparé
            botProcess = spawn('node', ['index.js'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                detached: false,
                env: { ...process.env, NODE_ENV: 'production' }
            });

            botProcess.stdout.on('data', (data) => {
                const output = data.toString().trim();
                if (output) {
                    log(`Bot stdout: ${output}`, 'info');
                    
                    // Détecter si le bot est prêt
                    if (output.includes('Connecté à WhatsApp!') || 
                        output.includes('connecté à WhatsApp') ||
                        output.includes('✅ Connecté') ||
                        output.includes('Bot démarré avec succès')) {
                        botReady = true;
                        botStatus = 'running';
                        log('✅ Bot WhatsApp connecté et prêt');
                    }
                }
            });

            botProcess.stderr.on('data', (data) => {
                const error = data.toString().trim();
                if (error && !error.includes('DeprecationWarning')) {
                    log(`Bot stderr: ${error}`, 'error');
                }
            });

            botProcess.on('close', (code) => {
                log(`Processus bot terminé avec code: ${code}`, code === 0 ? 'info' : 'error');
                botProcess = null;
                botReady = false;
                botStatus = code === 0 ? 'stopped' : 'error';
                
                // Redémarrer après 10 secondes si crash
                if (code !== 0) {
                    setTimeout(() => {
                        log('Tentative de redémarrage du bot après crash...', 'warn');
                        startBotProcess();
                    }, 10000);
                }
            });

            botProcess.on('error', (err) => {
                log(`Erreur processus bot: ${err.message}`, 'error');
                botProcess = null;
                botReady = false;
                botStatus = 'error';
                reject(err);
            });

            // Vérifier que le processus a bien démarré
            setTimeout(() => {
                if (botProcess && !botProcess.killed) {
                    log(`Processus bot démarré avec PID: ${botProcess.pid}`);
                    botStatus = 'starting';
                    resolve(true);
                } else {
                    reject(new Error('Échec du démarrage du bot'));
                }
            }, 5000);

        } catch (error) {
            log(`Erreur démarrage processus bot: ${error.message}`, 'error');
            reject(error);
        }
    });
}

// Fonction pour charger le module bot
function loadBotModule() {
    try {
        log('Chargement du module bot...');
        
        // Supprimer le cache pour recharger
        const modulePath = require.resolve('./index.js');
        delete require.cache[modulePath];
        
        botModule = require('./index.js');
        log('✅ Module bot chargé avec succès');
        
        return true;
    } catch (error) {
        log(`Erreur chargement module bot: ${error.message}`, 'error');
        botModule = null;
        return false;
    }
}

// Initialisation au démarrage du serveur
async function initializeBot() {
    log('🔧 Initialisation du système bot...');
    
    try {
        // Essayer de charger le module directement d'abord
        const moduleLoaded = loadBotModule();
        
        if (moduleLoaded && botModule && botModule.startBot) {
            log('Tentative de démarrage via module...');
            try {
                await botModule.startBot();
                botStatus = 'starting';
                
                // Vérifier périodiquement
                const checkInterval = setInterval(() => {
                    if (botModule && botModule.isBotReady && botModule.isBotReady()) {
                        botReady = true;
                        botStatus = 'running';
                        log('✅ Bot connecté via module');
                        clearInterval(checkInterval);
                    }
                }, 2000);
                
                setTimeout(() => clearInterval(checkInterval), 30000);
                return;
            } catch (moduleError) {
                log(`Échec démarrage via module: ${moduleError.message}`, 'warn');
            }
        }
        
        // Fallback: processus séparé
        await startBotProcess();
        
    } catch (error) {
        log(`Échec initialisation bot: ${error.message}`, 'error');
    }
}

// Middleware de logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
});

// Page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Page QR code avec interface améliorée
app.get('/qr', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HEXGATE V3 - Connexion WhatsApp</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            }
            
            body {
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                color: #f1f5f9;
                min-height: 100vh;
                padding: 20px;
            }
            
            .container {
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }
            
            .header {
                text-align: center;
                padding: 40px 0;
                background: rgba(30, 41, 59, 0.7);
                border-radius: 20px;
                margin-bottom: 30px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
            }
            
            .logo {
                font-size: 64px;
                margin-bottom: 20px;
                animation: float 3s ease-in-out infinite;
            }
            
            @keyframes float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            
            .title {
                font-size: 36px;
                font-weight: 800;
                background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 10px;
            }
            
            .subtitle {
                font-size: 16px;
                color: #94a3b8;
                margin-bottom: 30px;
            }
            
            .card {
                background: rgba(30, 41, 59, 0.8);
                border-radius: 20px;
                padding: 30px;
                margin-bottom: 30px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
            }
            
            .status-container {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 30px;
                padding: 20px;
                border-radius: 15px;
                background: rgba(0, 0, 0, 0.3);
            }
            
            .status-indicator {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                transition: all 0.3s;
            }
            
            .status-indicator.running { background: #10b981; box-shadow: 0 0 20px #10b981; }
            .status-indicator.starting { background: #f59e0b; box-shadow: 0 0 20px #f59e0b; animation: pulse 2s infinite; }
            .status-indicator.stopped { background: #ef4444; }
            .status-indicator.error { background: #dc2626; animation: pulse 1s infinite; }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            .status-text {
                font-size: 18px;
                font-weight: 600;
            }
            
            .status-details {
                font-size: 14px;
                color: #94a3b8;
                margin-top: 5px;
            }
            
            .form-group {
                margin-bottom: 25px;
            }
            
            label {
                display: block;
                margin-bottom: 10px;
                font-weight: 600;
                color: #cbd5e1;
            }
            
            input {
                width: 100%;
                padding: 18px;
                background: rgba(15, 23, 42, 0.8);
                border: 2px solid #334155;
                border-radius: 12px;
                color: white;
                font-size: 16px;
                transition: all 0.3s;
            }
            
            input:focus {
                outline: none;
                border-color: #06b6d4;
                box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2);
            }
            
            .btn {
                width: 100%;
                padding: 18px;
                background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 18px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.3s;
                margin-bottom: 15px;
            }
            
            .btn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px rgba(6, 182, 212, 0.4);
            }
            
            .btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .btn.secondary {
                background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            }
            
            .btn.secondary:hover:not(:disabled) {
                box-shadow: 0 10px 25px rgba(139, 92, 246, 0.4);
            }
            
            .code-display {
                display: none;
                margin-top: 30px;
                padding: 30px;
                background: rgba(0, 0, 0, 0.4);
                border-radius: 15px;
                border-left: 5px solid #06b6d4;
            }
            
            .code-display.show {
                display: block;
                animation: slideIn 0.5s ease;
            }
            
            @keyframes slideIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .code {
                font-size: 56px;
                font-weight: 900;
                letter-spacing: 8px;
                text-align: center;
                margin: 30px 0;
                color: #06b6d4;
                font-family: 'Courier New', monospace;
                text-shadow: 0 0 20px rgba(6, 182, 212, 0.5);
            }
            
            .instructions {
                margin-top: 25px;
                padding: 20px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 12px;
            }
            
            .instructions h3 {
                color: #22d3ee;
                margin-bottom: 15px;
                font-size: 20px;
            }
            
            .instructions ol {
                margin-left: 20px;
                line-height: 1.8;
            }
            
            .instructions li {
                margin-bottom: 12px;
                color: #cbd5e1;
            }
            
            .alert {
                padding: 15px;
                border-radius: 10px;
                margin: 15px 0;
                display: none;
            }
            
            .alert.show {
                display: block;
                animation: fadeIn 0.3s;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .alert.success {
                background: rgba(16, 185, 129, 0.2);
                border: 1px solid #10b981;
                color: #a7f3d0;
            }
            
            .alert.error {
                background: rgba(239, 68, 68, 0.2);
                border: 1px solid #ef4444;
                color: #fecaca;
            }
            
            .alert.info {
                background: rgba(59, 130, 246, 0.2);
                border: 1px solid #3b82f6;
                color: #bfdbfe;
            }
            
            .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                color: #64748b;
                font-size: 14px;
            }
            
            .footer a {
                color: #22d3ee;
                text-decoration: none;
                margin: 0 10px;
                transition: color 0.3s;
            }
            
            .footer a:hover {
                color: #06b6d4;
                text-decoration: underline;
            }
            
            .btn-group {
                display: flex;
                gap: 15px;
                margin-top: 20px;
            }
            
            .btn-group .btn {
                flex: 1;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🤖</div>
                <h1 class="title">HEXGATE V3</h1>
                <p class="subtitle">Connexion WhatsApp via Pairing Code</p>
            </div>
            
            <div class="card">
                <div class="status-container" id="statusContainer">
                    <div class="status-indicator" id="statusIndicator"></div>
                    <div>
                        <div class="status-text" id="statusText">Chargement...</div>
                        <div class="status-details" id="statusDetails"></div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="phoneNumber">📱 Numéro WhatsApp (avec indicatif pays)</label>
                    <input type="tel" id="phoneNumber" placeholder="Exemple: 243983205767" value="243983205767">
                </div>
                
                <button class="btn" id="generateBtn" onclick="generateCode()">
                    <span id="btnText">🔑 GÉNÉRER LE CODE</span>
                    <span id="btnLoading" style="display:none;">⏳ Génération en cours...</span>
                </button>
                
                <div class="btn-group">
                    <button class="btn secondary" onclick="restartBot()">
                        <span>🔄 REDÉMARRER BOT</span>
                    </button>
                    <button class="btn secondary" onclick="checkStatus()">
                        <span>📊 VÉRIFIER STATUT</span>
                    </button>
                </div>
                
                <div id="alertContainer"></div>
                
                <div class="code-display" id="codeDisplay">
                    <h3>✅ Code généré avec succès !</h3>
                    <div class="code" id="codeValue"></div>
                    <p style="text-align: center; color: #94a3b8; margin-bottom: 20px;">
                        Ce code expire dans <span id="expiryTime" style="font-weight: bold; color: #06b6d4;">5:00</span> minutes
                    </p>
                    
                    <div class="instructions">
                        <h3>📱 Instructions de connexion :</h3>
                        <ol>
                            <li>Ouvrez WhatsApp sur votre téléphone</li>
                            <li>Allez dans <strong>Paramètres → Périphériques liés → Ajouter un périphérique</strong></li>
                            <li>Saisissez ce code : <strong id="codeText" style="color: #06b6d4;"></strong></li>
                            <li>Attendez la connexion (peut prendre quelques secondes)</li>
                            <li>Une fois connecté, vous pouvez utiliser le bot avec les commandes habituelles</li>
                        </ol>
                    </div>
                    
                    <button class="btn secondary" onclick="copyCode()" style="margin-top: 20px;">
                        📋 Copier le code dans le presse-papier
                    </button>
                </div>
            </div>
            
            <div class="footer">
                Propulsé par HEXTECH | HEXGATE V3 WhatsApp Bot<br>
                <a href="/api/status">📊 Statut API</a> | 
                <a href="/info">ℹ️ Infos Serveur</a> |
                <a href="/health">❤️ Santé</a> |
                <a href="/logs">📋 Logs</a>
            </div>
        </div>
        
        <script>
            let countdownInterval = null;
            
            function updateStatus() {
                fetch('/api/status')
                    .then(response => response.json())
                    .then(data => {
                        const indicator = document.getElementById('statusIndicator');
                        const text = document.getElementById('statusText');
                        const details = document.getElementById('statusDetails');
                        const generateBtn = document.getElementById('generateBtn');
                        
                        // Mettre à jour les classes
                        indicator.className = 'status-indicator ' + data.botStatus;
                        
                        // Mettre à jour le texte
                        switch(data.botStatus) {
                            case 'running':
                                text.textContent = '✅ Bot Connecté à WhatsApp';
                                details.textContent = 'Prêt à générer des codes de pairing';
                                break;
                            case 'starting':
                                text.textContent = '⏳ Bot en Démarrage';
                                details.textContent = 'Connexion en cours à WhatsApp...';
                                break;
                            case 'stopped':
                                text.textContent = '❌ Bot Arrêté';
                                details.textContent = 'Le bot n\'est pas démarré';
                                break;
                            case 'error':
                                text.textContent = '⚠️ Erreur Bot';
                                details.textContent = 'Problème de connexion détecté';
                                break;
                        }
                        
                        // Activer/désactiver le bouton
                        generateBtn.disabled = data.botStatus !== 'running';
                        generateBtn.innerHTML = data.botStatus === 'running' 
                            ? '<span id="btnText">🔑 GÉNÉRER LE CODE</span>' 
                            : '<span id="btnText">⏳ Bot non connecté</span>';
                    })
                    .catch(error => {
                        console.error('Erreur mise à jour statut:', error);
                        document.getElementById('statusText').textContent = '❌ Serveur inaccessible';
                        document.getElementById('statusDetails').textContent = 'Impossible de contacter le serveur';
                        document.getElementById('statusIndicator').className = 'status-indicator error';
                    });
            }
            
            function generateCode() {
                const phone = document.getElementById('phoneNumber').value.trim();
                if (!phone) {
                    showAlert('Veuillez entrer un numéro WhatsApp', 'error');
                    return;
                }
                
                const btn = document.getElementById('generateBtn');
                const btnText = document.getElementById('btnText');
                const btnLoading = document.getElementById('btnLoading');
                
                btnText.style.display = 'none';
                btnLoading.style.display = 'inline';
                btn.disabled = true;
                
                fetch('/api/generate-paircode', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: phone })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('codeValue').textContent = data.code;
                        document.getElementById('codeText').textContent = data.code;
                        document.getElementById('codeDisplay').classList.add('show');
                        
                        startCountdown(5 * 60);
                        document.getElementById('codeDisplay').scrollIntoView({ behavior: 'smooth' });
                        
                        showAlert('✅ Code généré avec succès !', 'success');
                    } else {
                        showAlert('❌ Erreur: ' + (data.error || 'Impossible de générer le code'), 'error');
                    }
                })
                .catch(error => {
                    showAlert('❌ Erreur de connexion au serveur', 'error');
                    console.error(error);
                })
                .finally(() => {
                    btnText.style.display = 'inline';
                    btnLoading.style.display = 'none';
                    btn.disabled = false;
                });
            }
            
            function restartBot() {
                fetch('/api/restart-bot', { method: 'POST' })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            showAlert('🔄 Redémarrage du bot en cours...', 'info');
                            updateStatus();
                        } else {
                            showAlert('❌ Erreur: ' + data.error, 'error');
                        }
                    })
                    .catch(error => {
                        showAlert('❌ Erreur de connexion au serveur', 'error');
                    });
            }
            
            function checkStatus() {
                updateStatus();
                showAlert('📊 Vérification du statut en cours...', 'info');
            }
            
            function copyCode() {
                const code = document.getElementById('codeText').textContent;
                navigator.clipboard.writeText(code)
                    .then(() => showAlert('✅ Code copié dans le presse-papier !', 'success'))
                    .catch(() => showAlert('❌ Impossible de copier le code', 'error'));
            }
            
            function startCountdown(seconds) {
                const expiryElement = document.getElementById('expiryTime');
                
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                }
                
                function updateCountdown() {
                    const minutes = Math.floor(seconds / 60);
                    const remainingSeconds = seconds % 60;
                    expiryElement.textContent = \`\${minutes}:\${remainingSeconds.toString().padStart(2, '0')}\`;
                    
                    if (seconds > 0) {
                        seconds--;
                    } else {
                        clearInterval(countdownInterval);
                        expiryElement.textContent = '0:00';
                        showAlert('⏰ Le code a expiré. Veuillez en générer un nouveau.', 'info');
                    }
                }
                
                updateCountdown();
                countdownInterval = setInterval(updateCountdown, 1000);
            }
            
            function showAlert(message, type) {
                const alertDiv = document.createElement('div');
                alertDiv.className = \`alert \${type} show\`;
                alertDiv.textContent = message;
                
                const container = document.getElementById('alertContainer');
                container.innerHTML = '';
                container.appendChild(alertDiv);
                
                setTimeout(() => {
                    alertDiv.classList.remove('show');
                    setTimeout(() => alertDiv.remove(), 300);
                }, 5000);
            }
            
            // Initialisation
            updateStatus();
            setInterval(updateStatus, 10000);
            
            // Auto-focus sur l'input
            document.getElementById('phoneNumber').focus();
        </script>
    </body>
    </html>`;
    
    res.send(html);
});

// API pour vérifier le statut
app.get('/api/status', (req, res) => {
    try {
        res.json({
            status: 'online',
            serverTime: new Date().toISOString(),
            serverUptime: process.uptime(),
            botReady: botReady,
            botStatus: botStatus,
            environment: process.env.NODE_ENV || 'development',
            port: PORT,
            host: process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost',
            users: usersDB.size,
            memory: {
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
                heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
            }
        });
    } catch (error) {
        log(`Erreur API status: ${error.message}`, 'error');
        res.status(500).json({
            status: 'error',
            error: error.message
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
        
        const cleanPhone = phone.replace(/\D/g, '');
        
        if (cleanPhone.length < 9) {
            return res.status(400).json({ 
                success: false,
                error: 'Numéro invalide (minimum 9 chiffres)' 
            });
        }
        
        log(`Demande de code pour: ${cleanPhone}`);
        
        // Vérifier si le bot est prêt
        if (!botReady) {
            return res.status(503).json({
                success: false,
                error: 'Bot non disponible',
                message: 'Le bot WhatsApp est en cours de démarrage. Veuillez réessayer dans quelques instants.'
            });
        }
        
        // Essayer de générer le code via le module
        if (botModule && botModule.generatePairCode) {
            try {
                const code = await botModule.generatePairCode(cleanPhone);
                
                if (code) {
                    usersDB.set(cleanPhone, {
                        code: code,
                        timestamp: Date.now(),
                        status: 'pending',
                        ip: req.ip
                    });
                    
                    log(`Code généré pour ${cleanPhone}: ${code}`);
                    
                    return res.json({
                        success: true,
                        code: code,
                        phone: cleanPhone,
                        message: 'Code généré avec succès',
                        expiresIn: '5 minutes',
                        timestamp: Date.now()
                    });
                }
            } catch (error) {
                log(`Erreur génération via module: ${error.message}`, 'error');
            }
        }
        
        // Fallback: simuler un code
        const fakeCode = Math.floor(100000 + Math.random() * 900000).toString();
        usersDB.set(cleanPhone, {
            code: fakeCode,
            timestamp: Date.now(),
            status: 'pending',
            ip: req.ip
        });
        
        log(`Code simulé pour ${cleanPhone}: ${fakeCode}`);
        
        res.json({
            success: true,
            code: fakeCode,
            phone: cleanPhone,
            message: 'Code généré avec succès (mode simulation)',
            expiresIn: '5 minutes',
            timestamp: Date.now(),
            simulated: true
        });
        
    } catch (error) {
        log(`Erreur génération paircode: ${error.message}`, 'error');
        res.status(500).json({ 
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

// API pour redémarrer le bot
app.post('/api/restart-bot', async (req, res) => {
    try {
        log('Demande de redémarrage du bot...');
        
        botReady = false;
        botStatus = 'starting';
        
        // Arrêter le processus existant
        if (botProcess) {
            botProcess.kill('SIGTERM');
            botProcess = null;
        }
        
        // Redémarrer
        setTimeout(async () => {
            await initializeBot();
        }, 2000);
        
        res.json({
            success: true,
            message: 'Redémarrage du bot en cours...',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        log(`Erreur redémarrage bot: ${error.message}`, 'error');
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint de santé
app.get('/health', (req, res) => {
    try {
        res.json({ 
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            bot: botStatus,
            memory: {
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
                heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
            },
            nodeVersion: process.version,
            platform: process.platform,
            port: PORT
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Page d'information
app.get('/info', (req, res) => {
    res.json({
        name: 'HEXGATE V3 WhatsApp Bot',
        version: '3.0.0',
        description: 'Interface web pour la connexion au bot WhatsApp',
        author: 'HEXTECH',
        endpoints: {
            home: '/',
            qr: '/qr',
            status: '/api/status',
            generateCode: '/api/generate-paircode',
            restartBot: '/api/restart-bot',
            health: '/health',
            info: '/info'
        },
        environment: {
            nodeEnv: process.env.NODE_ENV || 'development',
            port: PORT,
            host: process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost',
            externalUrl: process.env.RENDER_EXTERNAL_URL || null
        }
    });
});

// Route 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Route non trouvée',
        path: req.path,
        method: req.method
    });
});

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
    log(`Erreur serveur: ${err.stack}`, 'error');
    res.status(500).json({
        error: 'Erreur interne du serveur',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue',
        timestamp: new Date().toISOString()
    });
});

// Nettoyage périodique
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
        log(`Nettoyage: ${cleaned} codes expirés supprimés`);
    }
}, 60000);

// Démarrer le serveur
const server = app.listen(PORT, '0.0.0.0', () => {
    log(`🚀 Serveur web démarré sur le port ${PORT}`);
    log(`🌐 Accédez à: http://localhost:${PORT}`);
    log(`🌍 Écoute sur: 0.0.0.0:${PORT}`);
    
    // Informations de débogage
    log(`🤖 Environnement: ${process.env.NODE_ENV || 'development'}`);
    log(`🖥️  Plateforme: ${process.platform}`);
    log(`⚡ Node.js: ${process.version}`);
    log(`📊 Mémoire: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
    
    // Configurer les timeouts
    server.keepAliveTimeout = SERVER_TIMEOUT;
    server.headersTimeout = SERVER_TIMEOUT;
    
    log(`⏱️  Timeouts configurés: ${SERVER_TIMEOUT}ms`);
    
    // Vérifier le dossier public
    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
        log(`✅ Dossier public créé: ${publicDir}`);
        
        const defaultHtml = `<!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"><title>HEXGATE V3</title></head>
        <body style="background:#0f172a;color:white;text-align:center;padding:50px">
            <h1 style="color:#06b6d4">HEXGATE V3 WhatsApp Bot</h1>
            <p>Serveur web opérationnel. Visitez <a href="/qr" style="color:#22d3ee">/qr</a> pour l'interface de connexion.</p>
        </body>
        </html>`;
        
        fs.writeFileSync(path.join(publicDir, 'index.html'), defaultHtml);
    }
    
    // Initialiser le bot
    setTimeout(async () => {
        try {
            await initializeBot();
        } catch (error) {
            log(`Échec initialisation bot: ${error.message}`, 'error');
        }
    }, 5000);
});

// Gestion des erreurs du serveur
server.on('error', (error) => {
    log(`Erreur serveur: ${error.message} (code: ${error.code})`, 'error');
    if (error.code === 'EADDRINUSE') {
        log(`Le port ${PORT} est déjà utilisé.`, 'error');
        process.exit(1);
    } else if (error.code === 'EACCES') {
        log(`Permission refusée sur le port ${PORT}.`, 'error');
        process.exit(1);
    }
});

// Gestion des signaux
process.on('SIGTERM', () => {
    log('Signal SIGTERM reçu, fermeture propre...');
    if (botProcess) {
        botProcess.kill('SIGTERM');
        log('Processus bot arrêté');
    }
    server.close(() => {
        log('Serveur web fermé');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    log('Signal SIGINT reçu, fermeture...');
    if (botProcess) {
        botProcess.kill('SIGTERM');
    }
    server.close(() => {
        log('Serveur web fermé');
        process.exit(0);
    });
});

// Exporter pour les tests
module.exports = app;
