const { supabase, supabaseAdmin } = require('../config/supabase');

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
  AI_FEEDBACK: 'ai_feedback',
};

// ใช้ supabaseAdmin เพื่อ bypass RLS (ต้องมี SUPABASE_SERVICE_ROLE_KEY ใน .env)
const from = (tableName) => supabaseAdmin.from(tableName);

module.exports = {
  supabase,
  supabaseAdmin,
  TABLE_NAMES,
  from,
};
