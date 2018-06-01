const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const db = require('./db/db');
require('dotenv').config()

const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');

const userController = require('./controllers/userController');
const friendController = require('./controllers/friendController');

const PORT = process.env.PORT || 3000;

app.use(session({
	secret: process.env.SECRET,
	resave: false,
	saveUninitialized: false,
	cookie: { secure: (process.env.COOKIE_SECURE === 'true') }
}))

app.use(function isAuthenticated(req,res,next) {
  if (req.url === '/' || req.url === '/users/login' || req.url === '/users/register') {
  	return next();
  }
 
  if (req.session.loggedIn) return next();

  res.json({
  	status: 200,
  	message: "You must be logged in to do this."
  })
})

app.use(cors());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use('/users',userController(io,db))
app.use('/friends',friendController(io,db));

app.get('/',(req,res) => {
	res.json({message: "Here"});
})

http.listen(PORT);