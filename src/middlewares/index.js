const { errorHandler } = require('./errorHandler');
const { requireAuth } = require('./requireAuth');
const { uploadPdf } = require('./uploadPdf');
const { uploadImage } = require('./uploadImage');

module.exports = { errorHandler, requireAuth, uploadPdf, uploadImage };
