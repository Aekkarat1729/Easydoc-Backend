const isAdmin = (request) => {
  const { credentials } = request.auth;
  console.log('Credentials:', credentials);
  if (!credentials || credentials.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required');
  }
};
module.exports = isAdmin;