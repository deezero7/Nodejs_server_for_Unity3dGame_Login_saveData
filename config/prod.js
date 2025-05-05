module.exports = { 
    port: process.env.PORT,
    mongoURI: process.env.DB_URL,
    jwtSecret: process.env.JWT_SECRET
};
