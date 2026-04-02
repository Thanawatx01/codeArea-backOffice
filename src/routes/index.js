const express = require('express');
const router = express.Router();

const auth = require('./auth');
const tags = require('./tags');
const questionCategories = require('./questionCategories');
const users = require('./users');
const questions = require('./questions');
const submissions = require('./submissions');
const submissionTestCases = require('./submissionTestCases');
const executor = require('./executor');
const testCases = require('./testCases');

router.use('/auth', auth);
router.use('/tags', tags);
router.use('/question-categories', questionCategories);
router.use('/users', users);
router.use('/questions', questions);
router.use('/submissions', submissions);
router.use('/submission-test-cases', submissionTestCases);
router.use('/executor', executor);
router.use('/test-cases', testCases);

module.exports = router;
