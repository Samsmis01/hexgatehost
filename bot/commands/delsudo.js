const fs = require("fs");

const path = require("path");

const sudoPath = path.join(__dirname, "../sudoers.json");

function loadSudoers() {

  if (!fs.existsSync(sudoPath)) return [];

  return JSON.parse(fs.readFileSync(sudoPath, "utf-8"));

}

function saveSudoers(list) {

  fs.writeFileSync(sudoPath, JSON.stringify(list, null, 2));

}

module.exports = {

  name: "delsudo",

  description: "Supprimer un utilisateur de la liste des sudoers",

  execute: async (sock, msg, args) => {

    const from = msg.key.remoteJid;

    const sender = msg.key.participant || msg.key.remoteJid;

    if (!args[0]) {

      return await sock.sendMessage(from, {

        text: "⚙️ Utilisation : `.delsudo 243XXXXXXXXX`"

      });

    }

    let sudoers = loadSudoers();

    const jid = args[0].replace(/\D/g, "") + "@s.whatsapp.net";

    if (!sudoers.includes(jid)) {

      return await sock.sendMessage(from, {

        text: "❌ Cet utilisateur n'est pas sudoer"

      });

    }

    sudoers = sudoers.filter(u => u !== jid);

    saveSudoers(sudoers);

    await sock.sendMessage(from, {

      text: `🗑️ Utilisateur supprimé des sudoers : ${jid}`

    });

    console.log(`📝 ${sender} a supprimé ${jid} des sudoers`);

  }

};