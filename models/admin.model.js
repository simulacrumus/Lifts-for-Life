const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adminSchema = new Schema({
    name:{
        type: String,
        max: 30,
        required: true
    },
    password:{
        type: String,
        max: 20,
        min: 8,
        required: true
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    date:{
        type: Date,
        required: false,
        default: Date.now
    },
    createdBy: {
        type: this,
        ref: 'admin',
        required: true
    },
    emailConfirmed: {
        type: Boolean,
        default: false
    },
    phone:{
        type: String,
        require: false
    },
    profilePic:{
        type: String,
        required: false,
        default: 'default-profile-pic.png'
    }
});

const Admin = mongoose.model('admin', adminSchema);
module.exports = Admin;