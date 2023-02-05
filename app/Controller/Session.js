const wa = require('whatsapp-web.js')
const fs = require('fs')
const qrcode = require('qrcode')

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//     cors: {
//         origin: process.env.ORIGIN
//     }
// });

//WhatsApp Web
const { Client, LocalAuth } = wa;

//Create Session
const sessions = [];
const SESSIONS_FILE = './whatsapp-sessions.json';

const createSessionsFileIfNotExists = function() {
    if (!fs.existsSync(SESSIONS_FILE)) {
        try {
            fs.writeFileSync(SESSIONS_FILE, JSON.stringify([]));
            console.log('Sessions file created successfully.');
        } catch (err) {
            console.log('Failed to create sessions file: ', err);
        }
    }
}

createSessionsFileIfNotExists();

const setSessionsFile = function(sessions) {
    fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions), function(err) {
        if (err) {
            console.log(err);
        }
    });
}

const getSessionsFile = function() {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE));
}

const getSession = () => {
    return sessions;
}

// // Create Session
// const createSession = function(id, description, io) {
//     const client = new Client({
//         restartOnAuthFail: true,
//         puppeteer: {
//             headless: true,
//             args: [
//                 '--no-sandbox',
//                 '--use-gl=egl',
//                 '--disable-setuid-sandbox',
//                 '--disable-dev-shm-usage',
//                 '--disable-accelerated-2d-canvas',
//                 '--no-first-run',
//                 '--no-zygote',
//                 '--single-process', // <- this one doesn't works in Windows
//                 '--disable-gpu'
//             ],
//         },
//         authStrategy: new LocalAuth({
//             clientId: id
//         })
//     });

//     client.initialize();

//     client.on('qr', (qr) => {
//         qrcode.toDataURL(qr, (err, url) => {
//             io.emit('qr', {
//                 id: id,
//                 src: url
//             });
//             io.emit('message', {
//                 id: id,
//                 text: 'QR Code received, scan please!'
//             });
//         });
//     }); 

//     client.on('ready', () => {
//         io.emit('ready', {
//             id: id
//         });
//         io.emit('message', {
//             id: id,
//             text: 'Whatsapp is ready!'
//         });

//         const savedSessions = getSessionsFile();
//         const sessionIndex = savedSessions.findIndex(sess => sess.id == id);
//         savedSessions[sessionIndex].ready = true;

//         setSessionsFile(savedSessions);
//     });

//     client.on('authenticated', () => {
//         io.emit('authenticated', { id: id });
//         io.emit('message', { id: id, text: 'Whatsapp is authenticated!' });
//     });

//     client.on('auth_failure', function() {
//         io.emit('message', {
//             id: id,
//             text: 'Auth failure, restarting...'
//         });
//     });

//     client.on('disconnected', (reason) => {
//         //io.emit('message', { id: id, text: 'Whatsapp is disconnected!' });
//         client.destroy();
//         client.initialize();

//         console.log('Whatsapp is disconnected!');

//         // Menghapus pada file sessions
//         const savedSessions = getSessionsFile;
//         const sessionIndex = savedSessions.findIndex(sess => sess.id == id);
//         savedSessions.splice(sessionIndex, 1);
//         setSessionsFile(savedSessions);

//         //Menghapus folder session
//         fs.rmSync(`.wwebjs_auth/session-${id}`, {
//             recursive: true,
//             force: true
//         });
//         //fs.rmdir(`.wwebjs_auth/session-${id}`, () => {
//         //console.log('Folder session deleted');
//         //})

//         io.emit('remove-session', id);
//     });

//     // Tambahkan client ke sessions
//     sessions.push({
//         id: id,
//         description: description,
//         client: client
//     });

//     // Menambahkan session ke file
//     const savedSessions = getSessionsFile();
//     const sessionIndex = savedSessions.findIndex(sess => sess.id == id);

//     if (sessionIndex == -1) {
//         savedSessions.push({
//             id: id,
//             description: description,
//             ready: false,
//         });
//         setSessionsFile(savedSessions);
//     }

//     // console.log(sessions);
// }

// const init = function(socket) {
//     const savedSessions = getSessionsFile();

//     if (savedSessions.length > 0) {
//         if (socket) {
//             /**
//              * At the first time of running (e.g. restarting the server), our client is not ready yet!
//              * It will need several time to authenticating.
//              *
//              * So to make people not confused for the 'ready' status
//              * We need to make it as FALSE for this condition
//              */
//             savedSessions.forEach((e, i, arr) => {
//                 arr[i].ready = false;
//             });

//             socket.emit('init', savedSessions);
//         } else {
//             savedSessions.forEach(sess => {
//                 createSession(sess.id, sess.description);
//             });
//         }
//     }
// }

// init();

module.exports = { getSession, createSessionsFileIfNotExists, setSessionsFile, getSessionsFile };