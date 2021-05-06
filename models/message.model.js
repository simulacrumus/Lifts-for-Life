const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        min: 1,
        max: 20
    },
    lastName: {
        type: String,
        required: true,
        min: 1,
        max: 25
    },
    email: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    location: {
        latitude: {
            type: Number,
            required: false
        },
        longitude: {
            type: Number,
            required: false
        }
    },
    ipAddress: {
        type: String
    }
});

module.exports = Message = mongoose.model('message', MessageSchema);