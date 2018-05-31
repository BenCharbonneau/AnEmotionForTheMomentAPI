module.exports = function(io,db) {

	const express = require('express');
	const router = express.Router();

	const Users = db.collection("users");
	const Friendships = db.collection("friendships");

	router.get('/requests/:id', async (req,res,next) => {
		try {
			const friendReqQuery = Friendships.where(req.params.id,">"," ")
			let friendReqs;

			const friendReqObserver = friendReqQuery.onSnapshot((snapshot) => {
				
				friendReqs = [];

				snapshot.docs.forEach((doc) => {
					const friendReq = doc.data();
					if (!friendReq.accepted && friendReq.requestor.id !== req.params.id) {
						friendReqs.push({ ...friendReq, id: doc.id });
					}	
				})

				io.emit(req.params.id.toString() + "_reqs",friendReqs)
			})

			res.json({
				status: 200,
				message: "Successfully set up friend request listener."
			})
			
		}
		catch (err) {
			next(err);
		}
	})

	router.get('/:id', async (req,res,next) => {
		try {
			const friendQuery = Friendships.where(req.params.id,">"," ")
			let friends;

			const friendObserver = friendQuery.onSnapshot((snapshot) => {
				
				friends = [];

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

				// res.json({
				// 	status: 200,
				// 	message: "Successfully set up friend listener.",
				// 	friends: friends
				// })
				//io.emit("message","Hi")

				io.emit(req.params.id.toString(),{
					status: 200,
					message: "Successfully got friends.",
					friends: friends
				})
			})

			res.json({
				status: 200,
				message: "Successfully set up friend listener."
			})
			
		}
		catch (err) {
			next(err);
		}
	})

	router.get('/requestsearch/:id/:search', async (req,res,next) => {
		try {
			const usernameProm = Users.where("username", ">=", req.params.search).limit(10).get();
			const nameProm = Users.where("name", ">=", req.params.search).limit(10).get();
			const friendshipProm = Friendships.where(req.params.id,">"," ").get();

			const [usernameDocs, nameDocs, friendshipDocs] = await Promise.all([usernameProm,nameProm,friendshipProm]);
			const users = [];

			usernameDocs.docs.forEach((doc) => {
				const user = doc.data();
				if (startsWith(user.username,req.params.search)) {
					users.push({ ...user, id: doc.id })
				}
			})

			nameDocs.docs.forEach((doc) => {
				let add = true;
				const user = doc.data();

				for (let user of users) {
					if (doc.id === user.id) {
						add = false;
					}
				}

				if (add && startWith(user.name,req.params.search)) {
					users.push({ ...user, id: doc.id });
				}
			})

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

	router.post('/request/accept/:id', async (req,res,next) => {
		try {

			const requestDocRef = await Friendships.doc(req.params.id)
			const requestDoc = await requestDocRef.get();
			const request = requestDoc.data();

			if (!request.requestor) {
				res.json({
					status: 200,
					message: "Could not find friend request on the database."
				})
			}
			else {

				const requestorDoc = await Users.doc(request.requestor.id).get();
				const requestor = requestorDoc.data();

				const requestKeys = Object.keys(request);
				const friendId = requestKeys.filter((key) => {
					return (key !== request.requestor.id && key !== "requestor" && key !== "accepted")
				})[0];

				const requesteeDoc = await Users.doc(friendId).get();
				const requestee = requesteeDoc.data();
			
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
					updatedReq = { accepted: true }
					updatedReq[friendId] = requestee.emotion || '😀';
					updatedReq[request.requestor.id] = requestor.emotion || '😀';
					await requestDocRef.update(updatedReq);
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

	router.post('/request/:id', async (req,res,next) => {
		try {

			const requestorPromise = Users.doc(req.params.id).get();
			const requesteePromise = Users.doc(req.body.friendId).get();
			const [requestorDoc,requesteeDoc] = await Promise.all([requestorPromise,requesteePromise])
			
			const requestor = requestorDoc.data();
			const requestee = requesteeDoc.data();

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
				const friendship = { accepted: false, requestor: { id: req.params.id, username: requestor.username } }
				friendship[req.body.friendId] = requestee.emotion || '😀'
				friendship[req.params.id] = requestor.emotion || '😀'
				await Friendships.add(friendship);
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

	router.delete('/:id', async (req,res,next) => {
			await Friendships.doc(req.params.id).delete();
			res.json({
				status: 200,
				message: "This friendship is over."
			})
	})

	function startsWith(str1,str2) {
		if (str1.slice(0,str2.length) === str2) {
			return true;
		}
		return false;
	}

	return router;
}