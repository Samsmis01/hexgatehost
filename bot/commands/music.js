const ytdlp = require("yt-dlp-exec");

const fs = require("fs");

const path = require("path");

// Crée le dossier temp s'il n'existe pas

const TEMP_DIR = path.join(__dirname, "../temp");

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

module.exports = {

  name: "music",

  description: "Télécharger une musique depuis YouTube",

  execute: async (sock, msg, args) => {

    const from = msg.key.remoteJid;

    if (!args[0]) {

      return await sock.sendMessage(from, {

        text:

          "❌ Utilisation : `.music <nom de la musique ou lien YouTube>`\n\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝚃𝙴𝚇𝙷"

      });

    }

    const query = args.join(" ");

    const fileName = path.join(TEMP_DIR, `${Date.now()}.mp3`);

    try {

      await sock.sendMessage(from, {

        text: `🎵 Recherche et téléchargement de : *${query}*...\n\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝙷𝙴𝚇-𝚃𝙴𝚇𝙷`

      });

      // Télécharger la musique depuis YouTube

      await ytdlp(query, {

        extractAudio: true,

        audioFormat: "mp3",

        output: fileName,

        limitRate: "1M", // Limite pour éviter crash

        quiet: true

      });

      // Envoyer la musique sur WhatsApp

      const audioBuffer = fs.readFileSync(fileName);

      await sock.sendMessage(from, {

        audio: audioBuffer,

        mimetype: "audio/mpeg",

        fileName: `${query}.mp3`,

        ptt: false

      });

      console.log(`🎶 Musique envoyée : ${query} > ${from}`);

      // Supprimer le fichier temporaire

      fs.unlinkSync(fileName);

    } catch (err) {

      console.error("MUSIC ERROR:", err);

      await sock.sendMessage(from, {

        text:

          "❌ Une erreur est survenue lors du téléchargement de la musique.\n\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝙷𝙴𝚇-𝚃𝙴𝚇𝙷"

      });

    }

  }

};