module.exports = {

  name: "onlinelist",

  description: "Tag les membres récemment actifs",

  execute: async (sock, msg, args) => {

    try {

      const from = msg.key.remoteJid;

      if (!from.endsWith("@g.us")) {

        return sock.sendMessage(from, { text: "❌ Commande groupe uniquement." });

      }

      if (!global.onlineUsers || !(global.onlineUsers instanceof Map)) {

        return sock.sendMessage(from, {

          text: "⚠️ Données d’activité indisponibles."

        });

      }

      const now = Date.now();

      const ONLINE_LIMIT = 5 * 60 * 1000; // 5 minutes

      const members = Array.from(global.onlineUsers.entries())

        .filter(([_, time]) => now - time <= ONLINE_LIMIT)

        .map(([jid]) => jid);

      if (members.length === 0) {

        return sock.sendMessage(from, {

          text: "😴 Aucun membre en ligne récemment.\n\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝙷𝙴𝚇-𝙶𝙰𝚃𝙴"

        });

      }

      const text =

        `🟢 *MEMBRES ACTIFS (${members.length})*\n\n` +

        members.map((u) => `• @${u.split("@")[0]}`).join("\n") +

        `\n\n> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝙷𝙴𝚇-𝙶𝙰𝚃𝙴`;

      await sock.sendMessage(from, {

        text,

        mentions: members

      });

    } catch (e) {

      console.error("❌ onlinelist error:", e);

      await sock.sendMessage(msg.key.remoteJid, {

        text:

          "❌ Une erreur est survenue lors du tag des membres en ligne.\n\n" +

          "> 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝙷𝙴𝚇-𝙶𝙰𝚃𝙴"

      });

    }

  }

};