// src/index.js
require('dotenv').config();
const Hapi = require('@hapi/hapi');
const JWT = require('@hapi/jwt');
const Inert = require('@hapi/inert');

const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const sentRoutes = require('./routes/sentRoutes');
const userRoutes = require('./routes/userRoutes');

/* ------------------------------ Helpers ------------------------------ */
function parseOrigins(str) {
  if (!str || str === '*') return ['*'];
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || (NODE_ENV === 'production' ? '0.0.0.0' : 'localhost');
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 10);
const CORS_ORIGINS = parseOrigins(process.env.CORS_ORIGINS || '*');

async function init() {
  const server = Hapi.server({
    port: PORT,
    host: HOST,
    router: { stripTrailingSlash: true },
    routes: {
      cors: {
        origin: CORS_ORIGINS,           // ['*'] หรือ ['https://foo.com','https://bar.com']
        credentials: true,
        additionalHeaders: ['authorization', 'content-type'],
        additionalExposedHeaders: ['*'],
      },
      payload: {
        maxBytes: MAX_UPLOAD_MB * 1024 * 1024, // default 10MB (แต่ละ route override ได้)
        output: 'file',
        parse: true,
        multipart: { output: 'file' },
        allow: ['multipart/form-data', 'application/json', 'application/x-www-form-urlencoded']
      },
    }
  });

  // Plugins
  await server.register([JWT, Inert]);

  // JWT Strategy
  server.auth.strategy('jwt', 'jwt', {
    keys: process.env.JWT_SECRET || 'supersecret',
    verify: {
      aud: false,
      iss: false,
      sub: false,
      nbf: true,
      exp: true,
      maxAgeSec: 14400, // 4 ชั่วโมง
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
  // ไม่บังคับ default auth เพราะบาง route ไม่ต้องใช้
  // server.auth.default('jwt');

  // Basic health checks
  server.route({
    method: 'GET',
    path: '/',
    options: { auth: false },
    handler: () => ({ ok: true, env: NODE_ENV })
  });

  server.route({
    method: 'GET',
    path: '/ping',
    options: { auth: false },
    handler: () => 'pong'
  });

  // Register app routes
  console.log('📦 Registering routes...');
  server.route([
    ...authRoutes,
    ...documentRoutes,
    ...sentRoutes,
    ...userRoutes
  ]);
  console.log('✅ Routes registered!');

  // Pretty print routes by tag
  console.log('📃 Routes loaded:');
  const routes = server.table();
  const grouped = routes.reduce((acc, r) => {
    const tags = r.settings && r.settings.tags ? r.settings.tags : [];
    tags.forEach(tag => {
      acc[tag] ||= [];
      acc[tag].push({ method: r.method.toUpperCase(), path: r.path });
    });
    return acc;
  }, {});
  for (const [tag, list] of Object.entries(grouped)) {
    console.log(`\n🔹 ${tag}:`);
    console.table(list);
  }

  // Unified error response (optional nice-to-have)
  server.ext('onPreResponse', (request, h) => {
    const res = request.response;
    if (res.isBoom) {
      const statusCode = res.output.statusCode || 500;
      const payload = {
        success: false,
        statusCode,
        error: res.output.payload.error,
        message: res.message || res.output.payload.message
      };
      return h.response(payload).code(statusCode);
    }
    return h.continue;
  });

  await server.start();
  console.log(`🚀 Server running on ${server.info.uri} (env=${NODE_ENV})`);

  // Graceful shutdown for Render/containers
  const shutdown = async (signal) => {
    try {
      console.log(`\n🛑 Received ${signal}, stopping server...`);
      await server.stop({ timeout: 10_000 });
      console.log('✅ Server stopped gracefully');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error while stopping server:', err);
      process.exit(1);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
  process.exit(1);
});

init();
