const { z } = require('zod');

const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const roleInputSchema = z.union([
  z.enum(['ADMIN', 'OFFICER', 'USER']),
  z.coerce.number().int().min(1).max(3)
]);


const phoneSchema = z.string().trim()
  .regex(/^\+?\d{8,15}$/, 'Invalid phone number');

const createUserSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phoneNumber: phoneSchema,
  password: z.string().min(6),
  role: roleInputSchema.default('USER'),
  position: z.string().trim().min(1).optional()
});

const updateUserSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phoneNumber: phoneSchema.optional(),
  password: z.string().min(6).optional(),
  role: roleInputSchema.optional(),
  position: z.string().trim().min(1).optional()
});

module.exports = { idParamSchema, createUserSchema, updateUserSchema };
