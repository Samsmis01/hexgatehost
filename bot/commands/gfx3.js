const { createCanvas } = require("canvas");

const fs = require("fs");

const path = require("path");

module.exports = {

  name: "gfx3",

  description: "Créer un logo GFX 3D (texte intégré dans l’image)",

  execute: async (sock, msg, args) => {

    const from = msg.key.remoteJid;

    if (!args.length) {

      return sock.sendMessage(from, {

        text: "❌ Utilisation : `.gfx3 HEXTECH`\n\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝙷𝙴𝚇-𝙶𝙰𝚃𝙴"

      });

    }

    const logoText = args.join(" ").toUpperCase();

    try {

      const width = 1000;

      const height = 500;

      const canvas = createCanvas(width, height);

      const ctx = canvas.getContext("2d");

      /* 🎨 BACKGROUND */

      const bgGradient = ctx.createLinearGradient(0, 0, width, height);

      bgGradient.addColorStop(0, "#050b1a");

      bgGradient.addColorStop(1, "#0a1a33");

      ctx.fillStyle = bgGradient;

      ctx.fillRect(0, 0, width, height);

      /* 💡 GLOW SHADOW */

      ctx.shadowColor = "#00ccff";

      ctx.shadowBlur = 40;

      /* 🧠 LOGO TEXT (INCRUSTÉ) */

      const textGradient = ctx.createLinearGradient(0, 0, width, 0);

      textGradient.addColorStop(0, "#00eaff");

      textGradient.addColorStop(1, "#0066ff");

      ctx.font = "bold 120px Sans";

      ctx.textAlign = "center";

      ctx.textBaseline = "middle";

      ctx.fillStyle = textGradient;

      // Effet profondeur (3D)

      for (let i = 6; i > 0; i--) {

        ctx.fillStyle = `rgba(0, 0, 0, ${i * 0.1})`;

        ctx.fillText(logoText, width / 2 + i, height / 2 + i);

      }

      // Texte principal

      ctx.shadowBlur = 50;

      ctx.fillStyle = textGradient;

      ctx.fillText(logoText, width / 2, height / 2);

      /* 💾 SAVE */

      const buffer = canvas.toBuffer("image/png");

      const filePath = path.join(__dirname, `../temp/logo_${Date.now()}.png`);

      fs.writeFileSync(filePath, buffer);

      /* 📤 SEND */

      await sock.sendMessage(from, {

        image: fs.readFileSync(filePath),

        caption:

          `🎨 *LOGO GFX 3D*\n\n` +

          `🖊 Texte : *${logoText}*\n\n` +

          `> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝙷𝙴𝚇-𝙶𝙰𝚃𝙴`

      });

      fs.unlinkSync(filePath);

    } catch (err) {

      console.error(err);

      await sock.sendMessage(from, {

        text: "❌ Erreur lors de la création du logo.\n\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝙷𝙴𝚇-𝙶𝙰𝚃𝙴"

      });

    }

  }

};