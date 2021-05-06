const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema({
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
    equipmentType: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: false
    },
    date: {
        type: Date,
        default: Date.now
    },
    picture: {
        type: String,
        default: 'path/to/default/image.jpeg'
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
        type: String,
        required: false
    }
});

module.exports = Donation = mongoose.model('donation', DonationSchema);