require('dotenv').config();
const Hapi = require('@hapi/hapi');
const JWT = require('@hapi/jwt');
const Inert = require('@hapi/inert');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const sentRoutes = require('./routes/sentRoutes');
const userRoutes = require('./routes/userRoutes');
const defaultDocumentRoutes = require('./routes/defaultDocumentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const socketAuth = require('./middleware/socketAuth');
const NotificationEmitter = require('./utils/notificationEmitter');

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || (NODE_ENV === 'production' ? '0.0.0.0' : 'localhost');
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 10);
const CORS_ORIGINS = parseOrigins(process.env.CORS_ORIGINS || '*');

const CORS_CREDENTIALS = !CORS_ORIGINS.includes('*');

function parseOrigins(origins) {
  if (!origins || origins === '*') return ['*'];
  return origins.split(',').map(o => o.trim()).filter(Boolean);
}

async function init() {
  try {
    const server = Hapi.server({
      port: PORT,
      host: HOST,
      router: { stripTrailingSlash: true },

      routes: {
        cors: {
          origin: CORS_ORIGINS,
          credentials: CORS_CREDENTIALS,
          additionalHeaders: ['accept', 'origin', 'x-requested-with'],
          additionalExposedHeaders: ['content-length', 'content-range'],
          maxAge: 86400
        },

      payload: {
        maxBytes: MAX_UPLOAD_MB * 1024 * 1024,
        output: 'file',
        parse: true,
        multipart: { output: 'file' },
        allow: [
          'multipart/form-data',
          'application/json',
          'application/x-www-form-urlencoded'
        ]
      }
    }
  });

  try {
    await server.register([JWT, Inert]);
  } catch (error) {
    throw error;
  }

  try {
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
      validate: (artifacts) => {
        return {
          isValid: true,
          credentials: {
            userId: artifacts.decoded.payload.userId,
            role: artifacts.decoded.payload.role
          }
        };
      }
    });
  } catch (error) {
    throw error;
  }

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

  server.route({
    method: 'GET',
    path: '/health',
    options: { auth: false },
    handler: () => ({ status: 'ok number 1' })
  });

  server.route([
      ...authRoutes,
      ...documentRoutes,
      ...sentRoutes,
      ...userRoutes,
      ...defaultDocumentRoutes,
      ...notificationRoutes
    ]);

  const routes = server.table();
  const grouped = routes.reduce((acc, r) => {
    const tags = r.settings?.tags || [];
    tags.forEach(tag => {
      acc[tag] ||= [];
      acc[tag].push({ method: r.method.toUpperCase(), path: r.path });
    });
    return acc;
  }, {});
  for (const [tag, list] of Object.entries(grouped)) {
    console.table(list);
  }

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
  console.log(`[SERVER] Server running on ${HOST}:${PORT} (${NODE_ENV})`);
  console.log(`[SERVER] API URL: http://${HOST}:${PORT}`);
  console.log(`[CORS] Allowed origins:`, CORS_ORIGINS);
  console.log(`[CORS] Credentials:`, CORS_CREDENTIALS ? 'enabled' : 'disabled');

  try {
    const io = new Server(server.listener, {
      cors: {
        origin: CORS_ORIGINS,
        credentials: CORS_CREDENTIALS,
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000
    });

    io.use(socketAuth);

    NotificationEmitter.setSocketIO(io);

    io.on('connection', (socket) => {
      const userId = socket.userId;
      const userRole = socket.userRole;
      
      console.log(`[SOCKET] User ${userId} (${userRole}) connected successfully`);
      socket.join(`user_${userId}`);

      socket.on('request_unread_count', async () => {
        try {
          console.log(`[SOCKET] User ${userId} requested unread count`);
          await NotificationEmitter.updateUnreadCount(userId);
        } catch (error) {
          console.error(`[SOCKET] Error updating unread count for user ${userId}:`, error);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log(`[SOCKET] User ${userId} disconnected:`, reason);
      });

      socket.on('error', (error) => {
        console.error(`[SOCKET] Socket error for user ${userId}:`, error);
      });
    });

    io.on('error', (error) => {
      console.error('[SOCKET] Server error:', error);
    });

  } catch (error) {
    console.error('[SOCKET] Failed to initialize Socket.IO server:', error);
    throw error;
  }

  const shutdown = async (signal) => {
    try {
      io.close(() => {
      });
      
      await server.stop({ timeout: 10_000 });
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  
  } catch (error) {
    process.exit(1);
  }
}

process.on('unhandledRejection', (err) => {
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  process.exit(1);
});

init();
