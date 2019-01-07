var mongoose = require("mongoose");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const _ = require("lodash");
const bcrypt = require('bcryptjs');


const SECRET = "abc1234";


var UserSchema = new mongoose.Schema({
    email:{
        type:String, 
        trim: true,
        minlength: 1,
        required: true,
        validate: {
            validator: (value) => {
                return validator.isEmail(value);
            },
            message : "Shut up"
        }
    },
    password: {
        type:String,
        require: true,
        minlength: 6
    },
    tokens: [{
        access: {
            type:String,
            required: true
        },
        token: {
            type:String,
            required: true
        }
    }]
});

UserSchema.pre('save', function (next) {
    var user = this; 

    if (user.isModified('password')){
        bcrypt.genSalt(10, (err,salt) => {
            bcrypt.hash(user.password, salt, (err,hash)=> {
                user.password = hash;
                next();
            });
        });
        
    }else{
        next();
    }
});

UserSchema.methods.toJSON = function () {
    var user = this; 
    var userObject = user.toObject();

    return _.pick(userObject, ["_id", 'email']);
};

UserSchema.methods.generateAuthToken = function () {
    var user = this; 
    var access = "auth";
    var token = jwt.sign({_id: user._id.toHexString()},SECRET).toString();

    user.tokens = user.tokens.concat({
        access, token
    });

    return user.save().then(() => {
        return token;
    });
};

UserSchema.methods.removeToken = function(token) {
    var user = this; 

    return user.update({
        $pull:{
            tokens:{
                tokens: {token}
            }
        }
    });
};

UserSchema.statics.findByToken = function (token) {
    var User = this;      
    var decoded;

    try{
        decoded = jwt.verify(token, SECRET);
    }catch(e){

    }

    return User.findOne({ 
        '_id': decoded._id,
        'tokens.token': token,
        'tokens.access': 'auth'
    });
};

UserSchema.statics.findByCredentials = function (email, password) {
    var User = this; 

    return User.findOne({email}).then((user) => {
        if(!user) {
            return Promise.reject();
        }  
        
        return new Promise((resolve, reject) => {
            bcrypt.compare(password, user.password, (err, res)=> {
                if(res){
                    resolve(user);
                }else{
                    reject();
                }
            });
        });
    }) 
};
var User = mongoose.model('User', UserSchema);

module.exports = {User};