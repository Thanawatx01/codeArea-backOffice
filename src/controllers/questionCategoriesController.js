const { from, TABLE_NAMES } = require('../models/index');
const { requireAuth } = require('../middlewares');

const list = async (req, res, next) => {
  try {
    // 1. รับค่าจาก Query Params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const name = req.query.name || '';
    const status = req.query.status; // รับค่า 0 หรือ 1

    const pageNumber = Math.max(page, 1);
    const pageSize = Math.max(limit, 1);
    const fromIndex = (pageNumber - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    // 2. สร้าง query แบบ Supabase
    let query = from(TABLE_NAMES.QUESTION_CATEGORIES)
      .select('*', { count: 'exact' })
      .order('id', { ascending: false });

    if (name) query = query.ilike('name', `%${name}%`);
    if (status !== undefined && status !== '') query = query.eq('status', status);

    query = query.range(fromIndex, toIndex);

    const { data, error, count } = await query;
    if (error) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }

    // นับจำนวน questions สำหรับแต่ละ category
    const dataWithCounts = await Promise.all((data || []).map(async (item) => {
      const { count: questionCount } = await from(TABLE_NAMES.QUESTIONS)
        .select('*', { count: 'exact', head: true })
        .eq('category_id', item.id);
      const { questions, ...rest } = item;
      return { ...rest, question_count: questionCount || 0 };
    }));

    // นับจำนวน categories ที่ถูกใช้ใน questions
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
    // ดึง ID จาก token (ที่ requireAuth เก็บไว้ใน req.user)
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
    };

    const { data, error } = await from(TABLE_NAMES.QUESTION_CATEGORIES)
      .insert(payload)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }

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
      .select('id')
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
      .select('id')
      .single();
    if (error) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }
    if (!data) {
      return res.status(404).json({ message: 'ไม่พบหมวดหมู่คำถาม', error: 'NOT_FOUND' });
    }
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
      .select()
      .single();
    if (error) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }
    if (!data) {
      return res.status(404).json({ message: 'ไม่พบหมวดหมู่คำถาม', error: 'NOT_FOUND' });
    }
    res.status(200).json({ message: 'กู้คืนหมวดหมู่คำถามสำเร็จ', data });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await from(TABLE_NAMES.QUESTION_CATEGORIES)
      .select()
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

module.exports = { list, search: list, create, getById, update, remove, restore };