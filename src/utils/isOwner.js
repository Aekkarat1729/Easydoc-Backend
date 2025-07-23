const Boom = require('@hapi/boom');

module.exports = (request, h) => {
  if (request.auth.credentials.role !== 'ADMIN') {
    throw Boom.forbidden('Admin only');
  }
  return h.continue;
};
