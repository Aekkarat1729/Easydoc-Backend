const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "../serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "easydocv1.appspot.com", // เปลี่ยนเป็น bucket ของคุณ
});

const bucket = admin.storage().bucket();
module.exports = bucket;
