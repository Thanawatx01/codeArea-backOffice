const router = require('express').Router();
const { requireAuth } = require('../middlewares');
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', requireAuth,authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.me);

module.exports = router;
