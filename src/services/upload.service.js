const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const DEFAULT_ALLOWED_MIMES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_UPLOAD_BYTES = parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 5242880;

const configuredAllowedMimes = String(
  process.env.ALLOWED_FILE_TYPES || process.env.UPLOAD_ALLOWED_TYPES || ''
)
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const allowedMimes = configuredAllowedMimes.length ? configuredAllowedMimes : DEFAULT_ALLOWED_MIMES;

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter(req, file, cb) {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'), false);
  },
  limits: {
    fileSize: MAX_UPLOAD_BYTES
  }
});

const brandingUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter(req, file, cb) {
    const allowedImageMimes = new Set(['image/jpeg', 'image/png']);
    if (allowedImageMimes.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    const typeError = new Error('Invalid image type. Only JPEG and PNG files are allowed.');
    typeError.fieldName = file.fieldname;
    cb(typeError, false);
  },
  limits: {
    fileSize: MAX_UPLOAD_BYTES
  }
});

const r2Config = {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  bucket: process.env.R2_BUCKET,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  endpoint: process.env.R2_ENDPOINT
};

const r2Client = isR2Configured()
  ? new S3Client({
      region: 'auto',
      endpoint: r2Config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey
      }
    })
  : null;

exports.uploadOrganizerDocs = (req, res, next) => {
  const uploadFields = upload.fields([
    { name: 'idProof', maxCount: 1 },
    { name: 'businessProof', maxCount: 1 }
  ]);

  uploadFields(req, res, (err) => {
    handleMulterError(err, req, res, next);
  });
};

exports.uploadEventBranding = (req, res, next) => {
  const uploadFields = brandingUpload.fields([
    { name: 'bannerImageFile', maxCount: 1 },
    { name: 'logoFile', maxCount: 1 },
    { name: 'posterImageFile', maxCount: 1 },
    { name: 'galleryImageFiles', maxCount: 12 }
  ]);

  uploadFields(req, res, (err) => {
    if (!err) {
      req.uploadError = null;
      req.uploadErrorField = null;
      next();
      return;
    }
    req.uploadErrorField = err.field || err.fieldName || null;
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      req.uploadError = `Branding image exceeds ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)}MB limit.`;
    } else {
      req.uploadError = err.message || 'Branding upload failed.';
    }
    next();
  });
};

exports.uploadBlogCover = (req, res, next) => {
  const uploadSingle = brandingUpload.single('coverImageFile');

  uploadSingle(req, res, (err) => {
    if (!err) {
      req.uploadError = null;
      req.uploadErrorField = null;
      next();
      return;
    }
    req.uploadErrorField = err.field || err.fieldName || 'coverImageFile';
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      req.uploadError = `Cover image exceeds ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)}MB limit.`;
    } else {
      req.uploadError = err.message || 'Cover upload failed.';
    }
    next();
  });
};

exports.uploadOrganizerDocsToR2 = async ({ userId, idProofFile, businessProofFile }) => {
  assertR2Configured();

  const idProof = await uploadFileToR2({
    userId,
    file: idProofFile,
    category: 'organizer-docs/id-proof'
  });
  const businessProof = await uploadFileToR2({
    userId,
    file: businessProofFile,
    category: 'organizer-docs/business-proof'
  });

  return { idProof, businessProof };
};

exports.uploadEventBrandingToR2 = async ({ userId, bannerImageFile, logoFile, posterImageFile, galleryImageFiles }) => {
  assertR2Configured();

  const result = {};

  if (bannerImageFile) {
    result.banner = await uploadFileToR2({
      userId,
      file: bannerImageFile,
      category: 'event-branding/banner'
    });
  }

  if (logoFile) {
    result.logo = await uploadFileToR2({
      userId,
      file: logoFile,
      category: 'event-branding/logo'
    });
  }

  if (posterImageFile) {
    result.poster = await uploadFileToR2({
      userId,
      file: posterImageFile,
      category: 'event-branding/poster'
    });
  }

  const galleryFiles = Array.isArray(galleryImageFiles) ? galleryImageFiles : [];
  if (galleryFiles.length) {
    result.gallery = [];
    for (const galleryFile of galleryFiles) {
      const uploadedGallery = await uploadFileToR2({
        userId,
        file: galleryFile,
        category: 'event-branding/gallery'
      });
      result.gallery.push(uploadedGallery);
    }
  }

  return result;
};

exports.uploadBlogCoverToR2 = async ({ userId, coverImageFile }) => {
  assertR2Configured();
  if (!coverImageFile) {
    throw new Error('Cover image file is required.');
  }
  return uploadFileToR2({
    userId,
    file: coverImageFile,
    category: 'blog/covers'
  });
};

exports.deleteObjects = async (keys = []) => {
  if (!r2Client || !r2Config.bucket) return;

  const validKeys = keys
    .map((key) => String(key || '').trim())
    .filter(Boolean);

  await Promise.all(
    validKeys.map(async (key) => {
      try {
        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: r2Config.bucket,
            Key: key
          })
        );
      } catch (error) {
        console.error(`[R2] Failed to delete object ${key}:`, error.message);
      }
    })
  );
};

exports.extractObjectKeyFromPublicUrl = (urlValue) => {
  const fullUrl = String(urlValue || '').trim();
  if (!fullUrl) return '';

  const customBase = String(process.env.R2_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
  if (customBase && fullUrl.startsWith(`${customBase}/`)) {
    return fullUrl.slice(customBase.length + 1);
  }

  const endpoint = String(r2Config.endpoint || '').trim().replace(/\/+$/, '');
  if (endpoint && r2Config.bucket) {
    const bucketPrefix = `${endpoint}/${r2Config.bucket}/`;
    if (fullUrl.startsWith(bucketPrefix)) {
      return fullUrl.slice(bucketPrefix.length);
    }
  }

  return '';
};

function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File size exceeds ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)}MB limit.`
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
}

async function uploadFileToR2({ userId, file, category }) {
  if (!file || !file.buffer || !file.originalname) {
    throw new Error('Invalid file payload.');
  }

  const extension = getSafeExtension(file.originalname);
  const originalBase = String(file.originalname).replace(/\.[^.]+$/, '');
  const sanitizedBase = originalBase.replace(/[^a-z0-9_-]/gi, '_').toLowerCase().slice(0, 80) || 'file';
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const key = `${category}/${String(userId || 'unknown')}/${uniqueSuffix}-${sanitizedBase}${extension}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: r2Config.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    })
  );

  return {
    key,
    url: buildPublicUrl(key)
  };
}

function buildPublicUrl(key) {
  const customBase = String(process.env.R2_PUBLIC_BASE_URL || '').trim();
  if (customBase) {
    return `${customBase.replace(/\/+$/, '')}/${key}`;
  }

  const endpoint = String(r2Config.endpoint || '').replace(/\/+$/, '');
  if (endpoint && r2Config.bucket) {
    return `${endpoint}/${r2Config.bucket}/${key}`;
  }

  throw new Error('Cannot build public URL for R2 object. Set R2_PUBLIC_BASE_URL.');
}

function getSafeExtension(fileName) {
  const parts = String(fileName || '').split('.');
  if (parts.length < 2) return '';
  const ext = parts.pop().toLowerCase().replace(/[^a-z0-9]/g, '');
  return ext ? `.${ext}` : '';
}

function isR2Configured() {
  return Boolean(
    r2Config.accountId &&
      r2Config.bucket &&
      r2Config.accessKeyId &&
      r2Config.secretAccessKey &&
      r2Config.endpoint
  );
}

function assertR2Configured() {
  if (!isR2Configured()) {
    throw new Error(
      'R2 is not fully configured. Set CLOUDFLARE_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ENDPOINT.'
    );
  }
}
