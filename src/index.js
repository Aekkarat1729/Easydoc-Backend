require('dotenv').config();
const Hapi = require('@hapi/hapi');
const JWT = require('@hapi/jwt');
const Inert = require('@hapi/inert');  // สำหรับการรับไฟล์

// ✅ นำเข้า routes ที่ต้องการ
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const mailBoxRoutes = require('./routes/mailBoxRoutes');
const sentRoutes = require('./routes/sentRoutes');
const userRoutes = require('./routes/userRoutes');

const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 3000,
    host: 'localhost',
    routes: {
      cors: true
    }
  });

  // ลงทะเบียน JWT Plugin และ Inert สำหรับไฟล์
  await server.register([JWT, Inert]);

  // กำหนดกลยุทธ์ JWT
  server.auth.strategy('jwt', 'jwt', {
    keys: process.env.JWT_SECRET || 'supersecret', // กำหนดคีย์สำหรับ JWT
    verify: {
      aud: false,
      iss: false,
      sub: false,
      nbf: true,  // ตรวจสอบว่า JWT ยังไม่ถูกใช้ก่อน
      exp: true,  // ตรวจสอบการหมดอายุของ JWT
      maxAgeSec: 14400, // อายุของ JWT (4 ชั่วโมง)
      timeSkewSec: 15 // ความคลาดเคลื่อนเวลา
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        userId: artifacts.decoded.payload.userId,
        role: artifacts.decoded.payload.role
      }
    })
  });

  //server.auth.default('jwt');  // ใช้การตรวจสอบ JWT สำหรับทุกๆ route

  // ✅ Register routes
  console.log('📦 Registering routes...');
  server.route([
    ...authRoutes, // อาจจะต้องใช้ auth สำหรับบาง route
    ...documentRoutes,
    ...mailBoxRoutes,
    ...sentRoutes,
    ...userRoutes
  ]);
  console.log('✅ Routes registered!');

  // ✅ Test route สำหรับตรวจว่า server ตอบสนองหรือไม่
  server.route({
    method: 'GET',
    path: '/ping',
    options: {
      auth: false,  // ไม่ต้องการการตรวจสอบ JWT สำหรับ route นี้
      handler: () => 'pong'
    }
  });

  // ✅ แสดงตาราง routes ทั้งหมด และจัดกลุ่มตาม tags
  console.log('📃 Routes loaded:');

  // ดึงข้อมูลจาก server.table() และจัดกลุ่มตาม tags
  const routes = server.table();
  const groupedRoutes = routes.reduce((acc, route) => {
    // ตรวจสอบว่า route มี tags หรือไม่
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

  // แสดง routes ตามหมวดหมู่
  for (const [tag, routes] of Object.entries(groupedRoutes)) {
    console.log(`\n🔹 ${tag}:`);
    console.table(routes);  // แสดง routes ตามแต่ละหมวดหมู่
  }

  await server.start();
  console.log(`🚀 Server running on ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});

init();
