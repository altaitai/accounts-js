var express = require("express");
var accounts = require("./accounts.js");
var util = require("./utility.js");
var app = express();

app.use(express.json());

app.post("/login", function (req, res) {
  util.logMessage("Login user " + req.body.username);
  accounts.login(req, (err, data) => {
    handleCallback(err, data, res);
  });
})

app.get("/users", function (req, res) {
  util.logMessage("Get users");
  accounts.getUsers((err, data) => {
    handleCallback(err, data, res);
  });
})

app.get("/users/:id", function (req, res) {
  util.logMessage("Get user " + req.params.id);
  accounts.getUser(req.params.id, (err, data) => {
    handleCallback(err, data, res);
  });
})

app.get("/users/:userid/sessions", function (req, res) {
  util.logMessage("Get user " 
                  + req.params.userid 
                  + " sessions");
  accounts.getSessions(req.params.userid, (err, data) => {
    handleCallback(err, data, res);
  });
})

app.get("/users/:userid/sessions/:sessionid", 
        function (req, res) {
  util.logMessage("Get user " 
                  + req.params.userid 
                  + " session "
                  + req.params.sessionid);
  accounts.getSession(req.params.userid,
                      req.params.sessionid,
                      (err, data) => {
    handleCallback(err, data, res);
  });
})

app.post("/users", function (req, res) {
  util.logMessage("Create user " + req.body.username);
  accounts.createUser(req, (err, data) => {
    handleCallback(err, data, res);
  });
})

handleCallback = function(err, data, res) {
  if (err) {
    util.logMessage("Error: " + err);
    res.send({
      "error": err
    });
  }
  else if (data) {
    res.send(data);
  }
  else {
    res.send({
      "message": "Action performed successfully"
    });
  }
}

app.listen(3000, () => {
  console.log("Server started on port 3000");
});

