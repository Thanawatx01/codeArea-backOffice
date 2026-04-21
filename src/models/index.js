// # Models Provider
// # แหล่งรวมชื่อตารางและฟังก์ชันการจัดการฐานข้อมูล (Supabase)
// # Config -> Table Names -> Database Helper -> Export
const { supabase, supabaseAdmin } = require('../config/supabase');

// # step 1: กำหนดชื่อตารางทั้งหมดในระบบ (Constants)
const TABLE_NAMES = {
  TAGS: 'tags',
  QUESTION_CATEGORIES: 'question_categories',
  USERS: 'users',
  LANGUAGES: 'languages',
  QUESTIONS: 'questions',
  QUESTION_TAG: 'question_tag',
  TEST_CASES: 'test_cases',
  SUBMISSIONS: 'submissions',
  SUBMISSION_TEST_CASES: 'submission_test_cases',
  POINT_LOGS: 'point_logs',
  AI_FEEDBACK: 'ai_feedback',
  USER_STREAKS: 'user_streaks',
  ACHIEVEMENTS: 'achievements',
  USER_ACHIEVEMENTS: 'user_achievements',
  USER_SKILLS: 'user_skills',
  AUDIT_LOGS: 'audit_logs',
};

// # step 2: สร้าง Helper Function สำหรับเข้าถึงตารางโดยใช้ Admin Role (Bypass RLS)
const from = (tableName) => supabaseAdmin.from(tableName);

module.exports = {
  supabase,
  supabaseAdmin,
  TABLE_NAMES,
  from,
};
