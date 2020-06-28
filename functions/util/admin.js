const admin = require('firebase-admin');
var serviceAccount = require('./../serviceAccountKey.json');
const config = require('./config');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://joinbuddy-2cd16.firebaseio.com',
  storageBucket: config.storageBucket,
});
const db = admin.firestore();

module.exports = { admin, db };
