const router = require('express').Router();
const { requireAuth } = require('../middlewares');
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);

module.exports = router;

// 200 ok (get update delete)
// 201 created (post)
// 400 bad request (all method)
// 404 not found (all method)
// 405 method not allowed (all method)
// 500 internal server error (all method)