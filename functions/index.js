const functions = require('firebase-functions');
const admin = require('firebase-admin');
var serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://joinbuddy-2cd16.firebaseio.com',
});
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
const app = require('express')();
const db = admin.firestore();
const config = {
  apiKey: 'AIzaSyBhId0MBL7A1SNeuRHDu_5qpfXyL57WEE0',
  authDomain: 'joinbuddy-2cd16.firebaseapp.com',
  databaseURL: 'https://joinbuddy-2cd16.firebaseio.com',
  projectId: 'joinbuddy-2cd16',
  storageBucket: 'joinbuddy-2cd16.appspot.com',
  messagingSenderId: '300615999250',
  appId: '1:300615999250:web:66de3c5630d9a9ea575dcb',
  measurementId: 'G-NEEJHEND3F',
};
const firebase = require('firebase');
firebase.initializeApp(config);

app.get('/screams', (req, res) => {
  db.collection('screams')
    .orderBy('createdAT', 'desc')
    .get()
    .then((snapshot) => {
      let screams = [];
      snapshot.forEach((doc) =>
        screams.push({
          screemId: doc.id,
          body: doc.data().body,
          userHandled: doc.data().userHandled,
          createdAT: doc.data().createdAT,
        })
      );
      return res.json(screams);
    })
    .catch((err) => console.error(err));
});

app.post('/screams', (req, res) => {
  const newScream = {
    body: req.body.body,
    userHandled: req.body.userHandled,
    createdAT: new Date().toISOString(), //admin.firestore.Timestamp.fromDate(new Date()),
  };
  db.collection('screams')
    .add(newScream)
    .then((ref) =>
      res.json({ message: `record ${ref.id} created successfully` })
    )
    .catch((err) => {
      res.status(500).json({ error: 'something went wrong' });
      console.error(err);
    });
});
const isEmpty = (string) => string.trim() === '';
const isEmail = (email) => {
  const regx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return email.match(regx);
};
const validateSignupData = (userData) => {
  let errors = {};
  const keys = ['email', 'password', 'confirmPassword', 'handle'];
  for (i = 0; i < keys.length; i++) {
    if (userData.hasOwnProperty(keys[i]) && isEmpty(userData[keys[i]]))
      errors[keys[i]] = 'must not be empty';
  }
  if (!isEmpty(userData.email) && !isEmail(userData.email)) {
    errors.email = 'must be valid email address';
  }

  if (
    !isEmpty(userData.confirmPassword) &&
    userData.password !== userData.confirmPassword
  ) {
    errors.confirmPassword = 'passwords must match';
  }
  return errors;
};
app.post('/signup', (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };
  //Validate Data
  let errors = validateSignupData(newUser);
  if (Object.keys(errors).length > 0) return res.status(400).json({ errors });
  let userId, token;

  db.collection('users')
    .doc(`${newUser.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res.status(400).json({ handle: 'this handle is already taken' });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then((data) => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((idToken) => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId: userId,
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => res.status(201).json({ token }))
    .catch((err) => {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        res.status(400).json({ email: 'Email is already in use' });
      }
      return res
        .status(500)
        .json({ error: 'something went wrong please try again later' });
    });
});
const validationLogin = (userData, keys = []) => {
  let errors = {};
  for (i = 0; i < keys.length; i++) {
    if (userData.hasOwnProperty(keys[i]) && isEmpty(userData[keys[i]]))
      errors[keys[i]] = 'must not be empty';
  }
  return errors;
};
app.post('/login', (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };
  const errors = validationLogin(user, ['email', 'password']);
  if (Object.keys(errors).length > 0) return res.status(400).json(errors);
  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => data.user.getIdToken())
    .then((token) => res.json({ token }))
    .catch((err) => {
      if (
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      )
        return res
          .status(403)
          .json({ general: 'wrong credentials please try again later' });
      res.status(500).json({ error: err.code });
    });
});
//https://baseurls.com/api/screams
exports.api = functions.region('europe-west3').https.onRequest(app);
