const bcrypt = require('bcrypt');
const sharp = require('sharp');
const SALT_ROUNDS = 10;
const { from, TABLE_NAMES, supabaseAdmin } = require('../models/index');

// ==========================================
// # ตัวช่วยภายใน (Internal Helpers)
// ==========================================

// # _processAvatarUpload Function
// # ตรวจสอบข้อมูล Base64, แปลงไฟล์เป็น WebP เพื่อลดขนาด, และอัปโหลดไปยัง Supabase Storage
// # Base64 Image -> Sharp (WebP @ 80%) -> Buffer -> Supabase Storage
const _processAvatarUpload = async (id, base64String) => {
  // # step 1: รับข้อมูล Base64 และตรวจสอบความถูกต้องของ Format
  const bucket = "user-profile-img";
  const matches = base64String.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  
  if (!matches || matches.length !== 3) return null;

  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');
  
  // # step 2: ใช้ Sharp แปลงข้อมูลเป็นไฟล์ WebP (Quality 80%)
  const optimizedBuffer = await sharp(buffer)
    .webp({ quality: 80 })
    .toBuffer();

  // # step 3: สร้างชื่อไฟล์ใหม่ตาม ID และ Timestamp เพื่อป้องกันการซ้ำ
  const fileName = `${id}_${Date.now()}.webp`;

  // # step 4: อัปโหลดไปยัง Bucket "user-profile-img"
  const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
    .from(bucket)
    .upload(fileName, optimizedBuffer, { contentType: 'image/webp', upsert: true });
    
  if (uploadErr) throw uploadErr;
  
  // # step 5: คืนค่าเป็น Public URL สำหรับบันทึกลงฐานข้อมูล
  const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(uploadData.path);
  return publicUrlData.publicUrl;
};

// # _cleanupOldAvatar Function
// # ลบไฟล์รูปโปรไฟล์เก่าออกจาก Storage เมื่อมีการเปลี่ยนรูปใหม่หรือลบรูปออก
// # Old URL -> Check Bucket -> Remove from Supabase Storage
const _cleanupOldAvatar = async (oldUrl, newUrl, isRemoving) => {
  // # step 1: ตรวจสอบว่า URL เก่ามาจาก Bucket ของเราหรือไม่
  if (!oldUrl || !oldUrl.includes("user-profile-img")) return;

  const isChanging = isRemoving || (newUrl && newUrl !== oldUrl);
  if (!isChanging) return;

  try {
    // # step 2: ดึงชื่อไฟล์จาก URL และทำการลบไฟล์ออกจาก Supabase Storage
    const bucketPath = "user-profile-img/";
    const startIndex = oldUrl.indexOf(bucketPath);
    if (startIndex === -1) return;

    const filename = oldUrl.substring(startIndex + bucketPath.length).split('?')[0].split('/')[0];
    if (filename) {
      await supabaseAdmin.storage.from("user-profile-img").remove([filename]);
    }
  } catch (e) {
    console.warn("[UsersController] Cleanup failed:", e.message);
  }
};

// # _sanitizeProfileData Function
// # ทำความสะอาดข้อมูล (Trimming) และจัดการค่าว่างให้เป็น NULL เพื่อความถูกต้องของฐานข้อมูล
// # Raw Data -> Trimming -> NULL standardizing -> Clean Object
const _sanitizeProfileData = (data) => {
  // # step 1: รับวัตถุข้อมูลมาวนลูปตรวจสอบทีละฟิลด์
  const sanitized = {};
  
  // # step 2: ตัดช่องว่างหัวท้ายของข้อความ (Trim)
  if (data.display_name !== undefined) sanitized.display_name = String(data.display_name).trim();
  
  // # step 3: ถ้าข้อมูลเป็นค่าว่าง ("") ให้เปลี่ยนเป็น null เพื่อแก้ปัญหา casting ใน Postgres
  if (data.bio !== undefined) sanitized.bio = data.bio?.trim() === "" ? null : data.bio;
  if (data.phone !== undefined) sanitized.phone = data.phone?.trim() === "" ? null : data.phone;
  if (data.dob !== undefined) sanitized.dob = (typeof data.dob === 'string' && data.dob.trim() === "") ? null : data.dob;
  
  return sanitized;
};

// ==========================================
// # ส่วนติดต่อฐานข้อมูล (External Handlers)
// ==========================================

// # list Function
// # ดึงรายการผู้ใช้ทั้งหมดพร้อมระบบค้นหาและแบ่งหน้า (Pagination)
// # Request (Query Params) -> Supabase (Range Query) -> Response (Paginated Data)
const list = async (req, res, next) => {
  try {
    // # step 1: รับค่า Page, Limit และ Search จาก Query Params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const pageNumber = Math.max(page, 1);
    const pageSize = Math.max(limit, 1);
    const fromIndex = (pageNumber - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    // # step 2: สร้าง Query ดึงข้อมูลจากตาราง USERS
    let query = from(TABLE_NAMES.USERS)
      .select('id, email, display_name, role_id, created_at, updated_at', { count: 'exact' })
      .order('id', { ascending: false });

    // # step 3: จัดการระบบค้นหาและช่วงข้อมูล (Range)
    if (search) query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
    query = query.range(fromIndex, toIndex);

    const { data, error, count } = await query;
    if (error) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }

    // # step 4: ส่งข้อมูลกลับไปพร้อมข้อมูลการแบ่งหน้า
    const total = count || 0;
    const total_pages = Math.ceil(total / pageSize);

    res.status(200).json({
      data: data || [],
      pagination: { page: pageNumber, limit: pageSize, total, total_pages }
    });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER' });
  }
};

// # getById Function
// # ดึงข้อมูลรายละเอียดของผู้ใช้รายบุคคลตาม ID
// # Request (param: id) -> Supabase (Single) -> Response (User Object)
const getById = async (req, res, next) => {
  try {
    // # step 1: รับ ID จาก URL Parameters
    const { id } = req.params;
    
    // # step 2: ค้นหาในฐานข้อมูลด้วย single() เพื่อรับวัตถุเดียว
    const { data, error } = await from(TABLE_NAMES.USERS)
      .select('id, email, display_name, role_id, avatar_url, bio, phone, dob, created_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้', error: 'NOT_FOUND' });
    }
    
    // # step 3: ส่งข้อมูลผู้ใช้กลับไปยัง Client
    res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER' });
  }
};

// # create Function
// # สร้างบัญชีผู้ใช้ใหม่ (จำกัดสิทธิ์เฉพาะผู้ดูแลระบบ)
// # Request (Body) -> Hash -> Supabase (Insert) -> Response (New User)
const create = async (req, res, next) => {
  try {
    const { email, display_name, password, role_id } = req.body;

    // # Security: ตรวจสอบสิทธิ์ผู้ดูแลระบบ (Role ID 2)
    if (!req.user || req.user.role_id !== 2) {
      return res.status(403).json({ message: 'สิทธิ์การเข้าถึงไม่ถูกต้อง', error: 'FORBIDDEN' });
    }

    // # step 1: ตรวจสอบความครบถ้วนของข้อมูล
    if (!email || !display_name || !password) {
      return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน', error: 'VALIDATION' });
    }

    // # step 2: เข้ารหัสรหัสผ่าน (Bcrypt Hashing)
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const payload = {
      email: String(email).trim(),
      display_name: String(display_name).trim(),
      password_hash,
      role_id: role_id || 1,
    };

    // # step 3: บันทึกลงฐานข้อมูลและส่งผลลัพธ์กลับ
    const { data, error } = await from(TABLE_NAMES.USERS)
      .insert(payload)
      .select('id, email, display_name, role_id')
      .single();

    if (error) {
      if (error.code === '23505') return res.status(400).json({ message: 'Email นี้ถูกใช้งานแล้ว', error: 'VALIDATION' });
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากฐานข้อมูล', error: 'DB', code: error.code });
    }

    res.status(201).json(data);
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER' });
  }
};

// # update Function
// # แก้ไขข้อมูลโปรไฟล์ รวมถึงการอัปโหลดรูปภาพและการทำความสะอาดข้อมูลเก่า
// # Request -> Permission -> Avatar Proc -> Sanitization -> DB Update -> Cleanup -> Response
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { display_name, avatar_url, bio, phone, dob, role_id } = req.body;

    // # Security: ตรวจสอบสิทธิ์เจ้าของบัญชีหรือผู้ดูแลระบบ
    if (!req.user || (String(req.user.id) !== String(id) && req.user.role_id !== 2)) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้', error: 'FORBIDDEN' });
    }

    if (!id || id === 'undefined') {
      return res.status(400).json({ message: 'ID ผู้ใช้ไม่ถูกต้อง', error: 'INVALID_ID' });
    }

    // # step 1: ดึงข้อมูลรูปภาพเดิมเตรียมไว้สำหรับกรณีลบไฟล์
    const { data: currentUser } = await from(TABLE_NAMES.USERS)
      .select('avatar_url')
      .eq('id', id)
      .single();

    // # step 2: หากมีการอัปโหลดรูป (Base64) ให้ประมวลผลผ่าน helper
    let finalAvatarUrl = avatar_url;
    if (avatar_url && avatar_url.startsWith('data:image/')) {
      finalAvatarUrl = await _processAvatarUpload(id, avatar_url);
    }

    // # step 3: ทำความสะอาดข้อมูลฟิลด์อื่นๆ และเตรียม Patch Object
    const patch = { 
      ..._sanitizeProfileData({ display_name, bio, phone, dob }),
      updated_at: new Date().toISOString() 
    };
    
    if (finalAvatarUrl !== undefined) patch.avatar_url = finalAvatarUrl;
    
    // # Security Check for Admin Role only
    if (role_id !== undefined && req.user.role_id === 2) {
      if ([1, 2].includes(Number(role_id))) patch.role_id = role_id;
    }

    // # step 4: อัปเดตฐานข้อมูล (Single Row Update)
    const { data, error } = await from(TABLE_NAMES.USERS)
      .update(patch)
      .eq('id', id)
      .select('id, email, display_name, role_id, avatar_url, bio, phone, dob')
      .single();

    if (error || !data) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้หรือข้อมูลผิดพลาด', error: 'NOT_FOUND' });
    }

    // # step 5: ลบไฟล์ภาพเก่าออกจาก Storage หากมีการเปลี่ยนแปลงสำเร็จ
    await _cleanupOldAvatar(currentUser?.avatar_url, finalAvatarUrl, avatar_url === null);

    res.status(200).json(data);
  } catch (err) {
    console.error("[UsersController] Update error:", err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER' });
  }
};

// # remove Function
// # ลบบัญชีผู้ใช้ (จำกัดสิทธิ์เฉพาะผู้ดูแลระบบ)
// # Request (param: id) -> Supabase (Delete) -> Response (Success)
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    // # Security: ตรวจสอบสิทธิ์ผู้ดูแลระบบก่อนการลบ
    if (!req.user || req.user.role_id !== 2) {
      return res.status(403).json({ message: 'สิทธิ์การเข้าถึงไม่ถูกต้อง', error: 'FORBIDDEN' });
    }

    // # step 1: สั่งลบข้อมูลออกจากตาราง USERS
    const { error } = await from(TABLE_NAMES.USERS).delete().eq('id', id);
    if (error) return res.status(404).json({ message: 'ไม่พบผู้ใช้', error: 'NOT_FOUND' });

    // # step 2: ส่งผลลัพธ์การลบสำเร็จกลับไป
    res.status(200).json({ message: 'ลบผู้ใช้สำเร็จ' });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER' });
  }
};

// # getProfileSummary Function
// # รวบรวมข้อมูลสถิติมุมมองแดชบอร์ดของผู้ใช้
// # Auth Token -> DB Queries (User, XP, Subs, Distribution) -> Calculated Stats -> JSON
const getProfileSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) return res.status(401).json({ message: 'ไม่พบเซสชันผู้ใช้', error: 'INVALID_SESSION' });
    
    // # step 1: ดึงข้อมูลพื้นฐาน (Profile) และคะแนนสะสม (XP)
    const { data: user, error: userErr } = await from(TABLE_NAMES.USERS)
      .select('id, email, display_name, role_id, avatar_url, bio, phone, dob, created_at')
      .eq('id', userId)
      .single();
    
    if (userErr || !user) return res.status(404).json({ message: 'ไม่พบผู้ใช้', error: 'NOT_FOUND' });

    const { data: pointLog } = await from(TABLE_NAMES.POINT_LOGS)
      .select('total_point').eq('user_id', userId).order('id', { ascending: false }).limit(1).maybeSingle();
    const xp = pointLog?.total_point || 0;

    // # step 2: ตรวจสอบประวัติการส่งทั้งหมดเพื่อทำสถิติความแม่นยำ
    const { data: submissions } = await from(TABLE_NAMES.SUBMISSIONS).select('id, status, question_id').eq('user_id', userId);
    
    const totalSubmissions = submissions?.length || 0;
    const passedCount = submissions?.filter(s => s.status === 1).length || 0;
    const failedCount = totalSubmissions - passedCount;
    const solvedQuestionIds = Array.from(new Set(submissions?.filter(s => s.status === 1).map(s => s.question_id) || []));
    const accuracy = totalSubmissions > 0 ? Math.round((passedCount / totalSubmissions) * 100) : 0;

    // # step 3: ดึงข้อมูลกิจกรรมล่าสุด 5 รายการ
    const { data: recentSubmissions } = await from(TABLE_NAMES.SUBMISSIONS)
      .select('id, status, created_at, language, run_time, questions(id, title, code)')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(5);

    // # step 4: วิเคราะห์หมวดหมู่และทักษะที่ใช้ (Distribution)
    let categoryStats = [];
    let tagStats = [];
    let solvedQuestions = [];

    if (solvedQuestionIds.length > 0) {
      const { data: qTags } = await from(TABLE_NAMES.QUESTION_TAG).select('tags(id, name)').in('question_id', solvedQuestionIds);
      if (qTags) {
        const tagCounts = {};
        qTags.forEach(qt => { if (qt.tags?.name) tagCounts[qt.tags.name] = (tagCounts[qt.tags.name] || 0) + 1; });
        tagStats = Object.entries(tagCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 5);
      }
      
      const { data: qCats } = await from(TABLE_NAMES.QUESTIONS).select('id, code, title, difficulty, points, question_categories(name)').in('id', solvedQuestionIds);
      if (qCats) {
        const catCounts = {};
        solvedQuestions = qCats.map(q => ({
          id: q.id, code: q.code, title: q.title, difficulty: q.difficulty,
          points: q.points, category_name: q.question_categories?.name || null
        }));
        qCats.forEach(q => { if (q.question_categories?.name) catCounts[q.question_categories.name] = (catCounts[q.question_categories.name] || 0) + 1; });
        categoryStats = Object.entries(catCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 5);
      }
    }

    // # step 5: รวมข้อมูลทั้งหมดส่งกลับไปยังหน้าจอโปรไฟล์
    res.status(200).json({
      user: { ...user, xp, solved_count: solvedQuestionIds.length, total_submissions: totalSubmissions, passed_count: passedCount, failed_count: failedCount, accuracy },
      recent_activity: recentSubmissions || [],
      category_stats: categoryStats,
      tag_stats: tagStats,
      solved_questions: solvedQuestions
    });
  } catch (err) {
    console.error('[getProfileSummary] Critical Error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER' });
  }
};

module.exports = { list, getById, create, update, remove, getProfileSummary };