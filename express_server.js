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

var numArray = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

var urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

app.post("/urls", (req, res) => {
  let templateVar = generateRandomString()
  urlDatabase[templateVar] = req.body.longURL
  console.log(urlDatabase);  // debug statement to see POST parameters
  console.log('Added shortURL: ' + templateVar + ' to: ' + req.body.longURL + ".");
  res.redirect('/urls');
});

app.post("/login", (req, res) => {
  let user = req.body.username
  console.log(user)
  res.cookie("username", user)
  res.redirect('/urls');
});

app.post("/logout", (req, res) => {
  let tempVar = req.cookies['username']
  console.log(tempVar)
  res.clearCookie('username')
  res.redirect('/urls');
})

app.post("/urls/:id/delete", (req, res) => {
  let id = req.params.id
  delete urlDatabase[id];
  res.redirect('/urls');
})


app.put("/urls/:shortURL", (req, res) => {
  let short = req.params.shortURL
  let newLong = req.body.longURL
  urlDatabase[short] = newLong
  console.log(urlDatabase)
  res.redirect('/urls');
});

app.get("/urls/new", (req, res) => {
  let objectToPass = {}
  objectToPass.username = req.cookies["username"]
  res.render("urls_new", objectToPass);
});

app.get("/urls/:shortURL", (req, res) => {
  let objectToPass = {short: req.params.shortURL}
  objectToPass.username = req.cookies["username"]
  objectToPass.long = urlDatabase[req.params.shortURL]
  res.render("urls_show", objectToPass);
});

app.get("/u/:shortURL", (req, res) => {
  let longURL = urlDatabase[req.params.shortURL]
  console.log(longURL)
  res.redirect(longURL);
});

app.get("/urls", (req, res) => {
  var templateVars = { urls: urlDatabase };
  templateVars.username = req.cookies["username"]
  res.render("urls_index", templateVars);
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
    tempArray.push(char)
  }
  tempString = tempArray.join('')
  return tempString
}