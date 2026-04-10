const router = require('express').Router();
const { requireAuth } = require('../middlewares');
const userActivitiesController = require('../controllers/userActivitiesController');

router.get('/', requireAuth, userActivitiesController.list);

module.exports = router;
