const Sequelize = require("sequelize");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { STRING } = Sequelize;
const config = {
  logging: false,
};

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

const Note = conn.define("note", {
  text: STRING,
});

Note.belongsTo(User);
User.hasMany(Note);

User.byToken = async (token) => {
  const decodedId = jwt.verify(token, "Margarita", function (err, decoded) {
    return decoded.userId;
  });
  try {
    const user = await User.findByPk(decodedId);
    if (user) {
      return user;
    }
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  // console.log("HASH AUTH",hash)
  const user = await User.findOne({
    where: {
      username,
    },
  });
  const compare = bcrypt.compareSync(password, user.password);
  const token = jwt.sign({ userId: user.id }, "Margarita");
  if (compare) {
    return token;
  }
  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};

const syncAndSeed = async () => {
  await conn.sync({ force: true });

  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];

  const notes = [
    { text: "Already tired" },
    { text: "I like traveling" },
    { text: "And meet new people" },
  ];

  const [lucy, moe, larry] = await Promise.all(
    credentials.map(async (credential) => {
      const hash = await bcrypt.hash(credential.password, 10);
      credential.password = hash;
      // Here I changed the returned value from credential to newUser, the actual user from the DB.
      const newUser = await User.create(credential);
      return newUser;
    })
  );

  // Here, we're creating our notes, and adding them to a new array of objects.
  // We can name these whatever we want :)
  const [Victor, Margarita, Anybody] = await Promise.all(
    notes.map((note) => {
      const newNote = Note.create(note);
      return newNote;
    })
  );

  // remember that we can see the magic methods by doing console.log(<instanceName>.__proto__)
  // console.log(Victor.__proto__);

  // I found out that, if we used createUser for making the association, it would create a new User in the DB, so this wasn't the way to go :/.
  // The error we received was because "lucy" was not the instance from the DB, but the object from the array,
  // and we needed to pass down the instance object into our setUser method. I found two ways to achieve this:

  // One way is to change the returned value on line 84 from the object from the array to the db instance like the way we did on line 93 with Note
  // The other way is to look for the db instance within our setUser method, as shown in line 109. As my brother and I use to say... pick your poison.

  await Victor.setUser(lucy);
  //await Margarita.setUser(await User.findOne({ where: { username: moe.username } }));
  await Margarita.setUser(moe);
  await Anybody.setUser(larry);

  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

//Remember to export our new Model
module.exports = {
  syncAndSeed,
  models: {
    User,
    Note,
  },
};
