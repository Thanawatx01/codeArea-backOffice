const router = require('express').Router();
const { requireAuth } = require('../middlewares');
const submissionsController = require('../controllers/submissionsController');

router.get('/', requireAuth, submissionsController.list);
router.post('/sample-run', requireAuth, submissionsController.sampleRun);
router.get('/:pid', requireAuth, submissionsController.getById);
router.post('/', requireAuth, submissionsController.create);

module.exports = router;
