const express = require('express')
const router = express.Router()
const cors = require('cors')
const dotenv = require('dotenv')
const { index, create, show } = require('../app/Controller/Message')

dotenv.config();

var corsOptions = {
    origin: process.env.ORIGIN,
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) ch>
}

router.get('/messages', index)
router.post('/messages/create', cors(corsOptions), create)
router.get('/messages/show', cors(corsOptions), show)

module.exports = router

