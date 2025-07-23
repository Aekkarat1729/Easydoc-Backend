// src/plugin/prisma.js
const { PrismaClient } = require('@prisma/client');

exports.plugin = {
  name: 'prisma-plugin',
  register: async function (server) {
    const prisma = new PrismaClient();
    await prisma.$connect();
    server.app.prisma = prisma;

    server.ext({
      type: 'onPostStop',
      method: async (server) => {
        await prisma.$disconnect();
      }
    });
  }
};
