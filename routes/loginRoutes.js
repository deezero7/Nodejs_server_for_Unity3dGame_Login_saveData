// This file contains the routes for the login page
const mongooseAcc = require('./../models/Account');

module.exports = app => {
// routes for login
app.get('/login', async (req, res) => {
    
    try{
    const { username, password } = req.query;
    if(username == null || password == null) {
        return res.status(400).send('username and password are required');
    }
    console.log('username: ' + username + ' password: ' + password);
    
    var userAccount = await mongooseAcc.findOne({ username: username});
    if(userAccount == null) {
        // create new account
        console.log('creating new account');

        var newAccount = new mongooseAcc({
            username: username,
            password: password,
            email: username + '@example.com',
            createdAt: Date.now(),
            lastAuthenticated: Date.now()
        });

        await newAccount.save().then(() => {
            console.log('new account created');
            res.status(200).send('new account created');
        }).catch((err) => {
            console.log(err);
            res.status(500).send('error creating account');
        });
    }
    else{
        if(password == userAccount.password){
            console.log('user authenticated / logged in');
            userAccount.lastAuthenticated = Date.now();
            await userAccount.save().then(() => {
                res.status(200).json({
                    status: 'success',
                    message: 'user authenticated',
                    user: {
                      _id: userAccount._id,
                      username: userAccount.username
                    }
                  });
            }).catch((err) => {
                console.log(err);
                res.status(500).send('error updating account');
            });
        }
    }
        }catch(err) {
            console.log(err);
        }


    //res.send('Hello World! : '+ Date.now());
});
}