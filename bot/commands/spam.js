const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {

  name: "spam",

  description: "Envoyer 'Vous êtes viré' 3 fois à un numéro spécifié avec délai",

  execute: async (sock, msg, args) => {

    const from = msg.key.remoteJid;

    // 🔹 Vérifier si un numéro a été fourni

    if (!args[0]) {

      return sock.sendMessage(from, {

        text: "⚠️ Veuillez fournir le numéro du destinataire.\n\nExemple : `.fire 243XXXXXXXXX`"

      });

    }

    // 🔹 Nettoyer le numéro et formater en JID WhatsApp

    const targetNumber = args[0].replace(/\D/g, "");

    const targetJid = `${targetNumber}@s.whatsapp.net`;

    // 🔹 Confirmation au user

    await sock.sendMessage(from, {

      text: `🚀 Envoi en cours vers ${targetNumber}...`

    });

    // 🔹 Envoyer le message 3 fois avec délai de 3 secondes

    try {

      for (let i = 1; i <= 3; i++) {

        await sock.sendMessage(targetJid, {

          text: `❌ Vous êtes viré ! (${i}/3)`

        });

        console.log(`📝 Message ${i}/3 envoyé à ${targetNumber}`);

        await delay(3000); // 3 secondes entre chaque message

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

  }

};

// > 𝚙𝚘𝚠𝚎𝚛𝚎𝚍 𝙷𝙴𝚇-𝙶𝙰𝚃𝙴