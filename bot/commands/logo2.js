const { createCanvas } = require("canvas");

const GIFEncoder = require("gifencoder");

const fs = require("fs");

const path = require("path");

module.exports = {

  name: "logo2",

  description: "Créer un logo animé (GIF) avec effet glow",

  execute: async (sock, msg, args) => {

    const from = msg.key.remoteJid;

    if (!args.length) {

      return sock.sendMessage(from, {

        text: "❌ Utilisation : `.logo2 hextech`"

      });

    }

    const text = args.join(" ").toUpperCase();

    const width = 500;

    const height = 300;

    const canvas = createCanvas(width, height);

    const ctx = canvas.getContext("2d");

    const encoder = new GIFEncoder(width, height);

    const outputPath = path.join(__dirname, "../temp/logo2.gif");

    const stream = encoder.createWriteStream();

    stream.pipe(fs.createWriteStream(outputPath));

    encoder.start();

    encoder.setRepeat(0);

    encoder.setDelay(120);

    encoder.setQuality(10);

    for (let i = 0; i < 20; i++) {

      ctx.clearRect(0, 0, width, height);

      // 🎨 Fond sombre

      ctx.fillStyle = "#050505";

      ctx.fillRect(0, 0, width, height);

      // ✨ Glow animé

      ctx.shadowColor = `rgba(0, 150, 255, ${0.3 + i / 40})`;

      ctx.shadowBlur = 20 + i * 2;

      ctx.font = "bold 60px Arial";

      ctx.fillStyle = "#00BFFF";

      ctx.textAlign = "center";

      ctx.textBaseline = "middle";

      ctx.fillText(text, width / 2, height / 2);

      encoder.addFrame(ctx);

    }

    encoder.finish();

    const buffer = fs.readFileSync(outputPath);

    await sock.sendMessage(from, {

      video: buffer,

      gifPlayback: true,

      caption: `✨ LOGO ANIMÉ ✨\n\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝙷𝙴𝚇-𝙶𝙰𝚃𝙴`

    });

    fs.unlinkSync(outputPath);

  }

};