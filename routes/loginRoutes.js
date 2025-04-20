// This file contains the routes for the login page
const mongooseAcc = require('./../models/Account');
const argon2 = require('argon2');
const crypto = require('crypto');

//response object to limit the amount of data sent to the client
var createResponse = function(code, msg, userData = null) {
    return {code, msg, userData};
}

module.exports = app => {

    // routes for login
    app.post('/login', async (req, res) => {
        
        try{
            var response = {code: 0, msg: ''};

            const { username, password } = req.body;
            if(username == null || password == null) {
                res.send(createResponse(1, 'username and password are required'));
                return;
            }
            
            var userAccount = await mongooseAcc.findOne({ username: username});
            if(userAccount != null) {
                argon2.verify(userAccount.password, password).then(async (match) => {
                    if(match) {
                        // update last authenticated date
                        userAccount.lastAuthenticated = Date.now();
                        await userAccount.save();      
                        res.send(createResponse(0, 'username logged in : ', userAccount)); // 0 for successful login
                        return;
                    }
                    else {
                        
                        res.send(createResponse(1, 'username and password are required')); // 1 for invalid login
                        return;
                    }
                });
            }
        
        }
        catch(err) {
                console.log(err);
            }
    });

    // routes for create account
    app.post('/createacc', async (req, res) => {
        
        try{
            const { username, password } = req.body;
            if(username == null || password == null) {
                res.send(createResponse(1, 'username and password are required'));
                return;
            }
            
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
                        res.send(createResponse(1, 'Account created : ', newAccount));
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