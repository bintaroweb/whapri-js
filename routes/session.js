const express = require('express')
const router = express.Router()
const cors = require('cors')
const dotenv = require('dotenv')
const { index } = require('../app/Controller/Session')

dotenv.config();

var corsOptions = {
    origin: process.env.ORIGIN,
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) ch>
}

router.get('/sessions', index)

module.exports = router

