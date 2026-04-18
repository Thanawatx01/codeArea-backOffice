const { from, TABLE_NAMES } = require('../models/index');
const { io_meta: submissionIoMeta } = require('../utils/submissionIoMeta');
const {
  enrichSubmissionTestCaseRow,
  buildStandaloneStcListSummary,
  computeScorePercent,
} = require('../utils/submissionTestSummary');

const SUBMISSION_STC_SELECT = `
  id,
  submission_id,
  test_case_id,
  output_data,
  error_message,
  run_time,
  memory_used,
  status,
  created_at,
  test_cases ( id, input_data, output_data, case_order, is_simple, status )
`;

const toId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeQuestionCodeQuery = (query) => {
  const a = query?.question_code;
  const b = query?.code;
  if (typeof a === 'string' && a.trim()) return a.trim();
  if (typeof b === 'string' && b.trim()) return b.trim();
  return null;
};

const list = async (req, res) => {
  try {
    let submissionId = toId(req.query.submissionId);
    const qCode = normalizeQuestionCodeQuery(req.query);

    if (!submissionId && qCode) {
      const { data: question, error: qErr } = await from(TABLE_NAMES.QUESTIONS)
        .select('id')
        .eq('code', qCode)
        .maybeSingle();
      if (qErr) {
        return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: qErr.code });
      }
      if (!question) {
        return res.status(404).json({ message: 'ไม่พบโจทย์', error: 'NOT_FOUND' });
      }
      const { data: sub, error: subErr } = await from(TABLE_NAMES.SUBMISSIONS)
        .select('id')
        .eq('user_id', req.user.id)
        .eq('question_id', question.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (subErr) {
        return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: subErr.code });
      }
      if (!sub) {
        return res.status(404).json({ message: 'ไม่พบ submission', error: 'NOT_FOUND' });
      }
      submissionId = sub.id;
    }

    if (!submissionId) {
      return res.status(400).json({
        message: 'กรุณาระบุ submissionId หรือ question_code / code',
        error: 'VALIDATION',
      });
    }

    const { data: submission, error: sErr } = await from(TABLE_NAMES.SUBMISSIONS)
      .select('id')
      .eq('id', submissionId)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (sErr) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: sErr.code });
    }
    if (!submission) {
      return res.status(404).json({ message: 'ไม่พบ submission', error: 'NOT_FOUND' });
    }

    const { data: rows, error } = await from(TABLE_NAMES.SUBMISSION_TEST_CASES)
      .select(SUBMISSION_STC_SELECT)
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }
    const raw = rows || [];
    const data = raw.map(enrichSubmissionTestCaseRow);
    const test_summary = buildStandaloneStcListSummary(raw);
    return res.status(200).json({
      io_meta: submissionIoMeta,
      score_percent: computeScorePercent(test_summary),
      test_summary,
      data,
    });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER' });
  }
};

const getById = async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ message: 'id ไม่ถูกต้อง', error: 'VALIDATION' });

    const { data: row, error } = await from(TABLE_NAMES.SUBMISSION_TEST_CASES)
      .select(
        `
        id,
        submission_id,
        test_case_id,
        output_data,
        error_message,
        run_time,
        memory_used,
        status,
        created_at,
        submissions!inner ( user_id ),
        test_cases ( id, input_data, output_data, case_order, is_simple, status )
      `
      )
      .eq('id', id)
      .single();

    if (error || !row) {
      return res.status(404).json({ message: 'ไม่พบรายการ', error: 'NOT_FOUND' });
    }
    if (row.submissions?.user_id !== req.user.id) {
      return res.status(404).json({ message: 'ไม่พบรายการ', error: 'NOT_FOUND' });
    }

    const { submissions: _sub, ...rest } = row;
    const enriched = enrichSubmissionTestCaseRow(rest);
    const test_summary = buildStandaloneStcListSummary([row]);
    return res.status(200).json({
      io_meta: submissionIoMeta,
      score_percent: computeScorePercent(test_summary),
      test_summary,
      ...enriched,
    });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER' });
  }
};

module.exports = { list, getById };
