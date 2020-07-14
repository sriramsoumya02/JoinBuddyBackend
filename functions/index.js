const functions = require('firebase-functions');
const app = require('express')();
const { db } = require('./util/admin');
const {
  getAllScreams,
  postOneScream,
  commentOnScream,
  getScream,
  likeScream,
  unlikeScream,
  deleteScream,
} = require('./handlers/screams');
const {
  signUp,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead,
} = require('./handlers/users');
const FBAuth = require('./util/fbAuth');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

//scream Routes
app.get('/screams', getAllScreams);
app.post('/screams', FBAuth, postOneScream);
app.get('/screams/:screamId', getScream);
app.post('/screams/:screamId/comment', FBAuth, commentOnScream);
app.post('/screams/:screamId/like', FBAuth, likeScream);
app.post('/screams/:screamId/unlike', FBAuth, unlikeScream);
app.delete('/screams/:screamId', FBAuth, deleteScream);
//user Routes
app.post('/signup', signUp);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/user/:handle', getUserDetails);
//notification - in users file
app.post('/notifications', FBAuth, markNotificationsRead);

//https://baseurls.com/api/screams
exports.api = functions.region('europe-west3').https.onRequest(app);
exports.createNotificationOnLike = functions
  .region('europe-west3')
  .firestore.document('likes/{likeId}')
  .onCreate((snap, context) => {
    console.log('soumya data ---------', snap.data());
    const likesdata = snap.data();
    const newNotification = {
      sender: likesdata.userHandle,
      read: false,
      screamId: likesdata.screamId,
      type: 'like',
      createdAt: new Date().toISOString(),
    };
    console.log(
      'soumya ------ scream id, snap.id',
      likesdata.screamId + ',' + snap.id
    );
    console.log(
      'Screams',
      db.collection('screams').doc(likesdata.screamId).get()
    );
    console.log(
      'notifications',
      db.collection('notifications').doc(snap.id).set({ test: '1' })
    );
    return db
      .collection('screams')
      .doc(likesdata.screamId)
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().userHandled !== likesdata.userHandle) {
          console.log('doc ---------- exists');
          newNotification.recipient = doc.data().userHandled;
          return db.doc(`/notifications/${snap.id}`).set(newNotification);
        }
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });

exports.deleteNotificationOnUnlike = functions
  .region('europe-west3')
  .firestore.document('likes/{id}')
  .onDelete((snap, context) => {
    return db
      .doc(`/notifications/${snap.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
        return;
      });
  });

exports.createNotificationOnComment = functions
  .region('europe-west3')
  .firestore.document('comments/{id}')
  .onCreate((snap, context) => {
    let commentsData = snap.data();
    let newNotification = {
      recipient: '',
      sender: commentsData.userHandle,
      read: false,
      screamId: commentsData.screamId,
      type: 'comment',
      createdAt: new Date().toISOString(),
    };
    return db
      .collection('screams')
      .doc(commentsData.screamId)
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().userHandled !== commentsData.userHandle) {
          newNotification.recipient = doc.data().userHandled;
          return db.doc(`/notifications/${snap.id}`).set(newNotification);
        }
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });

exports.onUserImagechange = functions
  .region('europe-west3')
  .firestore.document('users/{userId}')
  .onUpdate((change, context) => {
    if (change.after.data().imageUrl !== change.before.data().imageUrl) {
      var batch = db.batch();

      return db
        .collection('screams')
        .where('userHandled', '==', change.before.data().handle)
        .get()
        .then((snapshot) => {
          snapshot.forEach((doc) => {
            batch.update(db.collection('screams').doc(doc.id), {
              userImage: change.after.data().imageUrl,
            });
          });
          return batch.commit();
        });
    } else return true;
  });

exports.onScreamDelete = functions
  .region('europe-west3')
  .firestore.document('screams/{screamId}')
  .onDelete((snap, context) => {
    const screamId = context.params.screamId;
    //console.log('screamId -----------', screamId);
    const batch = db.batch();
    return db
      .collection('likes')
      .where('screamId', '==', screamId)
      .get()
      .then((snapshot) => {
        snapshot.forEach((doc) => {
          // console.log(
          //   'soumya --------likes',
          //   db.collection('likes').doc(doc.id)
          // );
          batch.delete(db.collection('likes').doc(doc.id));
        });
        return db
          .collection('comments')
          .where('screamId', '==', screamId)
          .get();
      })
      .then((snapshot) => {
        snapshot.forEach((doc) => {
          // console.log(
          //   'soumya --------comments',
          //   db.collection('comments').doc(doc.id)
          // );
          batch.delete(db.collection('comments').doc(doc.id));
        });
        return db
          .collection('notifications')
          .where('screamId', '==', screamId)
          .get();
      })
      .then((snapshot) => {
        snapshot.forEach((doc) => {
          // console.log(
          //   'soumya --------notofications',
          //   db.collection('notofications').doc(doc.id)
          // );
          batch.delete(db.collection('notofications').doc(doc.id));
        });
        return batch.commit();
      });
  });
