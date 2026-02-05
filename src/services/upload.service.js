const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../public/uploads/organizer-docs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('✓ Created organizer-docs upload directory');
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename: userId-timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    cb(null, `${req.session.userId}-${uniqueSuffix}-${sanitizedName}${ext}`);
  }
});

// File filter for security
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
  
  if (allowedMimes.includes(file.mimetype)) {
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
    fileSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 5242880  // 5MB default
  }
});

// Handle multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File size exceeds 5MB limit.' 
      });
    }
    return res.status(400).json({ 
      error: `Upload error: ${err.message}` 
    });
  } else if (err) {
    return res.status(400).json({ 
      error: err.message 
    });
  }
  next();
};

// Export upload middleware for multiple files
exports.uploadOrganizerDocs = (req, res, next) => {
  const uploadFields = upload.fields([
    { name: 'idProof', maxCount: 1 },
    { name: 'businessProof', maxCount: 1 }
  ]);

  uploadFields(req, res, (err) => {
    handleMulterError(err, req, res, next);
  });
};

// Validate files after upload
exports.validateFiles = (files) => {
  if (!files || files.length === 0) {
    return 'No files uploaded.';
  }

  for (const file of files) {
    // Check file size
    if (file.size > 5242880) { // 5MB
      return 'File size exceeds 5MB limit.';
    }

    // Check file type
    const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      return 'Invalid file type. Only JPEG, PNG, and PDF files are allowed.';
    }

    // Check file exists
    const filePath = path.join(uploadDir, file.filename);
    if (!fs.existsSync(filePath)) {
      return 'File upload failed. Please try again.';
    }
  }

  return null; // No errors
};

// Delete files helper
exports.deleteFiles = (filenames) => {
  filenames.forEach(filename => {
    if (filename) {
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`✓ Deleted file: ${filename}`);
        } catch (error) {
          console.error('Error deleting file:', error);
        }
      }
    }
  });
};

// Get file URL
exports.getFileUrl = (filename) => {
  return `/uploads/organizer-docs/${filename}`;
};

// Check if file exists
exports.fileExists = (filename) => {
  const filePath = path.join(uploadDir, filename);
  return fs.existsSync(filePath);
};