require('dotenv').config();
const Hapi = require('@hapi/hapi');
const JWT = require('@hapi/jwt');
const Inert = require('@hapi/inert');

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

  await server.register([JWT, Inert]);

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
    ...mailBoxRoutes,
    ...sentRoutes,
    ...userRoutes
  ]);
  console.log('✅ Routes registered!');

  server.route({
    method: 'GET',
    path: '/ping',
    options: {
      auth: false,
      handler: () => 'pong'
    }
  });

  console.log('📃 Routes loaded:');

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

  for (const [tag, routes] of Object.entries(groupedRoutes)) {
    console.log(`\n🔹 ${tag}:`);
    console.table(routes);
  }

  await server.start();
  console.log(`🚀 Server running on ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});

init();