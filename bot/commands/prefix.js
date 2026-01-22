const fs = require("fs");

const path = require("path");

const configPath = path.join(__dirname, "../config.json");

module.exports = {

  name: "prefix",

  description: "Changer le préfixe du bot",

  execute: async (sock, msg, args) => {

    const from = msg.key.remoteJid;

    // Vérification argument

    if (!args[0]) {

      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

      return sock.sendMessage(from, {

        text:

          "⚙️ *GESTION DU PRÉFIXE*\n\n" +

          `Préfixe actuel : *${config.prefix}*\n\n` +

          "Utilisation :\n" +

          "• `.prefix !`\n" +

          "• `.prefix /`\n\n" +

          "> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝙶𝙰𝚃𝙴"

      });

    }

    const newPrefix = args[0].trim();

    // Sécurité

    if (newPrefix.length > 3) {

      return sock.sendMessage(from, {

        text: "❌ Le préfixe doit faire **1 à 3 caractères maximum**"

      });

    }

    // Charger config

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    // Modifier

    config.prefix = newPrefix;

    // Sauvegarder

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    await sock.sendMessage(from, {

      text:

        "✅ *PRÉFIXE MODIFIÉ*\n\n" +

        `Nouveau préfixe : *${newPrefix}*\n\n` +

        "🔄 Redémarre le bot pour appliquer partout\n\n" +

        "> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝙶𝙰𝚃𝙴"

    });

    console.log(`🔧 Préfixe changé en "${newPrefix}"`);

  }

};