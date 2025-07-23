const cloudinary = require('cloudinary').v2;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ตั้งค่าการเชื่อมต่อกับ Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadDocument = async ({ name, fileType, file }) => {
  // ตรวจสอบประเภทของไฟล์ที่อนุญาต
  const allowedTypes = ['pdf', 'docx', 'jpeg', 'jpg'];
  
  if (!fileType || !allowedTypes.includes(fileType)) {
    throw new Error('Unsupported file type. Please upload a pdf, docx, jpeg, or jpg file.');
  }

  try {
    // ตรวจสอบว่าไฟล์ได้ถูกส่งมาไหม
    if (!file || !file.buffer) {
      throw new Error('No file uploaded or invalid file format.');
    }

    // อัปโหลดไฟล์ไปยัง Cloudinary โดยใช้ buffer ของไฟล์
    const result = await cloudinary.uploader.upload(file.buffer, {
      resource_type: 'auto',  // ใช้ auto เพื่อให้ Cloudinary ตรวจจับประเภทไฟล์อัตโนมัติ
      public_id: `documents/${name}_${Date.now()}`,  // ตั้งค่า public_id เพื่อระบุชื่อไฟล์ใน Cloudinary
    });

    // บันทึกข้อมูลเอกสารลงในฐานข้อมูล
    const document = await prisma.document.create({
      data: {
        name,
        fileType,
        fileUrl: result.secure_url,  // URL ที่ได้จาก Cloudinary
        uploadedAt: new Date(),
        userId: 1,  // ใส่ userId ที่เหมาะสม
      },
    });

    return document;
  } catch (err) {
    throw new Error('Failed to upload document: ' + err.message);
  }
};

module.exports = { uploadDocument };
