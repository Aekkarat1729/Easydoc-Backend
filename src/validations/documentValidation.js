// validations/documentValidation.js
const { z } = require('zod');

// สร้าง schema สำหรับการอัปโหลดเอกสาร
const documentSchema = z.object({
  filePath: z.string().min(1, "File path is required"),  // ไฟล์ต้องมีข้อมูล
});

const idParamSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

module.exports = { documentSchema, idParamSchema };
