const express = require('express');
const router = express.Router();

const auth = require('./auth');
const tags = require('./tags');
const questionCategories = require('./questionCategories');
const users = require('./users');
const languages = require('./languages');
const questions = require('./questions');
const questionTag = require('./questionTag');
const testCases = require('./testCases');
const submissions = require('./submissions');
const submissionTestCases = require('./submissionTestCases');
const aiFeedback = require('./aiFeedback');

router.use('/auth', auth);
router.use('/tags', tags);
router.use('/question-categories', questionCategories);
router.use('/users', users);
router.use('/languages', languages);
router.use('/questions', questions);
router.use('/question-tags', questionTag);
router.use('/test-cases', testCases);
router.use('/submissions', submissions);
router.use('/submission-test-cases', submissionTestCases);
router.use('/ai-feedback', aiFeedback);

module.exports = router;
