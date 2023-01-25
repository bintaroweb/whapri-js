const { sessions } = require('../Controller/Session.js')
const wa = require('whatsapp-web.js')
const phoneNumberFormatter = require("../Helpers/Formatter.js")

//WhatsApp Web
const { Message } = wa;

const index = (req, res) => {
    res.send('Halaman pesan');
}

const create = (req, res) => {
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
    //const isRegisteredNumber = await client.isRegisteredUser(number);

    //if (!isRegisteredNumber) {
    //return res.status(422).json({
    //status: false,
    //message: 'The number is not registered'
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
}

const show = async (req, res) => {
      const message = new Message();
      const status = await message.getInfo('req.message_id');
      console.log(status)
}

module.exports = { index, create, show }