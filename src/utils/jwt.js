const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'supersecret';

const sign = (payload) => jwt.sign(payload, SECRET, { expiresIn: '7d' });
const verify = (token) => jwt.verify(token, SECRET);

module.exports = { sign, verify };
