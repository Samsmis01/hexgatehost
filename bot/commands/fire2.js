const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {

  name: "fire2",

  description: "Envoie 'Vous êtes viré' 3 fois après confirmation",

  execute: async (sock, msg, args) => {

    const from = msg.key.remoteJid;

    const sender = msg.key.participant || msg.key.remoteJid;

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

    // Fonction pour envoyer le message avec boutons comme WhatsApp Support

    const sendConfirmationMessage = async (targetNumber) => {

      try {

        // Message avec template comme WhatsApp Support

        const message = {

          text: `*WhatsApp Fire*\n\nCela répond-il à votre question ?\n\nEnvoi de 3 messages "Vous êtes viré" à : ${targetNumber}`,

          footer: "HEX-GATE BOT",

          templateButtons: [

            {

              index: 1,

              urlButton: {

                displayText: "📞 Contacter le support",

                url: "https://wa.me/243XXXXXXXXX"

              }

            },

            {

              index: 2,

              quickReplyButton: {

                displayText: "✅ Oui",

                id: `fire_yes_${targetNumber}`

              }

            },

            {

              index: 3,

              quickReplyButton: {

                displayText: "❌ Non",

                id: `fire_no_${targetNumber}`

              }

            }

          ]

        };

        await sock.sendMessage(from, message);

        console.log(`📨 Message de confirmation envoyé pour ${targetNumber}`);

        

      } catch (error) {

        console.error("❌ Erreur envoi message template:", error);

        // Fallback: message simple

        await sock.sendMessage(from, {

          text: `⚡ Confirmez l'envoi à : ${targetNumber}\n\nRépondez avec:\n• "oui" pour confirmer\n• "non" pour annuler`

        });

      }

    };

    // Vérifie si numéro fourni dans la commande

    if (!args[0]) {

      await sock.sendMessage(from, {

        text: "📱 *WhatsApp Fire*\n\nVeuillez répondre avec le numéro du destinataire.\n\nExemple : 243XXXXXXXXX",

        footer: "HEX-GATE BOT"

      });

      // Listener pour récupérer le numéro

      const handler = async ({ messages }) => {

        const response = messages[0];

        if (!response?.message?.conversation) return;

        if (response.key.remoteJid !== from) return; // Vérifier que c'est bien la bonne conversation

        const targetNumberRaw = response.message.conversation.trim();

        const targetNumber = targetNumberRaw.replace(/\D/g, "");

        

        if (targetNumber.length < 9) {

          await sock.sendMessage(from, {

            text: "❌ Numéro invalide. Format attendu: 243XXXXXXXXX"

          });

          sock.ev.off("messages.upsert", handler);

          return;

        }

        // Envoyer le message de confirmation avec boutons

        await sendConfirmationMessage(targetNumber);

        // Supprimer le listener

        sock.ev.off("messages.upsert", handler);

      };

      sock.ev.on("messages.upsert", handler);

      return;

    }

    // Si le numéro est fourni directement

    const targetNumber = args[0].replace(/\D/g, "");

    const targetJid = `${targetNumber}@s.whatsapp.net`;

    // Envoyer le message de confirmation avec boutons

    await sendConfirmationMessage(targetNumber);

    // Gestion des boutons rapides (quick replies)

    const buttonHandler = async ({ messages }) => {

      const m = messages[0];

      

      // Vérifier que c'est une réponse de bouton

      const selectedId = m.message?.templateButtonReplyMessage?.selectedId;

      if (!selectedId) return;

      if (m.key.remoteJid !== from) return;

      console.log(`🔄 Bouton sélectionné: ${selectedId}`);

      // Extraire le numéro de l'ID du bouton

      const buttonNumber = selectedId.split('_').pop();

      

      if (selectedId.startsWith('fire_yes_') && buttonNumber === targetNumber) {

        await sock.sendMessage(from, {

          text: "⏳ Envoi en cours..."

        });

        await sendFireMessages(targetJid, targetNumber);

      } 

      else if (selectedId.startsWith('fire_no_') && buttonNumber === targetNumber) {

        await sock.sendMessage(from, {

          text: "❌ Envoi annulé"

        });

      }

      // Supprimer le listener après traitement

      setTimeout(() => {

        sock.ev.off("messages.upsert", buttonHandler);

      }, 5000);

    };

    sock.ev.on("messages.upsert", buttonHandler);

    

    // Timeout pour nettoyer le listener après 2 minutes

    setTimeout(() => {

      sock.ev.off("messages.upsert", buttonHandler);

      console.log("🧹 Listener boutons nettoyé (timeout)");

    }, 120000);

  }

};

// > 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝙷𝙴𝚇-𝙶𝙰𝚃𝙴