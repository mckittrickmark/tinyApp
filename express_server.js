var express = require("express");
var app = express();
var PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
const methodOverride = require('method-override')
const parseCookies = require('cookie-parser')
const bcrypt = require('bcryptjs')

const saltRounds = 12


app.set('view engine', 'ejs');
app.use(methodOverride('_method'))
app.use(bodyParser.urlencoded({extended: true}));
app.use(parseCookies())

var numArray = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

const urlDatabase = {
  "b2xVn2": {shortURL: "b2xVn2",
            longURL: "http://www.lighthouselabs.ca",
            userID: "a12345"},
  "9sm5xK": { shortURL: "9sm5xK",
            longURL: "http://www.google.com",
            userID: "a12345"}
};

// urlDatabase methods

urlMethods = {
  urlAll: (user_id) => {
    let tempUrlObj = {}
    for (let url in urlDatabase) {
      if (urlDatabase[url]['userID'] === user_id) {
        tempUrlObj[url] = urlDatabase[url]
        console.log(urlDatabase[url]['userID'], "???", user_id)
      }
    }
    return tempUrlObj
  },
//console.log(urlAll())
  urlLookup: (short) => {
    return urlDatabase[short]['longURL']
  },
  buildURL: (req, randString) => {
    let tempURL = { shortURL: randString,
                    longURL: req.body["longURL"],
                    userID: req.cookies["user_id"]
                    }
    urlDatabase[randString] = tempURL
  },
  urlAllowed: (user_id, short) => {
    if (urlDatabase[short]['userID'] === user_id) {
      return true
    } else {
      return false
    }
  }
}
//console.log(urlLookup("b2xVn2"))

const users = {
  a12345: {
    id: "a12345",
    username: "spaghetti@slime.com",
    password: "$2a$12$4uFKm24/7ufc1A0/u7BfrujHjMrqJZBhhmDc68CssPnWX8s4AvfWK"
  }
}

userMethods = {
  userAll: () => {
    return users
  },
  userLookup: (id) => {
    return users[id]
  },
  addUser: (id, username, password) => {
    let passwordcrypt = passwordHasher(password)
    users[id] = {
      id: id,
      username: username,
      password: passwordcrypt
    }
  },
  cookieToUser: (req) => {
    let user_id = req.cookies["user_id"]
    if (userMethods.userLookup(user_id)) {
      let user = userMethods.userLookup(user_id)
      return user
    } else {
      let user = {id: "", username: "", password: ""}
      console.log(user)
      return user
    }
  },
  userNametoId: (inputUsername) => {
    let id = ""
    for (user in users) {
      if (userMethods.userLookup(user).username === inputUsername) {
        id = user
      }
    }
    return id
  },
  // if you pass an invalid user_id to checkPassword it crashes the program ... change that or make sure it doesn't happen
  checkPassword: (user_id, inputPassword) => {
    let passcrypt = passwordHasher(inputPassword)
    let user = userMethods.userLookup(user_id)
    console.log(user)
    if (user["password"] === passcrypt) {
      return true
    } else {
      return false
    }
  },
  checkLogin: (req) => {
    let password = req.body["password"]
    let username = req.body["username"]
    let user_id = userMethods.userNametoId(username)
    if (!user_id) {
      return false
    }
    return userMethods.checkPassword(user_id, password)
  }
}

app.post("/urls", (req, res) => {
  if (userMethods.userLookup(req.cookies.user_id).id) {
    let randString = generateRandomString()
    urlMethods.buildURL(req, randString)
    console.log(urlDatabase);  // debug statement to see POST parameters
    console.log('Added shortURL: ' + randString + ' to: ' + req.body.longURL + ".");
    res.redirect('/urls');
} else
  res.redirect('/login');
});


app.post("/logout", (req, res) => {
  let tempVar = userMethods.cookieToUser(req) //this needs to be changed. Does it do anything?
  res.clearCookie('user_id')
  res.redirect('/urls');
})

app.post("/register", (req, res) => {
  let objectToPass = buildObjectToPass()
  let userIdTemp = generateRandomString()
  let password = req.body["password"]
  let username = req.body["username"]
  let validate = checkEmail(username)

  console.log(validate)
  if (validate.status_Code === "200"){
    userMethods.addUser(userIdTemp, username, password)
    objectToPass.user = userMethods.userLookup(userIdTemp)
    res.cookie("user_id", userIdTemp)
    res.render('register_response', objectToPass);
  } else {
    objectToPass.status_Code = validate.status_Code
    objectToPass.message = validate.message
    objectToPass.username = username
    res.render('register', objectToPass)
  }
})
// this needs to be refactored, also need to remove the delete operator and from the html form too
app.post("/urls/:id/delete", (req, res) => {
  let id = req.params.id
  delete urlDatabase[id];
  res.redirect('/urls');
})

app.post("/login", (req, res) => {
  let objectToPass = buildObjectToPass()

  let validated = userMethods.checkLogin(req)
  let username = req.body["username"] //might be redundant
  let user_id = userMethods.userNametoId(username) //might be redundant
  if (validated === true) {
    console.log("passed")
    objectToPass.user = userMethods.userLookup(user_id)
    res.cookie("user_id", user_id)
    res.redirect("/urls")
  } else {
    objectToPass.message = "Login info incorrect. Please try again."
    objectToPass.status_Code = "403"
    console.log(objectToPass)
    res.render("login", objectToPass)
    console.log("Failed")
  }

})

app.put("/urls/:shortURL", (req, res) => {
  if (userMethods.userLookup(req.cookies.user_id).id) {
    let short = req.params.shortURL
    let newLong = req.body.longURL
    urlDatabase[short]['longURL'] = newLong
    res.redirect('/urls');
  } else {
    res.redirect('/urls');
  }
});

app.get("/register", (req, res) => {
  let objectToPass = buildObjectToPass()
  objectToPass.user = userMethods.cookieToUser(req)

  res.render("register", objectToPass)
})

app.get("/login", (req, res) => {
  let objectToPass = buildObjectToPass()
  objectToPass.user = userMethods.cookieToUser(req)

  res.render("login", objectToPass)
})

app.get("/urls/new", (req, res) => {
  let objectToPass = buildObjectToPass()
  objectToPass.user = userMethods.cookieToUser(req)
  console.log(objectToPass.user['id'])
  if (objectToPass.user['id']) {
    res.render("urls_new", objectToPass);
  } else {
    res.redirect("/login")
  }
});

app.get("/urls/:shortURL", (req, res) => {
  let objectToPass = buildObjectToPass()
  objectToPass.user = userMethods.cookieToUser(req)
  objectToPass.short = req.params.shortURL
  objectToPass.long = urlMethods.urlLookup(objectToPass.short)
  if (urlMethods.urlAllowed(objectToPass.user.id, objectToPass.short)) {
    res.render("urls_show", objectToPass);
  } else {
      res.redirect("/urls")
  }
});

app.get("/u/:shortURL", (req, res) => {
  let longURL = urlMethods.urlLookup(req.params.shortURL)
  console.log(longURL)
  res.redirect(longURL);
});

app.get("/urls", (req, res) => {
  var objectToPass = buildObjectToPass()
  objectToPass.user = userMethods.cookieToUser(req)
  if (objectToPass.user['id']) {
    console.log(objectToPass.user['id'])
    objectToPass.urls = urlMethods.urlAll(objectToPass.user['id'])
    console.log(objectToPass.urls)
    res.render("urls_index", objectToPass);
  } else {
      res.redirect("/login")
  }
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});


function generateRandomString() {
  let tempString = ""
  let tempArray = []
  for (i = 0 ; i < 6; i++){
    let char = numArray[Math.floor(Math.random() * 62)]
    console.log("Char:", char)
    tempArray.push(char)
  }
  tempString = tempArray.join('')
  return tempString
}

function checkEmail(email) {
  var emailCheckResponse = {}
  let emailAlreadyExists = ""
  for (user in users) { //this references our data structure... should this be in userMethods?
    if (users[user]['username'] === email) {
      emailAlreadyExists = true
    }
  }
  if (!email) {
    emailCheckResponse.status_Code = "400"
    emailCheckResponse.message = "No email submitted - please enter a valid email"
    return emailCheckResponse
  } else if (emailAlreadyExists) {
    emailCheckResponse.status_Code = "400"
    emailCheckResponse.message = "This email already exists"
    return emailCheckResponse
  } else {
    emailCheckResponse.status_Code = "200"
    emailCheckResponse.message = "Successfully registered"
    return emailCheckResponse
  }
}

function passwordHasher (plaintext) {
  let passcrypt = bcrypt.hashSync(plaintext, saltRounds)
  return passcrypt
}

console.log(passwordHasher("a12345"))

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
  return tempObjectToPass
}