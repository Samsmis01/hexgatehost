const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const fs = require("fs")
const path = require("path")

const { makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")

// 🔥 IMPORT DE TON BOT
const startBot = require("./bot/index.js").default

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(bodyParser.json())
app.use(express.static("public"))

/* 📁 dossier des sessions */
const SESSIONS_DIR = path.join(__dirname, "sessions")
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR)
}

/* 🧠 stockage des bots actifs */
const activeBots = new Map()

/* 🔗 route test */
app.get("/", (req, res) => {
  res.send("✅ Baileys Pairing Server actif")
})

/* 📲 ROUTE PAIRING */
app.post("/pair", async (req, res) => {
  try {
    let { number } = req.body

    if (!number) {
      return res.status(400).json({ error: "Numéro manquant" })
    }

    number = number.replace(/\D/g, "")

    if (number.length < 10) {
      return res.status(400).json({ error: "Numéro invalide" })
    }

    if (activeBots.has(number)) {
      return res.status(400).json({ error: "Bot déjà actif pour ce numéro" })
    }

    const sessionPath = path.join(SESSIONS_DIR, number)

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ["Baileys", "Chrome", "1.0"]
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", async ({ connection }) => {
      if (connection === "open") {
        console.log(`✅ WhatsApp connecté : ${number}`)

        // 🚀 LANCEMENT DE TON BOT
        await startBot(sock, sessionPath)

        activeBots.set(number, sock)
      }

      if (connection === "close") {
        console.log(`❌ WhatsApp déconnecté : ${number}`)
        activeBots.delete(number)
      }
    })

    // 🔑 Génération du pairing code
    const code = await sock.requestPairingCode(number)

    res.json({
      success: true,
      pairingCode: code
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({
      error: "Erreur serveur",
      details: err.message
    })
  }
})

/* 🚀 Lancement serveur */
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`)
})
