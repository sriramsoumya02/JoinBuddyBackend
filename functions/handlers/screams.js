const { db } = require('../util/admin');
exports.getAllScreams = (req, res) => {
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
};

exports.postOneScream = (req, res) => {
  const newScream = {
    body: req.body.body,
    userHandled: req.user.handle,
    createdAt: new Date().toISOString(), //admin.firestore.Timestamp.fromDate(new Date()),
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
};
