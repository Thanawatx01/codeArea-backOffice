const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;
const { from, TABLE_NAMES } = require('../models/index');
const { requireAuth } = require('../middlewares');

const list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const pageNumber = Math.max(page, 1);
    const pageSize = Math.max(limit, 1);
    const fromIndex = (pageNumber - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    let query = from(TABLE_NAMES.USERS)
      .select('id, email, display_name, role_id, created_at, updated_at', { count: 'exact' })
      .order('id', { ascending: false });

    if (search) query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);

    query = query.range(fromIndex, toIndex);

    const { data, error, count } = await query;
    if (error) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }

    const total = count || 0;
    const total_pages = Math.ceil(total / pageSize);

    res.status(200).json({
      data: data || [],
      pagination: { page: pageNumber, limit: pageSize, total, total_pages }
    });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await from(TABLE_NAMES.USERS)
      .select('id, email, display_name, role_id, created_at')
      .eq('id', id)
      .single();
    if (error || !data) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้', error: 'NOT_FOUND' });
    }
    res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

const create = async (req, res, next) => {
  try {
    const { email, display_name, password, role } = req.body;
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const userId = req.user.id;

    if (!email || !display_name) {
      return res.status(400).json({ message: 'Email และ Display Name จำเป็น', error: 'VALIDATION' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const payload = {
      email: String(email).trim(),
      display_name: String(display_name).trim(),
      password_hash: password_hash,
      role_id: role || 1,
    };

    const { data, error } = await from(TABLE_NAMES.USERS)
      .insert(payload)
      .select('id, email, display_name, role_id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ message: 'Email ซ้ำ', error: 'VALIDATION' });
      }
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }

    res.status(201).json(data);
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { display_name, role_id } = req.body;
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const userId = req.user.id;

    const patch = { updated_at: new Date().toISOString() };
    if (display_name !== undefined) patch.display_name = display_name;
    if (role_id !== undefined) patch.role_id = role_id;

    const { data, error } = await from(TABLE_NAMES.USERS)
      .update(patch)
      .eq('id', id)
      .select('id, email, display_name, role_id')
      .single();

    if (error || !data) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้', error: 'NOT_FOUND' });
    }

    res.status(200).json(data);
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

    const { error } = await from(TABLE_NAMES.USERS)
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้', error: 'NOT_FOUND' });
    }

    res.status(200).json({ message: 'ลบผู้ใช้สำเร็จ' });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

module.exports = { list, getById, create, update, remove };