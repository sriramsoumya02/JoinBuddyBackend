const { admin, db } = require('../util/admin');

const config = require('../util/config');
const firebase = require('firebase');
firebase.initializeApp(config);
const { validateSignupData, validationLogin } = require('../util/validators');

exports.signUp = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };
  //Validate Data
  const { errors, valid } = validateSignupData(newUser);
  if (!valid) return res.status(400).json({ errors });
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
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/noimg.png?alt=media`;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId: userId,
        imageUrl,
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
};

exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };
  const { errors, valid } = validationLogin(user, ['email', 'password']);
  if (!valid) return res.status(400).json(errors);
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
};

exports.uploadImage = (req, res) => {
  const Busboy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');
  var busboy = new Busboy({ headers: req.headers });
  let imageFileName;
  let imageTobeUploaded = {};
  const { v4: uuidv4 } = require('uuid');
  let generatedToken = uuidv4();
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    console.log(
      'fieldname, file, filename, encoding, mimetype' +
        ',' +
        fieldname +
        ',' +
        file +
        ',' +
        filename +
        ',' +
        encoding +
        ',' +
        mimetype
    );
    if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
      return res.status(400).json({ error: 'Wrong file type submitted' });
    }
    //my.name.png
    const imageFileExtension = filename.split('.')[
      filename.split('.').length - 1
    ];
    console.log('soumya testing api----------------', imageFileExtension);
    imageFileName = `${Math.round(
      Math.random() * 100000000000
    ).toString()}.${imageFileExtension}`;
    imageFilePath = path.join(os.tmpdir(), imageFileName);
    imageTobeUploaded = { filepath: imageFilePath, mimetype };
    console.log('imageTobeUploaded', imageTobeUploaded);
    file.pipe(fs.createWriteStream(imageTobeUploaded.filepath));
  });
  busboy.on('finish', () => {
    const options = {
      resumable: false,
      metadata: {
        metadata: {
          contentType: imageTobeUploaded.mimetype,
          //Generate token to be appended to imageUrl
          firebaseStorageDownloadTokens: generatedToken,
        },
      },
    };
    //https://googleapis.dev/nodejs/storage/latest/Bucket.html#upload
    admin
      .storage()
      .bucket(config.storageBucket)
      .upload(imageTobeUploaded.filepath, options)
      .then(() => {
        imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media&token=${generatedToken}`;
        return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
      })
      .then(() => {
        return res.json({ messag: 'image Uploaded sucessfully' });
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json({ error: err.code });
      });
  });
  //https://stackoverflow.com/questions/56091250/firebase-and-busboy-do-i-get-the-whole-file-in-memory-or
  busboy.end(req.rawBody);
};

exports.addUserDetails = (req, res) => {
  let userDetails = reducedToObject(req.body);
  if (userDetails.website && !userDetails.website.startsWith('http'))
    userDetails.website = `http://${userDetails.website}`;
  db.doc(`/users/${req.user.handle}`)
    .update({ userDetails })
    .then(() => res.json({ message: 'user details added successfully' }))
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
