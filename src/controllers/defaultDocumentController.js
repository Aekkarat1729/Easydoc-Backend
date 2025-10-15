const admin = require('../config/firebase');
const { createDefaultDocument, getDefaultDocumentsByUser, getAllDefaultDocuments, getDefaultDocumentById, deleteDefaultDocument, updateDefaultDocument } = require('../services/defaultDocumentService');
const path = require('path');

// File validation helper
const validateFile = (file) => {
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB
  const allowedExtensions = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'txt', 'rtf', 'jpg', 'jpeg', 'png', 'gif', 'bmp',
    'zip', 'rar', '7z', 'csv'
  ];

  // Check file size if available
  if (file.bytes && file.bytes > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size exceeds maximum limit of ${maxSizeBytes / (1024 * 1024)}MB`
    };
  }

  // Check file extension
  const ext = path.extname(file.filename).toLowerCase().replace('.', '');
  if (!allowedExtensions.includes(ext)) {
    return {
      isValid: false,
      error: `File type '${ext}' is not allowed. Allowed types: ${allowedExtensions.join(', ')}`
    };
  }

  // Check filename length
  if (file.filename.length > 255) {
    return {
      isValid: false,
      error: 'Filename is too long (maximum 255 characters)'
    };
  }

  // Check for potentially dangerous characters in filename
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(file.filename)) {
    return {
      isValid: false,
      error: 'Filename contains invalid characters'
    };
  }

  return { isValid: true };
};

// Custom name validation helper
const validateCustomName = (name) => {
  if (!name || !name.trim()) {
    return { isValid: true }; // Custom name is optional
  }

  const trimmedName = name.trim();

  // Check name length
  if (trimmedName.length > 255) {
    return {
      isValid: false,
      error: 'Custom name is too long (maximum 255 characters)'
    };
  }

  // Check for potentially dangerous characters
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(trimmedName)) {
    return {
      isValid: false,
      error: 'Custom name contains invalid characters'
    };
  }

  return { isValid: true };
};


const deleteDefaultDocumentHandler = async (request, h) => {
  try {
    const { id } = request.params;
    
    if (!id) {
      console.error('[deleteDefaultDocumentHandler] Missing document ID');
      return h.response({ success: false, message: 'Document ID is required' }).code(400);
    }

    console.log('[deleteDefaultDocumentHandler] Deleting document:', id);
    
    await deleteDefaultDocument(id);
    
    console.log('[deleteDefaultDocumentHandler] Document deleted successfully:', id);
    return h.response({ success: true, message: 'Document deleted successfully', id }).code(200);
    
  } catch (err) {
    console.error('[deleteDefaultDocumentHandler] Error:', err);
    
    if (err.message.includes('not found')) {
      return h.response({ success: false, message: 'Document not found' }).code(404);
    } else if (err.message.includes('Invalid document ID')) {
      return h.response({ success: false, message: 'Invalid document ID' }).code(400);
    } else {
      return h.response({ success: false, message: 'Failed to delete document' }).code(500);
    }
  }
};

const updateDefaultDocumentHandler = async (request, h) => {
  try {
    const { id } = request.params;
    const { name } = request.payload || {};
    
    if (!id) {
      console.error('[updateDefaultDocumentHandler] Missing document ID');
      return h.response({ success: false, message: 'Document ID is required' }).code(400);
    }

    if (!name) {
      console.error('[updateDefaultDocumentHandler] Missing name in payload');
      return h.response({ success: false, message: 'Name is required' }).code(400);
    }

    console.log('[updateDefaultDocumentHandler] Updating document:', { id, name });
    
    const updated = await updateDefaultDocument(id, { name });
    
    console.log('[updateDefaultDocumentHandler] Document updated successfully:', id);
    return h.response({ success: true, data: updated }).code(200);
    
  } catch (err) {
    console.error('[updateDefaultDocumentHandler] Error:', err);
    
    if (err.message.includes('not found')) {
      return h.response({ success: false, message: 'Document not found' }).code(404);
    } else if (err.message.includes('Invalid document ID') ||
               err.message.includes('Name must be') ||
               err.message.includes('No valid fields')) {
      return h.response({ success: false, message: err.message }).code(400);
    } else {
      return h.response({ success: false, message: 'Failed to update document' }).code(500);
    }
  }
};

const uploadDefaultDocument = async (request, h) => {
  try {
    // Validate authentication
    if (!request.auth || !request.auth.credentials || !request.auth.credentials.userId) {
      console.error('[uploadDefaultDocument] Missing authentication credentials');
      return h.response({ success: false, message: 'Authentication required' }).code(401);
    }

    const { file, name: customName } = request.payload || {};
    const userId = request.auth.credentials.userId;

    // Validate file presence
    if (!file) {
      console.error('[uploadDefaultDocument] No file provided in request');
      return h.response({ success: false, message: 'No file uploaded' }).code(400);
    }

    // Validate file structure
    if (!file.path || !file.filename) {
      console.error('[uploadDefaultDocument] Invalid file structure:', { 
        hasPath: !!file.path, 
        hasFilename: !!file.filename 
      });
      return h.response({ success: false, message: 'Invalid file: missing path or filename' }).code(400);
    }

    // Validate file using validation helper
    const fileValidation = validateFile(file);
    if (!fileValidation.isValid) {
      console.error('[uploadDefaultDocument] File validation failed:', fileValidation.error);
      
      // Clean up temporary file
      try { 
        require('fs').unlinkSync(file.path); 
      } catch (cleanupError) {
        console.error('[uploadDefaultDocument] Failed to cleanup temp file after validation error:', cleanupError);
      }
      
      return h.response({ success: false, message: fileValidation.error }).code(400);
    }

    // Validate custom name if provided
    const nameValidation = validateCustomName(customName);
    if (!nameValidation.isValid) {
      console.error('[uploadDefaultDocument] Custom name validation failed:', nameValidation.error);
      
      // Clean up temporary file
      try { 
        require('fs').unlinkSync(file.path); 
      } catch (cleanupError) {
        console.error('[uploadDefaultDocument] Failed to cleanup temp file after name validation error:', cleanupError);
      }
      
      return h.response({ success: false, message: nameValidation.error }).code(400);
    }

    // Validate file extension
    const ext = path.extname(file.filename);
    if (!ext) {
      console.error('[uploadDefaultDocument] File has no extension:', file.filename);
      return h.response({ success: false, message: 'File must have a valid extension' }).code(400);
    }

    const fileType = ext.replace('.', '').toLowerCase();
    const fileName = `${Date.now()}_${file.filename}`;
    const firebasePath = `defaultdocument/${fileName}`;

    // Determine the document name: use custom name if provided, otherwise use filename
    const documentName = customName && customName.trim() ? customName.trim() : file.filename;

    console.log('[uploadDefaultDocument] Processing file:', {
      originalName: file.filename,
      customName: customName || 'not provided',
      finalName: documentName,
      fileType,
      userId,
      fileSize: file.bytes || 'unknown'
    });

    // Firebase upload with better error handling
    let fileUrl;
    try {
      const bucket = admin.storage().bucket();
      
      // Upload file to Firebase
      await bucket.upload(file.path, {
        destination: firebasePath,
        resumable: false,
        metadata: {
          contentType: file.headers?.['content-type'] || 'application/octet-stream',
          cacheControl: 'public, max-age=31536000',
        },
      });

      // Make file public and get URL
      const blob = bucket.file(firebasePath);
      await blob.makePublic();
      fileUrl = blob.publicUrl();

      console.log('[uploadDefaultDocument] File uploaded to Firebase successfully:', fileUrl);
    } catch (firebaseError) {
      console.error('[uploadDefaultDocument] Firebase upload error:', firebaseError);
      
      // Clean up temporary file
      try { 
        require('fs').unlinkSync(file.path); 
      } catch (cleanupError) {
        console.error('[uploadDefaultDocument] Failed to cleanup temp file:', cleanupError);
      }
      
      return h.response({ 
        success: false, 
        message: 'Failed to upload file to storage' 
      }).code(500);
    }

    // Clean up temporary file
    try { 
      require('fs').unlinkSync(file.path); 
    } catch (cleanupError) {
      console.warn('[uploadDefaultDocument] Failed to cleanup temp file:', cleanupError);
    }

    // Create database record
    let doc;
    try {
      doc = await createDefaultDocument({
        name: documentName,
        fileType,
        fileUrl,
        userId
      });
      
      console.log('[uploadDefaultDocument] Document created successfully:', doc.id);
    } catch (dbError) {
      console.error('[uploadDefaultDocument] Database error:', dbError);
      
      // If database fails, try to clean up uploaded file from Firebase
      try {
        const bucket = admin.storage().bucket();
        await bucket.file(firebasePath).delete();
        console.log('[uploadDefaultDocument] Cleaned up uploaded file from Firebase due to database error');
      } catch (cleanupError) {
        console.error('[uploadDefaultDocument] Failed to cleanup Firebase file after database error:', cleanupError);
      }
      
      return h.response({ 
        success: false, 
        message: 'Failed to save document information' 
      }).code(500);
    }

    return h.response({ success: true, data: doc }).code(201);
  } catch (err) {
    console.error('[uploadDefaultDocument] Unexpected error:', err);
    
    // Clean up temporary file if it exists
    if (request.payload?.file?.path) {
      try { 
        require('fs').unlinkSync(request.payload.file.path); 
      } catch (cleanupError) {
        console.error('[uploadDefaultDocument] Failed to cleanup temp file in error handler:', cleanupError);
      }
    }
    
    return h.response({ 
      success: false, 
      message: 'Internal server error' 
    }).code(500);
  }
};

const listAllDefaultDocuments = async (request, h) => {
  try {
    // ตรวจสอบ authentication  
    if (!request.auth || !request.auth.credentials || !request.auth.credentials.userId) {
      console.error('[listAllDefaultDocuments] Missing authentication credentials');
      return h.response({ success: false, message: 'Authentication required' }).code(401);
    }

    console.log('[listAllDefaultDocuments] Fetching ALL default documents for download page');
    
    const docs = await getAllDefaultDocuments();
    
    console.log('[listAllDefaultDocuments] Found documents:', docs.length);
    console.log('[listAllDefaultDocuments] Documents preview:', docs.map(d => ({
      id: d.id,
      name: d.name,
      fileType: d.fileType,
      fileSize: d.fileSize
    })));
    
    return h.response({ success: true, data: docs }).code(200);
    
  } catch (err) {
    console.error('[listAllDefaultDocuments] Error:', err);
    return h.response({ success: false, message: 'Failed to fetch documents' }).code(500);
  }
};

const listDefaultDocuments = async (request, h) => {
  try {
    // ตรวจสอบ authentication
    if (!request.auth || !request.auth.credentials || !request.auth.credentials.userId) {
      console.error('[listDefaultDocuments] Missing authentication credentials');
      return h.response({ success: false, message: 'Authentication required' }).code(401);
    }

    const userId = request.auth.credentials.userId;
    
    console.log('[listDefaultDocuments] Fetching documents for specific user:', userId);
    
    // ใช้ getDefaultDocumentsByUser สำหรับ user-specific requests
    const docs = await getDefaultDocumentsByUser(userId);
    
    console.log('[listDefaultDocuments] Found documents:', docs.length);
    
    return h.response({ success: true, data: docs }).code(200);
    
  } catch (err) {
    console.error('[listDefaultDocuments] Error:', err);
    return h.response({ success: false, message: 'Failed to fetch documents' }).code(500);
  }
};

const getDefaultDocument = async (request, h) => {
  try {
    const { id } = request.params;
    
    if (!id) {
      console.error('[getDefaultDocument] Missing document ID');
      return h.response({ success: false, message: 'Document ID is required' }).code(400);
    }

    console.log('[getDefaultDocument] Fetching document:', id);
    
    const doc = await getDefaultDocumentById(id);
    
    console.log('[getDefaultDocument] Document found:', doc.id);
    return h.response({ success: true, data: doc }).code(200);
    
  } catch (err) {
    console.error('[getDefaultDocument] Error:', err);
    
    if (err.message.includes('not found')) {
      return h.response({ success: false, message: 'Document not found' }).code(404);
    } else if (err.message.includes('Invalid document ID')) {
      return h.response({ success: false, message: 'Invalid document ID' }).code(400);
    } else {
      return h.response({ success: false, message: 'Failed to fetch document' }).code(500);
    }
  }
};

module.exports = {
  uploadDefaultDocument,
  listDefaultDocuments,
  listAllDefaultDocuments,
  getDefaultDocument,
  deleteDefaultDocumentHandler,
  updateDefaultDocumentHandler
};
