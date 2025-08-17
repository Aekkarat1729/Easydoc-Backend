// documentService.js
// ตัวอย่าง service เปล่า ๆ (ถ้าจะใช้จริงควรย้าย logic DB มาที่นี่)
const uploadDocument = async (documentData) => {
  try {
    return { id: Date.now(), ...documentData };
  } catch (err) {
    throw new Error('Failed to process document in service: ' + err.message);
  }
};

const getDocumentById = async (id) => {
  // ตัวอย่าง mock; ควรดึงจากฐานข้อมูลจริง
  return {
    id,
    name: 'Document1',
    fileType: 'pdf',
    fileUrl: 'https://storage.googleapis.com/your-bucket/uploads/sample.pdf',
  };
};

module.exports = { uploadDocument, getDocumentById };
