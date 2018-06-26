module.exports = function(io,db) {

	const express = require('express');
	const router = express.Router();
	const bcrypt = require('bcrypt');

	//connect to the database
	const Users = db.collection("users");
	const Friendships = db.collection("friendships");

	// Emit any changes to the user database using socket.io

	// Users.onSnapshot((usersSnap) => {
	// 	const users = [];

	// 	usersSnap.docs.forEach((doc) => {
	// 		const user = doc.data();
	// 		users.push({username: user.username, id: doc.id})
	// 	})

	// 	io.emit('userlist',users)
	// })

	//route for getting all users in the database
	router.get('/', async (req,res,next) => {
		try {
			const userDocs = await Users.get();

			const users = [];

			//only return the username and database id for each user
			userDocs.docs.forEach((doc) => {
				const user = doc.data();
				users.push({id: doc.id, username: user.username})
			})

			res.json({
				status: 200,
				message: "Successfully got users.",
				users: users
			})
		}
		catch (err) {
			next(err)
		}
	})

	//route for getting a single user's information
	router.get('/:id', async (req,res,next) => {
		try {

			const user = await Users.doc(req.params.id).get();

			if (user && (req.session.admin || user.id === req.session.userId)) {
				res.json({
					status: 200,
					message: "Successfully found user.",
					user: user.data()
				})
			}
			else if (!user) {
				res.json({
					status: 200,
					message: "Could not find specified user."
				})
			}
			else {
				res.json({
					status: 403,
					message: "You are not authorized to access this user's data."
				})
			}
			
		}
		catch (err) {
			next(err);
		}
	})

	//route for updating a user's emotion
	router.patch('/emotion/:id', async (req,res,next) => {
		try {

			//get the user from the database
			const userDoc = await Users.doc(req.params.id)
			const user = userDoc.get();

			//make sure that the logged in user is changing their own emotion
			if (!req.session.admin && userDoc.id !== req.session.userId) {
				res.json({
					status: 403,
					message: "You are not authorized to change this user's emotion."
				})
			}
			else {
				//update the emotion on the database
				await userDoc.update({emotion: req.body.emotion})
				
				//send a success message to the front end
				res.json({
					status: 200,
					message: "Successfully updated your emotion."
				})

				//create a batch to update all of the user's friendships
				const batch = db.batch();

				//get the user's friendships
				const friends = await Friendships.where(req.params.id,">"," ").get();

				//format the data to be added
				const emotionData = {}
				emotionData[req.params.id] = req.body.emotion;

				//update all accepted friendships
				friends.docs.forEach((doc) => {
					const friendReq = doc.data();
					if (friendReq.accepted) {
						batch.update(doc.ref, emotionData);
					}	
				})

				//run the update batch
				batch.commit()
			}

		}
		catch (err) {
			next(err);
		}
	})

	//route for logging a user in
	router.post('/login', async (req,res,next) => {
		try {

			//find the user with the specified username on the database
			const userQuery = await Users.where('username', '==', req.body.username).get();
			const userDoc = userQuery.docs[0]
			if (userDoc) {
				const user = userDoc.data();
				const id = userDoc.id;

				//check the user's password
				if (user && bcrypt.compareSync(req.body.password,user.password)) {
					
					//set up the user's session and send a success to the front end
					req.session.loggedIn = true;
					req.session.userId = userDoc.id;
					if (user.admin) req.session.admin = true;

					res.json({
						status: 200,
						message: "Successfully logged in.",
						user: { username: user.username, id: id }
					})
				}
				//send back an error message if the username and password weren't valid
				else {
					res.json({
						status: 200,
						message: "Invalid username and password."
					})
				}
			}
			else {
				res.json({
					status: 200,
					message: "Invalid username and password."
				})
			}
		}
		catch (err) {
			next(err);
		}
	})

	//route for registering a user
	router.post('/register', async (req,res,next) => {
		try {

			//make sure that there isn't already a user on the database with the chosen username
			const existingUser = await Users.where('username', '==', req.body.username).get()
			if (!existingUser.docs.length) {

				//hash the chosen password
				let { password } = req.body;
				password = bcrypt.hashSync(password,bcrypt.genSaltSync(10));
				req.body.password = password;

				//create the user on the database
				const createdUser = await Users.add(req.body);

				//create the user's session
				req.session.loggedIn = true;
				req.session.userId = createdUser.id;

				//send a success message to the front end
				res.json({
					status: 200,
					message: "Successfully registered.",
					user: { id: createdUser.id, username: req.body.username }
				})
			}
			else {
				//send a failure message to the front end
				res.json({
					status: 200,
					message: "Username already taken. Try again."
				})
			}
		}
		catch (err) {
			next(err);
		}
	})

	return router;
}