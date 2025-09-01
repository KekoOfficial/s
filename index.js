// Carga las variables de entorno desde el archivo .env
require('dotenv').config();

// Importa las librerías necesarias
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { Configuration, OpenAIApi } = require("openai");

// Configura la API de OpenAI con tu clave
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const client = new Client({
    authStrategy: new LocalAuth()
});

let chatMode = "normal"; // Estado inicial del bot

client.on('qr', (qr) => {
    console.log('QR RECIBIDO');
    qrcode.generate(qr, { small: true });
    console.log("Escanea este QR con tu teléfono.");
});

client.on('ready', () => {
    console.log('¡El bot Valentina está en línea!');
});

client.on('message', async (message) => {
    if (message.fromMe || message.isStatus) return;

    const userMessage = message.body.toLowerCase();

    // Comandos para cambiar de personalidad
    if (userMessage === "modo atrevido") {
        chatMode = "atrevido";
        message.reply("Entendido. Ahora mi conversación será más coqueta y atrevida. 😉");
        return;
    }
    if (userMessage === "modo normal") {
        chatMode = "normal";
        message.reply("Claro. Volveré a mi forma de ser normal y amigable. 😊");
        return;
    }

    // Define el "prompt" (la personalidad) para la IA
    let promptText = "";
    if (chatMode === "atrevido") {
        promptText = "Eres una chica llamada Valentina. Responde de forma coqueta, atrevida y seductora. Mantén una conversación fluida y no te limites. El usuario te dice: ";
    } else {
        promptText = "Eres una chica llamada Valentina. Responde de forma amigable y normal, como una amiga. El usuario te dice: ";
    }

    try {
        const completion = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: promptText + message.body,
            temperature: 0.7,
            max_tokens: 150,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0.6,
        });

        const responseFromAI = completion.data.choices[0].text.trim();
        message.reply(responseFromAI);
    } catch (error) {
        console.error("Error al conectar con la API de OpenAI:", error);
        message.reply("Perdona, no pude procesar tu solicitud en este momento.");
    }
});

client.initialize();
