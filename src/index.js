require('dotenv').config();
const Hapi = require('@hapi/hapi');
const JWT = require('@hapi/jwt');
const Inert = require('@hapi/inert'); // ใช้ Inert สำหรับจัดการไฟล์

const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const sentRoutes = require('./routes/sentRoutes');
const userRoutes = require('./routes/userRoutes');

const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 3000,
    host: 'localhost',
    routes: {
      cors: true,
      payload: {
        maxBytes: 10485760,  // 10MB limit
        output: 'file',    // Stream for large files
        parse: true,         // Parse the body
        multipart: true,     // Explicitly enable multipart/form-data
        allow: 'multipart/form-data' // Allow multipart requests
      }
    }
  });

  // ลงทะเบียน plugin ที่จำเป็น
  await server.register([JWT, Inert]);

  // ตั้งค่าการยืนยัน JWT
  server.auth.strategy('jwt', 'jwt', {
    keys: process.env.JWT_SECRET || 'supersecret',
    verify: {
      aud: false,
      iss: false,
      sub: false,
      nbf: true,
      exp: true,
      maxAgeSec: 14400,
      timeSkewSec: 15
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        userId: artifacts.decoded.payload.userId,
        role: artifacts.decoded.payload.role
      }
    })
  });

  console.log('📦 Registering routes...');
  server.route([
    ...authRoutes,
    ...documentRoutes,
    ...sentRoutes,
    ...userRoutes
  ]);
  console.log('✅ Routes registered!');

  // Ping route สำหรับตรวจสอบการทำงาน
  server.route({
    method: 'GET',
    path: '/ping',
    options: {
      auth: false,
      handler: () => 'pong'
    }
  });

  console.log('📃 Routes loaded:');

  // แสดงข้อมูล route ที่ลงทะเบียน
  const routes = server.table();
  const groupedRoutes = routes.reduce((acc, route) => {
    if (route.settings.tags) {
      route.settings.tags.forEach(tag => {
        if (!acc[tag]) {
          acc[tag] = [];
        }
        acc[tag].push({
          method: route.method.toUpperCase(),
          path: route.path
        });
      });
    }
    return acc;
  }, {});

  // แสดงรายละเอียด routes ใน console
  for (const [tag, routes] of Object.entries(groupedRoutes)) {
    console.log(`\n🔹 ${tag}:`);
    console.table(routes);
  }

  // เริ่มต้น server
  await server.start();
  console.log(`🚀 Server running on ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});

init();
