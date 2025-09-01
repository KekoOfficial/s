// Carga las variables de entorno y librerías
require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

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
        executablePath: '/usr/bin/chromium'
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

    // LÓGICA: RESPUESTA ESPECÍFICA SOBRE EL CREADOR
    if (userMessageLower.includes('quién es tu creador') || userMessageLower.includes('quién te hizo') || userMessageLower.includes('quien te creo')) {
        message.reply("Mi creador es NoaDev Studio, un equipo desarrollador en juego y bots.");
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
