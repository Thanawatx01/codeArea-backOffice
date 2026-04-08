const router = require('express').Router();
const { requireAuth } = require('../middlewares');
const leaderboardController = require('../controllers/leaderboardController');

router.get('/', requireAuth, leaderboardController.get);

module.exports = router;
