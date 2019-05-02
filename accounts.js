var express = require("express");
var fs = require("fs");
var crypto = require("crypto");
const uuid = require("uuid/v1");

// get config file
const config = JSON.parse(fs.readFileSync("accounts-config.js"));

module.exports = {
  login(user, callback) {
    if (user.username && user.password) {
      this.getUsers((err, users) => {
        const username = user.username.trim().toLowerCase();
        const encPassword = encryptString(user.password);
        for (var i = 0; i < users.length; i++) {
          if (users[i].username == username &&
              users[i].password == encPassword) {
            return this.createSession(users[i].id, callback);
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
      if (err) {
        return callback(err, undefined);
      }
      
      // get current date
      const date = new Date();
      
      // check if last session is active
      if (sessions.length > 0) {
        if (sessions[sessions.length-1].active) {
          // check if session has timed out
          if (sessionTimeout(sessions[sessions.length-1])) {
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
                  "sessionId": sessions[sessions.length-1].id,
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
        "id": uuid(),
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
  
  logout(userId, sessionId, callback) {
    this.getSessions(userId, (err, sessions) => {
      if (err) {
        return callback(err, undefined);
      }
      else {
        var session = findById(sessionId, sessions);
        if (session) {
          const date = new Date();
          session.lastActive = date.toISOString();
          session.active = false;
          this.saveSessions(userId, sessions, (err) => {
            if (err) {
              return callback(err, undefined);
            }
            else {
              return callback(undefined, {
                "message": "User logged out successfully"
              });
            }
          });
        }
        else {
          return callback("Invalid session ID", undefined);
        }
      }
    });
  },
  
  keepSessionAlive(userId, sessionId, callback) {
    this.getSessions(userId, (err, sessions) => {
      if (err) {
        return callback(err, undefined);
      }
      else {
        var session = findById(sessionId, sessions);
        if (session) {
          if (session.active) {
            const date = new Date();
            session.lastActive = date.toISOString();
            this.saveSessions(userId, sessions, (err) => {
              if (err) {
                return callback(err, undefined);
              }
              else {
                return callback(undefined, session);
              }
            });
          }
          else {
            return callback("Session inactive", undefined);
          }
        }
        else {
          return callback("Invalid session ID", undefined);
        }
      }
    });
  },

  getSessions(userId, callback) {
    // check if user exists
    this.getUser(userId, (err, user) => {
      if (err) {
        return callback(err, undefined);
      }
      
      const userDir = getUserDirectory(userId);
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
    });
  },
  
  getSession(userId, sessionId, callback) {
    this.getSessions(userId, (err, sessions) => {
      if (err) {
        return callback(err, undefined);
      }
      var session = findById(sessionId, sessions);
      if (session) {
        return callback(undefined, session);
      }
      else {
        return callback("Invalid session ID", undefined);
      }
    });
  },

  saveSessions(userId, data, callback) {
    fs.writeFile(getUserDirectory(userId) 
                 + config.sessionsFileName + ".json", 
                 JSON.stringify(data),
                 callback);
  },

  createUser(user, callback) {
    // validate request
    var newUser = {};
    if (user.firstName &&
        user.lastName &&
        user.email &&
        user.username &&
        user.password) {
      newUser.id = uuid();
      newUser.firstName = user.firstName.trim();
      newUser.lastName = user.lastName.trim();
      newUser.email = user.email.trim().toLowerCase();
      newUser.username = user.username.trim().toLowerCase();
      newUser.password = encryptString(user.password);
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
      var user = findById(userId, users);
      if (user) {
        return callback(undefined, user);
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
  }
};

function sessionTimeout(session) {
  const currentDate = new Date();
  const sessionDate = new Date(session.lastActive);
  const elapsed = currentDate - sessionDate;
  // check if x minutes has elapsed since last activity (convert to milliseconds)
  return elapsed.valueOf() > config.sessionTimeout*60000;
}

function encryptString(str) {
  var key = crypto.createCipher("aes-128-cbc", config.passphrase);
  var outStr = key.update(str, "utf8", "hex");
  outStr += key.final("hex");
  return outStr;
}

function decryptString(str) {
  var key = crypto.createDecipher("aes-128-cbc", config.passphrase);
  var outStr = key.update(str, "hex", "utf8");
  outStr += key.final("utf8");
  return outStr;
}

function getUserDirectory(userId) {
  return config.usersDir + config.userIdPrefix + userId + "/";
}

function findById(id, array) {
  if (array) {
    for (var i = 0; i < array.length; i++) {
      if (array[i].id == id) {
        return array[i];
      }
    }
  }
  return undefined;
}