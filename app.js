const express = require("express");
const app = express();

const userModel = require("./models/user");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const postModel = require("./models/post");
const jwt = require("jsonwebtoken");
const path = require("path");
const upload = require("./config/multerconfig");

const port = 3000;

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", isSignedUp, (req, res) => {
  res.render("index");
});

app.get("/profile/upload",isLoggedIn,(req,res) => {
    res.render("upload");
  });

app.post("/add-profile-photo", isLoggedIn,upload.single("image"),async (req, res) => {
  const user = await userModel.findOne({username:req.user.username})
  user.profilepic = req.file.filename;
  user.save();
  res.redirect("/profile");
});

app.post("/register", async (req, res) => {
  const { name, username, email, age, password } = req.body;
  const user = await userModel.findOne({ username });
  if (user) {
    res.status(500).send("User already exists");
  } else {
    bcrypt.genSalt((err, salt) => {
      bcrypt.hash(password, salt, async (err, hash) => {
        let user = await userModel.create({
          username,
          name,
          email,
          age,
          password: hash,
        });
        let id = user._id;
        const token = jwt.sign({ username, id }, "secretkey");
        res.cookie("token", token);
        res.send("User registered");
      });
    });
  }
});

app.get("/profile", isLoggedIn, async (req, res) => {
  let user = await userModel
    .findOne({ username: req.user.username })
    .populate("posts");
  let id = user._id;
  res.render("profile", { user, id });
});

app.post("/post", isLoggedIn, async (req, res) => {
  const user = await userModel.findOne({ username: req.user.username });
  const { postdata } = req.body;
  const post = await postModel.create({
    user: user._id,
    postdata,
  });

  user.posts.push(post._id);
  await user.save();
  res.redirect("/profile");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await userModel.findOne({ username });
  if (user) {
    bcrypt.compare(password, user.password, (err, result) => {
      if (result) {
        const token = jwt.sign({ username }, "secretkey");
        res.cookie("token", token);
        res.status(200).redirect("/feed");
      } else {
        res.status(500).send("Invalid credentials");
      }
    });
  } else {
    res.status(500).send("Invalid credentials");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/logout", isLoggedIn, (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

app.get("/post", isLoggedIn, async (req, res) => {
  res.render("post");
});

app.get("/like/:id", isLoggedIn, async (req, res) => {
  const post = await postModel.findOne({ _id: req.params.id }).populate("user");

  if (post.likes.indexOf(req.user.id) === -1) {
    post.likes.push(req.user.id);
  } else {
    post.likes.splice(req.user.id, 1);
  }
  await post.save();
  res.redirect("/feed");
});

app.get("/edit/:id", isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id });

  res.render("edit", { post });
});

app.post("/edit/:id", isLoggedIn, async (req, res) => {
  const { postdata } = req.body;
  const post = await postModel.findOneAndUpdate(
    { _id: req.params.id },
    { postdata }
  );
  res.redirect("/profile");
});

app.get("/delete/:id", isLoggedIn, async (req, res) => {
  const post = await postModel.findOneAndDelete({ _id: req.params.id });
  res.redirect("/profile");
});

app.get("/feed", isLoggedIn, async (req, res) => {
  let posts = await postModel.find().populate("user");
  let user = await userModel.findOne({ username: req.user.username });
  let id = user._id;
  let profilepic = user.profilepic;
  res.render("feed", { posts, id ,profilepic});
});

function isLoggedIn(req, res, next) {
  const token = req.cookies.token;
  if (token) {
    let data = jwt.verify(token, "secretkey");
    req.user = data;
    next();
  } else {
    res.redirect("/login");
  }
}

function isSignedUp(req, res, next) {
  const token = req.cookies.token;
  if (req.cookies.token) {
    res.redirect("/feed");
  } else {
    next();
  }
}

app.listen(port);
