module.exports = {

  name: "fakerecording",

  description: "Activer ou désactiver le fake recording (publique)",

  execute: async (sock, msg, args) => {

    const from = msg.key.remoteJid;

    // Vérifier argument

    if (!args[0] || !["on", "off"].includes(args[0].toLowerCase())) {

      return sock.sendMessage(from, {

        text:

          "⚙️ *FAKE RECORDING*\n\n" +

          "Utilisation :\n" +

          "• `.fakerecording on` → Activer\n" +

          "• `.fakerecording off` → Désactiver"

      });

    }

    // Modifier l'état en mémoire

    global.fakeRecording = args[0].toLowerCase() === "on";

    // ✅ Message de confirmation

    await sock.sendMessage(from, {

      text:

        "🎙️ *FAKE RECORDING*\n\n" +

        `Statut : *${global.fakeRecording ? "ACTIVÉ ✅" : "DÉSACTIVÉ ❌"}*`

    });

    console.log(

      `📝 Fake Recording modifié par ${msg.key.participant || from}: ${

        global.fakeRecording ? "ON" : "OFF"

      }`

    );

  }

};