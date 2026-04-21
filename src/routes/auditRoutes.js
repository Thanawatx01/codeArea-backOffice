const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { requireAuth, isAdmin } = require('../middlewares');

// All audit routes require admin privileges
router.use(requireAuth, isAdmin);

router.get('/', auditController.getAuditLogs);
router.get('/types', auditController.getActionTypes);

module.exports = router;
