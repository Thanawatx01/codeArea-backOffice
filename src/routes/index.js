const express = require('express');
// # Main Router
// # ศูนย์รวมเส้นทาง (Routes) ทั้งหมดของระบบ Backend
// # Module Imports -> Router Setup -> Route Registration -> Export
const router = express.Router();

// # step 1: นำเข้า Route Modules จากไฟล์ย่อยต่างๆ
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
const achievements = require('./achievements');
const audit = require('./auditRoutes');

// # step 2: ลงทะเบียนเส้นทาง (Routing Registration) ตาม Resource
router.use('/auth', auth);
router.use('/tags', tags);
router.use('/question-categories', questionCategories);
router.use('/users', users);
router.use('/questions', questions);
router.use('/question', questions);
router.use('/submissions', submissions);
router.use('/submission-test-cases', submissionTestCases);
router.use('/user-activities', userActivities);
router.use('/executor', executor);
router.use('/test-cases', testCases);
router.use('/settings', settings);
router.use('/leaderboard', leaderboard);
router.use('/dashboard', dashboard);
router.use('/ai-tutor', aiTutor);
router.use('/achievements', achievements);
router.use('/audit', audit);

module.exports = router;
