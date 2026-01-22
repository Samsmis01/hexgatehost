const delay = ms => new Promise(res => setTimeout(res, ms));

const { isAdmin } = require("./lib");

module.exports = {

  name: "freeze",

  description: "Fermer temporairement le groupe pour tous les membres (sauf admins)",

  execute: async (sock, msg, args) => {

    const from = msg.key.remoteJid;

    // Vérification que c'est un groupe

    if (!from.endsWith("@g.us")) {

      return await sock.sendMessage(from, {

        text: "❌ Cette commande est réservée aux groupes.\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝚃𝙴𝚇𝙷"

      });

    }

    const metadata = await sock.groupMetadata(from);

    const participants = metadata.participants || [];

    const senderJid = msg.key.participant || msg.key.remoteJid;

    const botJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";

    // Vérifier que l'expéditeur est admin

    if (!isAdmin(participants, senderJid)) {

      return await sock.sendMessage(from, {

        text: "☣️ Seuls les admins peuvent utiliser cette commande.\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝚃𝙴𝚇𝙷"

      });

    }

    // Vérifier que le bot est admin

    if (!isAdmin(participants, botJid)) {

      return await sock.sendMessage(from, {

        text: "☣️ Je dois être admin pour fermer le groupe.\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝚃𝙴𝚇𝙷"

      });

    }

    // Vérifier argument : durée en minutes

    if (!args[0] || isNaN(args[0])) {

      return await sock.sendMessage(from, {

        text: "⚠️ Utilisation : `.freeze <minutes>`\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝚃𝙴𝚇𝙷"

      });

    }

    const minutes = parseInt(args[0]);

    const ms = minutes * 60 * 1000;

    try {

      // 🔒 Fermer le groupe pour tous sauf admin

      await sock.groupSettingUpdate(from, "announcement"); // tous sauf admin ne peuvent plus envoyer de messages

      await sock.sendMessage(from, {

        text: `⏸️ Le groupe est maintenant **fermé** pour ${minutes} minutes. Seuls les admins peuvent parler.\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝚃𝙴𝚇𝙷`

      });

      console.log(`📝 Groupe ${from} fermé par ${senderJid} pour ${minutes} minutes.`);

      // ⏱ Attente

      await delay(ms);

      // 🔓 Réouvrir le groupe

      await sock.groupSettingUpdate(from, "not_announcement"); // tout le monde peut envoyer des messages

      await sock.sendMessage(from, {

        text: "✅ Le groupe est **réouvert**. Tout le monde peut maintenant parler.\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝚃𝙴𝚇𝙷"

      });

      console.log(`📝 Groupe ${from} réouvert automatiquement après ${minutes} minutes.`);

    } catch (err) {

      console.error("FREEZE ERROR:", err);

      await sock.sendMessage(from, {

        text: "❌ Une erreur est survenue lors du verrouillage temporaire.\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝚋𝚢 𝙷𝙴𝚇-𝚃𝙴𝚇𝙷"

      });

    }

  }

};