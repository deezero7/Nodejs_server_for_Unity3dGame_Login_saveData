const mongoose = require('mongoose');

// define the schema for the Account model
const accountSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastAuthenticated: {
        type: Date
    },
    salt: {
        type: String
    },
    adminFlag: {
        type: Boolean,
        default: false
    },
    userProfilePicture:{
        data: Buffer,
        contentType: String
    },
    gameData: {
        gold: { type: Number, default: 0 },
        gems: { type: Number, default: 0 },
        level: { type: Number, default: 1 },
        experiencePoints: { type: Number, default: 0 }
    }
});

// create the Account model using the schema
const Account = mongoose.model('Account', accountSchema);
module.exports = Account;
