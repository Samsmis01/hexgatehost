// prestart.js - Installation forcée pour Render
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 FORCING BAILEYS INSTALLATION...');

try {
  // Vérifier si Baileys est installé
  const baileysPath = path.join(__dirname, 'node_modules', '@whiskeysockets', 'baileys');
  
  if (!fs.existsSync(baileysPath)) {
    console.log('📦 Baileys not found, installing...');
    
    // Installation FORCÉE
    execSync('npm install @whiskeysockets/baileys@6.4.0 --no-save --legacy-peer-deps', {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    // Installer pino aussi
    execSync('npm install pino@8.15.4 --no-save --legacy-peer-deps', {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    console.log('✅ Baileys installed manually');
  } else {
    console.log('✅ Baileys already installed');
  }
} catch (error) {
  console.error('❌ Manual installation failed:', error.message);
}
