const express = require('express');
const router = express.Router();
// This file contains the routes for the login page
const mongooseAcc = require('./../models/Account');
const argon2 = require('argon2');
const crypto = require('crypto');

// regex for password validation
// at least 8 characters, 1 uppercase, 1 lowercase, 1 number
const PASSWORD_REGEX = new RegExp('^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)[A-Za-z\\d]{6,25}$');

// IP blocking map (in-memory, fast)
const failedLoginAttempts = {};  // IP: { count, lastAttempt }
const failedUsernameAttempts = {}; // username: { count, lastAttempt }
const BLOCK_THRESHOLD = 2;       // 10 failed attempts
const BLOCK_TIME_MS = 30 * 60 * 1000; // 30 minutes block

// get real ip
function getIp(req) {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
}

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


// ===== ROUTES =====

// Login Route
router.post('/login', async (req, res) => {
        try{

            const { username, password } = req.body;

            const ip = getIp(req);
            if(username == null || PASSWORD_REGEX.test(password) == false) {
                res.send(createResponse(3, 'username and password are required'));
                return;
            }

            // Check if IP is blocked
            const ipRecord = failedLoginAttempts[ip];
            if (ipRecord && ipRecord.count >= BLOCK_THRESHOLD && Date.now() - ipRecord.lastAttempt < BLOCK_TIME_MS) {
                return res.status(429).send(createResponse(99, 'Too many login attempts from your IP. Try again later.'));
            }

            // Check if username is locked
            const userRecord = failedUsernameAttempts[username];
            if (userRecord && userRecord.count >= BLOCK_THRESHOLD && Date.now() - userRecord.lastAttempt < BLOCK_TIME_MS) {
                return res.status(429).send(createResponse(98, 'Account locked due to too many failed attempts. Try again later.'));
            }
            
            var userAccount = await mongooseAcc.findOne({ username: username}, 'username  password adminFlag');
            console.log(userAccount);
            if(userAccount != null) {
                argon2.verify(userAccount.password, password).then(async (match) => {
                    if(match) {
                        // update last authenticated date
                        userAccount.lastAuthenticated = Date.now();
                        await userAccount.save(); 
                        
                        // Login success: reset fail counts
                        delete failedLoginAttempts[ip];
                        delete failedUsernameAttempts[username];

                        res.send(createResponse(0, 'username logged in : ', safeUserData(userAccount))); // 0 for successful login
                        console.log("user logged in: " + userAccount.username);
                        return;
                    }
                    else {
                        // Login failed: increment fail counts
                        // Update IP fail record
                        if (!failedLoginAttempts[ip]) {
                            failedLoginAttempts[ip] = { count: 1, lastAttempt: Date.now() };
                        } else {
                            failedLoginAttempts[ip].count += 1;
                            failedLoginAttempts[ip].lastAttempt = Date.now();
                        }

                        // Update Username fail record
                        if (!failedUsernameAttempts[username]) {
                            failedUsernameAttempts[username] = { count: 1, lastAttempt: Date.now() };
                        } else {
                            failedUsernameAttempts[username].count += 1;
                            failedUsernameAttempts[username].lastAttempt = Date.now();
                        }

                        res.send(createResponse(1, 'username and password not correct')); // 1 for invalid login
                        console.log("too many attempts from IP: " + ip + " or username: " + username+ " try after 30 minutes");
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
                res.status(500).send(createResponse(500, 'Server error'));
            }
    });

// Create Account Route
router.post('/createacc', async (req, res) => {
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

    module.exports = router;
