const mongoose = require('mongoose');

const EquipmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        max: 80,
        min: 2
    },
    type: {
        type: String,
        required: true
    },
    serialId: {
        type: Number,
        required: true,
        unique: true
    },
    sellPrice: {
        type: Number,
        required: true,
    },
    rentPrice: {
        type: Number,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    picture:{
        type: String,
        required: false,
        default: 'default-pic.png'
    }
});

module.exports = Equipment = mongoose.model('equipment', EquipmentSchema);