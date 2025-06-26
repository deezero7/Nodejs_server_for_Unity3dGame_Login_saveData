const mongoose = require("mongoose");
const accountSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, // Ensure uniqueness
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastAuthenticated: {
    type: Date,
  },
  salt: {
    type: String,
  },
  adminFlag: {
    type: Boolean,
    default: false,
  },
  userProfilePicture: {
    data: Buffer,
    contentType: String,
  },
  gameData: {
    gold: { type: Number, default: 0 },
    gems: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    experiencePoints: { type: Number, default: 0 },
  },

  lastEmailVerificationSent: {
    type: Date,
  },
});

const Account = mongoose.model("Account", accountSchema);
module.exports = Account;
