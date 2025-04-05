const express = require('express');
const keys = require('./config/keys');
const app = express();
const bodyParser = require('body-parser');

// dotenv config
require('dotenv').config();

//setup database connection
const db = require('./db');
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded())
// parse application/json
app.use(bodyParser.json())


//setulp routes
require('./routes/loginRoutes')(app);


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {console.log("server running on port " + PORT)});