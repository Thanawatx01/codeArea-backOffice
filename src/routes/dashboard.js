const router = require('express').Router();
const { requireAuth } = require('../middlewares');
const dashboardController = require('../controllers/dashboardController');

router.get('/', requireAuth, dashboardController.overview);

module.exports = router;
