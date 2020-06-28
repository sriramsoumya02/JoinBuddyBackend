const functions = require('firebase-functions');
const app = require('express')();
const { getAllScreams, postOneScream } = require('./handlers/screams');
const {
  signUp,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
} = require('./handlers/users');
const FBAuth = require('./util/fbAuth');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

//scream Routes
app.get('/screams', getAllScreams);
app.post('/screams', FBAuth, postOneScream);

//user Routes
app.post('/signup', signUp);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
//app.get('/user', FBAuth, getAuthenticatedUser);

//https://baseurls.com/api/screams
exports.api = functions.region('europe-west3').https.onRequest(app);
