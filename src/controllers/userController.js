const bcrypt = require('bcryptjs');
const userService = require('../services/userService');
const { createUserSchema, updateUserSchema } = require('../validations/userValidation');
const validateZod = require('../validations/validateZod');
const { success, created, notFound, error } = require('../utils/responseFormatter');
const isAdmin = require('../utils/isAdmin');
const { idParamSchema } = require('../validations/userValidation');

// ฟังก์ชันดึงข้อมูลผู้ใช้ทั้งหมด
const getAllUsers = {
  auth: 'jwt',
  tags: ['api', 'users'],
  handler: async (request, h) => {
    try {
      isAdmin(request); // เช็คสิทธิ์ของ admin
      const users = await userService.getAllUsers();
      return success(h, users || []);
    } catch (err) {
      return error(h, err.message);
    }
  },
};

// ฟังก์ชันดึงข้อมูลผู้ใช้ตาม id
const getUserById = {
  auth: 'jwt',
  tags: ['api', 'users'],
  validate: {
    params: validateZod(idParamSchema),
  },
  handler: async (request, h) => {
    try {
      const user = await userService.getUserById(Number(request.params.id));
      if (!user) return notFound(h);
      return success(h, user);
    } catch (err) {
      return error(h, err.message);
    }
  },
};

// ฟังก์ชันสร้างผู้ใช้ใหม่
const createUser = {
  auth: false, // ไม่ต้องใช้การตรวจสอบ JWT สำหรับการลงทะเบียน
  tags: ['api', 'users'],
  validate: { payload: validateZod(createUserSchema) },
  handler: async (request, h) => {
    const { firstName, lastName, email, phoneNumber, password, role } = request.payload;
    try {
      const user = await userService.createUser({
        firstName, 
        lastName, 
        email, 
        phoneNumber, 
        password, 
        role
      });
      return created(h, user);
    } catch (err) {
      return error(h, err.message);
    }
  },
};

// ฟังก์ชันอัปเดตข้อมูลผู้ใช้
const updateUser = {
  auth: 'jwt',
  tags: ['api', 'users'],
  validate: {
    params: validateZod(idParamSchema),
    payload: validateZod(updateUserSchema),
  },
  handler: async (request, h) => {
    const { id } = request.params;
    let data = { ...request.payload };
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10); // แฮชรหัสผ่านใหม่
    }
    try {
      const updated = await userService.updateUser(Number(id), data);
      return success(h, updated);
    } catch (err) {
      return error(h, err.message);
    }
  },
};

// ฟังก์ชันลบผู้ใช้
const deleteUser = {
  auth: 'jwt',
  tags: ['api', 'users'],
  validate: { params: validateZod(idParamSchema) },
  handler: async (request, h) => {
    try {
      await userService.deleteUser(Number(request.params.id));
      return success(h, 'User deleted');
    } catch (err) {
      return error(h, err.message);
    }
  },
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };
