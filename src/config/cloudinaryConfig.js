const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,   // ใส่ Cloud Name ที่ได้จาก Cloudinary
  api_key: process.env.CLOUDINARY_API_KEY,         // ใส่ API Key
  api_secret: process.env.CLOUDINARY_API_SECRET,    // ใส่ API Secret
  max_file_size: 10485760 // 10MB
});

module.exports = cloudinary;
