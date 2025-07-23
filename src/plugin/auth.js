const HapiAuthJwt2 = require('hapi-auth-jwt2');

const jwtPlugin = {
  plugin: HapiAuthJwt2,
  options: {
    validate: async (decoded, request, h) => {
      const { role } = decoded;
      // สามารถใช้ role ในการกำหนดสิทธิ์การเข้าถึง
      if (role !== 'ADMIN') {
        throw new Error('Unauthorized');
      }
      return { isValid: true };
    }
  }
};

module.exports = jwtPlugin;
