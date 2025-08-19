const isOfficer = (request) => {
  const { credentials } = request.auth;
  console.log('Credentials:', credentials); // เพิ่ม log เพื่อดูข้อมูล
  if (!credentials || credentials.role !== 'OFFICER') {
    throw new Error('Unauthorized: Officer access required');
  }
};
module.exports = isOfficer;