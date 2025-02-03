const mongoose = require("mongoose")

mongoose.connect("mongodb://127.0.0.1:27017/postapp")

const userSchema = mongoose.Schema({
    username:String,
    name:String,
    email:String,
    password:String,
    age:Number,
    posts:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"post"
    }]
})

module.exports = mongoose.model("user",userSchema)