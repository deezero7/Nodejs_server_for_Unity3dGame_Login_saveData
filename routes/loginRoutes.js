// This file contains the routes for the login page
const mongooseAcc = require('./../models/Account');
const argon2 = require('argon2');
const crypto = require('crypto');

// regex for password validation
const PASSWORD_REGEX = new RegExp('^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)[A-Za-z\\d]{6,25}$');

// at least 8 characters, 1 uppercase, 1 lowercase, 1 number

//response object to limit the amount of data sent to the client
var createResponse = function(code, message, userData = null) {
    return {code, message, userData};
}
//response object to limit the amount of data sent to the client
function safeUserData(account) {
    return {
        username: account.username,
        adminFlag: account.adminFlag
    }
}

module.exports = app => {

    // routes for login
    app.post('/login', async (req, res) => {
        
        try{

            const { username, password } = req.body;
            if(username == null || PASSWORD_REGEX.test(password) == false) {
                res.send(createResponse(3, 'username and password are required'));
                return;
            }
            
            var userAccount = await mongooseAcc.findOne({ username: username}, 'username  password adminFlag');
            console.log(userAccount);
            if(userAccount != null) {
                argon2.verify(userAccount.password, password).then(async (match) => {
                    if(match) {
                        // update last authenticated date
                        userAccount.lastAuthenticated = Date.now();
                        await userAccount.save(); 
                        
                        res.send(createResponse(0, 'username logged in : ', safeUserData(userAccount))); // 0 for successful login
                        console.log("user logged in: " + userAccount.username);
                        return;
                    }
                    else {
                        
                        res.send(createResponse(1, 'username and password not correct')); // 1 for invalid login
                        console.log("user not found ");
                        return;
                    }
                });
            }
            else {
                res.send(createResponse(1, 'username and password not correct')); // 1 for invalid login
                console.log("user not found ");
                return;
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
            if(username == null || username.length < 3 || username.length > 25) {
                res.send(createResponse(1, 'username and password are required'));
                return;
            }
            if(PASSWORD_REGEX.test(password) == false) {
                res.send(createResponse(3, 'password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, and one number'));
                return;
            }
            
            var userAccount = await mongooseAcc.findOne({ username: username}, '_id');
            //console.log(userAccount); // debugging purpose
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

                        res.send(createResponse(0, 'Account created : ', safeUserData(newAccount))); // 0 for successful login
                        console.log("account created: " + newAccount.username);
                        return;
                    }).catch(err => {
                        console.log("error hashing password: " + err);
                        res.status(500).send('error hashing password');
                    });
                });

                
            }
            else{
                res.send(createResponse(2, "Username already exists, please choose another one",null));

                console.log(userAccount); // debugging purpose
            }
            }
        catch(err) {
                console.log(err);
            }
    });


}