var express = require("express");
var app = express();
var PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
const methodOverride = require('method-override')
const parseCookies = require('cookie-parser')

app.set('view engine', 'ejs');
app.use(methodOverride('_method'))
app.use(bodyParser.urlencoded({extended: true}));
app.use(parseCookies())

var numArray = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

// urlDatabase methods

urlMethods = {
  urlAll: () => {
    return urlDatabase
  },
//console.log(urlAll())
  urlLookup: (short) => {
    return urlDatabase[short]
  }
}
//console.log(urlLookup("b2xVn2"))

const users = {
  a12345: {
    id: "a12345",
    username: "spaghetti@slime.com",
    password: "secret"
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
    users[id] = {
      id: id,
      username: username,
      password: password
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
    let user = userMethods.userLookup(user_id)
    console.log(user)
    if (user["password"] === inputPassword) {
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
//console.log(userMethods.checkLogin({body:{id: username: "spaghetti@slime.com", password: "secret"}}))
//console.log(userMethods.userLookup("a12345"))
//console.log(userMethods.checkPassword("a12345", "secret"))


app.post("/urls", (req, res) => {
  let templateVar = generateRandomString()
  urlDatabase[templateVar] = req.body.longURL
  console.log(urlDatabase);  // debug statement to see POST parameters
  console.log('Added shortURL: ' + templateVar + ' to: ' + req.body.longURL + ".");
  res.redirect('/urls');
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
    res.render('register_response', validate);
  } else {
    validate.username = username
    res.render('register', objectToPass)
  }
})

app.post("/urls/:id/delete", (req, res) => {
  let id = req.params.id
  delete urlDatabase[id];
  res.redirect('/urls');
})

app.post("/login", (req, res) => {
  let objectToPass = buildObjectToPass()

  let validated = userMethods.checkLogin(req)
  let username = req.body["username"]
  let user_id = userMethods.userNametoId(username)
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
  let short = req.params.shortURL
  let newLong = req.body.longURL
  urlDatabase[short] = newLong
  console.log(urlDatabase)
  res.redirect('/urls');
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

  res.render("urls_new", objectToPass);
});

app.get("/urls/:shortURL", (req, res) => {
  let objectToPass = buildObjectToPass()
  objectToPass.user = userMethods.cookieToUser(req)

  objectToPass.short = req.params.shortURL
  objectToPass.long = urlDatabase[req.params.shortURL]
  console.log(objectToPass)
  res.render("urls_show", objectToPass);
});

app.get("/u/:shortURL", (req, res) => {
  let longURL = urlDatabase[req.params.shortURL]
  console.log(longURL)
  res.redirect(longURL);
});

app.get("/urls", (req, res) => {
  var objectToPass = buildObjectToPass()
  objectToPass.user = userMethods.cookieToUser(req)

  objectToPass.urls = urlDatabase
  res.render("urls_index", objectToPass);
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