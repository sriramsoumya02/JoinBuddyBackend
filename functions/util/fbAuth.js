const { db, admin } = require('./admin');
module.exports = (req, res, next) => {
  let idtoken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    idtoken = req.headers.authorization.split('Bearer ')[1];
  } else {
    console.error('no Token Found');
    return res.status(403).json({ error: 'UnAuthoraized' });
  }

  admin
    .auth()
    .verifyIdToken(idtoken)
    .then((decodedToken) => {
      console.log('decodedToken :', decodedToken);
      req.user = decodedToken;
      return db
        .collection('users')
        .where('userId', '==', req.user.uid)
        .limit(1)
        .get();
    })
    .then((doc) => {
      req.user.handle = doc.docs[0].data().handle;
      req.user.imageUrl = doc.docs[0].data().imageUrl;
      return next();
    })
    .catch((err) => res.status(403).json({ error: 'unAuthoraized' }));
};
