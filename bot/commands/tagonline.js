const colors = require("colors");

module.exports = {

  name: "tagonline",

  description: "Tague uniquement les membres en ligne dans le groupe",

  execute: async (sock, msg, args) => {

    try {

      const from = msg.key.remoteJid;

      // Vérifier que c'est un groupe

      if (!from.endsWith("@g.us")) {

        return sock.sendMessage(from, { text: "❌ Cette commande est réservée aux groupes !" });

      }

      // Obtenir les participants du groupe

      const groupMetadata = await sock.groupMetadata(from);

      const participants = groupMetadata.participants;

      // Récupérer les présences disponibles

      const presence = sock.presences[from] || {};

      const onlineMembers = [];

      for (const participant of participants) {

        if (presence[participant.id]?.lastKnownPresence === "available") {

          onlineMembers.push(participant.id);

        }

      }

      if (!onlineMembers.length) {

        return sock.sendMessage(from, { text: "❌ Aucun membre en ligne actuellement." });

      }

      // Préparer le message avec mentions

      const mentions = onlineMembers;

      const text = onlineMembers.map((id) => `@${id.split("@")[0]}`).join(" ");

      await sock.sendMessage(from, {

        text: `💫 Membres en ligne :\n${text}\n\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝙷𝙴𝚇-𝙶𝙰𝚃𝙴`,

        mentions

      });

      console.log(colors.green(`[TAG ONLINE] ${onlineMembers.length} membres tagués dans ${from}`));

    } catch (err) {

      console.log(colors.red("❌ Erreur lors du tag des membres en ligne :", err.message));

      sock.sendMessage(msg.key.remoteJid, { text: `❌ Une erreur est survenue lors du tag des membres en ligne.` });

    }

  }

};