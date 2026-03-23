const { errorHandler } = require('./errorHandler');
const { requireAuth } = require('./requireAuth');
const { uploadPdf } = require('./uploadPdf');

module.exports = { errorHandler, requireAuth, uploadPdf };
