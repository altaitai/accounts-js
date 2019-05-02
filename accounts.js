var express = require("express");
var fs = require("fs");
var crypto = require("crypto");

// get config file
const config = JSON.parse(fs.readFileSync("accounts-config.js"));

module.exports = {
  login(req, callback) {
    if (req.body.username && req.body.password) {
      this.getUsers((err, users) => {
        const username = req.body.username.trim().toLowerCase();
        const encPassword = this.encryptString(req.body.password);
        for (var i = 0; i < users.length; i++) {
          if (users[i].username == username &&
              users[i].password == encPassword) {
            return this.createSession(i, callback);
          }
        }
      
        return callback("Invalid credentials", undefined);
      });
    }
    else {
      return callback("Invalid request", undefined);
    }
  },

  createSession(userId, callback) {
    this.getSessions(userId, (err, sessions) => {
      // get current date
      const date = new Date();
      
      // check if last session is active
      if (sessions.length > 0) {
        if (sessions[sessions.length-1].active) {
          // check if session has timed out
          if (this.sessionTimeout(sessions[sessions.length-1])) {
            // set session to inactive
            sessions[sessions.length-1].active = false;
            
          }
          else {
            // update lastActive field
            sessions[sessions.length-1].lastActive = date.toISOString();
            
            // save sessions file and return active session
            return this.saveSessions(userId, sessions, (err) => {
              if (err) {
                return callback(err, undefined);
              }
              else {
                return callback(undefined, {
                  "newSession": false,
                  "sessionId": sessions.length-1,
                  "userId": userId
                });
              }
            });
          }
        }
      }
      
      // add new session
      const newSession = {
        "active": true,
        "id": sessions.length,
        "created": date.toISOString(),
        "lastActive": date.toISOString()
      };
      sessions.push(newSession);
      this.saveSessions(userId, sessions, (err) => {
        if (err) {
          return callback(err, undefined);
        }
        else {
          return callback(undefined, {
            "newSession": true,
            "sessionId": newSession.id,
            "userId": userId
          });
        }
      });
    });
  },
  
  sessionTimeout(session) {
    const currentDate = new Date();
    const sessionDate = new Date(session.lastActive);
    const elapsed = currentDate - sessionDate;
    // check if x minutes has elapsed since last activity (convert to milliseconds)
    return elapsed.valueOf() > config.sessionTimeout*60000;
  },

  getUserDirectory(userId) {
    return config.usersDir + config.userIdPrefix + userId + "/";
  },

  getSessions(userId, callback) {
    // check if user exists
    this.getUser(userId, (err, user) => {
      if (err) {
        return callback(err, undefined);
      }
    });
    
    const userDir = this.getUserDirectory(userId);
    const sessionsFile = userDir + config.sessionsFileName + ".json";
    
    // create user directory if not created
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir);
    }
    
    // return empty array if file does not exist
    if (!fs.existsSync(sessionsFile)) {
      return callback(undefined, []);
    }
    
    // read users file
    fs.readFile(sessionsFile, (err, data) => {
      if (err) {
        return callback(err, undefined);
      }
      else {
        return callback(undefined, JSON.parse(data));
      }
    });
  },
  
  getSession(userId, sessionId, callback) {
    this.getSessions(userId, (err, sessions) => {
      if (err) {
        return callback(err, undefined);
      }
      else if (sessions[sessionId]) {
        return callback(undefined, sessions[sessionId]);
      }
      else {
        return callback("Invalid session ID", undefined);
      }
    });
  },

  saveSessions(userId, data, callback) {
    fs.writeFile(this.getUserDirectory(userId) 
                 + config.sessionsFileName + ".json", 
                 JSON.stringify(data),
                 callback);
  },

  createUser(req, callback) {
    // validate request
    var newUser = {};
    if (req.body.firstName &&
        req.body.lastName &&
        req.body.email &&
        req.body.username &&
        req.body.password) {
      newUser.firstName = req.body.firstName.trim();
      newUser.lastName = req.body.lastName.trim();
      newUser.email = req.body.email.trim().toLowerCase();
      newUser.username = req.body.username.trim().toLowerCase();
      newUser.password = this.encryptString(req.body.password);
    }
    else {
      return callback("Invalid request", undefined);
    }
    
    // read existing users
    this.getUsers((err, users) => {
      // check if users is empty
      if (users.length == 0) {
        users.push(newUser);
      }
      else {
        // check if user already exists
        for (var i = 0; i < users.length; i++) {
          if (users[i].username == newUser.username) {
            return callback("Username already taken", undefined);
          }
        }
        
        // add new user and save file
        users.push(newUser);
      }
      
      // save file
      this.saveUsers(users, (err) => {
        if (err) {
          return callback("Error creating user: " + err, undefined);
        }
        else {
          return callback(undefined, {
            "message": "User created successfully"
          });
        }
      });
    });
  },

  getUsers(callback) {
    // create users directory if not created
    if (!fs.existsSync(config.usersDir)) {
      fs.mkdirSync(config.usersDir);
    }
    
    // return empty array if file does not exist
    if (!fs.existsSync(config.usersDir + config.usersFileName + ".json")) {
      return callback(undefined, []);
    }
    
    // read users file if file exists
    fs.readFile(config.usersDir + config.usersFileName + ".json", (err, data) => {
      if (err) {
        return callback(err, undefined);
      }
      else {
        return callback(err, JSON.parse(data));
      }
    });
  },
  
  getUser(userId, callback) {
    this.getUsers((err, users) => {
      if (users[userId]) {
        return callback(undefined, users[userId]);
      }
      else {
        return callback("Invalid user ID", undefined);
      }
    });
  },
  
  saveUsers(data, callback) {
    fs.writeFile(config.usersDir + config.usersFileName + ".json", 
                 JSON.stringify(data),
                 callback);
  },

  encryptString(str) {
    var key = crypto.createCipher("aes-128-cbc", config.passphrase);
    var outStr = key.update(str, "utf8", "hex");
    outStr += key.final("hex");
    return outStr;
  },

  decryptString(str) {
    var key = crypto.createDecipher("aes-128-cbc", config.passphrase);
    var outStr = key.update(str, "hex", "utf8");
    outStr += key.final("utf8");
    return outStr;
  }
};

