// Importa la librería de WhatsApp
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcodeterminal');

// Crea un nuevo cliente de WhatsApp
// Con "LocalAuth" el bot guardará la sesión para no tener que escanear el QR cada vez.
const client = new Client({
    authStrategy: new LocalAuth()
});

// Este evento se dispara cuando el bot necesita ser vinculado.
// Imprimirá un código QR en la terminal de Termux.
client.on('qr', (qr) => {
    console.log('QR RECIBIDO', qr);
    qrcode.generate(qr, { small: true });
    console.log("Escanea este QR con tu teléfono.");
});

// Este evento se dispara cuando el bot se ha conectado exitosamente.
client.on('ready', () => {
    console.log('¡El bot Valentina está en línea!');
});

// Este evento se dispara cada vez que llega un mensaje.
client.on('message', async (message) => {
    // Para que no responda a sus propios mensajes o a mensajes de grupos.
    if (message.fromMe || message.isStatus) return;

    // Aquí iría el código para interactuar con la IA (como ChatGPT)
    // Para que el bot sea "normal" o "atrevido", tendrías que enviar un "prompt"
    // o una indicación a la IA antes de la pregunta real.
    // Por ejemplo: "Eres una chica llamada Valentina, responde de forma atrevida..."

    // Ejemplo básico para que el bot responda
    const userMessage = message.body.toLowerCase();

    if (userMessage.includes("hola")) {
        message.reply("¡Hola! ¿En qué puedo ayudarte hoy?");
    } else if (userMessage.includes("cómo estás")) {
        message.reply("Estoy genial, ¡gracias por preguntar!");
    } else {
        // Aquí iría la llamada a la API de la IA
        // const responseFromAI = await yourAIFunction(userMessage);
        // message.reply(responseFromAI);
        message.reply("Perdona, aún no sé cómo responder a eso. Intenta preguntarme algo más.");
    }
});

// Inicia el bot
client.initialize();
