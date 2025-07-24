const uploadDocument = async (documentData) => {
  try {
    console.log('Document data in service:', documentData);
    return { id: Date.now(), ...documentData }; // ควรบันทึกในฐานข้อมูลจริง
  } catch (err) {
    throw new Error('Failed to process document in service: ' + err.message);
  }
};

const getDocumentById = async (id) => {
  return { id, name: 'Document1', fileType: 'pdf', fileUrl: 'https://ucarecdn.com/uuid/' }; // ใช้ URL ของ Uploadcare
};

module.exports = { uploadDocument, getDocumentById };