
// Fichier de stockage des scores
const SCORES_FILE = path.join(__dirname, 'quiz_scores.json');

// Initialiser les scores
let scores = {};
if (fs.existsSync(SCORES_FILE)) {
    try {
        scores = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
    } catch (e) {
        console.error('Erreur lecture scores:', e);
        scores = {};
    }
}

// Sauvegarder les scores
function saveScores() {
    fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
}

// Questions par catégorie
const questions = {
    sciences: [
        {
            question: "Quelle est la planète la plus proche du soleil ?",
            options: ["1. Vénus", "2. Mercure", "3. Terre"],
            answer: 2
        },
        {
            question: "Quel gaz les plantes absorbent-elles pour la photosynthèse ?",
            options: ["1. Oxygène", "2. Dioxyde de carbone", "3. Azote"],
            answer: 2
        }
    ],
    histoire: [
        {
            question: "En quelle année a pris fin la Seconde Guerre mondiale ?",
            options: ["1. 1943", "2. 1945", "3. 1950"],
            answer: 2
        },
        {
            question: "Qui a découvert l'Amérique en 1492 ?",
            options: ["1. Marco Polo", "2. Christophe Colomb", "3. Vasco de Gama"],
            answer: 2
        }
    ]
};

// États des quiz en cours
const userQuizzes = {};

module.exports = {
    name: "quiz",
    description: "Système de quiz interactif",
    
    commands: {
        quiz: {
            name: "quiz",
            description: "Menu des catégories de quiz",
            execute: async (sock, msg, args) => {
                const from = msg.key.remoteJid;
                const userId = msg.key.participant || msg.key.remoteJid;
                
                const menuText = `
┏━━━━━━━━━━━━━━━━━┓
┃   📚 QUIZ GAME  ┃
┗━━━━━━━━━━━━━━━━━┛

Choisissez une catégorie :

🔬 *1. SCIENCES*
   - 2 questions scientifiques
   
📜 *2. HISTOIRE*
   - 2 questions historiques

📊 *3. SCORES*
   - Voir les meilleurs scores

🔄 *4. RESET*
   - Réinitialiser (owner only)

*Comment jouer:*
Répondez avec 1, 2 ou 3 selon l'option choisie.
`;

                await sock.sendMessage(from, {
                    text: menuText,
                    buttons: [
                        {
                            buttonId: 'sciences',
                            buttonText: { displayText: '🔬 SCIENCES' },
                            type: 1
                        },
                        {
                            buttonId: 'histoire',
                            buttonText: { displayText: '📜 HISTOIRE' },
                            type: 1
                        },
                        {
                            buttonId: 'scores',
                            buttonText: { displayText: '📊 SCORES' },
                            type: 1
                        }
                    ]
                });
            }
        },

        scores: {
            name: "scores",
            description: "Affiche les scores du quiz",
            execute: async (sock, msg, args) => {
                const from = msg.key.remoteJid;
                
                if (Object.keys(scores).length === 0) {
                    return await sock.sendMessage(from, { 
                        text: "📊 *SCORES*\n\nAucun score enregistré pour le moment.\nJouez au quiz pour apparaître ici !" 
                    });
                }

                // Trier les scores
                const sortedScores = Object.entries(scores)
                    .sort(([,a], [,b]) => b.total - a.total)
                    .slice(0, 10);

                let scoreText = "🏆 *CLASSEMENT DES SCORES*\n\n";
                
                sortedScores.forEach(([user, data], index) => {
                    const medals = ["🥇", "🥈", "🥉"];
                    const medal = medals[index] || `#${index + 1}`;
                    scoreText += `${medal} *${data.name || user}*\n`;
                    scoreText += `  ✅ Correct: ${data.correct || 0}\n`;
                    scoreText += `  📊 Score: ${data.total || 0} points\n`;
                    scoreText += `  🕐 Dernier: ${new Date(data.lastPlayed || Date.now()).toLocaleDateString()}\n\n`;
                });

                scoreText += `\n_${sortedScores.length} joueurs au total_`;

                await sock.sendMessage(from, { text: scoreText });
            }
        },

        resetquiz: {
            name: "resetquiz",
            description: "Réinitialise les scores du quiz (owner only)",
            execute: async (sock, msg, args) => {
                const from = msg.key.remoteJid;
                const userId = msg.key.participant || msg.key.remoteJid;
                
                // Vérifier si owner (à adapter)
                const isOwner = true; // Remplacez par votre logique owner
                
                if (!isOwner) {
                    return await sock.sendMessage(from, { 
                        text: "❌ *ACCÈS REFUSÉ*\nSeul le propriétaire peut réinitialiser les scores." 
                    });
                }

                scores = {};
                saveScores();
                
                await sock.sendMessage(from, { 
                    text: "✅ *SCORES RÉINITIALISÉS*\n\nTous les scores ont été remis à zéro." 
                });
            }
        }
    },

    // Système de participation "joint"
    handleMessage: async (sock, msg) => {
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        const from = msg.key.remoteJid;
        const userId = msg.key.participant || msg.key.remoteJid;
        const userName = msg.pushName || "Joueur";

        // Commande "joint" (sans préfixe)
        if (text.toLowerCase().trim() === 'joint') {
            if (!scores[userId]) {
                scores[userId] = {
                    name: userName,
                    correct: 0,
                    total: 0,
                    lastPlayed: Date.now(),
                    joined: new Date().toISOString()
                };
                saveScores();
            }

            await sock.sendMessage(from, {
                text: `🎮 *BIENVENUE AU QUIZ!*\n\nSalut *${userName}* ! 👋\n\nTu as rejoint le jeu de quiz.\n\nUtilise *!quiz* pour voir les catégories disponibles.\n\n*Comment jouer:*\n1. Choisis une catégorie\n2. Réponds avec 1, 2 ou 3\n3. Gagne des points !`
            });
            return true;
        }

        // Gestion des réponses aux quiz
        if (userQuizzes[userId] && ['1', '2', '3'].includes(text.trim())) {
            const userQuiz = userQuizzes[userId];
            const answer = parseInt(text.trim());
            
            // Vérifier la réponse
            const currentQuestion = questions[userQuiz.category][userQuiz.currentQuestion];
            const isCorrect = answer === currentQuestion.answer;
            
            // Mettre à jour le score
            if (!scores[userId]) {
                scores[userId] = {
                    name: userName,
                    correct: 0,
                    total: 0,
                    lastPlayed: Date.now()
                };
            }
            
            scores[userId].lastPlayed = Date.now();
            
            if (isCorrect) {
                scores[userId].correct = (scores[userId].correct || 0) + 1;
                scores[userId].total = (scores[userId].total || 0) + 10;
                await sock.sendMessage(from, { text: `✅ *CORRECT!* +10 points\n\nExplication: C'est la bonne réponse !` });
            } else {
                scores[userId].total = Math.max(0, (scores[userId].total || 0) - 5);
                await sock.sendMessage(from, { text: `❌ *FAUX!* -5 points\n\nLa bonne réponse était l'option *${currentQuestion.answer}*` });
            }
            
            saveScores();
            
            // Passer à la question suivante
            userQuiz.currentQuestion++;
            
            if (userQuiz.currentQuestion < questions[userQuiz.category].length) {
                await askQuestion(sock, from, userId, userQuiz.category, userQuiz.currentQuestion);
            } else {
                // Fin du quiz
                delete userQuizzes[userId];
                
                const userScore = scores[userId] || { correct: 0, total: 0 };
                const totalQuestions = questions[userQuiz.category].length;
                
                await sock.sendMessage(from, {
                    text: `🎉 *QUIZ TERMINÉ!*\n\nCatégorie: *${userQuiz.category.toUpperCase()}*\n\n📊 *TON SCORE:*\n✅ Réponses correctes: ${userScore.correct}/${totalQuestions}\n🏆 Points totaux: ${userScore.total}\n\nUtilise *!scores* pour voir le classement.`
                });
            }
            
            return true;
        }

        // Gestion des boutons
        if (msg.message?.buttonsResponseMessage) {
            const buttonId = msg.message.buttonsResponseMessage.selectedButtonId;
            const userId = msg.key.participant || msg.key.remoteJid;
            
            switch(buttonId) {
                case 'sciences':
                    await startQuiz(sock, msg, 'sciences');
                    break;
                case 'histoire':
                    await startQuiz(sock, msg, 'histoire');
                    break;
                case 'scores':
                    // Utiliser la commande scores existante
                    const scoresCommand = module.exports.commands.scores;
                    await scoresCommand.execute(sock, msg, []);
                    break;
            }
            return true;
        }
        
        return false;
    }
};

// Démarrer un quiz
async function startQuiz(sock, msg, category) {
    const from = msg.key.remoteJid;
    const userId = msg.key.participant || msg.key.remoteJid;
    
    userQuizzes[userId] = {
        category: category,
        currentQuestion: 0,
        startTime: Date.now()
    };
    
    await sock.sendMessage(from, {
        text: `🎯 *QUIZ ${category.toUpperCase()}*\n\nTu as ${questions[category].length} questions à répondre.\n\n*Règles:*\n✅ Bonne réponse: +10 points\n❌ Mauvaise réponse: -5 points\n\nAppuie sur n'importe quel bouton pour commencer !`
    });
    
    // Démarrer avec la première question
    await askQuestion(sock, from, userId, category, 0);
}

// Poser une question
async function askQuestion(sock, from, userId, category, questionIndex) {
    const question = questions[category][questionIndex];
    const questionNumber = questionIndex + 1;
    const totalQuestions = questions[category].length;
    
    const questionText = `
📝 *Question ${questionNumber}/${totalQuestions}*
━━━━━━━━━━━━━━━━━━━━

${question.question}

${question.options.join('\n')}

━━━━━━━━━━━━━━━━━━━━
*Réponds avec 1, 2 ou 3*
`;

    await sock.sendMessage(from, { text: questionText });
}