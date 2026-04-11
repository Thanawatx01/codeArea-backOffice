const { from, TABLE_NAMES } = require('../models/index');

/**
 * Get aggregated dashboard statistics
 */
const getSummary = async (req, res) => {
  try {
    // 1. Basic Counts (Total Questions, Users, Admins, Test Cases)
    const [
      { count: questions_total },
      { count: users_total },
      { count: admins_total },
      { count: test_cases_total }
    ] = await Promise.all([
      from(TABLE_NAMES.QUESTIONS).select('*', { count: 'exact', head: true }),
      from(TABLE_NAMES.USERS).select('*', { count: 'exact', head: true }),
      from(TABLE_NAMES.USERS).select('*', { count: 'exact', head: true }).eq('role_id', 2),
      from(TABLE_NAMES.TEST_CASES).select('*', { count: 'exact', head: true })
    ]);

    // 2. Submission Statistics (Accepted vs Others)
    // SUBMISSION_ACCEPTED is typically 1 based on submissionsController constants
    const { count: successful_submissions } = await from(TABLE_NAMES.SUBMISSIONS)
      .select('*', { count: 'exact', head: true })
      .eq('status', 1);

    const { count: total_submissions } = await from(TABLE_NAMES.SUBMISSIONS)
      .select('*', { count: 'exact', head: true });

    const accepted = successful_submissions || 0;
    const total = total_submissions || 0;
    const not_accepted = Math.max(0, total - accepted);

    // 3. Recent Activity & User Stats Aggregation
    // We'll fetch the last 100 submissions to build a reasonably fresh activity list and top questions
    const { data: recentSubs, error: subError } = await from(TABLE_NAMES.SUBMISSIONS)
      .select(`
        user_id,
        status,
        created_at,
        question_id,
        users ( display_name, email ),
        questions ( code, title )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (subError) throw subError;

    // Aggregating Recent User Activity
    const userStatsMap = new Map();
    (recentSubs || []).forEach(sub => {
      const uid = sub.user_id;
      if (!userStatsMap.has(uid) && userStatsMap.size < 10) {
        userStatsMap.set(uid, {
          user_id: uid,
          display_name: sub.users?.display_name || sub.users?.email?.split('@')[0] || 'Unknown',
          email: sub.users?.email || '',
          last_submission_at: sub.created_at,
          total_attempt: 0,
          total_finished: 0,
          submissions_passed: 0,
          submissions_not_passed: 0
        });
      }

      const stats = userStatsMap.get(uid);
      if (stats) {
        stats.total_attempt += 1;
        if (sub.status === 1) { // Accepted
          stats.submissions_passed += 1;
          stats.total_finished = 1; // Mark as having finished at least one
        } else {
          stats.submissions_not_passed += 1;
        }
      }
    });

    const recent_user_activity = Array.from(userStatsMap.values());

    // Aggregating Top Questions
    const questionStatsMap = new Map();
    (recentSubs || []).forEach(sub => {
      const qid = sub.question_id;
      if (!questionStatsMap.has(qid)) {
        questionStatsMap.set(qid, {
          question_id: qid,
          code: sub.questions?.code || 'N/A',
          title: sub.questions?.title || 'Unknown Question',
          submission_count: 0
        });
      }
      questionStatsMap.get(qid).submission_count += 1;
    });

    const top_questions = Array.from(questionStatsMap.values())
      .sort((a, b) => b.submission_count - a.submission_count)
      .slice(0, 5);

    // Final Payload Construction
    const payload = {
      test_cases_total: test_cases_total || 0,
      admins_total: admins_total || 0,
      questions_total: questions_total || 0,
      users_total: users_total || 0,
      completion_comparison: {
        labels: ['ผ่าน (Accepted)', 'ไม่ผ่าน (Failed/Other)'],
        successful_submissions: accepted,
        unsuccessful_submissions: not_accepted,
        values: [accepted, not_accepted]
      },
      recent_user_activity,
      top_questions
    };

    res.status(200).json(payload);
  } catch (err) {
    console.error('[DashboardController] Error fetching summary:', err);
    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลแดชบอร์ด',
      error: 'SERVER',
      detail: err.message
    });
  }
};

module.exports = {
  getSummary
};
