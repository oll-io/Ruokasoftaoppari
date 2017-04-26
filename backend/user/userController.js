var User                = require("./userModel");
var fs                  = require("fs");
var jwt                 = require("jsonwebtoken");
var express             = require("express");
var app                 = express();
var config              = require("../config");

app.set('secret', config.secret);

exports.signUp = function(req, res){
    if(!req.body) return res.sendStatus(400);

    var userName = req.body.username;
    var userEmail = req.body.email;
    var userPassword = req.body.password;
    console.log("Username is " + userName + " and the email is " + userEmail);
    var newUser = new User({
        username: userName,
        userEmail: userEmail,
        userPassword: userPassword
    });

    User.find({userEmail: userEmail}, function(err, exists){
        if(err){
            res.json({success:false, message: "Couldn't access database."});
            console.log("Couldn't access database.");
            console.log(err);
        }else{
            if(exists.length){
                console.log("User with that email already exists");
                console.log("User exists: " + exists);
                res.json({success: false, message: "User with that email already exists"});
            }else{
                newUser.save(function(err, results){
                    if (err){
                        res.json({success: false, message: "Couldn't save user to database."})
                        console.log("Couldn't save to database.");
                    }else{
                        console.log(results);
                        
                        var token = jwt.sign(newUser, app.get('secret'), {
                            expiresIn: '24h'
                        });
                        res.json({
                            success: true,
                            message: 'Token sent',
                            token: token
                        });

                        User.findOne({username: userName}, function(err, user){
                            if(err){
                                res.json({success:false, message: "Couldn't confirm password."})
                                console.log("Couldn't confirm password");
                                console.log(err);
                            }else{
                                user.comparePassword(userPassword, function(err, isMatch){
                                    if(err) throw err;
                                    console.log("userPassword: ", isMatch);
                                });
                            }
                        });
                    }
                });
            }
        }
    });
};

exports.login = function(req, res){
    if(!req.body) return res.sendStatus(400);

    console.log("Hello, login here.");
    var userEmail = req.body.email;
    var userPassword = req.body.password;
    console.log(userEmail);
    
    User.findOne({userEmail: userEmail}, function(err, user){
        if(err){
            res.json({success: false, message: "Couldn't access database."})
            console.log("Couldn't access database.");
            console.log(err);
        }else{
            console.log("Exists: " + user);
            if(user){
                user.comparePassword(userPassword, function(err, isMatch){
                    if(isMatch == true){
                        console.log("login userPassword: ", isMatch);

                        var token = jwt.sign(user, app.get('secret'), {
                            expiresIn: '24h'
                        });
                        res.json({
                            success: true,
                            message: 'Token sent',
                            token: token,
                            username: user.username
                        });
                    }else{
                        console.log("Password is incorrect.");
                        res.json({success: false, message: "Email or password is incorrect."});
                    }
                });
            }else{
                res.json({success: false, message: "Login failed. User does not exist."});
            }
        }
    });
};

exports.changeUsername = function(req, res){
    if(!req.body) return res.sendStatus(400);

    var userEmail = req.body.email;
    var newUsername = req.body.username;
    console.log(userEmail + " " + newUsername);

    User.findOne({userEmail:userEmail}, function(err, user){
        if(err){
            console.log(err);
        }else{
            User.findOneAndUpdate({userEmail:userEmail}, {$set:{username:newUsername}}, function(err, results){
                console.log("Username changed " + results);
                res.json({success: true, message: "Username changed."});
            });
        }
    });    
};

exports.changePassword = function(req, res){
    if(!req.body) return res.sendStatus(400);

    var userEmail = req.body.email;
    var oldPassword = req.body.oldpassword;
    var newPassword = req.body.newpassword;
    console.log(userEmail + " " + oldPassword);

    User.findOne({userEmail:userEmail}, function(err, user){
        if(err){
            res.json({success: false, message:"Couldn't access database."});
            console.log("/changepassword: Couldn't access database to find user.");
            console.log(err);
        }else{
            user.comparePassword(oldPassword, function(err, isMatch){
                if(isMatch == true){
                    console.log("userPassword: ", isMatch);

                    user.userPassword = newPassword;
                    user.save(function(err, results){
                        if(err){
                            console.log(err);
                        }else{
                            console.log("Password changed: " + results);
                            res.json({success: true, message: "Password changed."});
                        }
                    });

                }else{
                    res.json({success:false, message: "Password wrong."});
                }
            });
        }
    });
};

exports.setAvatar = function(req, res){
    if(!req.file) return res.sendStatus(400);
    if(!req.body) return res.sendStatus(400);

    console.log("Name: " + req.file.originalname);
    console.log("Path: " + req.file.path);

    var userEmail = req.headers['email'];
    fs.rename(req.file.path, req.file.destination + "avatars/" + userEmail + ".jpg", function(err, results){
        if(err){
            res.json({success: false, message: "Failed to save avatar."});
            console.log("/setavatar: renaming borked up");
            console.log(err);
        }else{
            res.json({success: true, message: "Avatar saved."});
        };
    });
};

exports.getUsers = function(req, res){
    if(!req.headers['id']) return res.sendStatus(400);
    
    groupID = req.headers['id'];
    //console.log("GroupID: " + groupID);
    User.find({"groups.groupID":groupID}, function(err, members){
        if(err){
            res.json({success:false, message: "Couldn't access database."});
            console.log("Couldn't get list of users.");
            console.log(err);
        }else{
            if(members){
                res.json(members);
            }else{
                res.json(null);
            }
        }
    });
};

exports.getProfile = function(req, res){
    if(!req.headers['email']) return res.sendStatus(400);

    userEmail = req.headers['email'];

    User.findOne({userEmail:userEmail}, 'username userEmail groups', function(err, profile){
        if(err){
            res.json({success: false, message: "Cannot access database."});
            console.log("/profile: Cannot access database to find user.");
        }else{
            if(profile){
                res.json(profile);
            }else{
                res.json({success: false, message: "No user by that email!"});
                console.log("/profile: Couldn't find user by that email.");
            }
        }
    });
};