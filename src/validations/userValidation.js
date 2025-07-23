const { z } = require('zod');

const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const createUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phoneNumber: z.string().min(10),
  password: z.string().min(6),
  role: z.enum(['USER', 'ADMIN']).default('USER') // เพิ่ม role ในการสร้างผู้ใช้
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().min(10).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['USER', 'ADMIN']).optional()  // สามารถอัปเดต role ได้
});

module.exports = { idParamSchema, createUserSchema, updateUserSchema };
