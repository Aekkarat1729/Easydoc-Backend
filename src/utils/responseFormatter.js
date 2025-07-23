const success = (h, data, message = 'OK') => h.response({ success: true, message, data }).code(200);
const created = (h, data, message = 'Created') => h.response({ success: true, message, data }).code(201);
const notFound = (h, message = 'Not found') => h.response({ success: false, message }).code(404);
const error = (h, message = 'Error') => h.response({ success: false, message }).code(500);
const unauthorized = (h, message = 'Unauthorized') => h.response({ success: false, message }).code(401);

module.exports = { success, created, notFound, error, unauthorized };
