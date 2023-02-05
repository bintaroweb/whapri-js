const express = require('express')
const http = require('http')
const qrcode = require('qrcode')
const { Server } = require("socket.io")
const wa = require('whatsapp-web.js')
const cors = require('cors')
const bodyParser = require('body-parser')
const fs = require('fs')
const dotenv = require('dotenv')
const axios = require('axios')
// const session = require('express-session');
// const { message } = require('./routes/index')
const phoneNumberFormatter = require("./app/Helpers/Formatter.js")
// const { use } = require('./routes/message.js')

dotenv.config();

const app = express();
const port = 3000;

//CORS
var corsOptions = {
	origin: process.env.ORIGIN,
	optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

// const options = {
// 	key: fs.readFileSync('/etc/letsencrypt/live/api.whapri.my.id/privkey.pem'),
// 	cert: fs.readFileSync('/etc/letsencrypt/live/api.whapri.my.id/fullchain.pem'),
// };

const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: process.env.ORIGIN
	}
});

// Parsing application/json
app.use(bodyParser.json())

// Parsing application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
	extended: false
}))


//WhatsApp Web
const {	Client, LocalAuth, Message } = wa;

//Crate Session
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

// Create Session
const createSession = function(id, description) {
	const client = new Client({
		restartOnAuthFail: true,
		puppeteer: {
			headless: true,
			args: [
				'--no-sandbox',
				'--use-gl=egl',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-accelerated-2d-canvas',
				'--no-first-run',
				'--no-zygote',
				'--single-process', // <- this one doesn't works in Windows
				'--disable-gpu'
			],
		},
		authStrategy: new LocalAuth({
			clientId: id
		})
	});

	client.initialize();

	client.on('qr', (qr) => {
		// console.log('QR RECEIVED', qr);
		qrcode.toDataURL(qr, (err, url) => {
			io.emit('qr', {
				id: id,
				src: url
			});
			io.emit('message', {
				id: id,
				text: 'QR Code received, scan please!'
			});
		});
	});

	client.on('ready', () => {
		io.emit('ready', {
			id: id
		});
		io.emit('message', {
			id: id,
			text: 'Whatsapp is ready!'
		});

		const savedSessions = getSessionsFile();
		const sessionIndex = savedSessions.findIndex(sess => sess.id == id);
		savedSessions[sessionIndex].ready = true;
		setSessionsFile(savedSessions);
	});

	client.on('authenticated', () => {
		io.emit('authenticated', {
			id: id
		});
		io.emit('message', {
			id: id,
			text: 'Whatsapp is authenticated!'
		});
	});

	client.on('auth_failure', function() {
		io.emit('message', {
			id: id,
			text: 'Auth failure, restarting...'
		});
	});

	client.on('disconnected', (reason) => {
		//io.emit('message', { id: id, text: 'Whatsapp is disconnected!' });
		client.destroy();
		client.initialize();

		console.log('Whatsapp is disconnected!');

		//Update status device
		axios.post(process.env.ORIGIN + '/api/device/status', {
			uuid: id,
		})
		.then(function (response) {
			console.log(response);
		})
		.catch(function (error) {
			console.log(error);
		});

		// Menghapus pada file sessions
		const savedSessions = getSessionsFile();
		const sessionIndex = savedSessions.findIndex(sess => sess.id == id);
		savedSessions.splice(sessionIndex, 1);
		setSessionsFile(savedSessions);
		//Menghapus folder session
		// fs.rmSync(`.wwebjs_auth/session-${id}`, {
		// 	recursive: true,
		// 	force: true
		// });
		fs.rmdir(`.wwebjs_auth/session-${id}`, () => {
			console.log('Folder session deleted');
		})

		io.emit('remove-session', id);		
	});

	client.on('message_ack', (msg, ack) => {
		/*
			== ACK VALUES ==
			ACK_ERROR: -1
			ACK_PENDING: 0
			ACK_SERVER: 1
			ACK_DEVICE: 2
			ACK_READ: 3
			ACK_PLAYED: 4
		*/
			axios.post(process.env.ORIGIN + '/api/message/status', {
				id: msg.id.id,
				ack: ack,
				timestamp: msg.timestamp
			})
			.then(function (response) {
				console.log(response);
			})
			.catch(function (error) {
				console.log(error);
			});

		// console.log(ack)
		console.log(msg)
	});

	// Tambahkan client ke sessions
	sessions.push({
		id: id,
		description: description,
		client: client
	});

	// Menambahkan session ke file
	const savedSessions = getSessionsFile();
	const sessionIndex = savedSessions.findIndex(sess => sess.id == id);

	if (sessionIndex == -1) {
		savedSessions.push({
			id: id,
			description: description,
			ready: false,
		});
		setSessionsFile(savedSessions);
	}
}

const init = function(socket) {
	const savedSessions = getSessionsFile();
	if (savedSessions.length > 0) {
		if (socket) {
			/**
			 * At the first time of running (e.g. restarting the server), our client is not ready yet!
			 * It will need several time to authenticating.
			 *
			 * So to make people not confused for the 'ready' status
			 * We need to make it as FALSE for this condition
			 */
			savedSessions.forEach((e, i, arr) => {
				arr[i].ready = false;
			});

			socket.emit('init', savedSessions);
		} else {
			savedSessions.forEach(sess => {
				createSession(sess.id, sess.description);
			});
		}
	}
}

init();

// Socket IO
io.on('connection', function(socket) {
	init(socket);

	socket.on('create-session', function(data) {
		createSession(data.id, data.description);
		// console.log('Create session: ' + data.id);
	});
});

app.use((req, res, next) => {
    // console.log('Time:', Date.now())
    req.session = sessions;
    next()
})

// app.use(message);

// Send message
app.post('/send-message', cors(corsOptions), async (req, res) => {

	const sender = req.body.device;
	const number = phoneNumberFormatter(req.body.receiver);
	const message = req.body.message;

	const client = sessions.find(sess => sess.id == sender)?.client;

	// Make sure the sender is exists & ready
	if (!client) {
		return res.status(422).json({
			status: false,
			message: `The sender: ${sender} is not found!`
		})
	}

	/**
	 * Check if the number is already registered
	 * Copied from app.js
	 *
	 * Please check app.js for more validations example
	 * You can add the same here!
	 */
	// const isRegisteredNumber = await client.isRegisteredUser(number);

	// if (!isRegisteredNumber) {
	// return res.status(422).json({
	// 	status: false,
	// 	message: 'The number is not registered'
	// });
	// }

	client.sendMessage(number, message).then(response => {
		res.status(200).json({
			status: true,
			response: response
		});
	}).catch(err => {
		res.status(500).json({
			status: false,
			response: err
		});
	});
});

app.post('/send-bulk', cors(corsOptions), async (req, res) => {

	const sender = req.body.device;
	const number = phoneNumberFormatter(req.body.receiver);
	const message = req.body.message;

	const client = sessions.find(sess => sess.id == sender)?.client;

	// Make sure the sender is exists & ready
	if (!client) {
		return res.status(422).json({
			status: false,
			message: `The sender: ${sender} is not found!`
		})
	}

	const time = Math.floor(Math.random() * 120000);

	setTimeout(() => {
		client.sendMessage(number, message).then(response => {
			res.status(200).json({
				status: true,
				response: response
			});
		}).catch(err => {
			res.status(500).json({
				status: false,
				response: err
			});
		});
	  }, time)
	
});

// app.get('/get-info', async(req, res) => {
//   const message = new Message();
//   const status = await message.getInfo(req.body.id);
//   console.log(status)
// //   res.send(status)
// })

app.get('/delete', (req, res) => {
	fs.rmSync(`.wwebjs_auth/session-${req.query.id}`, {
		recursive: true,
		force: true
	});
	//fs.rmSync('.wwebjs_auth/new', { recursive: true, force: true });
	console.log(req.query.id);
})

app.get('/', (req, res) => {
	// var timeStamp = 1674688594 * 1000;
	// var date= new Date(timeStamp);
	// dateFormat = date.getHours() + ":" + date.getMinutes() + ", "+ date.toDateString();
	//Update status device
	axios.post(process.env.ORIGIN + '/api/device/status', {
		uuid: 'c4d6ab4a-3e1a-4109-b356-2a1104eefd69',
		status: 'disconnected'
	})
	.then(function (response) {
		console.log(response);
	})
	.catch(function (error) {
		console.log(error);
	});
	res.send(process.env.ORIGIN + '/api/device/status');
})

server.listen(port, () => {
	console.log(`Server is running port ${ port }...`)
})