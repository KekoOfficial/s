// Este es un esfuerzo extremo con extremos para el bot Valentina.
// El siguiente código incluye todo lo que necesitas para que funcione sin problemas.

// Dependencias esenciales para el funcionamiento
require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
// const { OpenAI } = require('openai'); // Descomenta esta línea si usas OpenAI
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configuración de la base de datos local
const dbPath = './data/store.json';
let db = { users: {}, qna: {} };

try {
    if (fs.existsSync(dbPath)) {
        db = JSON.parse(fs.readFileSync(dbPath));
    }
} catch (error) {
    console.error("Error al cargar la base de datos:", error);
}

// Lista de preguntas para el onboarding
const onboardingQuestions = [
    "Nombre completo:",
    "Apodo / cómo le gusta que le llamen:",
    "Edad:",
    "Fecha de nacimiento:",
    "País:",
    "Ciudad actual:",
    "Idiomas que habla:",
    "Estudia / trabaja en:",
    "Pasatiempos favoritos:",
    "Música que escucha:",
    "Comida favorita:",
    "Películas / series favoritas:",
    "Redes sociales (si quiere compartir):",
    "Sueños o metas personales:",
    "Algo curioso sobre él/ella:",
    "Qué no le gusta:",
    "Color favorito:",
    "Animal favorito:",
    "Frase que le identifica:",
];

// Inicia el cliente con autenticación local
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        // Asegúrate de que esta ruta es la correcta.
        // Si tienes problemas, bórrala y deja que puppeteer lo descargue por sí mismo.
        executablePath: 'LA_RUTA_QUE_ENCONTRASTE_CON_EL_COMANDO_find'
    }
});

client.on('qr', qr => {
    console.log('¡QR RECIBIDO! Por favor, escanea el código para iniciar la sesión:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('¡El bot Valentina está en línea!');
});

client.on('message', async message => {
    if (message.fromMe || message.isStatus) return;

    const userNumber = message.from.split('@')[0];
    const userMessage = message.body.trim();
    const userMessageLower = userMessage.toLowerCase();

    // Comandos de administración y ayuda
    if (userMessageLower.startsWith('!')) {
        const command = userMessageLower.split(' ')[0];
        const args = userMessageLower.slice(command.length).trim();

        switch (command) {
            case '!menu':
            case '!ayuda':
                message.reply('**Menú de comandos:**\n\n' +
                    '• `!saludo`: Te saludo cordialmente.\n' +
                    '• `!broma`: Te cuento un chiste.\n' +
                    '• `!definir [palabra]`: Busco la definición de una palabra.\n' +
                    '• `!perfil`: Muestra la información que has guardado en el base de datos.\n' +
                    '• `!aprender [pregunta]`: Me enseñas una pregunta con su respuesta.\n' +
                    '• `!adiós`: Me despido de ti.\n\n' +
                    '• Puedes preguntar cualquier cosa (si tienes la IA activada).\n' +
                    '• Escribe `sí` para comenzar el proceso de onboarding.');
                return;
            case '!saludo':
                message.reply('¡Hola! Estoy aquí para ayudarte.');
                return;
            case '!broma':
                const jokes = [
                    "¿Qué le dice una impresora a otra? ¿Esa hoja es tuya o es impresión mía?",
                    "¿Qué hace una abeja en el gimnasio? ¡Zum-ba!",
                    "¿Qué le dice un semáforo a otro? No me mires que me pongo rojo."
                ];
                message.reply(jokes[Math.floor(Math.random() * jokes.length)]);
                return;
            case '!definir':
                const word = args;
                if (!word) {
                    message.reply('Por favor, dime qué palabra quieres que defina. Ejemplo: `!definir amistad`');
                    return;
                }
                const definitions = {
                    "amistad": "Relación de afecto, simpatía y confianza que se establece entre personas.",
                    "programación": "El arte y la ciencia de escribir instrucciones para una computadora.",
                    "bot": "Un programa de software que realiza tareas automáticas y repetitivas a través de internet."
                };
                message.reply(definitions[word] || 'Lo siento, no tengo una definición para esa palabra.');
                return;
            case '!aprender':
                if (!args) {
                    message.reply('Por favor, dime la pregunta que quieres que aprenda. Ejemplo: `!aprender ¿Qué es un bot?`');
                    return;
                }
                db.users[userNumber].learning = args;
                saveDb();
                message.reply(`¡Excelente! Ahora, dime la respuesta para la pregunta: "${args}"`);
                return;
            case '!perfil':
                const userProfile = db.users[userNumber].profile;
                if (Object.keys(userProfile).length === 0) {
                    message.reply('No has completado el onboarding. Escribe "sí" para empezar.');
                } else {
                    let profileText = '**Tu perfil:**\n\n';
                    for (const question in userProfile) {
                        profileText += `• **${question}** ${userProfile[question]}\n`;
                    }
                    message.reply(profileText);
                }
                return;
            case '!adiós':
            case '!chao':
                message.reply('¡Hasta luego! Vuelve pronto.');
                return;
            default:
                // Si el comando no se encuentra en la lista, el bot lo maneja con IA si está configurada.
                // const aiResponse = await openai.chat.completions.create({
                //     model: 'gpt-3.5-turbo',
                //     messages: [{ role: 'user', content: userMessage }],
                //     max_tokens: 150
                // });
                // message.reply(aiResponse.choices[0].message.content.trim());
                message.reply('Lo siento, no conozco ese comando.');
                return;
        }
    }

    // Lógica para el onboarding y conversación normal
    if (!db.users[userNumber]) {
        db.users[userNumber] = {
            profile: {},
            mode: 'normal',
            onboardingStep: 0,
            learning: null
        };
        saveDb();
        message.reply(`¡${getGreeting()}! Soy Valentina. ¿Te gustaría responder unas preguntas sobre ti? (Escribe 'sí' o 'no')`);
        return;
    }

    if (db.users[userNumber].onboardingStep > 0 && db.users[userNumber].onboardingStep <= onboardingQuestions.length) {
        if (userMessageLower === 'cancelar') {
            db.users[userNumber].onboardingStep = 0;
            saveDb();
            message.reply("Entendido. Podemos continuar con esto más tarde.");
            return;
        }

        db.users[userNumber].profile[onboardingQuestions[db.users[userNumber].onboardingStep - 1]] = userMessage;
        db.users[userNumber].onboardingStep++;
        saveDb();

        if (db.users[userNumber].onboardingStep > onboardingQuestions.length) {
            const userName = db.users[userNumber].profile['Apodo / cómo le gusta que le llamen:'] || 'amigo';
            message.reply(`¡Genial! Gracias por compartir, ${userName}. Ahora soy tu súper amiga.`);
            db.users[userNumber].onboardingStep = 0;
        } else {
            message.reply(onboardingQuestions[db.users[userNumber].onboardingStep - 1]);
        }
        return;
    }

    if (userMessageLower === 'sí' && db.users[userNumber].onboardingStep === 0) {
        db.users[userNumber].onboardingStep = 1;
        saveDb();
        message.reply("¡Perfecto! Vamos con la primera pregunta:\n\n" + onboardingQuestions[0]);
        return;
    }

    if (db.users[userNumber].learning) {
        db.qna[db.users[userNumber].learning] = userMessage;
        db.users[userNumber].learning = null;
        saveDb();
        message.reply("¡Gracias por enseñarme! Ya he guardado esa respuesta.");
        return;
    }

    if (db.qna[userMessageLower]) {
        message.reply(db.qna[userMessageLower]);
        return;
    }

    const userName = db.users[userNumber].profile['Apodo / cómo le gusta que le llamen:'] || "amigo";

    if (userMessageLower.includes('gracias')) {
        message.reply(`¡De nada, ${userName}! Para eso estoy.`);
        return;
    }
    
    // Si ninguna de las condiciones anteriores se cumple, el bot no responde
    // para evitar un ciclo de respuestas
});

const saveDb = () => fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
};

client.initialize();
