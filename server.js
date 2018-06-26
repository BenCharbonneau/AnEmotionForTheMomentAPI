const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const db = require('./db/db');
require('dotenv').config()

const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');

//import controllers
const userController = require('./controllers/userController');
const friendController = require('./controllers/friendController');

const PORT = process.env.PORT || 3000;

//MIDDLEWARE

//set up user sessions
app.use(session({
	secret: process.env.SECRET,
	resave: false,
	saveUninitialized: false,
	cookie: { secure: (process.env.COOKIE_SECURE === 'true') }
}))

//authenticate requests
app.use(function isAuthenticated(req,res,next) {
  if (req.url === '/' || req.url === '/users/login' || req.url === '/users/register') {
  	return next();
  }
 
  if (req.session.loggedIn) return next();

  res.json({
  	status: 403,
  	message: "You must be logged in to do this."
  })
})

//set up cors
app.use(cors());

//parse the request body into req.body
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

//look for routes in the controllers
app.use('/users',userController(io,db))
app.use('/friends',friendController(io,db));

//END MIDDLEWARE

//default route
app.get('/',(req,res) => {
	res.json({
    status: 200,
    message: "Check the API documentation at https://github.com/BenCharbonneau/AnEmotionForTheMomentAPI."
  });
})

//start listening for requests to the server
http.listen(PORT);