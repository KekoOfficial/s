// Esfuerzo Extremo por Extremos para que funcione
// Carga las variables de entorno y librerías
require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Base de datos de usuarios y Q&A
const dbPath = './data/store.json';
let db = {
    users: {},
    qna: {}
};

// Carga la base de datos al iniciar
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

// Configura el cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: 'LA_RUTA_QUE_ENCONTRASTE'
    }
});

client.on('call', async (call) => {
    console.log('Llamada recibida de', call.from);
    await call.reject();
    console.log('Llamada rechazada');
});

client.on('qr', (qr) => {
    console.log('QR RECIBIDO');
    qrcode.generate(qr, { small: true });
    console.log("Escanea este QR con tu teléfono.");
});

client.on('ready', () => {
    console.log('¡El bot Valentina está en línea!');
});

// Función para guardar los datos
const saveDb = () => {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
};

// Función para obtener el saludo según la hora del día
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
};

// Para manejar el estado de aprendizaje y onboarding por usuario
let userState = {};

client.on('message', async (message) => {
    if (message.fromMe || message.isStatus) return;

    const userNumber = message.from.split('@')[0];
    const userMessage = message.body.trim();
    const userMessageLower = userMessage.toLowerCase();
    
    // Admin mode for the owner
    const ownerNumber = '521999999999'; // Reemplaza con tu número de teléfono en formato de WhatsApp

    // LÓGICA: RESPUESTA ESPECÍFICA SOBRE EL CREADOR
    if (userMessageLower.includes('quién es tu creador') || userMessageLower.includes('quién te hizo') || userMessageLower.includes('quien te creo')) {
        message.reply("Mi creador es NoaDev Studio, un equipo desarrollador en juego y bots.");
        return;
    }

    // LÓGICA: COMANDOS DEL BOT
    if (userMessageLower.startsWith('!')) {
        const command = userMessageLower.split(' ')[0];
        const args = userMessageLower.slice(command.length).trim();

        switch (command) {
            case '!saludo':
                message.reply('¡Hola! Estoy aquí para ayudarte.');
                break;
            case '!broma':
                const jokes = [
                    "¿Qué le dice una impresora a otra? ¿Esa hoja es tuya o es impresión mía?",
                    "¿Qué hace una abeja en el gimnasio? ¡Zum-ba!",
                    "¿Qué le dice un semáforo a otro? No me mires que me pongo rojo."
                ];
                const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
                message.reply(randomJoke);
                break;
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
                const definition = definitions[word] || 'Lo siento, no tengo una definición para esa palabra en mi diccionario.';
                message.reply(definition);
                break;
            case '!ayuda':
            case '!menu':
                message.reply('**Menú de comandos:**\n\n' +
                '• `!saludo`: Te saludo cordialmente.\n' +
                '• `!broma`: Te cuento un chiste.\n' +
                '• `!definir [palabra]`: Busco la definición de una palabra.\n' +
                '• `!adiós` o `!chao`: Me despido de ti.\n\n' +
                'Puedes preguntar cualquier cosa, usaré mi inteligencia artificial para responder. (Recuerda tener tu clave de OpenAI en el archivo `.env`)');
                break;
            case '!adiós':
            case '!chao':
                message.reply('¡Hasta luego! Vuelve pronto.');
                break;
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
                break;
            // Modo de aprendizaje
            case '!aprender':
                if (!args) {
                    message.reply('Por favor, dime la pregunta que quieres que aprenda. Ejemplo: `!aprender ¿Qué es un bot?`');
                    return;
                }
                db.users[userNumber].learning = args;
                saveDb();
                message.reply(`¡Excelente! Ahora, dime la respuesta para la pregunta: "${args}"`);
                break;
            // Comando para borrar la información de un usuario
            case '!borrar-mi-info':
                if (db.users[userNumber]) {
                    delete db.users[userNumber];
                    saveDb();
                    message.reply('Toda tu información ha sido eliminada. Gracias por usar el bot.');
                }
                break;
            default:
                // Si el comando no existe, usa la IA
                const aiResponse = await openai.chat.completions.create({
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: userMessage }],
                    max_tokens: 150
                });
                message.reply(aiResponse.choices[0].message.content.trim());
                break;
        }
        return;
    }
    
    // Si el usuario no existe, inicia el onboarding
    if (!db.users[userNumber]) {
        db.users[userNumber] = {
            profile: {},
            mode: 'normal',
            onboardingStep: 0,
            learning: null
        };
        saveDb();
        message.reply(`${getGreeting()}! Soy Valentina. Me gustaría conocerte mejor. ¿Te gustaría responder unas preguntas sobre ti? 😊 (Escribe 'sí' o 'no')`);
        return;
    }
    
    // Lógica para el proceso de onboarding
    if (db.users[userNumber].onboardingStep > 0 && db.users[userNumber].onboardingStep <= onboardingQuestions.length) {
        const step = db.users[userNumber].onboardingStep;
        const currentQuestion = onboardingQuestions[step - 1];

        if (userMessageLower === 'cancelar') {
            db.users[userNumber].onboardingStep = 0;
            saveDb();
            message.reply("Entendido. Podemos continuar con esto más tarde.");
            return;
        }

        db.users[userNumber].profile[currentQuestion] = userMessage;
        db.users[userNumber].onboardingStep++;
        saveDb();

        if (db.users[userNumber].onboardingStep > onboardingQuestions.length) {
            const userName = db.users[userNumber].profile['Apodo / cómo le gusta que le llamen:'] || 'amigo';
            message.reply(`¡Genial! Gracias por compartir, ${userName}. Ahora soy tu súper amiga. Si necesitas algo, solo pregúntame.`);
            db.users[userNumber].onboardingStep = 0;
            saveDb();
        } else {
            const nextQuestion = onboardingQuestions[db.users[userNumber].onboardingStep - 1];
            message.reply(nextQuestion);
        }
        return;
    }

    // Comienza el onboarding
    if (userMessageLower === 'sí' && db.users[userNumber].onboardingStep === 0) {
        db.users[userNumber].onboardingStep = 1;
        saveDb();
        message.reply("¡Perfecto! Vamos con la primera pregunta:\n\n" + onboardingQuestions[0]);
        return;
    }
    
    // Lógica de aprendizaje
    if (db.users[userNumber].learning) {
        db.qna[db.users[userNumber].learning] = userMessage;
        db.users[userNumber].learning = null;
        saveDb();
        message.reply("¡Gracias por enseñarme! Ya he guardado esa respuesta.");
        return;
    }

    // Lógica para responder a preguntas aprendidas
    if (db.qna[userMessageLower]) {
        message.reply(db.qna[userMessageLower]);
        return;
    }

    // Lógica principal de conversación (se ejecuta después del onboarding)
    const userName = db.users[userNumber].profile['Apodo / cómo le gusta que le llamen:'] || "amigo";

    if (userMessageLower.includes('gracias')) {
        message.reply(`¡De nada, ${userName}! Para eso estoy.`);
        return;
    }
    if (userMessageLower.includes('genial') || userMessageLower.includes('bueno')) {
        message.reply(`¡Me alegra oír eso, ${userName}!`);
        return;
    }
    if (userMessageLower.includes('triste') || userMessageLower.includes('mal')) {
        message.reply(`Oh no, lamento escuchar eso, ${userName}. ¿Hay algo en lo que pueda ayudarte?`);
        return;
    }
    
    // Si el usuario ya está en onboarding, no responde
    if (db.users[userNumber].onboardingStep > 0) return;
    
    message.reply(`Hola, ${userName}. ¿En qué puedo ayudarte?`);
});

client.initialize();
