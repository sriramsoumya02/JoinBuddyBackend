const { db } = require('../util/admin');
exports.getAllScreams = (req, res) => {
  db.collection('screams')
    .orderBy('createdAt', 'desc')
    .get()
    .then((snapshot) => {
      let screams = [];
      snapshot.forEach((doc) => {
        let resultScreams = doc.data();
        resultScreams.screamId = doc.id;
        screams.push(resultScreams);
      });
      return res.json(screams);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.postOneScream = (req, res) => {
  const newScream = {
    body: req.body.body,
    userHandled: req.user.handle,
    createdAt: new Date().toISOString(), //admin.firestore.Timestamp.fromDate(new Date()),
    likeCount: 0,
    commentCount: 0,
    userImage: req.user.imageUrl,
  };

  db.collection('screams')
    .add(newScream)
    .then((ref) => {
      let result = newScream;
      result.screamId = ref.id;
      return res.json(result);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: 'something went wrong' });
    });
};
//comment on scream eg:8zxn26KBn7Qnl4nAmk3R
exports.commentOnScream = (req, res) => {
  if (req.body.body.trim() === '')
    res.status(400).json({ comment: 'Must Not be Empty' });
  const scream = db.doc(`/screams/${req.params.screamId}`);
  const newComment = {
    body: req.body.body,
    screamId: req.params.screamId,
    createdAt: new Date().toISOString(),
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
  };
  scream
    .get()
    .then((doc) => {
      if (!doc.exists)
        return res.status(404).json({ error: 'Scream not Found' });
      return scream.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => db.collection('comments').add(newComment))
    .then(() => res.json(newComment))
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: 'something went wrong' });
    });
};
// Fetch one scream
exports.getScream = (req, res) => {
  let scream = {};
  db.doc(`/screams/${req.params.screamId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) res.status(404).json({ error: 'Scream not Found' });
      scream = doc.data();
      scream.screamId = doc.id;
      return db
        .collection('comments')
        .orderBy('createdAt', 'desc')
        .where('screamId', '==', req.params.screamId)
        .get();
    })
    .then((data) => {
      scream.comments = [];
      data.forEach((doc) => scream.comments.push(doc.data()));
      return res.json(scream);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
exports.likeScream = (req, res) => {
  const likeScream = db
    .collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('screamId', '==', req.params.screamId)
    .limit(1);
  const scream = db.doc(`/screams/${req.params.screamId}`);
  let screamVal;
  scream
    .get()
    .then((doc) => {
      if (!doc.exists)
        return res.status(404).json({ error: 'Scream not found' });
      screamVal = doc.data();
      screamVal.screamId = doc.id;
      screamVal.likeCount = doc.data().likeCount + 1;
      return likeScream.get();
    })
    .then((doc) => {
      if (!doc.empty)
        return res.status(400).json({ message: 'scream already liked' });
      return db.collection('likes').add({
        userHandle: req.user.handle,
        screamId: req.params.screamId,
      });
    })
    .then(() => scream.update({ likeCount: screamVal.likeCount }))
    .then(() => res.json(screamVal))
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.unlikeScream = (req, res) => {
  const likeScream = db
    .collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('screamId', '==', req.params.screamId)
    .limit(1);
  const scream = db.doc(`/screams/${req.params.screamId}`);
  let screamVal;
  scream
    .get()
    .then((doc) => {
      if (!doc.exists)
        return res.status(404).json({ error: 'Scream not found' });
      screamVal = doc.data();
      screamVal.screamId = doc.id;
      screamVal.likeCount = doc.data().likeCount - 1;
      return likeScream.get();
    })
    .then((doc) => {
      if (doc.empty)
        return res.status(400).json({ message: 'scream already unliked' });
      return db.doc(`/likes/${doc.docs[0].id}`).delete();
    })
    .then(() => scream.update({ likeCount: screamVal.likeCount }))
    .then(() => res.json(screamVal))
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
exports.deleteScream = (req, res) => {
  db.doc(`/screams/${req.params.screamId}`)
    .get()
    .then((doc) => {
      if (!doc.exists)
        return res.status(404).json({ error: 'Scream not found' });
      else if (req.user.handle !== doc.data().userHandled)
        return res.status(403).json({ error: 'Unauthorized' });
      return db.doc(`/screams/${req.params.screamId}`).delete();
    })
    .then(() => res.json({ message: 'Scream deleted successfully' }))
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
