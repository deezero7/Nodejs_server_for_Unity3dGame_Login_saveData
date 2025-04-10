// This file contains the routes for the login page
const mongooseAcc = require('./../models/Account');
const argon2 = require('argon2');
const crypto = require('crypto');

module.exports = app => {

    // routes for login
    app.post('/login', async (req, res) => {
        
        try{
            const { username, password } = req.body;
            if(username == null || password == null) {
                return res.status(400).send('username and password are required');
            }
            
            var userAccount = await mongooseAcc.findOne({ username: username});
            if(userAccount != null) {
                argon2.verify(userAccount.password, password).then(async (match) => {
                    if(match) {
                        // update last authenticated date
                        userAccount.lastAuthenticated = Date.now();
                        await userAccount.save();
                        res.send(userAccount);
                        console.log("user authenticated: " + userAccount.username);
                    }
                    else {
                        console.log('invalid password');
                        res.status(401).send('invalid password');
                    }
                }).catch(err => {
                    console.log("error verifying password: " + err);
                    res.status(500).send('error verifying password');
                });
            }
            else{
                console.log('user not found');
                res.status(401).send('user not found');
            }
        }catch(err) {
                console.log(err);
            }
    });

    // routes for create account
    app.post('/createacc', async (req, res) => {
        
        try{
            const { username, password } = req.body;
            if(username == null || password == null) {
                return res.status(400).send('username and password are required');
            }
            console.log('username: ' + username + ' password: ' + password);
            
            var userAccount = await mongooseAcc.findOne({ username: username});
            if(userAccount == null) {
                // create new account
                console.log('creating new account');

                // hash password
                var accSalt = null;
                var hashPass = null;
                crypto.randomBytes(16, function(err, salt) {
                    accSalt = salt;
                    argon2.hash(password,salt).then( async (hash) => {
                        
                        var newAccount = new mongooseAcc({
                            username: username,
                            password: hash,
                            email: username + '@example.com',
                            createdAt: Date.now(),
                            lastAuthenticated: Date.now(),
                            salt: salt
                        });
        
                        await newAccount.save();
                        res.send(newAccount);
                        console.log("account created: " + newAccount.username);
                        return;
                    }).catch(err => {
                        console.log("error hashing password: " + err);
                        res.status(500).send('error hashing password');
                    });
                });

                
            }
            else{
                res.send("Username already exists, please choose another one");
            }
            }
        catch(err) {
                console.log(err);
            }
    });


}