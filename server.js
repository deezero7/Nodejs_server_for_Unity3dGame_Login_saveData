const express = require("express");
const keys = require("./config/keys");
const app = express();
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const db = require("./db");
const path = require("path");
const fs = require("fs");
const cors = require("cors"); // frontend and backend are on different domains, the browser considers this cross-origin, and CORS is required.

// dotenv config
dotenv.config();

//setup database connection

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded());
// parse application/json
app.use(bodyParser.json()); // for parsing application/json cauz not all requests are json

// Trust proxy for real IPs (important for blocking)
app.set("trust proxy", true);

// allow only your frontend domain
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://deezero7.github.io/webapp_for_Unity3dGame_nextjs-",
    ], // replace with your actual frontend domain
    credentials: true, // if using cookies/auth tokens
  })
);

// //setulp routes
// require('./routes/loginRoutes')(app);

// Dynamic route loading with router form directory/folder
const routesPath = path.join(__dirname, "routes");
fs.readdirSync(routesPath).forEach((file) => {
  if (file.endsWith(".js")) {
    const route = require(path.join(routesPath, file));
    app.use("/u3d", route); // All routes under /api/
    console.log(`Loaded routes from ${file}`);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("server running on port " + PORT);
});
