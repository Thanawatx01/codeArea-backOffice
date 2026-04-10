const { from, TABLE_NAMES } = require('../models/index');

const toPositiveInt = (value, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
};

const toIsoDateStart = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

const toIsoDateEnd = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// GET /api/user-activities
const list = async (req, res) => {
  try {
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 20), 100);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const startDateIso = toIsoDateStart(req.query.start_date || req.query.startDate);
    const endDateIso = toIsoDateEnd(req.query.end_date || req.query.endDate);

    const fromIndex = (page - 1) * limit;
    const toIndex = fromIndex + limit - 1;

    let usersQuery = from(TABLE_NAMES.USERS)
      .select('id, display_name, email', { count: 'exact' })
      .order('id', { ascending: false })
      .range(fromIndex, toIndex);

    if (search) usersQuery = usersQuery.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`);

    const { data: users, error: usersError, count } = await usersQuery;
    if (usersError) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: usersError.code });
    }

    const userRows = users || [];
    const userIds = userRows.map((u) => u.id);
    const statsMap = new Map();
    userIds.forEach((id) => {
      statsMap.set(id, {
        total_attempt: 0,
        total_unfinished: 0,
        total_finished: 0,
        questionIds: new Set(),
      });
    });

    if (userIds.length > 0) {
      let submissionsQuery = from(TABLE_NAMES.SUBMISSIONS)
        .select('user_id, question_id, status, created_at')
        .in('user_id', userIds);

      if (startDateIso) submissionsQuery = submissionsQuery.gte('created_at', startDateIso);
      if (endDateIso) submissionsQuery = submissionsQuery.lte('created_at', endDateIso);

      const { data: submissions, error: submissionsError } = await submissionsQuery;
      if (submissionsError) {
        return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: submissionsError.code });
      }

      for (const s of submissions || []) {
        const bag = statsMap.get(s.user_id);
        if (!bag) continue;
        bag.total_attempt += 1;
        if (Number(s.status) === 0) bag.total_unfinished += 1;
        else bag.total_finished += 1;
        if (s.question_id != null) bag.questionIds.add(s.question_id);
      }
    }

    const data = userRows.map((u) => {
      const st = statsMap.get(u.id) || {
        total_attempt: 0,
        total_unfinished: 0,
        total_finished: 0,
        questionIds: new Set(),
      };
      const distinctQuestionCount = st.questionIds.size;
      const avgSubmitPerQuestion =
        distinctQuestionCount === 0 ? 0 : round2(st.total_attempt / distinctQuestionCount);

      return {
        display_name: u.display_name,
        email: u.email,
        total_attempt: st.total_attempt,
        total_unfinished: st.total_unfinished,
        total_finished: st.total_finished,
        avg_submit_per_question: avgSubmitPerQuestion,
      };
    });

    const total = count || 0;
    return res.status(200).json({
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

module.exports = { list };
