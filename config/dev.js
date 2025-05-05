require('dotenv').config(); // .env file


module.exports = { 
    port: 3000,
    mongoURI: process.env.DB_URL,
    jwtSecret: process.env.JWT_SECRET
};

/*
mongodb+srv://deezero7:<db_password>@cluster0.tl1bk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0


*/