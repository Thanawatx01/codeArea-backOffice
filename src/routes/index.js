const express = require('express');
const router = express.Router();

const auth = require('./auth');
const tags = require('./tags');
const questionCategories = require('./questionCategories');
const users = require('./users');
const questions = require('./questions');
const submissions = require('./submissions');
const submissionTestCases = require('./submissionTestCases');
const userActivities = require('./userActivities');
const executor = require('./executor');
const testCases = require('./testCases');

const settings = require('./settings');
const leaderboard = require('./leaderboard');
const dashboard = require('./dashboard');
const aiTutor = require('./aiTutor');

router.use('/auth', auth);
router.use('/tags', tags);
router.use('/question-categories', questionCategories);
router.use('/users', users);
router.use('/questions', questions);
router.use('/question', questions);
router.use('/submissions', submissions);
router.use('/submission-test-cases', submissionTestCases);
router.use('/ai-feedback', aiFeedback);
router.use('/user-activities', userActivities);
router.use('/executor', executor);
router.use('/test-cases', testCases);
router.use('/settings', settings);
router.use('/leaderboard', leaderboard);
router.use('/dashboard', dashboard);
router.use('/ai-tutor', aiTutor);
router.use('/reports', reports);

module.exports = router;
