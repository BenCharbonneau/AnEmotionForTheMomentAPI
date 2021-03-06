//connect to firebase
const admin = require("firebase-admin");

const serviceAccount = require("../databaseKey");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

module.exports = db;