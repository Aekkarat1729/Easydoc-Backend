const Boom = require('@hapi/boom');

const validateZod = (schema) => {
  return (value, options) => {
    const result = schema.safeParse(value);
    if (!result.success) {
      throw Boom.badRequest('Validation error', {
        issues: result.error.issues,
      });
    }
    return result.data;
  };
};

module.exports = validateZod;
