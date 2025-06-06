const mongoose = require('mongoose');
const keys = require('./config/keys');

// define mongodb connection url
const mongoURL = keys.mongoURI;
//const mongoURL = process.env.DB_URL

//set up mongodb connection
mongoose.connect(mongoURL, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true
})

// get the default connection
const db = mongoose.connection;

// define events
db.on('connected', () => {
    console.log('Connected to mongodb server');
});

db.on('error', () => {
    console.error('mongodb connection error');
});

db.on('disconnected', () => {
    console.log('mongodb disconnected');
});

// export the database connection
module.exports = db;

