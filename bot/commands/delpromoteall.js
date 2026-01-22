const { proto } = require('@whiskeysockets/baileys');

module.exports = {

  name: "delpromoteall",

  description: "Retirer tous les administrateurs du groupe (sauf l'owner)",

  execute: async (sock, msg) => {

    const from = msg.key.remoteJid;

    try {

      // Récupérer les métadonnées du groupe

      const groupMetadata = await sock.groupMetadata(from);

      const participants = groupMetadata.participants;

      // Filtrer les admins

      const admins = participants

        .filter(p => p.admin === 'admin' || p.admin === 'superadmin')

        .map(p => p.id)

        .filter(jid => jid !== global.OWNER_NUMBER); // Ne jamais retirer l'owner

      if (admins.length === 0) {

        return await sock.sendMessage(from, {

          text: "⚠️ Aucun administrateur à retirer."

        });

      }

      // Retirer les droits admin

      await sock.groupParticipantsUpdate(from, admins, 'demote');

      await sock.sendMessage(from, {

        text: `✅ Tous les admins ont été rétrogradés en membres.\n\nTotal: ${admins.length}`

      });

      console.log(`📝 ${msg.key.participant || from} a rétrogradé ${admins.length} admins.`);

    } catch (error) {

      console.log(`❌ Erreur delpromoteall: ${error}`);

      await sock.sendMessage(from, {

        text: "❌ Une erreur est survenue lors de la suppression des admins."

      });

    }

  }

};

// > 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝙷𝙴𝚇-𝙶𝙰𝚃𝙴