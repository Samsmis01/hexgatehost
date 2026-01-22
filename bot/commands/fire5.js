const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {

  name: "fire5",

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

    // Fonction pour envoyer message avec boutons

    const sendConfirmationWithButtons = async (targetNumber) => {

      try {

        // Essayer avec les quick reply buttons (fonctionne mieux)

        const message = {

          text: `📱 *WhatsApp Fire*\n\nCela répond-il à votre question ?\n\nEnvoi de 3 messages "Vous êtes viré" à : ${targetNumber}`,

          footer: "HEX-GATE BOT",

          mentions: [],

          buttons: [

            {

              buttonId: `fire_yes_${targetNumber}`,

              buttonText: { displayText: "✅ Oui" },

              type: 1

            },

            {

              buttonId: `fire_no_${targetNumber}`,

              buttonText: { displayText: "❌ Non" },

              type: 1

            }

          ],

          headerType: 1,

          viewOnce: false

        };

        await sock.sendMessage(from, message);

        console.log(`✅ Message avec boutons envoyé pour ${targetNumber}`);

        

      } catch (error) {

        console.error("❌ Erreur boutons:", error);

        // Fallback: message simple avec réaction

        await sock.sendMessage(from, {

          text: `📱 *Confirmation requise*\n\nVoulez-vous envoyer 3 messages "Vous êtes viré" à ${targetNumber} ?\n\nRépondez avec :\n• "oui" pour confirmer\n• "non" pour annuler`,

          footer: "HEX-GATE BOT"

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

    // Envoyer le message avec boutons

    await sendConfirmationWithButtons(targetNumber);

    // Gestion des réponses aux boutons

    const buttonHandler = async ({ messages }) => {

      const m = messages[0];

      

      // Vérifier si c'est une réponse de bouton

      const selectedButtonId = m.message?.buttonsResponseMessage?.selectedButtonId;

      if (!selectedButtonId) return;

      if (m.key.remoteJid !== from) return;

      console.log(`🔄 Bouton sélectionné: ${selectedButtonId}`);

      // Vérifier le numéro cible

      const buttonNumber = selectedButtonId.split('_').pop();

      if (buttonNumber !== targetNumber) return;

      // Réagir selon le choix

      if (selectedButtonId.startsWith('fire_yes_')) {

        // Ajouter une réaction ✓

        await sock.sendMessage(from, {

          react: { text: "✅", key: m.key }

        });

        

        await sock.sendMessage(from, {

          text: "⏳ Envoi en cours..."

        });

        

        await sendFireMessages(targetJid, targetNumber);

      } 

      else if (selectedButtonId.startsWith('fire_no_')) {

        await sock.sendMessage(from, {

          react: { text: "❌", key: m.key }

        });

        

        await sock.sendMessage(from, {

          text: "❌ Envoi annulé"

        });

      }

      // Supprimer le listener

      sock.ev.off("messages.upsert", buttonHandler);

    };

    // Ajouter le listener

    sock.ev.on("messages.upsert", buttonHandler);

    

    // Nettoyer après 2 minutes

    setTimeout(() => {

      sock.ev.off("messages.upsert", buttonHandler);

      console.log("🧹 Listener boutons nettoyé (timeout)");

    }, 120000);

  }

};

// > 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝙷𝙴𝚇-𝙶𝙰𝚃𝙴