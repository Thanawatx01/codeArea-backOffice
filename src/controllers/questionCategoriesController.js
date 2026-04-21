const { from, TABLE_NAMES } = require('../models/index');
const { logAudit } = require('../utils/auditLogger');

const list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const name = req.query.name || '';
    const status = req.query.status;

    const pageNumber = Math.max(page, 1);
    const pageSize = Math.max(limit, 1);
    const fromIndex = (pageNumber - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    let query = from(TABLE_NAMES.QUESTION_CATEGORIES)
      .select('*, users!question_categories_created_by_fkey(display_name), updater:users!question_categories_updated_by_fkey(display_name)', { count: 'exact' })
      .order('id', { ascending: false });

    if (name) query = query.ilike('name', `%${name}%`);
    if (status !== undefined && status !== '') {
      const isTrue = String(status) === '1' || String(status).toLowerCase() === 'true';
      query = query.eq('status', isTrue);
    }

    query = query.range(fromIndex, toIndex);

    const { data, error, count } = await query;
    if (error) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }

    const dataWithCounts = await Promise.all((data || []).map(async (item) => {
      const { count: questionCount } = await from(TABLE_NAMES.QUESTIONS)
        .select('*', { count: 'exact', head: true })
        .eq('category_id', item.id);
      
      const { users, updater, ...restItem } = item;
      return { 
        ...restItem, 
        question_count: questionCount || 0,
        created_by_name: users?.display_name || "System",
        updated_by_name: updater?.display_name || users?.display_name || "System",
      };
    }));

    const { count: usedCategoriesCount } = await from(TABLE_NAMES.QUESTIONS)
      .select('category_id', { count: 'exact', head: true })
      .not('category_id', 'is', null);

    const total = count || 0;
    const total_pages = Math.ceil(total / pageSize);

    res.status(200).json({
      data: dataWithCounts,
      used_categories_count: usedCategoriesCount || 0,
      pagination: { page: pageNumber, limit: pageSize, total, total_pages }
    });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

const create = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const userId = req.user.id;
    if (!name) return res.status(400).json({ message: 'Name is required', error: 'VALIDATION' });

    const payload = {
      name: String(name).trim(),
      description,
      status: true,
      created_by: userId,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await from(TABLE_NAMES.QUESTION_CATEGORIES)
      .insert(payload)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }

    // Audit Log
    await logAudit({
      userId,
      actionType: 'CATEGORY_CREATE',
      details: { categoryId: data.id, categoryName: data.name },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({ message: 'สร้างหมวดหมู่คำถามสำเร็จ', data });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const userId = req.user.id;

    const patch = { updated_by: userId, updated_at: new Date().toISOString() };
    if (name !== undefined) patch.name = name;
    if (description !== undefined) patch.description = description;

    const { data: target, error: targetError } = await from(TABLE_NAMES.QUESTION_CATEGORIES)
      .select('id, name')
      .eq('id', id)
      .single();
    if (targetError || !target) {
      return res.status(404).json({ message: 'ไม่พบหมวดหมู่คำถาม', error: 'NOT_FOUND' });
    }

    if (Object.keys(patch).length > 2) {
      const { error: updateError } = await from(TABLE_NAMES.QUESTION_CATEGORIES)
        .update(patch)
        .eq('id', target.id);
      if (updateError) {
        return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: updateError.code });
      }
    }

    // Audit Log
    await logAudit({
      userId,
      actionType: 'CATEGORY_UPDATE',
      details: { categoryId: id, categoryName: target.name, patch },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({ message: 'อัปเดตหมวดหมู่คำถามสำเร็จ' });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const userId = req.user.id;
    const { data, error } = await from(TABLE_NAMES.QUESTION_CATEGORIES)
      .update({ status: false, updated_by: userId, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name')
      .single();
    if (error) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }
    if (!data) {
      return res.status(404).json({ message: 'ไม่พบหมวดหมู่คำถาม', error: 'NOT_FOUND' });
    }

    // Audit Log
    await logAudit({
      userId,
      actionType: 'CATEGORY_DELETE',
      details: { categoryId: id, categoryName: data.name },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(200).json({ message: 'ลบหมวดหมู่คำถามสำเร็จ (soft delete)' });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

const restore = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const userId = req.user.id;
    const { data, error } = await from(TABLE_NAMES.QUESTION_CATEGORIES)
      .update({ status: true, updated_by: userId, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name')
      .single();
    if (error) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }
    if (!data) {
      return res.status(404).json({ message: 'ไม่พบหมวดหมู่คำถาม', error: 'NOT_FOUND' });
    }

    // Audit Log
    await logAudit({
      userId,
      actionType: 'CATEGORY_RESTORE',
      details: { categoryId: id, categoryName: data.name },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({ message: 'กู้คืนหมวดหมู่คำถามสำเร็จ', data });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await from(TABLE_NAMES.QUESTION_CATEGORIES)
      .select('*, users!question_categories_created_by_fkey(display_name), updater:users!question_categories_updated_by_fkey(display_name)')
      .eq('id', id)
      .single();
    if (error || !data) {
      return res.status(404).json({ message: 'ไม่พบหมวดหมู่คำถาม', error: 'NOT_FOUND' });
    }
    res.status(200).json({ message: 'สำเร็จ', data });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

const toPositiveInt = (value, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
};

const toIsoDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

const report = async (req, res) => {
  try {
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 20), 100);
    const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';
    const startDate = toIsoDate(req.query.start_date || req.query.startDate);
    const endDate = toIsoDate(req.query.end_date || req.query.endDate);

    const fromIndex = (page - 1) * limit;
    const toIndex = fromIndex + limit - 1;

    let categoryQuery = from(TABLE_NAMES.QUESTION_CATEGORIES)
      .select('id, name', { count: 'exact' })
      .order('id', { ascending: false })
      .range(fromIndex, toIndex);

    if (name) categoryQuery = categoryQuery.ilike('name', `%${name}%`);

    const { data: categories, error: categoryErr, count } = await categoryQuery;
    if (categoryErr) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: categoryErr.code });
    }

    const categoryRows = categories || [];
    const categoryIds = categoryRows.map((c) => c.id);
    const statsByCategory = new Map();
    categoryIds.forEach((id) => statsByCategory.set(id, { total_attempt: 0, total_finished: 0, total_unfinished: 0 }));

    if (categoryIds.length > 0) {
      const { data: questions, error: qErr } = await from(TABLE_NAMES.QUESTIONS)
        .select('id, category_id')
        .in('category_id', categoryIds);
      if (qErr) {
        return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: qErr.code });
      }

      const questionIds = (questions || []).map((q) => q.id);
      const categoryByQuestionId = new Map((questions || []).map((q) => [q.id, q.category_id]));

      if (questionIds.length > 0) {
        let submissionQuery = from(TABLE_NAMES.SUBMISSIONS)
          .select('question_id, status, created_at')
          .in('question_id', questionIds);

        if (startDate) submissionQuery = submissionQuery.gte('created_at', startDate);
        if (endDate) submissionQuery = submissionQuery.lte('created_at', endDate);

        const { data: submissions, error: sErr } = await submissionQuery;
        if (sErr) {
          return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: sErr.code });
        }

        for (const s of submissions || []) {
          const categoryId = categoryByQuestionId.get(s.question_id);
          if (!categoryId || !statsByCategory.has(categoryId)) continue;
          const slot = statsByCategory.get(categoryId);
          slot.total_attempt += 1;
          if (s.status === 0 || s.status === null || s.status === undefined) slot.total_unfinished += 1;
          else slot.total_finished += 1;
        }
      }
    }

    const data = categoryRows.map((c) => {
      const st = statsByCategory.get(c.id) || { total_attempt: 0, total_finished: 0, total_unfinished: 0 };
      return {
        category_id: c.id,
        category: c.name,
        total_unfinished: st.total_unfinished,
        total_finished: st.total_finished,
        total_attempt: st.total_attempt,
      };
    }).sort((a, b) => {
      if (b.total_attempt !== a.total_attempt) return b.total_attempt - a.total_attempt;
      if (b.total_finished !== a.total_finished) return b.total_finished - a.total_finished;
      return (a.category || '').localeCompare(b.category || '');
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

module.exports = { list, search: list, create, getById, update, remove, restore, report };