const express = require('express');
const keys = require('./config/keys');
const app = express();

// dotenv config
require('dotenv').config();

//setup database connection
const db = require('./db');


//setulp routes
require('./routes/loginRoutes')(app);


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {console.log("server running on port " + PORT)});