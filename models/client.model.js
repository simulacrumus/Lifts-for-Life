const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        max: 30,
        min: 3
    },
    lastName: {
        type: String,
        required: true,
        max: 50,
        min: 3
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    address:{
        type: String,
        required: true,
        unique: true
    },
    phoneNumber:{
        type: String,
        required: false,
        unique: true
    },
    password: {
        type: String,
        required: true,
        max: 30,
        min: 6
    },
    date: {
        type: Date,
        default: Date.now
    },
    newsletter: {
        type: Boolean,
        default: false
    },
    note:{
        type: String,
        max: 255,
        min: 0,
        required: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true
    },
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'order',
        required: false
    }],
    emailConfirmed: {
        type: Boolean,
        default: true
    },
    profilePic:{
        type: String,
        required: false,
        default: 'default-profile-pic.png'
    }
});

module.exports = Client = mongoose.model('client', ClientSchema);