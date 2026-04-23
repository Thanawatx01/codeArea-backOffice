const { from, TABLE_NAMES } = require('../models/index');

const getQuestionReport = async (req, res, next) => {
  try {
    const { code } = req.params;

    // 1. Query Question
    const { data: question, error: qError } = await from(TABLE_NAMES.QUESTIONS)
      .select(`
        id, 
        code, 
        title, 
        difficulty, 
        status, 
        created_at,
        category_id,
        question_categories ( id, name )
      `)
      .eq('code', code)
      .single();

    if (qError || !question) {
      return res.status(404).json({ message: 'ไม่พบคำถาม', error: 'NOT_FOUND' });
    }

    const questionId = question.id;

    // 2. Query Test Cases count for this question
    const { count: testCasesCount, error: tcError } = await from(TABLE_NAMES.TEST_CASES)
      .select('id', { count: 'exact', head: true })
      .eq('question_id', questionId);

    if (tcError) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล test cases', error: 'DB', code: tcError.code });
    }

    // 3. Query Submissions and link to Submission Test Cases
    // Using Supabase foreign key relation: submission_test_cases connected to submissions
    const { data: submissions, error: subError } = await from(TABLE_NAMES.SUBMISSIONS)
      .select(`
        id,
        user_id,
        status,
        created_at,
        submission_test_cases (
          id,
          test_case_id,
          status,
          run_time,
          memory_used
        )
      `)
      .eq('question_id', questionId);

    if (subError) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล submissions', error: 'DB', code: subError.code });
    }

    // 4. Calculate stats for submissions and their test cases
    let passedSubmissions = 0;
    let failedSubmissions = 0;
    let totalPassedAndFailedSubmissions = 0;

    const enrichedSubmissions = (submissions || []).map((sub) => {
      // Calculate submission status
      if (sub.status === 3) {
        passedSubmissions += 1;
      } else {
        failedSubmissions += 1;
      }

      // Calculate test case pass/fail for this submission
      let passedTestCases = 0;
      let failedTestCases = 0;

      (sub.submission_test_cases || []).forEach((tc) => {
        if (tc.status === 3) {
          passedTestCases += 1;
        } else {
          failedTestCases += 1;
        }
      });

      return {
        ...sub,
        test_case_stats: {
          passed: passedTestCases,
          failed: failedTestCases,
          total_evaluated: passedTestCases + failedTestCases
        }
      };
    });

    totalPassedAndFailedSubmissions = passedSubmissions + failedSubmissions;

    const report = {
      Category_id: question.category_id,
      category: question.question_categories ? question.question_categories.name : null,
      question: {
        id: question.id,
        code: question.code,
        title: question.title,
        difficulty: question.difficulty
      },
      test_cases_count: testCasesCount || 0,
      stats: {
        total_attempt: (submissions || []).length,           // All records (was total_submissions)
        total_finish: passedSubmissions,                     // Submissions that passed
        total_unfinish: failedSubmissions,                   // Submissions that failed
        total_evaluated: totalPassedAndFailedSubmissions     // Total sum
      },
      submissions: enrichedSubmissions
    };

    return res.status(200).json(report);

  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

module.exports = {
  getQuestionReport
};
