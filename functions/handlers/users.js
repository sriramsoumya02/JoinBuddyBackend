const { admin, db } = require('../util/admin');

const config = require('../util/config');
const firebase = require('firebase');
firebase.initializeApp(config);
const {
  validateSignupData,
  validationLogin,
  reducedToObject,
} = require('../util/validators');

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
          .json({ general: 'invalid credentials.wrong userid/ password' });
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
        let oldImageurl = req.user.imageUrl;
        let semiUrl = oldImageurl.split('/')[oldImageurl.split('/').length - 1];
        let filename = semiUrl.substring(0, semiUrl.indexOf('?'));
        if (filename !== 'noimg.png') {
          admin
            .storage()
            .bucket(config.storageBucket)
            .file(filename)
            .delete()
            .then(() => {
              console.log('old image deleted sucessfully');
            })
            .catch((err) => console.error(err));
        }
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
    .update(userDetails)
    .then(() => res.json({ message: 'user details added successfully' }))
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
// Get own user details
exports.getAuthenticatedUser = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.user.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
      }
      return db
        .collection('likes')
        .where('handle', '==', req.user.handle)
        .get();
    })
    .then((snapshot) => {
      userData.likes = [];
      snapshot.forEach((doc) => userData.likes.push(doc.data()));
      return db
        .collection('notifications')
        .where('recipient', '==', req.user.handle)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
    })
    .then((snapshot) => {
      userData.notifications = [];
      snapshot.forEach((doc) => {
        let notificationData = doc.data();
        notificationData.notificationId = doc.id;
        userData.likes.push(notificationData);
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};
// Get any user's details
exports.getUserDetails = (req, res) => {
  let userData = {};
  db.collection('users')
    .doc(req.params.handle)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'user Not Found' });
      }
      userData.user = doc.data();
      return db
        .collection('screams')
        .where('userHandled', '==', doc.data().handle)
        .orderBy('createdAt', 'desc')
        .get();
    })
    .then((snapshot) => {
      userData.screams = [];
      snapshot.forEach((doc) => {
        let screamDoc = doc.data();
        screamDoc.screamId = doc.id;
        userData.screams.push(screamDoc);
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.markNotificationsRead = (req, res) => {
  const batch = db.batch();
  req.body.forEach((notificationId) => {
    batch.update(db.collection('notifications').doc(notificationId), {
      read: true,
    });
  });
  batch
    .commit()
    .then(() => {
      return res.json({ message: 'Notifications marked read' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
