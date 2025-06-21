const express = require("express");
const router = express.Router();
// This file contains the routes for the login page
const mongooseAcc = require("./../models/Account");
const argon2 = require("argon2");
const crypto = require("crypto");
const multer = require("multer"); // set the destination for uploaded files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 },
}); // limit to 200KB
// for generating token required this
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
// for middleware authentication needs this
const auth = require("../middleware/auth");

// regex for password validation
// at least 6 characters, 1 uppercase, 1 lowercase, 1 number, and one special character (@$!%*?&)
const PASSWORD_REGEX = new RegExp(
  "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{6,25}$"
);

// IP blocking map (in-memory, fast)
const failedLoginAttempts = {}; // IP: { count, lastAttempt }
const failedUsernameAttempts = {}; // username: { count, lastAttempt }
const BLOCK_THRESHOLD = 5; // 5 failed attempts
const BLOCK_TIME_MS = 30 * 60 * 1000; // 30 minutes block

// get real ip
function getIp(req) {
  return req.headers["x-forwarded-for"] || req.connection.remoteAddress;
}

//response object to limit the amount of data sent to the client to unity for json
var createResponse = function (code, message, userData = null) {
  return { code, message, userData };
};
//response object to limit the amount of data sent to the client
function safeUserData(user) {
  const data = {
    username: user.username,
    isAdmin: user.adminFlag === true,
    gameData: user.gameData || {
      gold: 0,
      gems: 0,
      level: 1,
      experiencePoints: 0,
    },
    userProfilePicture: null,
  };

  if (user.userProfilePicture?.data) {
    // if userProfilePicture exists and has data
    const base64 = user.userProfilePicture.data.toString("base64");
    const mimeType = user.userProfilePicture.contentType || "image/png";
    data.userProfilePicture = `data:${mimeType};base64,${base64}`;
  }

  return data;
}

// ===== ROUTES =====

// middleware/auth.js already verifies token, auto login
router.post("/autoLogin", auth, async (req, res) => {
  try {
    const user = await mongooseAcc.findOne(
      { username: req.user.username },
      "username adminFlag gameData userProfilePicture"
    );

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    //auto-refresh on every successful login  sliding session (the token expiry keeps moving forward with activity)
    //Generate a new JWT token and update in unity too at autologin
    const newToken = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: "168h",
    });

    res.send(
      createResponse(0, "Login successful", {
        ...safeUserData(user), // send only safe data and with spread operator to add data or fields to the object
        newToken,
      })
    );

    console.log("Auto logged in: " + user.username);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server error" });
  }
});

// Login Route
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const ip = getIp(req);
    if (username == null || PASSWORD_REGEX.test(password) == false) {
      res.send(createResponse(3, "username and password are required"));
      return;
    }

    // Check if IP is blocked
    const ipRecord = failedLoginAttempts[ip];
    if (
      ipRecord &&
      ipRecord.count >= BLOCK_THRESHOLD &&
      Date.now() - ipRecord.lastAttempt < BLOCK_TIME_MS
    ) {
      return res
        .status(429)
        .send(
          createResponse(
            99,
            "Too many login attempts from your IP. Try again later."
          )
        );
    }

    // Check if username is locked
    const userRecord = failedUsernameAttempts[username];
    if (
      userRecord &&
      userRecord.count >= BLOCK_THRESHOLD &&
      Date.now() - userRecord.lastAttempt < BLOCK_TIME_MS
    ) {
      return res
        .status(429)
        .send(
          createResponse(
            98,
            "Account locked due to too many failed attempts. Try again later."
          )
        );
    }

    var userAccount = await mongooseAcc.findOne(
      { username: username },
      "username password adminFlag userProfilePicture gameData"
    );
    // Check if user email is verified
    if (!userAccount.emailVerified) {
      return res.send(
        createResponse(4, "Please verify your email before logging in.")
      );
    }

    console.log(userAccount);
    if (userAccount != null) {
      argon2.verify(userAccount.password, password).then(async (match) => {
        if (match) {
          // update last authenticated date
          userAccount.lastAuthenticated = Date.now();
          await userAccount.save();

          // Login success: reset fail counts
          delete failedLoginAttempts[ip];
          delete failedUsernameAttempts[username];

          // 0 for successful login
          const token = jwt.sign(
            { username: userAccount.username },
            JWT_SECRET,
            { expiresIn: "168h" }
          );

          res.send(
            createResponse(0, "Login successful", {
              ...safeUserData(userAccount), // send only safe data and with spread operator to add data or fields to the object
              token,
            })
          );
          console.log("user logged in: " + userAccount.username);
          return;
        } else {
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
            failedUsernameAttempts[username] = {
              count: 1,
              lastAttempt: Date.now(),
            };
          } else {
            failedUsernameAttempts[username].count += 1;
            failedUsernameAttempts[username].lastAttempt = Date.now();
          }

          res.send(createResponse(1, "username and password not correct")); // 1 for invalid login
          console.log(
            "too many attempts from IP: " +
              ip +
              " or username: " +
              username +
              " try after 30 minutes"
          );
          return;
        }
      });
    } else {
      res.send(createResponse(1, "username and password not correct")); // 1 for invalid login
      console.log("user not found ");
      return;
    }
  } catch (err) {
    console.log(err);
    res.status(500).send(createResponse(500, "Server error"));
  }
});

// Create Account Route
router.post("/createacc", async (req, res) => {
  try {
    const { username, password, email } = req.body;
    if (!email || !username || !password) {
      return res.send(createResponse(1, "All fields are required"));
    }
    if (username == null || username.length < 3 || username.length > 25) {
      res.send(createResponse(1, "username and password are required"));
      return;
    }
    if (PASSWORD_REGEX.test(password) == false) {
      res.send(
        createResponse(
          3,
          "password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, and one number"
        )
      );
      return;
    }

    const exists = await mongooseAcc.findOne({
      $or: [{ username }, { email }],
    });
    if (exists) {
      return res.send(createResponse(2, "Username or Email already in use"));
    }

    const salt = crypto.randomBytes(16);
    const hash = await argon2.hash(password, salt);
    const emailVerificationToken = jwt.sign({ email }, JWT_SECRET, {
      expiresIn: "1d",
    });

    const newUser = new mongooseAcc({
      username,
      password: hash,
      salt,
      email,
      emailVerified: false,
      emailVerificationToken,
      createdAt: Date.now(),
      lastAuthenticated: Date.now(),
    });

    await newUser.save();
    await sendVerificationEmail(email, emailVerificationToken);

    res.send(createResponse(0, "Account created. Verify your email."));
  } catch (err) {
    console.log(err);
    res.status(500).send(createResponse(500, "Error creating account"));
  }
});

// Endpoint to resend verification email
router.get("/verify-email", async (req, res) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await mongooseAcc.findOne({ email: decoded.email });

    if (!user) return res.status(404).send("User not found");
    if (user.emailVerified) return res.send("Email already verified.");

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.send("✅ Email verified successfully. You can now log in.");
  } catch (err) {
    console.error(err);
    res.status(400).send("Invalid or expired token");
  }
});

// endpoint for user profile picture upload
router.post(
  "/uploadProfilePictureWeb",
  auth,
  upload.single("image"),
  async (req, res) => {
    try {
      const username = req.user.username; // from token
      if (!req.file) {
        return res
          .status(400)
          .send(createResponse(1, "Image file is required"));
      }

      const userAccount = await mongooseAcc.findOne({ username });
      if (!userAccount) {
        return res.status(404).send(createResponse(2, "User not found"));
      }

      userAccount.userProfilePicture.data = req.file.buffer;
      userAccount.userProfilePicture.contentType = req.file.mimetype;

      await userAccount.save();
      res.send(
        createResponse(0, "Profile picture uploaded successfully (web)")
      );
      console.log("Profile picture uploaded for user:", username);
    } catch (err) {
      console.error(err);
      res.status(500).send(createResponse(3, "Server error"));
    }
  }
);

// endpoint for getting user profile picture if needed
router.get("/getProfilePicture/:username", async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) {
      return res.status(400).send(createResponse(1, "Username is required"));
    }

    // Find the user account
    const userAccount = await mongooseAcc.findOne({ username: username });
    if (!userAccount) {
      return res.status(404).send(createResponse(2, "User not found"));
    }

    // Send the profile picture
    res.set("Content-Type", userAccount.userProfilePicture.contentType);
    res.send(userAccount.userProfilePicture.data);
  } catch (err) {
    console.error(err);
    res.status(500).send(createResponse(3, "Server error"));
  }
});

// endpoint for updating game data
router.put("/saveGameData", async (req, res) => {
  try {
    const { username, gameData } = req.body;
    if (!username || !gameData) {
      return res
        .status(400)
        .send(createResponse(1, "Username and game data are required"));
    }

    // Find and update the user account using findOneAndUpdate
    const userAccount = await mongooseAcc.findOneAndUpdate(
      { username }, // Find the user by username
      { $set: { gameData } }, // Update the gameData field
      { new: true } // Return the updated document
    );

    if (!userAccount) {
      return res.status(404).send(createResponse(2, "User not found"));
    }

    // Send success response with updated game data
    res.send(
      createResponse(0, "Game data saved successfully", userAccount.gameData)
    );
    console.log("Game data saved successfully for user: " + username);
  } catch (err) {
    console.error(err);
    res.status(500).send(createResponse(3, "Server error"));
  }
});

// endpoint for getting game data
router.get("/getGameData/:username", async (req, res) => {
  try {
    const { username } = req.params; // get username from params cause using get request(not body as in post)
    if (!username) {
      return res.status(400).send(createResponse(1, "usernname is required"));
    }

    const userAccount = await mongooseAcc.findOne(
      { username: username },
      "gameData"
    );
    if (!userAccount) {
      return res.status(404).send(createResponse(2, "User not found"));
    }

    res.send(
      createResponse(
        0,
        "Game data retrieved successfully",
        userAccount.gameData
      )
    );
  } catch (err) {
    console.error(err);
    res.status(500).send(createResponse(3, "Server error"));
  }
});

// endpoint for getting game data with authentication
router.get("/getGameDataSecured", auth, async (req, res) => {
  try {
    const { username } = req.user; // comes from decoded JWT

    const userAccount = await mongooseAcc.findOne(
      { username },
      "username userProfilePicture gameData"
    );

    if (!userAccount) {
      return res.status(404).send(createResponse(2, "User not found"));
    }

    const profilePic = userAccount.userProfilePicture?.data
      ? `data:${
          userAccount.userProfilePicture.contentType
        };base64,${userAccount.userProfilePicture.data.toString("base64")}`
      : null;

    res.send(
      createResponse(0, "Game data retrieved successfully", {
        username: userAccount.username,
        gold: userAccount.gameData.gold,
        gems: userAccount.gameData.gems,
        level: userAccount.gameData.level,
        profilePic,
      })
    );
  } catch (err) {
    console.error(err);
    res.status(500).send(createResponse(3, "Server error"));
  }
});

module.exports = router;
