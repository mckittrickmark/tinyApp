var express = require("express");
var app = express();
var PORT = 8080; // default port 8080

//required modules imported
const bodyParser = require("body-parser");
const methodOverride = require('method-override');
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');

const saltRounds = 12;

//calling required modules
app.set('view engine', 'ejs');
app.use(methodOverride('_method'))
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: "session",
  keys: ["magicKey"]
}))

// building nums
var numArray = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const urlDatabase = {
  "b2xVn2": {shortURL: "b2xVn2",
            longURL: "http://www.lighthouselabs.ca",
            userID: "a12345",
            visitCount: 0,
            visitIps: [],
            dateCreated: "today"
            },
  "9sm5xK": { shortURL: "9sm5xK",
            longURL: "http://www.google.com",
            userID: "a12345",
            visitCount: 0,
            visitIps: [],
            dateCreated: "today"
            }
};
// --------------------------------------------------------------------------------
// urlDatabase methods

urlMethods = {
// returns a filtered list of urls (in a oject). Results are filtered by the user logged in
  urlAll: (user_id) => {
    let tempUrlObj = {};
    for (let url in urlDatabase) {
      if (urlDatabase[url]['userID'] === user_id) {
        tempUrlObj[url] = urlDatabase[url]
      }
    }
    return tempUrlObj;
  },
// returns a lookup of the long url when provided a short url
  urlLookup: (short) => {
    try {
      return urlDatabase[short]['longURL'];
    }
    catch(error) {
      return false;
    }
  },
// builds new url entry from a request and a the randomly generated 6 character string
  buildURL: (req, randString) => {
    let long = req.body["longURL"];
    if (req.body["longURL"].slice(4).toLowerCase() !== "http") {
      longURL = "http://" + long;
    }
    let tempURL = { shortURL: randString,
                    longURL: longURL,
                    userID: req.session.user_id,
                    visitCount: 0,
                    visitIps: [],
                    uniqueCount: 0,
                    dateCreated: Date()
                    }
    urlDatabase[randString] = tempURL;
  },
// checks if a url exists and if a user has access to it
  urlAllowed: (user_id, short) => {
    if (urlDatabase[short]['userID'] === user_id) {
      return true;
    } else {
      return false;
    }
  },
  countOneVisit: (req, shortURL) => {
  urlDatabase[shortURL].visitCount += 1;
  urlDatabase[shortURL]['visitIps'].push(req.connection.remoteAddress);
  let catchArray = [];
  for (visit of urlDatabase[shortURL]['visitIps']) {
      if (!catchArray.includes(visit)) {
        catchArray.push(visit)
      }
    }
  urlDatabase[shortURL]['uniqueCount'] = catchArray.length;
  }
}

//X-Forwarded-For
// ----------------------------------------------------------
// USERS

// data object holding user information
const users = {
  a12345: {
    id: "a12345",
    username: "spaghetti@slime.com",
    password: "$2a$12$4uFKm24/7ufc1A0/u7BfrujHjMrqJZBhhmDc68CssPnWX8s4AvfWK"
  }
}

// methods that interact with the users database
userMethods = {
// returns a list of all users
  userAll: () => {
    return users;
  },

// looks up a user object when given a user id
  userLookup: (id) => {
    return users[id];
  },
//creates a user object when given id, username (email), and password

  addUser: (id, username, password) => {
    let passwordcrypt = passwordHasher(password)
    users[id] = {
      id: id,
      username: username,
      password: passwordcrypt
    }
  },
//returns a  user object when provided with a req
  cookieToUser: (req) => {
    let user_id = req.session.user_id;
    if (userMethods.userLookup(user_id)) {
      let user = userMethods.userLookup(user_id);
      return user;
    } else {
      let user = {id: "", username: "", password: ""}
      return user;
    }
  },

// looks up a user id when given a username. Used primarily at login
  userNametoId: (inputUsername) => {
    let id = "";
    for (user in users) {
      if (userMethods.userLookup(user).username === inputUsername) {
        id = user;
      }
    }
    return id;
  },
// checks a password against hashed / encrypted password stored in the users object
// user_id must be verified prior to calling this function. This function is only called from within checkLogin
  checkPassword: (user_id, inputPassword) => {
    let user = userMethods.userLookup(user_id)
    if (bcrypt.compareSync(inputPassword, user.password)) {
      return true;
    } else {
      return false;
    }
  },

// verifies if a username and password combination are valid and returns a boolean true/false value
  checkLogin: (req) => {
    let password = req.body["password"];
    let username = req.body["username"];
    let user_id = userMethods.userNametoId(username)
    if (!user_id) {
      return false;
    }
    return userMethods.checkPassword(user_id, password);
  }
}
// -----------------------------------------------------------------------------
// Begining of http paths

// Handles addition of new urls for a verified user. If user is not logged in, redirects to login.
//Called from submit button on new url page.
app.post("/urls", (req, res) => {
  if (userMethods.userLookup(req.session.user_id)) {
    let randString = generateRandomString();
    urlMethods.buildURL(req, randString);
    res.redirect('/urls');
  } else {
    res.redirect("/login_needed");
  }
});

// Handles logouts and redirects to login. Clears cookies

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect('/urls');
})

// Handles user registration. Checks if email is valid (not blank or already used) with checkEmail function
// addUser Function from userMethods is responsible for building the user object
// Also sets cookie for the user to begin surfing the website

app.post("/register", (req, res) => {
  let objectToPass = buildObjectToPass();
  let userIdTemp = generateRandomString();
  let password = req.body["password"];
  let username = req.body["username"];
  let validate = checkEmail(username);
  if (!password) {
    objectToPass.message = "Please enter a password";
    res.render("not_yours", objectToPass);
  } else if (validate.status_Code === "200"){
    userMethods.addUser(userIdTemp, username, password);
    objectToPass.user = userMethods.userLookup(userIdTemp);
    req.session.user_id = userIdTemp;
    res.render('register_response', objectToPass);
  } else {
    objectToPass.status_Code = validate.status_Code;
    objectToPass.message = validate.message;
    objectToPass.username = username;
    res.render('register', objectToPass);
  }
})
// this needs to be refactored, also need to remove the delete operator and from the html form too
// deletes an existing url object.
// is called from the /urls page
app.delete("/urls/:id/delete", (req, res) => {
  objectToPass = buildObjectToPass();
  let user_id = req.session.user_id;
  if (!user_id) {
    res.redirect("/login_needed")
  }
  else if (urlMethods.urlAllowed(user_id, req.params.id)) {
    let id = req.params.id;
    delete urlDatabase[id];
    res.redirect('/urls');
  } else {
    res.redirect('/urls');
  }
})

// handles login function. Login is checked with the checkLogin function (which returns boolean).
// Sets cookies if successful. If unsuccessful renders to login page again with additional message.

app.post("/login", (req, res) => {
  let objectToPass = buildObjectToPass();
  let validated = userMethods.checkLogin(req);
  let username = req.body["username"];
  let user_id = userMethods.userNametoId(username)
  if (validated === true) {
    objectToPass.user = userMethods.userLookup(user_id);
    req.session.user_id = user_id;
    res.redirect("/urls");
  } else {
    objectToPass.message = "Login info incorrect. Please try again.";
    objectToPass.status_Code = "403";
    res.render("login", objectToPass);
  }
})

// Renders the page showing individual information about each entry
app.put("/urls/:shortURL", (req, res) => {
  objectToPass = buildObjectToPass();
  let short = req.params.shortURL;
  if(!userMethods.userLookup(req.session.user_id)) {
    res.redirect("/login_needed");
  } else if (urlMethods.urlAllowed(objectToPass.user.id, short)) {
    objectToPass.message = "You are only able to edit short URL pages you created. Still friends?";
    res.render("not_yours", objectToPass);
  }
    if (userMethods.userLookup(req.session.user_id).id) {
      let short = req.params.shortURL;
      let newLong = req.body.longURL;
      if (newLong.slice(4).toLowerCase() !== "http") {
        newLong = "http://" + newLong;
      }
      urlDatabase[short]['longURL'] = newLong;
      res.redirect('/urls');
    } else {
      res.redirect('/urls');
    }
});

// ----------------------------------------
// Each time a page is rendered an object called object to pass is created with buildObjectToPass()
// Cookies are handled with the cookieToUser function. If no user_id cookie exists user = {}

// simple home screen
app.get("/home", (req, res) => {
  let objectToPass = buildObjectToPass();
  objectToPass.user = userMethods.cookieToUser(req);
  if (objectToPass.user['id']) {
    res.render("home", objectToPass);
  } else {
    res.redirect("/login_needed");
  }
})
// simple home screen
app.get("/", (req, res) => {
  let objectToPass = buildObjectToPass();
  objectToPass.user = userMethods.cookieToUser(req);
  res.render("home", objectToPass);
})
// displays registration page
app.get("/register", (req, res) => {
  let objectToPass = buildObjectToPass();
  objectToPass.user = userMethods.cookieToUser(req);
  res.render("register", objectToPass);
})
// displays registration page
app.get("/login", (req, res) => {
  let objectToPass = buildObjectToPass();
  objectToPass.user = userMethods.cookieToUser(req);
  res.render("login", objectToPass);
})
// Viewing the new url page requires a user to be logged in

app.get("/urls/new", (req, res) => {
  let objectToPass = buildObjectToPass();
  objectToPass.user = userMethods.cookieToUser(req);
  if (objectToPass.user['id']) {
    res.render("urls_new", objectToPass);
  } else {
    res.redirect("/login");
  }
});

// viewing an individual urls information requires a user to be logged in and have created the url

app.get("/urls/:shortURL", (req, res) => {
  let objectToPass = buildObjectToPass();
  objectToPass.user = userMethods.cookieToUser(req);
  objectToPass.short = req.params.shortURL;
  objectToPass.long = urlMethods.urlLookup(objectToPass.short);
  objectToPass.url = urlDatabase[objectToPass.short];
  if (!objectToPass.user['id']) {
    res.redirect("/login_needed");
  }
  else if (objectToPass.long === false) {
    objectToPass.message = "That short URL does not exist. :(";
    res.render("not_yours", objectToPass);
  }
  else if (urlMethods.urlAllowed(objectToPass.user.id, objectToPass.short)) {
    res.render("urls_show", objectToPass);
  } else {
      objectToPass.message = "You are able to only view short URL pages you created. Still friends?"
      res.render("not_yours", objectToPass);
  }
});

// main function of the app. Redirects to the longURL when provided the shortURL

app.get("/u/:shortURL", (req, res) => {
  let longURL = urlMethods.urlLookup(req.params.shortURL);
  if (longURL === false) {
    let objectToPass = buildObjectToPass();
    objectToPass.message = "That short URL does not exist.";
    res.render("not_yours", objectToPass);
  } else {
    urlMethods.countOneVisit(req, req.params.shortURL);
    res.redirect(longURL);
  }
});

// shows a full list of all of a users URLs. A user can only view their own URLs.

app.get("/urls", (req, res) => {
  var objectToPass = buildObjectToPass();
  objectToPass.user = userMethods.cookieToUser(req);
  if (objectToPass.user['id']) {
    objectToPass.urls = urlMethods.urlAll(objectToPass.user['id']);
    res.render("urls_index", objectToPass);
  } else {
      res.redirect("login_needed");
  }
});

app.get("/login_needed", (req, res) => {
  let objectToPass = buildObjectToPass();
  objectToPass.user = userMethods.cookieToUser(req);
  res.render("login_needed", objectToPass);
})

// ------------------------------------------------------------------------------
// starting the server

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

// ------------------------------------------------------------------------------
// Other Functions

// Random string used for userIDs and shortURLs

function generateRandomString() {
  let tempString = "";
  let tempArray = [];
  for (i = 0 ; i < 6; i++){
    let char = numArray[Math.floor(Math.random() * 62)];
    tempArray.push(char);
  }
  tempString = tempArray.join('')
  return tempString;
}

// checks emails versus existing users

function checkEmail(email) {
  var emailCheckResponse = {};
  let emailAlreadyExists = "";
  for (user in users) { //this references our data structure... should this be in userMethods?
    if (users[user]['username'] === email) {
      emailAlreadyExists = true;
    }
  }
  if (!email) {
    emailCheckResponse.status_Code = "400";
    emailCheckResponse.message = "No email submitted - please enter a valid email";
    return emailCheckResponse;
  } else if (emailAlreadyExists) {
    emailCheckResponse.status_Code = "400";
    emailCheckResponse.message = "This email already exists";
    return emailCheckResponse;
  } else {
    emailCheckResponse.status_Code = "200";
    emailCheckResponse.message = "Successfully registered";
    return emailCheckResponse;
  }
}

// password Hasher

function passwordHasher (plaintext) {
  let passcrypt = bcrypt.hashSync(plaintext, saltRounds);
  return passcrypt;
}

// constructs the object containing all the variables a page may request
// Default is a ll values set to empty

function buildObjectToPass () {
  //empty object to contain all possible strings/objects
  let tempObjectToPass = {  user_id: "",
                            username: "",
                            password: "",
                            user: {},
                            users: {},
                            urls: {},
                            short: "",
                            long: "",
                            status_Code: "",
                            message: ""
                          }
  return tempObjectToPass;
}