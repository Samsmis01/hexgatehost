module.exports = {
    name: "hug",
    description: "Fait un câlin à quelqu'un",
    execute: async (sock, msg, args) => {
        const from = msg.key.remoteJid;
        const sender = msg.pushName || "Quelqu'un";
        
        let target = "quelqu'un";
        let mentions = [];
        
        if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
            const mentioned = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
            target = `@${mentioned.split('@')[0]}`;
            mentions = [mentioned];
        } else if (args[0]) {
            target = args[0];
        }
        
        const gifs = [
            "https://media.tenor.com/SLBmCk58bi4AAAAC/hug.gif",
            "https://media.tenor.com/xIuMvqiVlq0AAAAC/hugs.gif",
            "https://media.tenor.com/4B2-HFfMaM4AAAAC/hug-anime.gif"
        ];
        
        const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
        
        await sock.sendMessage(from, {
            video: { url: randomGif },
            gifPlayback: true,
            caption: `🤗 ${sender} fait un câlin à ${target}!`,
            mentions: mentions
        });
    }
};