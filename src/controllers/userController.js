// src/controllers/userController.js
const userService = require('../services/userService');
const { createUserSchema, updateUserSchema, idParamSchema } = require('../validations/userValidation');
const { success, created, notFound, error } = require('../utils/responseFormatter');
const isAdmin = require('../utils/isAdmin');
const isOfficer = require('../utils/isOfficer');

// helper: แปลง zod error เป็น response 400 ที่อ่านง่าย
function replyZodError(h, zodError) {
  return h.response({
    success: false,
    statusCode: 400,
    error: 'Bad Request',
    message: 'Validation error',
    details: zodError.format?.() || zodError
  }).code(400);
}

// Officer/Admin เท่านั้น: รายชื่อย่อ
const getUsersForOfficer = {
  auth: 'jwt',
  tags: ['api', 'users'],
  handler: async (request, h) => {
    try {
      try { isOfficer(request); } catch { isAdmin(request); }
  const users = await userService.getUsersForOfficer();
  return success(h, users.map(u => ({ ...u, position: u.position })) || []);
    } catch (err) {
      return error(h, err.message);
    }
  },
};

const getAllUsers = {
  auth: 'jwt',
  tags: ['api', 'users'],
  handler: async (request, h) => {
    try {
      isAdmin(request);
  const users = await userService.getAllUsers();
  return success(h, users.map(u => ({ ...u, position: u.position })) || []);
    } catch (err) {
      return error(h, err.message);
    }
  },
};

const getUserById = {
  auth: 'jwt',
  tags: ['api', 'users'],
  handler: async (request, h) => {
    const parsed = idParamSchema.safeParse(request.params);
    if (!parsed.success) return replyZodError(h, parsed.error);
    try {
      const user = await userService.getUserById(Number(parsed.data.id));
      if (!user) return notFound(h);
  return success(h, { ...user, position: user.position });
    } catch (err) {
      return error(h, err.message);
    }
  },
};

// ✅ กำหนด payload เพื่อให้ parse JSON ได้แน่นอน
const createUser = {
  auth: false,
  tags: ['api', 'users'],
  payload: {
    parse: true,
    output: 'data',
    allow: ['application/json', 'application/x-www-form-urlencoded']
  },
  handler: async (request, h) => {
    const parsed = createUserSchema.safeParse(request.payload);
    if (!parsed.success) return replyZodError(h, parsed.error);

    try {
  const user = await userService.createUser(parsed.data);
  return created(h, { ...user, position: user.position });
    } catch (err) {
      return error(h, err.message);
    }
  },
};

const updateUser = {
  auth: 'jwt',
  tags: ['api', 'users'],
  payload: {
    parse: true,
    output: 'data',
    allow: ['application/json', 'application/x-www-form-urlencoded']
  },
  handler: async (request, h) => {
    const parsedId = idParamSchema.safeParse(request.params);
    if (!parsedId.success) return replyZodError(h, parsedId.error);

    const parsedPayload = updateUserSchema.safeParse(request.payload || {});
    if (!parsedPayload.success) return replyZodError(h, parsedPayload.error);

    try {
  const updated = await userService.updateUser(Number(parsedId.data.id), parsedPayload.data);
  return success(h, { ...updated, position: updated.position });
    } catch (err) {
      return error(h, err.message);
    }
  },
};

const deleteUser = {
  auth: 'jwt',
  tags: ['api', 'users'],
  handler: async (request, h) => {
    const parsedId = idParamSchema.safeParse(request.params);
    if (!parsedId.success) return replyZodError(h, parsedId.error);

    try {
      isAdmin(request);
      await userService.deleteUser(Number(parsedId.data.id));
      return success(h, 'User deleted');
    } catch (err) {
      return error(h, err.message);
    }
  },
};

module.exports = {
  getUsersForOfficer,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
