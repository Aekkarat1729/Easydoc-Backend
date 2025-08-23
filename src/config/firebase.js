const admin = require("firebase-admin");
const path = require("path");

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, "easydocv1-firebase-adminsdk-r4zkx-e42d3aabbc.json");
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "easydocv1.appspot.com",
  });
}

const bucket = admin.storage().bucket();
module.exports = admin;
