const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'client',
        required: true
    },
    clientName: {
        type: mongoose.Schema.Types.String,
        required: false,
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        required: true
    },
    equipmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'equipment',
        required: true
    },
    equipmentName: {
        type: mongoose.Schema.Types.String,
        required: false,
    },
    date:{
        type: Date,
        default: Date.now
    },
    isRent: {
        type: Boolean,
        default: false,
        required: true
    },
    rentExpiry: {
        type: Date,
        required: false
    },
    totalPrice:{
        type: Number,
        required: true
    }
});

module.exports = Order = mongoose.model('order', OrderSchema);