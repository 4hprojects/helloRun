const multer = require('multer');
const logger = require('../utils/logger');
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command
} = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const DEFAULT_ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const DEFAULT_RESULT_ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES = parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 5242880;

const configuredAllowedMimes = String(
  process.env.ALLOWED_FILE_TYPES || process.env.UPLOAD_ALLOWED_TYPES || ''
)
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const allowedMimes = configuredAllowedMimes.length ? configuredAllowedMimes : DEFAULT_ALLOWED_MIMES;
const configuredResultAllowedMimes = String(
  process.env.RESULT_UPLOAD_ALLOWED_TYPES || process.env.UPLOAD_RESULT_ALLOWED_TYPES || ''
)
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const resultAllowedMimes = configuredResultAllowedMimes.length
  ? configuredResultAllowedMimes
  : DEFAULT_RESULT_ALLOWED_MIMES;

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter(req, file, cb) {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed.'), false);
  },
  limits: {
    fileSize: MAX_UPLOAD_BYTES
  }
});

const resultProofUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter(req, file, cb) {
    if (resultAllowedMimes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP files are allowed.'), false);
  },
  limits: {
    fileSize: MAX_UPLOAD_BYTES
  }
});

const brandingUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter(req, file, cb) {
    const allowedImageMimes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (allowedImageMimes.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    const typeError = new Error('Invalid image type. Only JPEG, PNG, and WebP files are allowed.');
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
    { name: 'paymentQrImageFile', maxCount: 1 },
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

exports.uploadCertificateAssets = (req, res, next) => {
  const uploadFields = brandingUpload.fields([
    { name: 'backgroundImageFile', maxCount: 1 },
    { name: 'organizerLogoFile', maxCount: 1 },
    { name: 'eventLogoFile', maxCount: 1 },
    { name: 'eventArtworkFile', maxCount: 1 },
    { name: 'signatureImageFile', maxCount: 1 },
    { name: 'sponsorLogoFiles', maxCount: 6 }
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
      req.uploadError = `Certificate image exceeds ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)}MB limit.`;
    } else {
      req.uploadError = err.message || 'Certificate asset upload failed.';
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

exports.uploadBlogAssets = (req, res, next) => {
  const uploadFields = brandingUpload.fields([
    { name: 'coverImageFile', maxCount: 1 },
    { name: 'galleryImageFiles', maxCount: 3 }
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
      req.uploadError = `Blog image exceeds ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)}MB limit.`;
    } else {
      req.uploadError = err.message || 'Blog upload failed.';
    }
    next();
  });
};

exports.uploadAvatarImage = (req, res, next) => {
  const avatarUpload = brandingUpload.single('avatarImageFile');
  avatarUpload(req, res, (err) => {
    if (!err) { req.uploadError = null; next(); return; }
    req.uploadError = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
      ? `Avatar image exceeds ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)}MB limit.`
      : (err.message || 'Avatar upload failed.');
    next();
  });
};

exports.uploadBadgeImage = (req, res, next) => {
  const badgeUpload = brandingUpload.single('badgeImageFile');
  badgeUpload(req, res, (err) => {
    if (!err) { req.uploadError = null; next(); return; }
    req.uploadError = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
      ? `Badge image exceeds ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)}MB limit.`
      : (err.message || 'Badge image upload failed.');
    next();
  });
};

exports.uploadPaymentProof = (req, res, next) => {
  const uploadSingle = upload.single('paymentProofFile');

  uploadSingle(req, res, (err) => {
    if (!err) {
      req.uploadError = null;
      req.uploadErrorField = null;
      next();
      return;
    }
    req.uploadErrorField = err.field || err.fieldName || 'paymentProofFile';
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      req.uploadError = `Payment receipt exceeds ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)}MB limit.`;
    } else {
      req.uploadError = err.message || 'Payment receipt upload failed.';
    }
    next();
  });
};

exports.uploadResultProof = (req, res, next) => {
  const uploadSingle = resultProofUpload.single('resultProofFile');

  uploadSingle(req, res, (err) => {
    if (!err) {
      req.uploadError = null;
      req.uploadErrorField = null;
      next();
      return;
    }
    req.uploadErrorField = err.field || err.fieldName || 'resultProofFile';
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      req.uploadError = `Run result evidence exceeds ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)}MB limit.`;
    } else {
      req.uploadError = err.message || 'Run result evidence upload failed.';
    }
    next();
  });
};

exports.uploadOrganizerDocsToR2 = async ({ userId, idProofFile, businessProofFile }) => {
  assertR2Configured();

  const idProof = idProofFile
    ? await uploadFileToR2({
        userId,
        file: idProofFile,
        category: 'organizer-docs/id-proof',
        label: 'id-proof'
      })
    : null;
  const businessProof = businessProofFile
    ? await uploadFileToR2({
        userId,
        file: businessProofFile,
        category: 'organizer-docs/business-proof',
        label: 'business-proof'
      })
    : null;

  return { idProof, businessProof };
};

exports.uploadEventBrandingToR2 = async ({
  userId,
  slug,
  bannerImageFile,
  logoFile,
  posterImageFile,
  paymentQrImageFile,
  galleryImageFiles
}) => {
  assertR2Configured();

  const safeSlug = slug
    ? String(slug).replace(/[^a-z0-9_-]/gi, '-').toLowerCase().replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
    : null;

  const result = {};

  if (bannerImageFile) {
    result.banner = await uploadFileToR2({
      userId,
      file: bannerImageFile,
      category: 'event-branding/banner',
      label: safeSlug ? `${safeSlug}-banner` : 'banner'
    });
  }

  if (logoFile) {
    result.logo = await uploadFileToR2({
      userId,
      file: logoFile,
      category: 'event-branding/logo',
      label: safeSlug ? `${safeSlug}-logo` : 'logo'
    });
  }

  if (posterImageFile) {
    result.poster = await uploadFileToR2({
      userId,
      file: posterImageFile,
      category: 'event-branding/poster',
      label: safeSlug ? `${safeSlug}-poster` : 'poster'
    });
  }

  if (paymentQrImageFile) {
    result.paymentQr = await uploadFileToR2({
      userId,
      file: paymentQrImageFile,
      category: 'event-payments/qr',
      label: safeSlug ? `${safeSlug}-payment-qr` : 'payment-qr'
    });
  }

  const galleryFiles = Array.isArray(galleryImageFiles) ? galleryImageFiles : [];
  if (galleryFiles.length) {
    result.gallery = [];
    for (const [i, galleryFile] of galleryFiles.entries()) {
      // eslint-disable-next-line no-await-in-loop
      const uploadedGallery = await uploadFileToR2({
        userId,
        file: galleryFile,
        category: 'event-branding/gallery',
        label: safeSlug ? `${safeSlug}-gallery-${i + 1}` : `gallery-${i + 1}`
      });
      result.gallery.push(uploadedGallery);
    }
  }

  return result;
};

exports.uploadCertificateAssetsToR2 = async ({
  userId,
  eventId,
  backgroundImageFile,
  organizerLogoFile,
  eventLogoFile,
  eventArtworkFile,
  signatureImageFile,
  sponsorLogoFiles
}) => {
  assertR2Configured();
  const safeEventId = String(eventId || 'event').replace(/[^a-z0-9_-]/gi, '-').slice(0, 80);
  const result = {};

  if (backgroundImageFile) {
    result.background = await uploadFileToR2({
      userId,
      file: backgroundImageFile,
      category: `events/${safeEventId}/certificate-assets/backgrounds`,
      label: 'certificate-background'
    });
  }
  if (organizerLogoFile) {
    result.organizerLogo = await uploadFileToR2({
      userId,
      file: organizerLogoFile,
      category: `events/${safeEventId}/certificate-assets/logos`,
      label: 'organizer-logo'
    });
  }
  if (eventLogoFile) {
    result.eventLogo = await uploadFileToR2({
      userId,
      file: eventLogoFile,
      category: `events/${safeEventId}/certificate-assets/logos`,
      label: 'event-logo'
    });
  }
  if (eventArtworkFile) {
    result.eventArtwork = await uploadFileToR2({
      userId,
      file: eventArtworkFile,
      category: `events/${safeEventId}/certificate-assets/artwork`,
      label: 'event-artwork'
    });
  }
  if (signatureImageFile) {
    result.signature = await uploadFileToR2({
      userId,
      file: signatureImageFile,
      category: `events/${safeEventId}/certificate-assets/signatures`,
      label: 'signature'
    });
  }

  const sponsorFiles = Array.isArray(sponsorLogoFiles) ? sponsorLogoFiles : [];
  if (sponsorFiles.length) {
    result.sponsorLogos = [];
    for (const [index, file] of sponsorFiles.entries()) {
      // eslint-disable-next-line no-await-in-loop
      const uploaded = await uploadFileToR2({
        userId,
        file,
        category: `events/${safeEventId}/certificate-assets/sponsors`,
        label: `sponsor-${index + 1}`
      });
      result.sponsorLogos.push(uploaded);
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

exports.uploadBlogGalleryToR2 = async ({ userId, galleryImageFiles }) => {
  assertR2Configured();
  const galleryFiles = Array.isArray(galleryImageFiles) ? galleryImageFiles : [];
  if (!galleryFiles.length) {
    return [];
  }

  const uploads = [];
  for (const galleryImageFile of galleryFiles) {
    // eslint-disable-next-line no-await-in-loop
    const uploaded = await uploadFileToR2({
      userId,
      file: galleryImageFile,
      category: 'blog/gallery'
    });
    uploads.push(uploaded);
  }
  return uploads;
};

exports.uploadPaymentProofToR2 = async ({ userId, paymentProofFile }) => {
  assertR2Configured();
  if (!paymentProofFile) {
    throw new Error('Payment receipt file is required.');
  }
  return uploadFileToR2({
    userId,
    file: paymentProofFile,
    category: 'payments/proofs'
  });
};

exports.uploadResultProofToR2 = async ({ userId, resultProofFile }) => {
  assertR2Configured();
  if (!resultProofFile) {
    throw new Error('Run result evidence file is required.');
  }
  return uploadFileToR2({
    userId,
    file: resultProofFile,
    category: 'results/proofs'
  });
};

exports.uploadBufferToR2 = async ({ userId, buffer, contentType, category, fileName }) => {
  assertR2Configured();
  if (!buffer || !Buffer.isBuffer(buffer) || !buffer.length) {
    throw new Error('Binary file buffer is required.');
  }

  const extension = getSafeExtension(fileName || 'file.bin');
  const originalBase = String(fileName || 'file').replace(/\.[^.]+$/, '');
  const sanitizedBase = originalBase.replace(/[^a-z0-9_-]/gi, '_').toLowerCase().slice(0, 80) || 'file';
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const baseCategory = String(category || 'misc/files').replace(/^\/+|\/+$/g, '');
  const scopedCategory = scopeCategoryForSmokeTests(baseCategory);
  const key = `${scopedCategory}/${String(userId || 'unknown')}/${uniqueSuffix}-${sanitizedBase}${extension}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: r2Config.bucket,
      Key: key,
      Body: buffer,
      ContentType: String(contentType || 'application/octet-stream')
    })
  );

  return {
    key,
    url: buildPublicUrl(key)
  };
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
        logger.error(`[R2] Failed to delete object ${key}:`, error.message);
      }
    })
  );
};

exports.listObjectKeysByPrefix = async (prefix) => {
  if (!r2Client || !r2Config.bucket) return [];

  const safePrefix = String(prefix || '').trim().replace(/^\/+/, '');
  if (!safePrefix) return [];

  const keys = [];
  let continuationToken;

  do {
    const response = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: r2Config.bucket,
        Prefix: safePrefix,
        ContinuationToken: continuationToken
      })
    );

    const objects = Array.isArray(response.Contents) ? response.Contents : [];
    for (const object of objects) {
      const key = String(object?.Key || '').trim();
      if (key) keys.push(key);
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
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

exports.getSignedReadUrlFromR2 = async (key, options = {}) => {
  assertR2Configured();
  const safeKey = String(key || '').trim().replace(/^\/+/, '');
  if (!safeKey) {
    throw new Error('R2 object key is required.');
  }

  const commandInput = {
    Bucket: r2Config.bucket,
    Key: safeKey
  };

  if (options.contentDisposition) {
    commandInput.ResponseContentDisposition = String(options.contentDisposition);
  }
  if (options.contentType) {
    commandInput.ResponseContentType = String(options.contentType);
  }

  return getSignedUrl(r2Client, new GetObjectCommand(commandInput), {
    expiresIn: Number(options.expiresIn || 300)
  });
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

async function uploadFileToR2({ userId, file, category, label, convertImagesToWebp = true }) {
  if (!file || !file.buffer || !file.originalname) {
    throw new Error('Invalid file payload.');
  }

  const normalizedFile = await normalizeFileForUpload(file, { convertImagesToWebp });
  const extension = normalizedFile.extension || getSafeExtension(file.originalname);
  let sanitizedBase;
  if (label) {
    sanitizedBase = String(label).replace(/[^a-z0-9_-]/gi, '-').toLowerCase().replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'file';
  } else {
    const originalBase = String(file.originalname).replace(/\.[^.]+$/, '');
    sanitizedBase = originalBase.replace(/[^a-z0-9_-]/gi, '_').toLowerCase().slice(0, 80) || 'file';
  }
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const scopedCategory = scopeCategoryForSmokeTests(String(category || 'misc/files'));
  const key = `${scopedCategory}/${String(userId || 'unknown')}/${uniqueSuffix}-${sanitizedBase}${extension}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: r2Config.bucket,
      Key: key,
      Body: normalizedFile.buffer,
      ContentType: normalizedFile.contentType
    })
  );

  return {
    key,
    url: buildPublicUrl(key)
  };
}

// Magic-byte signatures for files stored verbatim (not re-encoded through sharp).
// The multer fileFilter only sees the client-supplied MIME type, which is spoofable;
// this confirms the bytes actually match the declared type before they reach R2.
const MAGIC_BYTE_CHECKS = {
  'application/pdf': (buffer) => buffer.subarray(0, 5).toString('latin1') === '%PDF-',
  'image/webp': (buffer) =>
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP',
  'image/jpeg': (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  'image/png': (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
};

function assertDeclaredTypeMatchesBytes(file) {
  const check = MAGIC_BYTE_CHECKS[String(file.mimetype || '')];
  if (!check) return;
  const buffer = file.buffer || Buffer.alloc(0);
  if (buffer.length < 12 || !check(buffer)) {
    throw new Error(`File content does not match the declared type (${file.mimetype}).`);
  }
}

async function normalizeFileForUpload(file, options = {}) {
  const shouldConvertImage = options.convertImagesToWebp !== false
    && String(file.mimetype || '').startsWith('image/')
    && file.mimetype !== 'image/webp';

  if (!shouldConvertImage) {
    // Files on this branch (PDFs, webp, or images when conversion is disabled) are
    // stored verbatim — sharp never sees them, so verify the bytes here instead.
    assertDeclaredTypeMatchesBytes(file);
    return {
      buffer: file.buffer,
      contentType: file.mimetype,
      extension: getExtensionForContentType(file.mimetype) || getSafeExtension(file.originalname)
    };
  }

  const buffer = await sharp(file.buffer)
    .rotate()
    .webp({ quality: 82 })
    .toBuffer();

  return {
    buffer,
    contentType: 'image/webp',
    extension: '.webp'
  };
}

exports._normalizeFileForUpload = normalizeFileForUpload;

function buildPublicUrl(key) {
  const customBase = String(process.env.R2_PUBLIC_BASE_URL || '').trim();
  if (customBase) {
    return `${customBase.replace(/\/+$/, '')}/${key}`;
  }

  throw new Error('Cannot build public URL for R2 object. Set R2_PUBLIC_BASE_URL to a public bucket URL or custom domain.');
}

function getSafeExtension(fileName) {
  const parts = String(fileName || '').split('.');
  if (parts.length < 2) return '';
  const ext = parts.pop().toLowerCase().replace(/[^a-z0-9]/g, '');
  return ext ? `.${ext}` : '';
}

function getExtensionForContentType(contentType) {
  switch (String(contentType || '').toLowerCase()) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'application/pdf':
      return '.pdf';
    default:
      return '';
  }
}

function scopeCategoryForSmokeTests(category) {
  const safeCategory = String(category || 'misc/files').replace(/^\/+|\/+$/g, '');
  const runId = getSmokeTestRunId();
  if (!runId) return safeCategory;
  return `smoke-tests/${runId}/${safeCategory}`;
}

function getSmokeTestRunId() {
  if (process.env.SMOKE_TEST_OBJECT_PREFIX === '0') return '';
  const runId = String(process.env.SMOKE_TEST_RUN_ID || '').trim();
  return runId.replace(/[^a-zA-Z0-9._-]/g, '-');
}

exports._scopeCategoryForSmokeTests = scopeCategoryForSmokeTests;

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
