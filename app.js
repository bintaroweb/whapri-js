const express = require('express')
const http = require('http')
const { Server } = require("socket.io")
const bodyParser = require('body-parser')
const dotenv = require('dotenv')
const { message } = require('./routes')
const { createSession, init} = require('./app/Controller/Session.js')

dotenv.config();

// const options = {
//     key: fs.readFileSync('/etc/letsencrypt/live/api.whapri.my.id/privkey.pem'),
//     cert: fs.readFileSync('/etc/letsencrypt/live/api.whapri.my.id/fullchain.pem')
// };

const app = express();
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

//Socket IO
io.on('connection', function(socket) {
    init(socket);

    socket.on('create-session', function(data) {
        createSession(data.id, data.description, io);
    });
});

//App Route
app.use(message);

app.get('/', (req, res) => {
    res.send('Hello World!');
    console.log(req.io);
})

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server is running port ${ port }...`)
})