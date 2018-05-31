const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const db = require('./db/db');
const cors = require('cors');

const bodyParser = require('body-parser');
// const methodOverride = require('method-override');
// const session = require('express-session');

const userController = require('./controllers/userController');
const friendController = require('./controllers/friendController');
// app.use(session({
// 	secret: 'some random string',
// 	resave: false,
// 	saveUninitialized: false,
// 	cookie: { secure: false }
// }))
// app.use(methodOverride('_method'));
app.use(cors());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// io.on('connection',(socket) => {
// 	console.log('socket connected',socket.id);
// })

app.use('/users',userController(io,db))
app.use('/friends',friendController(io,db));

app.get('/',(req,res) => {
	res.json({message: "Here"});
})

http.listen(3000);