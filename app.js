const express = require("express")
const app = express()
const userModel = require("./models/user")
const cookieParser = require("cookie-parser")
const bcrypt = require("bcrypt")
const postModel = require("./models/post")
const jwt = require("jsonwebtoken")
const post = require("./models/post")

app.set("view engine","ejs")
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())

app.get("/",(req,res)=>{
    res.render("index")
})

app.post("/register",async (req,res)=>{
    const {name,username,email,age,password} = req.body
    const user = await userModel.findOne({username})
    if(user){
        res.status(500).send("User already exists")
    }
    else{
        bcrypt.genSalt((err,salt)=>{
            bcrypt.hash(password,salt, async (err,hash)=>{
                let user = await userModel.create({username,name,email,age,password:hash})
                let id = user._id
                const token = jwt.sign({username,id},"secretkey")
                res.cookie("token",token)
                res.send("User registered")
            })
        })
    }
})

app.get("/profile",isLoggedIn,async (req,res)=>{
    let user = await userModel.findOne({username:req.user.username}).populate("posts")
    let id = req.user._id
    res.render("profile",{user,id})
})

app.post("/post",isLoggedIn,async (req,res)=>{
    const user = await userModel.findOne({username:req.user.username})
    const {postdata} = req.body;
    const post = await postModel.create({
        user:user._id,
        postdata
    })
    
    user.posts.push(post._id)
    await user.save()
    res.redirect("/profile")
})

app.post("/login",async (req,res)=>{  
    const {username,password} = req.body
    const user = await userModel.findOne({username})
    if (user){
        bcrypt.compare(password,user.password,(err,result)=>{
            if(result){
                const token = jwt.sign({username},"secretkey")
                res.cookie("token",token)
                res.status(200).redirect("/profile")
            }
            else{
                res.status(500).send("Invalid credentials")
            }
        })
    }
    else{
        res.status(500).send("Invalid credentials")
    }
})

app.get("/login",(req,res)=>{
    res.render("login")
})

app.get("/logout",(req,res)=>{
    res.clearCookie("token")
    res.redirect("/login")
})

app.get("/post",isLoggedIn,async (req,res)=>{
    res.render("post")
})

app.get("/like/:id",isLoggedIn,async (req,res)=>{
    const post = await postModel.findOne({_id:req.params.id}).populate("user")
    
    if (post.likes.indexOf(req.user.id)===-1){
        post.likes.push(req.user.id)
    }else{
        post.likes.splice(req.user.id,1)
    }
    await post.save()
    res.redirect("/profile")
})

app.get("/edit/:id",async (req,res)=>{
    let post = await postModel.findOne({_id:req.params.id})

    res.render("edit",{post})
})

app.post("/edit/:id",async (req,res)=>{
    const {postdata} = req.body;
    const post = await postModel.findOneAndUpdate({_id:req.params.id},{postdata})
    res.redirect("/profile")
})

app.get("/delete/:id",async (req,res)=>{
    const post = await postModel.findOneAndDelete({_id:req.params.id})
    res.redirect("/profile")
})

function isLoggedIn(req,res,next){
    const token = req.cookies.token
    if(token){
        let data = jwt.verify(token,"secretkey")
        req.user = data
        next()
    }else{
        res.redirect("/login")
    }
}

app.listen(3000)