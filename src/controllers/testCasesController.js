const { from, TABLE_NAMES } = require('../models/index');

const TEST_CASE_SELECT =
  'id, question_id, input_data, output_data, case_order, is_simple, status, created_at';

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
    const qCode = normalizeQuestionCodeQuery(req.query);
    if (!qCode) {
      return res.status(400).json({
        message: 'กรุณาระบุ question_code หรือ code',
        error: 'VALIDATION',
      });
    }

    const { data: question, error: qErr } = await from(TABLE_NAMES.QUESTIONS)
      .select('id, code, status')
      .eq('code', qCode)
      .maybeSingle();

    if (qErr) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: qErr.code });
    }
    if (!question) {
      return res.status(404).json({ message: 'ไม่พบโจทย์', error: 'NOT_FOUND' });
    }
    if (question.status === false) {
      return res.status(404).json({ message: 'ไม่พบโจทย์', error: 'NOT_FOUND' });
    }

    const { data: rows, error } = await from(TABLE_NAMES.TEST_CASES)
      .select(TEST_CASE_SELECT)
      .eq('question_id', question.id)
      .eq('status', true)
      .order('case_order', { ascending: true });

    if (error) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }

    return res.status(200).json({
      question_code: question.code,
      question_id: question.id,
      data: rows || [],
    });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER' });
  }
};

const getById = async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ message: 'id ไม่ถูกต้อง', error: 'VALIDATION' });

    const { data: row, error } = await from(TABLE_NAMES.TEST_CASES)
      .select(
        `
        id,
        question_id,
        input_data,
        output_data,
        case_order,
        is_simple,
        status,
        created_at,
        questions!inner ( code, status )
      `
      )
      .eq('id', id)
      .eq('status', true)
      .maybeSingle();

    if (error) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }
    if (!row || row.questions?.status === false) {
      return res.status(404).json({ message: 'ไม่พบ test case', error: 'NOT_FOUND' });
    }

    const { questions: qMeta, ...rest } = row;
    return res.status(200).json({
      ...rest,
      question_code: qMeta?.code ?? null,
    });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER' });
  }
};

module.exports = { list, getById };
