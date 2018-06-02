module.exports = function(io,db) {

	const express = require('express');
	const router = express.Router();
	const bcrypt = require('bcrypt');

	const Users = db.collection("users");
	const Friendships = db.collection("friendships");

	// Users.onSnapshot((usersSnap) => {
	// 	const users = [];

	// 	usersSnap.docs.forEach((doc) => {
	// 		const user = doc.data();
	// 		users.push({username: user.username, id: doc.id})
	// 	})

	// 	io.emit('userlist',users)
	// })

	router.get('/', async (req,res,next) => {
		try {
			const userDocs = await Users.get();

			const users = [];

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

	router.patch('/emotion/:id', async (req,res,next) => {
		try {

			const userDoc = await Users.doc(req.params.id)
			const user = userDoc.get();

			if (!req.session.admin && userDoc.id !== req.session.userId) {
				res.json({
					status: 403,
					message: "You are not authorized to change this user's emotion."
				})
			}
			else {
				await userDoc.update({emotion: req.body.emotion})
				
				res.json({
					status: 200,
					message: "Successfully updated your emotion."
				})

				const batch = db.batch();

				const friends = await Friendships.where(req.params.id,">"," ").get();

				const emotionData = {}
				emotionData[req.params.id] = req.body.emotion;

				friends.docs.forEach((doc) => {
					const friendReq = doc.data();
					if (friendReq.accepted) {
						batch.update(doc.ref, emotionData);
					}	
				})

				batch.commit()
			}

		}
		catch (err) {
			next(err);
		}
	})

	router.post('/login', async (req,res,next) => {
		try {

			const userQuery = await Users.where('username', '==', req.body.username).get();
			const userDoc = userQuery.docs[0]
			if (userDoc) {
				const user = userDoc.data();
				const id = userDoc.id;

				if (user && bcrypt.compareSync(req.body.password,user.password)) {
					
					req.session.loggedIn = true;
					req.session.userId = userDoc.id;
					if (user.admin) req.session.admin = true;

					res.json({
						status: 200,
						message: "Successfully logged in.",
						user: { username: user.username, id: id }
					})
				}
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

	router.post('/register', async (req,res,next) => {
		try {
			const existingUser = await Users.where('username', '==', req.body.username).get()
			if (!existingUser.docs.length) {
				let { password } = req.body;
				password = bcrypt.hashSync(password,bcrypt.genSaltSync(10));
				req.body.password = password;

				const createdUser = await Users.add(req.body);

				req.session.loggedIn = true;
				req.session.userId = createdUser.id;

				res.json({
					status: 200,
					message: "Successfully registered.",
					user: { id: createdUser.id, username: req.body.username }
				})
			}
			else {
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