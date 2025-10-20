// src/routes/dashboardRoutes.js
const { getDashboardData, getOfficerDashboardData } = require('../controllers/dashboardController');

module.exports = [
  { method: 'GET', path: '/dashboard', options: getDashboardData },
  { method: 'GET', path: '/officer-dashboard', options: getOfficerDashboardData }
];