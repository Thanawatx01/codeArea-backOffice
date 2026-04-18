const { from, TABLE_NAMES } = require('../models/index');
const { io_meta: submissionIoMeta } = require('../utils/submissionIoMeta');
const { submissionPidMicrotime } = require('../utils/submissionPid');
const {
  enrichSubmissionTestCaseRow,
  summarizeSampleRunResults,
  buildSubmissionTestSummary,
  summarizeTestCaseRowStatuses,
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

const fetchSubmissionTestCasesBySubmissionIds = async (submissionIds) => {
  if (!submissionIds.length) return new Map();
  const { data: rows, error } = await from(TABLE_NAMES.SUBMISSION_TEST_CASES)
    .select(SUBMISSION_STC_SELECT)
    .in('submission_id', submissionIds)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const map = new Map();
  for (const row of rows || []) {
    const sid = row.submission_id;
    if (!map.has(sid)) map.set(sid, []);
    map.get(sid).push(row);
  }
  return map;
};
const {
  TEST_PASS,
  TEST_ERROR,
  runSingleTestCase,
  runTestCasesSequentialRecursive,
} = require('../utils/submissionJudge');

const SUBMISSION_JUDGING = 0;
const SUBMISSION_ACCEPTED = 1;
const SUBMISSION_WRONG_ANSWER = 2;
const SUBMISSION_ERROR = 3;

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

/** ใช้เฉพาะ question_code — ฟิลด์ code ใน body คือซอร์สโปรแกรม */
const normalizeQuestionCodeBody = (body) => {
  const a = body?.question_code;
  if (typeof a === 'string' && a.trim()) return a.trim();
  return null;
};

const fetchQuestionIdByCode = async (code) => {
  const { data, error } = await from(TABLE_NAMES.QUESTIONS).select('id').eq('code', code).maybeSingle();
  return { id: data?.id ?? null, error };
};

const averageNullableInts = (values) => {
  const nums = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
};

const aggregateSubmissionStatus = (rows) => {
  if (rows.some((r) => r.status === TEST_ERROR)) return SUBMISSION_ERROR;
  if (rows.some((r) => r.status !== TEST_PASS)) return SUBMISSION_WRONG_ANSWER;
  return SUBMISSION_ACCEPTED;
};

const firstCompileLikeError = (rows) => {
  const hit = rows.find((r) => r.status === TEST_ERROR && r.error_message);
  return hit?.error_message ? String(hit.error_message).slice(0, 4000) : null;
};

const sampleRun = async (req, res) => {
  try {
    const qCode = normalizeQuestionCodeBody(req.body || {});
    const { language, code } = req.body || {};
    const lang = typeof language === 'string' ? language.trim() : '';
    const answer = typeof code === 'string' ? code : code != null ? String(code) : '';

    if (!qCode || !lang || !answer) {
      return res.status(400).json({
        message: 'กรุณาระบุ question_code, language, code',
        error: 'VALIDATION',
      });
    }

    const { data: question, error: qErr } = await from(TABLE_NAMES.QUESTIONS)
      .select('id, status, code')
      .eq('code', qCode)
      .single();
    if (qErr || !question) {
      return res.status(404).json({ message: 'ไม่พบโจทย์', error: 'NOT_FOUND' });
    }
    if (question.status === false) {
      return res.status(400).json({ message: 'โจทย์นี้ปิดใช้งาน', error: 'VALIDATION' });
    }

    const questionId = question.id;
    const { data: cases, error: cErr } = await from(TABLE_NAMES.TEST_CASES)
      .select('id, input_data, output_data, case_order')
      .eq('question_id', questionId)
      .eq('is_simple', true)
      .eq('status', true)
      .order('case_order', { ascending: true });
    if (cErr) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: cErr.code });
    }

    const list = cases || [];
    const runOne = async (tc) => {
      const r = await runSingleTestCase({ language: lang, code: answer, testCase: tc });
      return {
        test_case_id: tc.id,
        case_order: tc.case_order,
        input_data: tc.input_data,
        expected_output: tc.output_data,
        passed: r.status === TEST_PASS,
        status: r.status,
        output_data: r.output_data,
        error_message: r.error_message,
        run_time: r.run_time,
        memory_used: r.memory_used,
        ...(r.piston_failed_phase != null ? { piston_failed_phase: r.piston_failed_phase } : {}),
      };
    };

    const results =
      list.length === 0
        ? []
        : await runTestCasesSequentialRecursive(list, runOne, 0, []);

    const summary = summarizeSampleRunResults(results);
    return res.status(200).json({
      question_code: question.code,
      language: lang,
      score_percent: computeScorePercent(summary),
      summary,
      results,
    });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

const create = async (req, res) => {
  try {
    const qCode = normalizeQuestionCodeBody(req.body || {});
    const { language, code } = req.body || {};
    const lang = typeof language === 'string' ? language.trim() : '';
    const answer = typeof code === 'string' ? code : code != null ? String(code) : '';

    if (!qCode || !lang || !answer) {
      return res.status(400).json({
        message: 'กรุณาระบุ question_code, language, code',
        error: 'VALIDATION',
      });
    }

    const { data: question, error: qErr } = await from(TABLE_NAMES.QUESTIONS)
      .select('id, status, time_limit, memory_limit, points')
      .eq('code', qCode)
      .single();
    if (qErr || !question) {
      if (qErr?.code === 'PGRST116' || !question) {
        return res.status(404).json({ message: 'ไม่พบโจทย์', error: 'NOT_FOUND' });
      }
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: qErr.code });
    }
    if (question.status === false) {
      return res.status(400).json({ message: 'โจทย์นี้ปิดใช้งาน', error: 'VALIDATION' });
    }

    const questionId = question.id;
    const { data: hiddenCases, error: hcErr } = await from(TABLE_NAMES.TEST_CASES)
      .select('id, input_data, output_data, case_order')
      .eq('question_id', questionId)
      .eq('is_simple', false)
      .eq('status', true)
      .order('case_order', { ascending: true });
    if (hcErr) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: hcErr.code });
    }
    const hidden = hiddenCases || [];

    const { data: submission, error: sErr } = await from(TABLE_NAMES.SUBMISSIONS)
      .insert({
        pid: submissionPidMicrotime(),
        user_id: req.user.id,
        question_id: questionId,
        language: lang,
        answer,
        compile_error: null,
        status: SUBMISSION_JUDGING,
        run_time: null,
        memory_used: null,
      })
      .select('id, pid')
      .single();
    if (hardenSupabaseInsert(res, sErr)) return undefined;

    const runOne = async (tc) => {
      const r = await runSingleTestCase({ language: lang, code: answer, testCase: tc });
      const { error: insErr } = await from(TABLE_NAMES.SUBMISSION_TEST_CASES).insert({
        submission_id: submission.id,
        test_case_id: tc.id,
        output_data: r.output_data,
        error_message: r.error_message,
        run_time: r.run_time,
        memory_used: r.memory_used,
        status: r.status,
      });
      if (insErr) {
        const err = new Error(insErr.message);
        err.code = insErr.code;
        throw err;
      }
      return r;
    };

    let judged = [];
    try {
      judged =
        hidden.length === 0
          ? []
          : await runTestCasesSequentialRecursive(hidden, runOne, 0, []);
    } catch (e) {
      await from(TABLE_NAMES.SUBMISSIONS)
        .update({
          status: SUBMISSION_ERROR,
          compile_error: e.message || 'บันทึกผลเทสไม่สำเร็จ',
        })
        .eq('id', submission.id);
      return res.status(400).json({
        message: 'เกิดข้อผิดพลาดจากระบบขณะบันทึกผลการตรวจ',
        error: 'DB',
        code: e.code,
        submission_id: submission.id,
      });
    }

    const finalStatus = hidden.length === 0 ? SUBMISSION_ACCEPTED : aggregateSubmissionStatus(judged);
    const avgTime = averageNullableInts(judged.map((j) => j.run_time));
    const avgMem = averageNullableInts(judged.map((j) => j.memory_used));

    await from(TABLE_NAMES.SUBMISSIONS)
      .update({
        status: finalStatus,
        run_time: avgTime,
        memory_used: avgMem,
        compile_error: finalStatus === SUBMISSION_ERROR ? firstCompileLikeError(judged) : null,
      })
      .eq('id', submission.id);

    if (finalStatus === SUBMISSION_ACCEPTED && Number(question.points) > 0) {
      const { data: existingPoints } = await from(TABLE_NAMES.POINT_LOGS)
        .select('id')
        .eq('user_id', req.user.id)
        .eq('question_id', questionId)
        .maybeSingle();

      const { data: priorAccepted } = await from(TABLE_NAMES.SUBMISSIONS)
        .select('id')
        .eq('user_id', req.user.id)
        .eq('question_id', questionId)
        .eq('status', SUBMISSION_ACCEPTED)
        .neq('id', submission.id)
        .limit(1)
        .maybeSingle();

      if (!existingPoints && !priorAccepted) {
        const { data: lastLog } = await from(TABLE_NAMES.POINT_LOGS)
          .select('total_point')
          .eq('user_id', req.user.id)
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();
        const prevMax = lastLog?.total_point != null ? Number(lastLog.total_point) : 0;
        const add = Number(question.points);
        const newTotal = prevMax + add;

        const { error: plErr } = await from(TABLE_NAMES.POINT_LOGS).insert({
          user_id: req.user.id,
          submission_id: submission.id,
          question_id: questionId,
          point: add,
          total_point: newTotal,
        });
        if (plErr && plErr.code !== '23505') {
          return res.status(400).json({
            message: 'บันทึกคะแนนไม่สำเร็จ',
            error: 'DB',
            code: plErr.code,
            submission_id: submission.id,
          });
        }
      }
    }

    const judgedSummary = summarizeTestCaseRowStatuses(judged.map((j) => ({ status: j.status })));
    const submission_test_cases = hidden.map((tc, i) => {
      const j = judged[i] || {};
      return {
        test_case_id: tc.id,
        case_order: tc.case_order,
        input_data: tc.input_data,
        expected_output: tc.output_data,
        passed: j.status === TEST_PASS,
        status: j.status,
        actual_output: j.output_data ?? null,
        error_message: j.error_message ?? null,
        run_time: j.run_time ?? null,
        memory_used: j.memory_used ?? null,
        ...(j.piston_failed_phase != null ? { piston_failed_phase: j.piston_failed_phase } : {}),
      };
    });

    return res.status(201).json({
      id: submission.id,
      pid: submission.pid,
      submission_id: submission.id,
      status: finalStatus,
      run_time: avgTime,
      memory_used: avgMem,
      hidden_tests_run: hidden.length,
      score_percent: computeScorePercent(judgedSummary),
      submission_test_cases,
      test_summary: {
        ...judgedSummary,
        run_time_submission_ms: avgTime,
        memory_used_submission_bytes: avgMem,
        submission_run_time_memory_note:
          'run_time และ memory_used ที่ส่งในระดับ submission เป็นค่าเฉลี่ยต่อ 1 เทสต์ซ่อนหลังตัดสิน',
        ...(hidden.length === 0
          ? { note: 'ไม่มีเทสต์ซ่อน — ไม่มีการรันเทสต์ซ่อนจึงไม่มี score จากเทสต์' }
          : {}),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

function hardenSupabaseInsert(res, error) {
  if (!error) return false;
  if (error.code === '23503') {
    res.status(400).json({
      message: 'ข้อมูลอ้างอิงไม่ถูกต้อง (Foreign key)',
      error: 'VALIDATION',
      code: error.code,
      detail: error.detail || null,
    });
    return true;
  }
  res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
  return true;
}

const list = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const fromIndex = (page - 1) * limit;
    const toIndex = fromIndex + limit - 1;
    const codeFilter = normalizeQuestionCodeQuery(req.query);
    let qFilter = null;
    if (codeFilter) {
      const { id, error: qcErr } = await fetchQuestionIdByCode(codeFilter);
      if (qcErr) {
        return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: qcErr.code });
      }
      if (!id) {
        return res.status(404).json({ message: 'ไม่พบโจทย์', error: 'NOT_FOUND' });
      }
      qFilter = id;
    }

    let query = from(TABLE_NAMES.SUBMISSIONS)
      .select(
        'id, pid, question_id, language, answer, status, run_time, memory_used, created_at',
        { count: 'exact' }
      )
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(fromIndex, toIndex);

    if (qFilter) query = query.eq('question_id', qFilter);

    const { data, error, count } = await query;
    if (error) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }

    const rows = data || [];
    let stcBySubmission;
    try {
      stcBySubmission = await fetchSubmissionTestCasesBySubmissionIds(rows.map((r) => r.id));
    } catch (stcErr) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: stcErr.code });
    }

    const enriched = rows.map((s) => {
      const rawStc = stcBySubmission.get(s.id) || [];
      const stc = rawStc.map(enrichSubmissionTestCaseRow);
      const test_summary = buildSubmissionTestSummary(s, stc);
      return {
        ...s,
        score_percent: computeScorePercent(test_summary),
        submission_test_cases: stc,
        test_summary,
      };
    });

    const total = count || 0;
    return res.status(200).json({
      io_meta: submissionIoMeta,
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER' });
  }
};

const getById = async (req, res) => {
  try {
    // พารามิเตอร์ชื่อ pid — ตรงกับคอลัมน์ submissions.pid (microtime ตอนสร้าง)
    const pid = toId(req.params.pid);
    if (!pid) return res.status(400).json({ message: 'pid ไม่ถูกต้อง', error: 'VALIDATION' });

    const { data, error } = await from(TABLE_NAMES.SUBMISSIONS)
      .select(
        'id, pid, user_id, question_id, language, answer, compile_error, status, run_time, memory_used, created_at'
      )
      .eq('pid', pid)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: 'ไม่พบ submission', error: 'NOT_FOUND' });
    }

    let stcRows;
    try {
      stcRows = await fetchSubmissionTestCasesBySubmissionIds([data.id]);
    } catch (stcErr) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: stcErr.code });
    }

    const rawStc = stcRows.get(data.id) || [];
    const stc = rawStc.map(enrichSubmissionTestCaseRow);
    const test_summary = buildSubmissionTestSummary(data, stc);

    return res.status(200).json({
      io_meta: submissionIoMeta,
      score_percent: computeScorePercent(test_summary),
      ...data,
      submission_test_cases: stc,
      test_summary,
    });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER' });
  }
};

module.exports = { list, getById, create, sampleRun };
