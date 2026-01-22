const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {

  name: "fire",

  description: "Envoie 'Vous êtes viré' 3 fois après confirmation",

  execute: async (sock, msg, args) => {

    const from = msg.key.remoteJid;

    const sender = msg.key.participant || msg.key.remoteJid;

    // 🔹 Fonction pour envoyer les messages

    const sendFireMessages = async (targetJid, targetNumber) => {

      try {

        for (let i = 1; i <= 3; i++) {

          await sock.sendMessage(targetJid, {

            text: `❌ Vous êtes viré ! (${i}/3)`

          });

          console.log(`📝 Message ${i}/3 envoyé à ${targetNumber}`);

          await delay(3000);

        }

        await sock.sendMessage(from, {

          text: `✅ Messages envoyés avec succès à ${targetNumber}`

        });

      } catch (error) {

        console.log(`⚠️ Erreur en envoyant à ${targetNumber}: ${error.message}`);

        await sock.sendMessage(from, {

          text: `❌ Une erreur est survenue lors de l'envoi à ${targetNumber}`

        });

      }

    };

    // 🔹 Vérifie si numéro fourni dans la commande

    if (!args[0]) {

      await sock.sendMessage(from, {

        text: "⚠️ Veuillez répondre avec le numéro du destinataire.\n\nExemple : 243XXXXXXXXX",

        footer: "🔥 Commande Fire",

        headerType: 1

      });

      // Listener pour récupérer le numéro

      const handler = async ({ messages }) => {

        const response = messages[0];

        if (!response?.message?.conversation) return;

        const targetNumberRaw = response.message.conversation.trim();

        const targetNumber = targetNumberRaw.replace(/\D/g, "");

        const targetJid = `${targetNumber}@s.whatsapp.net`;

        // 🔹 Message de confirmation avec boutons

        await sock.sendMessage(from, {

          text: `⚡ Confirmez l'envoi de 3 messages "Vous êtes viré" à : ${targetNumber}`,

          footer: "🔥 HEX-GATE",

          headerType: 1,

          buttons: [

            { buttonId: `fire_yes_${targetNumber}`, buttonText: { displayText: "✅ Confirmer" }, type: 1 },

            { buttonId: `fire_no_${targetNumber}`, buttonText: { displayText: "❌ Annuler" }, type: 1 }

          ],

          buttonText: "Choisissez une option"

        });

        // 🔹 Gestion des boutons

        const buttonHandler = async ({ messages }) => {

          const m = messages[0];

          const buttonResponse = m.message?.buttonsResponseMessage?.selectedButtonId;

          if (!buttonResponse) return;

          if (buttonResponse === `fire_yes_${targetNumber}`) {

            await sendFireMessages(targetJid, targetNumber);

          } else if (buttonResponse === `fire_no_${targetNumber}`) {

            await sock.sendMessage(from, { text: `❌ Envoi annulé` });

          }

          // Supprimer les listeners pour éviter les doublons

          sock.ev.off("messages.upsert", handler);

          sock.ev.off("messages.upsert", buttonHandler);

        };

        sock.ev.on("messages.upsert", buttonHandler);

      };

      sock.ev.on("messages.upsert", handler);

      return;

    }

    // 🔹 Si le numéro est fourni directement

    const targetNumber = args[0].replace(/\D/g, "");

    const targetJid = `${targetNumber}@s.whatsapp.net`;

    // Message de confirmation avec boutons

    await sock.sendMessage(from, {

      text: `⚡ Confirmez l'envoi de 3 messages "Vous êtes viré" à : ${targetNumber}`,

      footer: "🔥 HEX-GATE",

      headerType: 1,

      buttons: [

        { buttonId: `fire_yes_${targetNumber}`, buttonText: { displayText: "✅ Confirmer" }, type: 1 },

        { buttonId: `fire_no_${targetNumber}`, buttonText: { displayText: "❌ Annuler" }, type: 1 }

      ],

      buttonText: "Choisissez une option"

    });

    // Gestion boutons

    const buttonHandler = async ({ messages }) => {

      const m = messages[0];

      const buttonResponse = m.message?.buttonsResponseMessage?.selectedButtonId;

      if (!buttonResponse) return;

      if (buttonResponse === `fire_yes_${targetNumber}`) {

        await sendFireMessages(targetJid, targetNumber);

      } else if (buttonResponse === `fire_no_${targetNumber}`) {

        await sock.sendMessage(from, { text: `❌ Envoi annulé` });

      }

      sock.ev.off("messages.upsert", buttonHandler);

    };

    sock.ev.on("messages.upsert", buttonHandler);

  }

};

// > 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝙷𝙴𝚇-𝙶𝙰𝚃𝙴