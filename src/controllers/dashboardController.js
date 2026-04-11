const { from, TABLE_NAMES } = require('../models/index');

const SUBMISSION_ACCEPTED = 1;
const SUBMISSION_JUDGING = 0;
const SUBMISSION_WRONG_ANSWER = 2;
const SUBMISSION_ERROR = 3;
const ADMIN_ROLE_ID = 2;

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const utcDateKey = (createdAt) => {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

async function countExact(table, filterFn) {
  let q = from(table).select('*', { count: 'exact', head: true });
  if (filterFn) q = filterFn(q);
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

/** อ่าน submissions ทีละ chunk — ไม่เก็บทั้งตารางใน array (ลดความเสี่ยง OOM บน Railway) */
async function forEachSubmissionChunk(onRow, pageSize = 1500) {
  let offset = 0;
  for (;;) {
    const { data, error } = await from(TABLE_NAMES.SUBMISSIONS)
      .select('user_id, question_id, status, created_at')
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const chunk = data || [];
    for (const row of chunk) onRow(row);
    if (chunk.length < pageSize) break;
    offset += pageSize;
  }
}

const getSummary = async (req, res) => {
  try {
    if (!req.user || req.user.role_id !== ADMIN_ROLE_ID) {
      return res.status(403).json({ message: 'Forbidden. Admins only.', error: 'FORBIDDEN' });
    }

    const [
      testCasesTotal,
      adminsTotal,
      questionsTotal,
      usersTotal,
      submissionsTotal,
      submissionsAccepted,
    ] = await Promise.all([
      countExact(TABLE_NAMES.TEST_CASES),
      countExact(TABLE_NAMES.USERS, (q) => q.eq('role_id', ADMIN_ROLE_ID)),
      countExact(TABLE_NAMES.QUESTIONS),
      countExact(TABLE_NAMES.USERS),
      countExact(TABLE_NAMES.SUBMISSIONS),
      countExact(TABLE_NAMES.SUBMISSIONS, (q) => q.eq('status', SUBMISSION_ACCEPTED)),
    ]);

    const unsuccessfulSubmissions = Math.max(0, submissionsTotal - submissionsAccepted);

    const questionTally = new Map();
    const latestSubmissionByUser = new Map();
    const statsByUser = new Map();

    const bumpUserStats = (userId) => {
      let b = statsByUser.get(userId);
      if (!b) {
        b = {
          total_attempt: 0,
          total_unfinished: 0,
          total_finished: 0,
          submissions_passed: 0,
          submissions_not_passed: 0,
          questionIds: new Set(),
          byDay: new Map(),
        };
        statsByUser.set(userId, b);
      }
      return b;
    };

    await forEachSubmissionChunk((row) => {
      if (row.question_id != null) {
        const qid = row.question_id;
        questionTally.set(qid, (questionTally.get(qid) || 0) + 1);
      }
      if (row.user_id != null && row.created_at) {
        const t = new Date(row.created_at).getTime();
        if (Number.isFinite(t)) {
          const prev = latestSubmissionByUser.get(row.user_id);
          if (!prev || t > prev.time) {
            latestSubmissionByUser.set(row.user_id, {
              time: t,
              at: new Date(row.created_at).toISOString(),
            });
          }
        }
      }
      if (row.user_id != null) {
        const bag = bumpUserStats(row.user_id);
        bag.total_attempt += 1;
        const st = row.status == null ? SUBMISSION_JUDGING : Number(row.status);
        if (st === SUBMISSION_JUDGING) bag.total_unfinished += 1;
        else bag.total_finished += 1;
        if (st === SUBMISSION_ACCEPTED) bag.submissions_passed += 1;
        if (st === SUBMISSION_WRONG_ANSWER || st === SUBMISSION_ERROR) bag.submissions_not_passed += 1;
        if (row.question_id != null) bag.questionIds.add(row.question_id);
        const dayKey = utcDateKey(row.created_at);
        if (dayKey) bag.byDay.set(dayKey, (bag.byDay.get(dayKey) || 0) + 1);
      }
    });

    const recentUserIds = [...latestSubmissionByUser.entries()]
      .sort((a, b) => b[1].time - a[1].time)
      .slice(0, 5)
      .map(([uid]) => uid);

    let recent_user_activity = [];
    if (recentUserIds.length > 0) {
      const { data: uRows, error: uErr } = await from(TABLE_NAMES.USERS)
        .select('id, display_name, email')
        .in('id', recentUserIds);
      if (uErr) throw uErr;
      const userById = new Map((uRows || []).map((u) => [u.id, u]));

      recent_user_activity = recentUserIds.map((user_id) => {
        const u = userById.get(user_id);
        const last = latestSubmissionByUser.get(user_id);
        const bag = statsByUser.get(user_id) || {
          total_attempt: 0,
          total_unfinished: 0,
          total_finished: 0,
          submissions_passed: 0,
          submissions_not_passed: 0,
          questionIds: new Set(),
          byDay: new Map(),
        };
        const distinctQuestionCount = bag.questionIds.size;
        const avg_submit_per_question =
          distinctQuestionCount === 0 ? 0 : round2(bag.total_attempt / distinctQuestionCount);
        const submissions_by_day = [...bag.byDay.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, count]) => ({ date, count }));

        return {
          user_id,
          display_name: u?.display_name ?? null,
          email: u?.email ?? null,
          last_submission_at: last?.at ?? null,
          total_attempt: bag.total_attempt,
          total_unfinished: bag.total_unfinished,
          total_finished: bag.total_finished,
          submissions_passed: bag.submissions_passed,
          submissions_not_passed: bag.submissions_not_passed,
          avg_submit_per_question,
          submissions_by_day,
        };
      });
    }

    const topFiveIds = [...questionTally.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    let top_questions = [];
    if (topFiveIds.length > 0) {
      const { data: qRows, error: qErr } = await from(TABLE_NAMES.QUESTIONS)
        .select('id, code, title')
        .in('id', topFiveIds);
      if (qErr) throw qErr;
      const byId = new Map((qRows || []).map((q) => [q.id, q]));
      top_questions = topFiveIds.map((id) => {
        const q = byId.get(id);
        return {
          question_id: id,
          code: q?.code ?? null,
          title: q?.title ?? null,
          submission_count: questionTally.get(id) || 0,
        };
      });
    }

    return res.status(200).json({
      test_cases_total: testCasesTotal,
      admins_total: adminsTotal,
      questions_total: questionsTotal,
      users_total: usersTotal,
      completion_comparison: {
        labels: ['ผ่าน (Accepted)', 'ไม่ผ่าน (Failed/Other)'],
        successful_submissions: submissionsAccepted,
        unsuccessful_submissions: unsuccessfulSubmissions,
        values: [submissionsAccepted, unsuccessfulSubmissions],
      },
      recent_user_activity,
      top_questions,
    });
  } catch (err) {
    console.error('[DashboardController]', err);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลแดชบอร์ด',
      error: 'SERVER',
      detail: err.message,
    });
  }
};

module.exports = { getSummary };
