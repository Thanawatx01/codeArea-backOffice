const path = require('path');
const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfExt = path.extname(file.originalname || '').toLowerCase() === '.pdf';
  if (isPdfMime || isPdfExt) return cb(null, true);
  return cb(new Error('อนุญาตเฉพาะไฟล์ PDF เท่านั้น'));
};

const uploadPdf = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = { uploadPdf };
