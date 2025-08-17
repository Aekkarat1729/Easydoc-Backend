// documentValidation.js
const { z } = require('zod');

const documentSchema = z.object({
  file: z.object({
    path: z.string().optional(),     // Hapi จะให้ path เมื่อ output: 'file'
    filename: z.string().min(1, "Filename is required"),
    bytes: z.number().optional(),
    headers: z.object({}).optional()
  }).refine(file => file.filename, { message: "File is required" })
});

const idParamSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

module.exports = { documentSchema, idParamSchema };
