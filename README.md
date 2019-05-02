# accounts-js
**account-js** is a bare bones Node.js based account management library.
It uses the filesystem to store user and session information in JSON format.

## Usage
The two files needed to integrate accounts-js in your project are *accounts.js* and *accounts-config.js*. Put them in the same directory.
The *accounts-config.js* file is used to customize the library configuration. See **Configuration** section for description.
Start by including the library source to your project.

```javascript
const accounts = require("./accounts.js");
```

 To **create a user**, use the *createUser* function.
```javascript
accounts.createUser({
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@foobar.com",
    username: "johndoe",
    password: "theB3STpasSworD!"
  }, (error, result) => {
  if (error) {
    console.log("An error occured! " + error);
  }
  else {
    console.log(username + " created successfully!");
  }
});
```

After the user account has been properly created, a user can **login** as shown below.
```javascript
accounts.login({
    username: "johndoe",
    password: "theB3STpasSworD!"
  }, (error, result) => {
  if (error) {
    console.log(error);
  }
  else {
    console.log("johndoe successfully logged in!");
    console.log(result);
  }
});
```
 
After successful login, the *result* object will contain these fields:
```javascript
{
  newSession: true,
  sessionId: '702eb100-6d20-11e9-b481-db938ae3ca71',
  userId: '70336bf0-6d20-11e9-b481-db938ae3ca71'
}
```

The *sessionId* is the UUID of the newly created session upon login and the *userId* is the UUID of the authenticated user account.
These identifiers are required to perform any operation on the user account. 
 
 ## API
 
 TBD
