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
    const { display_name, role } = req.body;
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const userId = req.user.id;

    const patch = { updated_at: new Date().toISOString() };
    if (display_name !== undefined) patch.display_name = display_name;
    if (role !== undefined) patch.role = role;

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

const leaderboard = async (req, res) => {
  try {
    // 1. Get all users
    const { data: users, error: userError } = await from(TABLE_NAMES.USERS)
      .select('id, display_name, email, avatar_url');
    
    if (userError) throw userError;

    // 2. Get total points and solved status from point_logs
    const { data: points, error: pointError } = await from(TABLE_NAMES.POINT_LOGS)
      .select('user_id, point');
    
    if (pointError) throw pointError;

    // 3. Aggregate stats per user
    const statsMap = new Map();
    (points || []).forEach(log => {
      const uid = log.user_id;
      if (!statsMap.has(uid)) statsMap.set(uid, { total_score: 0, solved_count: 0 });
      const current = statsMap.get(uid);
      current.total_score += Number(log.point || 0);
      current.solved_count += 1;
    });

    // 4. Get max points possible in the system
    const { data: questions, error: qError } = await from(TABLE_NAMES.QUESTIONS)
      .select('points')
      .eq('status', true);
    
    if (qError) throw qError;
    const max_score = (questions || []).reduce((sum, q) => sum + Number(q.points || 0), 0);

    // 5. Map to final structure and sort by score
    const result = users.map(u => ({
      id: u.id,
      username: u.display_name || u.email.split('@')[0],
      solved_count: statsMap.get(u.id)?.solved_count || 0,
      total_score: statsMap.get(u.id)?.total_score || 0,
      max_score: max_score
    })).sort((a, b) => b.total_score - a.total_score);

    res.status(200).json({ data: result });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลกระดานคะแนน', error: 'SERVER', detail: err.message });
  }
};

module.exports = { list, getById, create, update, remove, leaderboard };