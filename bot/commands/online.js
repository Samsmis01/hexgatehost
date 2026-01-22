const fs = require("fs");

const path = require("path");

const configPath = path.join(__dirname, "../config.json");

module.exports = {

  name: "online",

  description: "Activer ou désactiver le mode always online",

  execute: async (sock, msg, args) => {

    const from = msg.key.remoteJid;

    // Vérification argument

    if (!args[0] || !["on", "off"].includes(args[0].toLowerCase())) {

      return sock.sendMessage(from, {

        text:

          "⚙️ *MODE ONLINE*\n\n" +

          "Utilisation :\n" +

          "• `.online on` → Activer\n" +

          "• `.online off` → Désactiver\n\n" +

          "> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝙶𝙰𝚃𝙴"

      });

    }

    const enable = args[0].toLowerCase() === "on";

    // 🔄 Modifier config.json

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    config.alwaysOnline = enable;

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // 🧠 Mise à jour en mémoire

    global.alwaysOnline = enable;

    await sock.sendMessage(from, {

      text:

        "🟢 *MODE ONLINE*\n\n" +

        `Statut : *${enable ? "ACTIVÉ ✅" : "DÉSACTIVÉ ❌"}*\n\n` +

        "> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝙶𝙰𝚃𝙴"

    });

    console.log(

      `📡 AlwaysOnline modifié → ${enable ? "ON" : "OFF"}`

    );

  }

};