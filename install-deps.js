// install-deps.js - Script d'installation manuelle pour Render
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔧 Installation manuelle des dépendances pour Render.com');

try {
  // Liste des dépendances critiques
  const criticalDeps = [
    '@whiskeysockets/baileys@6.4.0',
    'pino@8.15.4',
    'qrcode-terminal@0.12.0'
  ];

  console.log('📦 Installation des dépendances critiques...');
  
  for (const dep of criticalDeps) {
    try {
      console.log(`Installing ${dep}...`);
      execSync(`npm install ${dep} --no-save --legacy-peer-deps`, {
        stdio: 'inherit',
        cwd: __dirname
      });
      console.log(`✅ ${dep} installé avec succès`);
    } catch (error) {
      console.warn(`⚠️ Échec installation ${dep}: ${error.message}`);
    }
  }

  console.log('✅ Installation des dépendances terminée');
  process.exit(0);
} catch (error) {
  console.error('❌ Erreur lors de l\'installation:', error.message);
  process.exit(1);
  }
