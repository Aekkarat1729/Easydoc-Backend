const mailBoxService = require('../services/mailBoxService');
const { mailBoxSchema } = require('../validations/mailBoxValidation');
const validateZod = require('../validations/validateZod');
const { success, created, notFound, error } = require('../utils/responseFormatter');
const { idParamSchema } = require('../validations/mailBoxValidation'); // หรือจากไฟล์อื่นที่คุณใช้


const createMailBox = {
  auth: 'jwt',
  tags: ['api', 'mailboxes'],
  validate: { payload: validateZod(mailBoxSchema) },
  handler: async (request, h) => {
    try {
      const mailBox = await mailBoxService.createMailBox(request.payload);
      return created(h, mailBox);
    } catch (err) {
      return error(h, err.message);
    }
  },
};

const getMailBoxById = {
  auth: 'jwt',
  tags: ['api', 'mailboxes'],
  validate: {
    params: validateZod(idParamSchema),
  },
  handler: async (request, h) => {
    try {
      const mailBox = await mailBoxService.getMailBoxById(Number(request.params.id));
      if (!mailBox) return notFound(h);
      return success(h, mailBox);
    } catch (err) {
      return error(h, err.message);
    }
  },
};

const updateMailBox = {
  auth: 'jwt',
  tags: ['api', 'mailboxes'],
  validate: {
    params: validateZod(idParamSchema),
    payload: validateZod(mailBoxSchema),
  },
  handler: async (request, h) => {
    const { id } = request.params;
    try {
      const updatedMailBox = await mailBoxService.updateMailBox(Number(id), request.payload);
      return success(h, updatedMailBox);
    } catch (err) {
      return error(h, err.message);
    }
  },
};

const deleteMailBox = {
  auth: 'jwt',
  tags: ['api', 'mailboxes'],
  validate: { params: validateZod(idParamSchema) },
  handler: async (request, h) => {
    try {
      await mailBoxService.deleteMailBox(Number(request.params.id));
      return success(h, 'MailBox deleted');
    } catch (err) {
      return error(h, err.message);
    }
  },
};

module.exports = { createMailBox, getMailBoxById, updateMailBox, deleteMailBox };
