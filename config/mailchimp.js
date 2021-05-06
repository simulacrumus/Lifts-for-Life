const mailchimp = require("@mailchimp/mailchimp_marketing");
const config = require('config');
const API = config.get('mailchimpAPI');
const SERVER = config.get('mailchimpServer');

module.exports = mailchimp.setConfig({
  apiKey: API,
  server: SERVER,
});