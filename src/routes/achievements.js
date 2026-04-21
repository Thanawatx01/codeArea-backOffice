const express = require('express');
const router = express.Router();
const achievementsController = require('../controllers/achievementsController');
const { requireAuth, isAdmin } = require('../middlewares');

// All achievement management routes require admin privileges
router.get('/', requireAuth, achievementsController.list);
router.post('/', requireAuth, isAdmin, achievementsController.create);
router.put('/:id', requireAuth, isAdmin, achievementsController.update);
router.delete('/:id', requireAuth, isAdmin, achievementsController.delete);

module.exports = router;
