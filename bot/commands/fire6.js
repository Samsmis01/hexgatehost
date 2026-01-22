const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {

  name: "fire6",

  description: "Envoie 'Vous êtes viré' 3 fois après confirmation",

  execute: async (sock, msg, args) => {

    const from = msg.key.remoteJid;

    // Fonction pour envoyer les messages

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

    // Vérifier si numéro fourni

    if (!args[0]) {

      await sock.sendMessage(from, {

        text: "📱 *WhatsApp Fire*\n\nVeuillez fournir un numéro:\n\nExemple : .fire 243XXXXXXXXX",

        footer: "HEX-GATE BOT"

      });

      return;

    }

    // Nettoyer le numéro

    const targetNumber = args[0].replace(/\D/g, "");

    

    if (targetNumber.length < 9) {

      await sock.sendMessage(from, {

        text: "❌ Numéro invalide. Format attendu: 243XXXXXXXXX"

      });

      return;

    }

    const targetJid = `${targetNumber}@s.whatsapp.net`;

    // Envoyer message avec LIST (plus fiable)

    try {

      await sock.sendMessage(from, {

        text: `📱 *WhatsApp Fire*\n\nCela répond-il à votre question ?\n\nEnvoi de 3 messages "Vous êtes viré" à : ${targetNumber}`,

        footer: "HEX-GATE BOT - Sélectionnez une option",

        sections: [

          {

            title: "Confirmez votre choix",

            rows: [

              {

                title: "✅ Oui, envoyer",

                rowId: `fire_yes_${targetNumber}`,

                description: "Confirmer l'envoi des messages"

              },

              {

                title: "❌ Non, annuler",

                rowId: `fire_no_${targetNumber}`,

                description: "Annuler l'opération"

              }

            ]

          }

        ],

        buttonText: "Choisir une option",

        listType: 1

      });

      

    } catch (error) {

      console.error("❌ Erreur liste:", error);

      // Fallback: message simple

      await sock.sendMessage(from, {

        text: `📱 Confirmation requise\n\nEnvoi à: ${targetNumber}\n\nRépondez:\n• "oui" pour confirmer\n• "non" pour annuler`

      });

    }

    // Gestion des réponses LIST

    const listHandler = async ({ messages }) => {

      const m = messages[0];

      

      // Vérifier si c'est une réponse de liste

      const selectedRowId = m.message?.listResponseMessage?.selectedRowId;

      if (!selectedRowId) return;

      if (m.key.remoteJid !== from) return;

      console.log(`🔄 Option sélectionnée: ${selectedRowId}`);

      // Vérifier le numéro cible

      const rowNumber = selectedRowId.split('_').pop();

      if (rowNumber !== targetNumber) return;

      // Traiter la réponse

      if (selectedRowId.startsWith('fire_yes_')) {

        await sock.sendMessage(from, {

          text: "⏳ Envoi en cours...",

          react: { text: "✅", key: m.key }

        });

        await sendFireMessages(targetJid, targetNumber);

      } 

      else if (selectedRowId.startsWith('fire_no_')) {

        await sock.sendMessage(from, {

          text: "❌ Envoi annulé",

          react: { text: "❌", key: m.key }

        });

      }

      // Supprimer le listener

      sock.ev.off("messages.upsert", listHandler);

    };

    // Ajouter le listener

    sock.ev.on("messages.upsert", listHandler);

    

    // Nettoyer après 2 minutes

    setTimeout(() => {

      sock.ev.off("messages.upsert", listHandler);

      console.log("🧹 Listener liste nettoyé");

    }, 120000);

  }

};

// > 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝙷𝙴𝚇-𝙶𝙰𝚃𝙴