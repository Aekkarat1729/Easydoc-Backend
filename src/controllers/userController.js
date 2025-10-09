const userService = require('../services/userService');
const { createUserSchema, updateUserSchema, idParamSchema } = require('../validations/userValidation');
const { success, created, notFound, error } = require('../utils/responseFormatter');
const isAdmin = require('../utils/isAdmin');
const isOfficer = require('../utils/isOfficer');
const admin = require('../config/firebase');
const path = require('path');

function replyZodError(h, zodError) {
  return h.response({
    success: false,
    statusCode: 400,
    error: 'Bad Request',
    message: 'Validation error',
    details: zodError.format?.() || zodError
  }).code(400);
}

const getUsersForOfficer = {
  auth: 'jwt',
  tags: ['api', 'users'],
  handler: async (request, h) => {
    try {
      const users = await userService.getUsersForOfficer();
    return success(h, users.map(u => ({ ...u, position: u.position, profileImage: u.profileImage })) || []);
    } catch (err) {
      return error(h, err.message);
    }
  }
};

const getAllUsers = {
  auth: 'jwt',
  tags: ['api', 'users'],
  handler: async (request, h) => {
    try {
      isAdmin(request);
      const users = await userService.getAllUsers();
    return success(h, users.map(u => ({ ...u, position: u.position, profileImage: u.profileImage })) || []);
    } catch (err) {
      return error(h, err.message);
    }
  }
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
    return success(h, { ...user, position: user.position, profileImage: user.profileImage });
    } catch (err) {
      return error(h, err.message);
    }
  }
};

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
  return created(h, { ...user, position: user.position, profileImage: user.profileImage });
    } catch (err) {
      return error(h, err.message);
    }
  }
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
  return success(h, { ...updated, position: updated.position, profileImage: updated.profileImage });
    } catch (err) {
      return error(h, err.message);
    }
  }
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
  }
};

const uploadProfileImage = {
  auth: 'jwt',
  tags: ['api', 'users'],
  payload: {
    maxBytes: 10 * 1024 * 1024,
    output: 'file',
    parse: true,
    allow: ['multipart/form-data'],
    multipart: true
  },
  handler: async (request, h) => {
    try {
      const userId = request.auth?.credentials?.userId;
      if (!userId) {
        return h.response({ success: false, message: 'Unauthorized: Missing user ID.' }).code(401);
      }
      const possibleKeys = ['file', 'profileImage', 'profileimage', 'profile_file', 'profilename'];
      let file = null;
      for (const key of possibleKeys) {
        if (request.payload[key] && typeof request.payload[key] === 'object') {
          file = request.payload[key];
          break;
        }
      }
      if (!file) {
        for (const k in request.payload) {
          if (request.payload[k] && typeof request.payload[k] === 'object' && request.payload[k].path && request.payload[k].filename) {
            file = request.payload[k];
            break;
          }
        }
      }
      if (!file) {
        return h.response({ success: false, message: 'No file uploaded. Please select a file with key "file" or "profileImage".' }).code(400);
      }
      if (!file.path || !file.filename) {
        return h.response({ success: false, message: 'Uploaded file is missing path or filename.' }).code(400);
      }
      const allowedTypes = ['.jpeg', '.jpg', '.png'];
      const ext = path.extname(file.filename).toLowerCase();
      if (!allowedTypes.includes(ext)) {
        return h.response({ success: false, message: 'File must be .jpeg or .png only.' }).code(400);
      }
      const user = await userService.getUserById(userId);
      if (!user) return h.response({ success: false, message: 'User not found.' }).code(404);
      const fileName = `profile_${Date.now()}${ext}`;
      const safeName = `${user.firstName}_${user.lastName}`.replace(/[^a-zA-Z0-9_]/g, '_');
      const firebasePath = `profile/${safeName}/profileimages/${fileName}`;
      const bucket = admin.storage().bucket();
      await bucket.upload(file.path, {
        destination: firebasePath,
        resumable: false,
        metadata: {
          contentType: file.headers?.['content-type'] || (ext === '.png' ? 'image/png' : 'image/jpeg'),
          cacheControl: 'public, max-age=31536000',
        },
      });
      const blob = bucket.file(firebasePath);
      await blob.makePublic();
      const fileUrl = blob.publicUrl();
      try { require('fs').unlinkSync(file.path); } catch (_) {}
      await userService.updateUser(userId, { profileImage: fileUrl });
      return h.response({ success: true, fileUrl, message: 'Profile image uploaded successfully.' }).code(200);
    } catch (err) {
      return h.response({ success: false, message: err.message || 'Internal server error.' }).code(500);
    }
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUsersForOfficer,
  uploadProfileImage
};