const router = require('express').Router();
const submissionsController = require('../controllers/submissionsController');

router.get('/', submissionsController.list);
router.get('/:id', submissionsController.getById);
router.post('/', submissionsController.create);

module.exports = router;
