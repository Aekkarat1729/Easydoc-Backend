
const admin = require("firebase-admin");
const path = require("path");

let serviceAccount;
if (process.env.FIREBASE_SA_BASE64) {
  // ใช้ BASE64 หากตั้งไว้ใน .env
  serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SA_BASE64, 'base64').toString('utf8')
  );
} else {
  // ใช้ไฟล์ service account ปกติ
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, "easydocv1-firebase-adminsdk-r4zkx-e42d3aabbc.json");
  serviceAccount = require(serviceAccountPath);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "easydocv1.appspot.com",
  });
}

const bucket = admin.storage().bucket();
module.exports = admin;
