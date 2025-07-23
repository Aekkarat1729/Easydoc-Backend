const sentService = require('../services/sentService');
const { sentSchema } = require('../validations/sentValidation');
const validateZod = require('../validations/validateZod');
const { success, created, error } = require('../utils/responseFormatter');

const sendDocument = {
  auth: 'jwt',
  tags: ['api', 'sent'],
  validate: { payload: validateZod(sentSchema) },
  handler: async (request, h) => {
    try {
      const sentDocument = await sentService.sendDocument(request.payload);
      return created(h, sentDocument);
    } catch (err) {
      return error(h, err.message);
    }
  },
};

module.exports = { sendDocument };
