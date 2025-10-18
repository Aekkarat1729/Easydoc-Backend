// src/routes/dashboardRoutes.js
const { getDashboardData } = require('../controllers/dashboardController');

module.exports = [
  { method: 'GET', path: '/dashboard', options: getDashboardData }
];