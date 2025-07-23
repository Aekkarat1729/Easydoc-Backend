const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const validateRole = (userRole, requiredRole) => {
  if (userRole !== requiredRole) {
    throw new Error('Unauthorized access');
  }
};

module.exports = { loginSchema, validateRole };
