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
  POINT_LOGS: 'point_logs',
  AI_FEEDBACK: 'ai_feedback',
};

// Use backend-only SUPABASE_SECRET_KEY client for custom-auth DB access behind RLS.
const from = (tableName) => supabaseAdmin.from(tableName);

module.exports = {
  supabase,
  supabaseAdmin,
  TABLE_NAMES,
  from,
};
