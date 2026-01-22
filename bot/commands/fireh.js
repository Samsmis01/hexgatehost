const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {

  name: "fireh",

  description: "Envoie 'Vous êtes viré' 3 fois après confirmation",

  execute: async (sock, msg, args) => {

    const from = msg.key.remoteJid;

    console.log(`🔥 Commande fire appelée par: ${from}`);

    // Fonction pour envoyer les messages

    const sendFireMessages = async (targetJid, targetNumber) => {

      try {

        console.log(`🚀 Début envoi à ${targetNumber}`);

        

        for (let i = 1; i <= 3; i++) {

          await sock.sendMessage(targetJid, {

            text: `❌ Vous êtes viré ! (${i}/3)`

          });

          await delay(2000);

        }

        

        await sock.sendMessage(from, {

          text: `✅ 3 messages envoyés à ${targetNumber}`

        });

        

      } catch (error) {

        console.error(`❌ Erreur:`, error.message);

        await sock.sendMessage(from, {

          text: `❌ Échec: ${error.message}`

        });

      }

    };

    // VÉRIFICATION ARGUMENTS

    if (!args[0]) {

      await sock.sendMessage(from, {

        text: "📱 *WhatsApp Fire*\n\n`.fire 243XXXXXXXXX`\n\nEx: `.fire 243816107573`"

      });

      return;

    }

    // NETTOYAGE NUMÉRO

    const targetNumber = args[0].replace(/\D/g, "");

    

    if (targetNumber.length < 9) {

      await sock.sendMessage(from, { text: "❌ Format: 243XXXXXXXXX" });

      return;

    }

    const targetJid = `${targetNumber}@s.whatsapp.net`;

    // 🔥 ESSAI AVEC THUMBNAIL ET TEMPLATE

    try {

      // URL d'une thumbnail (logo/petite image)

      const thumbnailUrl = "https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/Assets/icon.png";

      

      // Message avec BOUTONS et THUMBNAIL

      const templateMessage = {

        text: "📱 WhatsApp Fire",

        footer: "HEX-GATE BOT",

        templateButtons: [

          {

            index: 1,

            urlButton: {

              displayText: "📞 Support",

              url: "https://wa.me/243000000000"

            }

          },

          {

            index: 2,

            callButton: {

              displayText: "📞 Appeler",

              phoneNumber: "+243000000000"

            }

          },

          {

            index: 3,

            quickReplyButton: {

              displayText: "✅ Oui",

              id: `fire_yes_${targetNumber}`

            }

          },

          {

            index: 4,

            quickReplyButton: {

              displayText: "❌ Non",

              id: `fire_no_${targetNumber}`

            }

          }

        ],

        // Thumbnail optionnelle

        // thumbnail: thumbnailUrl,

        // mediaType: 1, // 1 = image

        // caption: `Cela répond-il à votre question ?\n\nEnvoi à: ${targetNumber}`

      };

      console.log(`📤 Envoi template avec thumbnail pour ${targetNumber}`);

      await sock.sendMessage(from, templateMessage);

      

      // Envoyer aussi un message texte explicatif

      await sock.sendMessage(from, {

        text: `📱 *Confirmation requise*\n\nNuméro: ${targetNumber}\n\n*Sélectionnez une option ci-dessus*`

      });

      

    } catch (error) {

      console.error("❌ Erreur template:", error);

      

      // FALLBACK: message texte simple

      await sock.sendMessage(from, {

        text: `📱 *WhatsApp Fire*\n\nCela répond-il à votre question ?\n\nEnvoi à: *${targetNumber}*\n\nRépondez:\n✅ "oui" pour confirmer\n❌ "non" pour annuler`

      });

    }

    // 🔥 VERSION ALTERNATIVE: LIST MESSAGE (plus fiable)

    try {

      // Attendre un peu avant d'envoyer le second message

      await delay(1000);

      

      const listMessage = {

        text: "📱 Sélectionnez une option",

        footer: "HEX-GATE BOT",

        title: "WhatsApp Fire",

        buttonText: "Options",

        sections: [

          {

            title: "Confirmation d'envoi",

            rows: [

              {

                title: "✅ Oui, envoyer les messages",

                rowId: `fire_yes_${targetNumber}`,

                description: `Confirmer l'envoi à ${targetNumber}`

              },

              {

                title: "❌ Non, annuler",

                rowId: `fire_no_${targetNumber}`,

                description: "Annuler l'opération"

              },

              {

                title: "📞 Contacter le support",

                rowId: `fire_support_${targetNumber}`,

                description: "Obtenir de l'aide"

              }

            ]

          }

        ]

      };

      await sock.sendMessage(from, listMessage);

      console.log(`📋 Liste envoyée pour ${targetNumber}`);

      

    } catch (listError) {

      console.error("❌ Erreur liste:", listError);

    }

    // GESTION DES RÉPONSES

    const handler = async ({ messages }) => {

      const m = messages[0];

      if (m.key.remoteJid !== from) return;

      

      let selectedId = null;

      

      // Vérifier différents types de réponses

      if (m.message?.buttonsResponseMessage?.selectedButtonId) {

        selectedId = m.message.buttonsResponseMessage.selectedButtonId;

        console.log(`🔄 Bouton: ${selectedId}`);

      } 

      else if (m.message?.listResponseMessage?.selectedRowId) {

        selectedId = m.message.listResponseMessage.selectedRowId;

        console.log(`📋 Liste: ${selectedId}`);

      }

      else if (m.message?.templateButtonReplyMessage?.selectedId) {

        selectedId = m.message.templateButtonReplyMessage.selectedId;

        console.log(`📱 Template: ${selectedId}`);

      }

      // Vérifier réponse texte

      else if (m.message?.conversation) {

        const text = m.message.conversation.toLowerCase().trim();

        console.log(`💬 Texte: "${text}"`);

        

        if (text === "oui" || text === "yes" || text === "✅") {

          selectedId = `fire_yes_${targetNumber}`;

        } else if (text === "non" || text === "no" || text === "❌") {

          selectedId = `fire_no_${targetNumber}`;

        }

      }

      if (!selectedId) return;

      

      // Extraire le numéro

      const idNumber = selectedId.split('_').pop();

      if (idNumber !== targetNumber) return;

      

      // TRAITEMENT

      if (selectedId.startsWith('fire_yes_')) {

        console.log(`✅ Confirmation pour ${targetNumber}`);

        

        await sock.sendMessage(from, {

          react: { text: "✅", key: m.key },

          text: "⏳ Envoi en cours..."

        });

        

        await sendFireMessages(targetJid, targetNumber);

        

      } else if (selectedId.startsWith('fire_no_')) {

        console.log(`❌ Annulation pour ${targetNumber}`);

        

        await sock.sendMessage(from, {

          react: { text: "❌", key: m.key },

          text: "❌ Opération annulée"

        });

        

      } else if (selectedId.startsWith('fire_support_')) {

        await sock.sendMessage(from, {

          text: "📞 Support HEX-GATE\n\nContactez: @support\n\nOu visitez: hexgate.com"

        });

      }

      

      // Nettoyer

      sock.ev.off("messages.upsert", handler);

    };

    // Ajouter écouteur

    sock.ev.on("messages.upsert", handler);

    console.log(`👂 Écouteur activé pour ${from}`);

    

    // Timeout après 90 secondes

    setTimeout(() => {

      sock.ev.off("messages.upsert", handler);

      console.log(`⏰ Timeout pour ${from}`);

    }, 90000);

  }

};