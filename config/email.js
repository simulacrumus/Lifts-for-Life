const config = require('config');
const nodemailer = require('nodemailer');
const emailAddress = config.get('emailAddress');
const emailPassword = config.get('emailPassword');
const emailHost = config.get('emailHost');
const emailPort = config.get('emailPort');

// Nodemailer setup
// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    name: emailHost,
    host: emailHost,
    port: emailPort,
    secure: true,
    auth: {
        user: emailAddress,
        pass: emailPassword
    },
    tls: {
        rejectUnauthorized: false
    }
});

module.exports = transporter;