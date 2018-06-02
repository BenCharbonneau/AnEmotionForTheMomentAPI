# An Emotion for the Moment API

This API exposes the server endpoints for accessing the "An Emotion for the Moment" database. They can be used to allow users to connect and share thier emotions with each other. 

## Endpoints

All enpoints start with https://an-emotion-for-the-moment-api.herokuapp.com/.

### Authentication
**POST /users/register** - Register a new user and create their account on the database. Accepts a username and password, both are required.

Example success response: 
{
	status: 200,
	message: "Successfully registered.",
	user: { id: 1, username: "testuser" }
}
You will also receive a cookie with your user's session that can be used for authentication in subsequent API calls.

Example failure response:
{
	status: 200,
	message: "Username already taken. Try again."
}

**POST /users/login** - Login an existing user. Accepts a username and password, both are required.


Example success response: 
{
	status: 200,
	message: "Successfully logged in.",
	user: { id: 1, username: "testuser" }
}
You will also receive a cookie with your user's session that can be used for authentication in subsequent API calls.

Example failure response:
{
	status: 200,
	message: "Invalid username and password."
}

### You must be an authenticated user to access the below endpoints

**GET /users** - Get all the users and all of their data from the database.
Example success response: 
{
	status: 200,
	message: "Successfully got users.",
	users: [{
			id: 1,
			username: "testuser1",
			password: 1234,
			emotion: 😀
		},{
			id: 2,
			username: "testuser2",
			password: 1234,
			emotion: 😀
		}]
	}
}

Example failure response:
{
  	status: 403,
  	message: "You must be logged in to do this."
}

**GET /:id** - Get a specific user's data. :id should be replaced with the user's database id.
Example success response: 
{
	status: 200,
	message: "Successfully found user.",
	user: {
		username: "testuser",
		password: 1234,
		emotion: 😀
	}
}

Example failure response:
{
	status: 200,
	message: "Could not find specified user."
}


**PATCH /users/emotion/:id** - Update a specific user's emotion. :id should be replaced with the user's database id.
Example success response: 
{
	status: 200,
	message: "Successfully updated your emotion."
}

Example failure response:
{
	status: 403,
	message: "You are not authorized to access this user's emotion."
}

**GET /friends/requests/:id** - Get all friend requests sent to specific user. :id should be replaced with the user's database id. It will also listen to the database and broadcast any changes to the user's friend requests to :id_reqs using socket.io. Where :id will be replaced with the id that you passed in through :id.
Example success response: 
{
	status: 200,
	message: "Successfully set up friend request listener."
}

The data from the socket will look like this:
[
	{
		accepted: false,
		1: 😀,
		2: 😀,
		requestor: {
			id: 1,
			username: "testuser"
		}
	},
	{
		accepted: false,
		1: 😀,
		3: 😀,
		requestor: {
			id: 1,
			username: "testuser"
		}
	}
]

Example failure response:
{
	status: 403,
	message: "You must be logged in to do this."
}

**GET /friends/:id** - Get a specific user's friends. :id should be replaced with the user's database id. It will also listen to the database and broadcast any changes to the user's friends to :id using socket.io. Where :id will be replaced with the id that you passed in through :id.
Example success response: 
{
	status: 200,
	message: "Successfully set up friend listener."
}

The data from the socket will look like this:
{
	status: 200,
	message: "Successfully got friends.",
	friends: [
		{
			accepted: true,
			1: 😀,
			2: 😀,
			requestor: {
				id: 1,
				username: "testuser"
			}
		},
		{
			accepted: true,
			1: 😀,
			3: 😀,
			requestor: {
				id: 1,
				username: "testuser"
			}
		}
	]
}

Example failure response:
{
	status: 403,
	message: "You must be logged in to do this."
}

**GET /requestsearch/:id/:search** - Search for users that a specific user can send friend requests to. :id should be replaced with the user's database id. :search should be replaced with a search string. The search string will be used to search for users based on username.
Example success response: 
{
	status: 200,
	message: "Successfully got users.",
	users: [
		{
			id: 1,
			username: "testuser1",
			password: 1234,
			emotion: 😀
		},{
			id: 2,
			username: "testuser2",
			password: 1234,
			emotion: 😀
		}
	]
}

Example failure response:
{
	status: 403,
	message: "You must be logged in to do this."
}

**POST /request/accept/:id** - Accept a friend request for a specific user. :id should be replaced with the friend request's database id.
Example success response: 
{
	status: 200,
	message: "Friend request accepted."
}

Example failure response:
{
	status: 200,
	message: "Could not find friend request on the database."
}

**POST /request/:id** - Make a friend request from a specific user to another user. :id should be replaced with the requesting user's database id. The requestee's database id should be passed in the body of the request as friendId.
Example success response: 
{
	status: 200,
	message: "Friend request sent."
}

Example failure response:
{
	status: 200,
	message: "Could not find friend in the database."
}

**DELETE /:id** - Delete a friend request. :id should be the friend request's database id.
Example success response: 
{
	status: 200,
	message: "This friendship is over."
}

Example failure response:
{
	status: 403,
	message: "You must be logged in to do this."
}

##Technologies used

Node.js with Express for the server
Firebase for the database
Socket.io for the realtime communication


