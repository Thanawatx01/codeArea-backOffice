const multer = require('multer');
const path = require('path');

// Use memory storage for processing if needed, or disk storage
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, PNG, WEBP, GIF) are allowed'), false);
  }
};

const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

module.exports = { uploadImage };
