const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads/organizer-docs');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: userId_timestamp_random_originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${req.session.userId}_${uniqueSuffix}_${basename}${ext}`);
  }
});

// File filter for security
const fileFilter = (req, file, cb) => {
  const allowedTypes = process.env.UPLOAD_ALLOWED_TYPES.split(',');
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 5242880 // 5MB default
  }
});

// Export upload middleware for multiple files
exports.uploadOrganizerDocs = upload.fields([
  { name: 'idProof', maxCount: 1 },
  { name: 'businessProof', maxCount: 1 }
]);

// Delete file helper
exports.deleteFile = (filePath) => {
  try {
    const fullPath = path.join(__dirname, '../public', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log('File deleted:', fullPath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

// Validate uploaded files
exports.validateFiles = (files) => {
  if (!files || !files.idProof || !files.businessProof) {
    return {
      valid: false,
      error: 'Please upload both ID proof and business registration documents.'
    };
  }
  
  return { valid: true };
};