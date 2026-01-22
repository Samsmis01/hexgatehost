
import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

import makeWASocket, {
  useMultiFileAuthState
} from "@whiskeysockets/baileys"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

    sock.ev.on("connection.update", ({ connection }) => {
      if (connection === "open") {
        console.log(`✅ Connecté : ${number}`)
      }

      if (connection === "close") {
        console.log(`❌ Déconnecté : ${number}`)
        activeBots.delete(number)
      }
    })

    const code = await sock.requestPairingCode(number)
    activeBots.set(number, sock)

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
