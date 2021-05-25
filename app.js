const express = require("express");
const app = express();
app.use(express.json());
const {
  models: { User, Note },
} = require("./db");
const path = require("path");

async function requireToken(req, res, next) {
  const token = req.headers.authorization;
  const user = await User.byToken(token);
  req.user = user;
  next();
}

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.post("/api/auth", async (req, res, next) => {
  try {
    res.send({ token: await User.authenticate(req.body) });
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/auth", requireToken, async (req, res, next) => {
  try {
    res.send(req.user);
  } catch (ex) {
    next(ex);
  }
});

// Here I'm creating the GET route for the notes of each user
app.get("/api/auth/notes", requireToken, async (req, res, next) => {
  try {
    const user = req.user;
    res.send(await Note.findAll({ where: { userId: user.id } }));
  } catch (ex) {
    next(ex);
  }
});

app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;
