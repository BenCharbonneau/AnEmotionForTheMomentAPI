module.exports = function(io,db) {

	//set up express router
	const express = require('express');
	const router = express.Router();

	//set up database collection variables
	const Users = db.collection("users");
	const Friendships = db.collection("friendships");

	//router to get all friend requests that were sent to a user
	router.get('/requests/:id', async (req,res,next) => {
		try {
			//get all of the user's friendships
			const friendReqQuery = Friendships.where(req.params.id,">"," ")
			let friendReqs;

			//set up a realtime snapshot of the search
			const friendReqObserver = friendReqQuery.onSnapshot((snapshot) => {
				
				friendReqs = [];

				//everytime a new snapshot is created, get the data and filter it down to 
				//just the friendships where the user is not the requestor and hasn't accepted the friend request yet
				snapshot.docs.forEach((doc) => {
					const friendReq = doc.data();
					if (!friendReq.accepted && friendReq.requestor.id !== req.params.id) {
						friendReqs.push({ ...friendReq, id: doc.id });
					}	
				})

				//use socket.io to send the friend requests to the front end on the user's channel
				io.emit(req.params.id.toString() + "_reqs",friendReqs)
			})

			//let the front end know that it has a realtime connection that will grab unaccepted friend requests
			res.json({
				status: 200,
				message: "Successfully set up friend request listener."
			})
			
		}
		catch (err) {
			next(err);
		}
	})

	//router to get all of a user's friends
	router.get('/:id', async (req,res,next) => {
		try {
			//get all of the user's friendships
			const friendQuery = Friendships.where(req.params.id,">"," ")
			let friends;

			//set up a realtime snapshot of the search
			const friendObserver = friendQuery.onSnapshot((snapshot) => {
				
				friends = [];

				//everytime a new snapshot is created, get the data and filter it down to 
				//just the friendships where the friendship is accepted
				snapshot.docs.forEach((doc) => {
					const friendship = doc.data();
					if (friendship.accepted) {
						const friend = Object.entries(friendship).filter((friend) => {
							const key = friend[0];
							const value = friend[1];
							return (key !== req.params.id && typeof value === "string")
						})
						friends.push({ id: friend[0][0], emotion: friend[0][1] });
					}
					
				})

				//use socket.io to send the friendship data to the front end on the user's channel
				io.emit(req.params.id.toString(),{
					status: 200,
					message: "Successfully got friends.",
					friends: friends
				})
			})

			//let the front end know that the listener for the user's friendships is set up
			res.json({
				status: 200,
				message: "Successfully set up friend listener."
			})
			
		}
		catch (err) {
			next(err);
		}
	})

	//router to search for users that a friend request can be sent to
	router.get('/requestsearch/:id/:search', async (req,res,next) => {
		try {
			const search = req.params.search.toLowerCase();

			//get the list of user's with names or usernames that match the search and the user's current friends and friend requests
			const usernameProm = Users.where("username", ">=", search).limit(10).get();
			const nameProm = Users.where("name", ">=", search).limit(10).get();
			const friendshipProm = Friendships.where(req.params.id,">"," ").get();

			const [usernameDocs, nameDocs, friendshipDocs] = await Promise.all([usernameProm,nameProm,friendshipProm]);
			const users = [];

			//check to make sure that all of the username results match the search
			usernameDocs.docs.forEach((doc) => {
				const user = doc.data();
				if (startsWith(user.username,search)) {
					users.push({ ...user, id: doc.id })
				}
			})

			//check to make sure that all of the name results match the search
			nameDocs.docs.forEach((doc) => {
				let add = true;
				
				//make sure that the user isn't already in the list from the username search
				for (let user of users) {
					if (doc.id === user.id) {
						add = false;
					}
				}

				//make sure the user's name starts with the search term
				const user = doc.data();

				if (add && startWith(user.name,search)) {
					users.push({ ...user, id: doc.id });
				}
			})

			//add a message if the users in the list already have an active friend request and remove users that are already a friend
			friendshipDocs.docs.forEach((doc) => {
				const friendship = doc.data();

				for (let i in users) {
					const user = users[i];
					if (friendship[user.id] !== undefined) {
						if (friendship.accepted) {
							users.splice(i,1);
						}
						else if (friendship.requestor.id === req.params.id) {
							user.message = "You already sent them a friend request.";
						}
						else {
							user.message = "They already sent you a friend request. Check your friend requests to accept it.";
						}
					}
				}
			})

			//respond to the front end with the list of users
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

	//router to accept a friend request
	router.post('/request/accept/:id', async (req,res,next) => {
		try {

			//get the request from the database
			const requestDocRef = await Friendships.doc(req.params.id)
			const requestDoc = await requestDocRef.get();
			const request = requestDoc.data();

			//send an error message to the front end if the request isn't on the database
			if (!request.requestor) {
				res.json({
					status: 200,
					message: "Could not find friend request on the database."
				})
			}
			else {

				//get the requestor's record from the database
				const requestorDoc = await Users.doc(request.requestor.id).get();
				const requestor = requestorDoc.data();

				//get the friend's id from the friendship record
				const requestKeys = Object.keys(request);
				const friendId = requestKeys.filter((key) => {
					return (key !== request.requestor.id && key !== "requestor" && key !== "accepted")
				})[0];

				//get the friend's record from the database
				const requesteeDoc = await Users.doc(friendId).get();
				const requestee = requesteeDoc.data();
			
				//send an error message if we couldn't get the requestor or requestee from the database
				if (!requestor.username) {
					res.json({
						status:200,
						message: "Could not find original requesting user in the database."
					})
				}
				else if (!requestee.username) {
					res.json({
						status:200,
						message: "Could not find the user currently accepting the request in the database."
					})
				}
				else {
					//update the friendship record to a status of accepted and update the users' stored emotions
					updatedReq = { accepted: true }
					updatedReq[friendId] = requestee.emotion || '😀';
					updatedReq[request.requestor.id] = requestor.emotion || '😀';
					await requestDocRef.update(updatedReq);

					//send a success message to the front end
					res.json({
						status: 200,
						message: "Friend request accepted."
					})
				}
			}
		}
		catch (err) {
			next(err);
		}
	})

	//router to send a friend request
	router.post('/request/:id', async (req,res,next) => {
		try {

			//get the requestor and requestee user records from the database
			const requestorPromise = Users.doc(req.params.id).get();
			const requesteePromise = Users.doc(req.body.friendId).get();
			const [requestorDoc,requesteeDoc] = await Promise.all([requestorPromise,requesteePromise])
			
			const requestor = requestorDoc.data();
			const requestee = requesteeDoc.data();

			//send an error message if one of the users can't be found
			if (!requestor.username) {
				res.json({
					status:200,
					message: "Could not find requesting user in the database."
				})
			}
			else if (!requestee.username) {
				res.json({
					status:200,
					message: "Could not find friend in the database."
				})
			}
			else {
				//create the friend request on the database
				const friendship = { accepted: false, requestor: { id: req.params.id, username: requestor.username } }
				friendship[req.body.friendId] = requestee.emotion || '😀'
				friendship[req.params.id] = requestor.emotion || '😀'
				await Friendships.add(friendship);

				//send a success message to the front end
				res.json({
					status: 200,
					message: "Friend request sent."
				})
			}
		}
		catch (err) {
			next(err);
		}
	})

	//delete a friendship
	router.delete('/:id', async (req,res,next) => {
			await Friendships.doc(req.params.id).delete();
			res.json({
				status: 200,
				message: "This friendship is over."
			})
	})

	//determine if str1 starts with str2 (not case sensitive)
	function startsWith(str1,str2) {
		if (str1.slice(0,str2.length).toLowerCase() === str2.toLowerCase()) {
			return true;
		}
		return false;
	}

	return router;
}