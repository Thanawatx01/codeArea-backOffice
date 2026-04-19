const { from, TABLE_NAMES } = require('../models/index');

// ค่าสถานะของการส่งโค้ด
const SUBMISSION_ACCEPTED = 1;
const SUBMISSION_JUDGING = 0;
const SUBMISSION_WRONG_ANSWER = 2;
const SUBMISSION_ERROR = 3;
const ADMIN_ROLE_ID = 2;

// ฟังก์ชันปัดเศษทศนิยม 2 ตำแหน่ง
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// แปลงวันที่ created_at ให้เป็น YYYY-MM-DD (UTC)
const utcDateKey = (createdAt) => {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

// countExact
// ฟังก์ชันสำหรับนับจำนวนแถวในตารางตามเงื่อนไขที่กำหนดแบบแม่นยำ (Exact Count)
// 1. รับชื่อตารางและฟังก์ชันฟิลเตอร์
// 2. สร้าง query พร้อมเปิดใช้งาน mode head: true เพื่อให้นับจำนวนโดยไม่ดึงข้อมูลจริงมา
// 3. คืนค่าจำนวนแถวทั้งหมด
async function countExact(table, filterFn) {
  let q = from(table).select('*', { count: 'exact', head: true });
  if (filterFn) q = filterFn(q);
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

// forEachSubmissionChunk
// ฟังก์ชันอ่านข้อมูลการส่ง (Submissions) ทีละชุด (Chunk) เพื่อป้องกันปัญหาหน่วยความจำเต็ม (OOM)
// 1. ตั้งค่า offset และวนลูปดึงข้อมูลตามขนาด pageSize (1500 แถว)
// 2. นำข้อมูลแต่ละแถวส่งไปยัง callback function (onRow)
// 3. หยุดการทำงานเมื่อดึงข้อมูลได้น้อยกว่า pageSize (แสดงว่าถึงแถวสุดท้ายแล้ว)
// Security: ใช้ baseQueryFn เพื่อจำกัดขอบเขตข้อมูลที่ต้องการดึง (เช่น ช่วงวันที่)
async function forEachSubmissionChunk(onRow, pageSize = 1500, baseQueryFn = null) {
  let offset = 0;
  for (;;) {
    let q = from(TABLE_NAMES.SUBMISSIONS)
      .select('user_id, question_id, status, created_at')
      .order('id', { ascending: true });
    
    if (baseQueryFn) q = baseQueryFn(q);
    
    const { data, error } = await q.range(offset, offset + pageSize - 1);
    if (error) throw error;
    const chunk = data || [];
    for (const row of chunk) onRow(row);
    if (chunk.length < pageSize) break;
    offset += pageSize;
  }
}

// getSummary
// ฟังก์ชันดึงข้อมูลสรุปภาพรวมของระบบสำหรับหน้า Admin Dashboard
// 1. ดึงจำนวน Test Cases, Admins, Questions, Users และ Submissions ทั้งหมดแบบขนาน (Parallel)
// 2. วนอ่าน Submissions ทั้งหมดผ่าน forEachSubmissionChunk เพื่อคำนวณสถิติรายบุคคลและโจทย์ที่นิยม
// 3. จัดกลุ่มสถิติผู้ใช้ (การส่งรายวัน, อัตราการผ่าน) และจัดอันดับ 5 อันดับแรก
// 4. คืนค่า JSON สรุปผลพร้อมข้อมูลสำหรับวาด Chart
// Security: ตรวจสอบ ADMIN_ROLE_ID ใน Middleware และฟังก์ชันนี้เพื่อป้องกันการเข้าถึงจากบุคคลทั่วไป
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

// getCategoryStats
// ฟังก์ชันคำนวณสถิติการส่งแยกตามหมวดหมู่โจทย์ (Question Categories)
// 1. ดึงรายการหมวดหมู่ทั้งหมดมาจากฐานข้อมูล
// 2. นับจำนวนโจทย์ที่มีอยู่ในแต่ละหมวดหมู่ (Question Count)
// 3. เริ่มต้นโครงสร้างข้อมูลสถิติ (Stats structure) สำหรับทุกหมวดหมู่
// 4. วนอ่านข้อมูล Submissions ผ่าน read stream และสะสมจำนวน Done/Not Done ตามช่วงวันที่กำหนด
// 5. กรองผลลัพธ์ตามหมวดหมู่ที่ระบุ (หากมีการเลือก) และส่งข้อมูลกลับ
// Security: ปรับแต่ง Query ในระนาบฐานข้อมูลผ่าน baseQueryFn เพื่อลดการโหลดข้อมูลที่ไม่จำเป็น
const getCategoryStats = async (req, res) => {
  try {
    if (!req.user || req.user.role_id !== ADMIN_ROLE_ID) {
      return res.status(403).json({ message: 'Forbidden. Admins only.', error: 'FORBIDDEN' });
    }

    const { startDate, endDate, categoryId } = req.query;

    const { data: allCategories, error: catErr } = await from(TABLE_NAMES.QUESTION_CATEGORIES)
      .select('id, name')
      .order('id', { ascending: true });
    if (catErr) throw catErr;

    const { data: qCats, error: qErr } = await from(TABLE_NAMES.QUESTIONS)
      .select('id, category_id');
    if (qErr) throw qErr;

    const qCountMap = new Map();
    const qMap = new Map();
    
    qCats.forEach((q) => {
      const cid = q.category_id || 'none';
      qCountMap.set(cid, (qCountMap.get(cid) || 0) + 1);
      qMap.set(q.id, cid);
    });

    const catStats = new Map();
    
    allCategories.forEach((c) => {
      catStats.set(c.id, {
        categoryId: c.id,
        categoryName: c.name,
        questionCount: qCountMap.get(c.id) || 0,
        notDoneCount: 0,
        doneCount: 0,
        total: 0
      });
    });

    if (qCountMap.has('none')) {
      catStats.set('none', {
        categoryId: null,
        categoryName: 'ไม่มีหมวดหมู่',
        questionCount: qCountMap.get('none') || 0,
        notDoneCount: 0,
        doneCount: 0,
        total: 0
      });
    }

    await forEachSubmissionChunk((sub) => {
      const cid = qMap.get(sub.question_id);
      if (cid === undefined) return; 
      if (categoryId && String(cid) !== String(categoryId)) return;

      const st = catStats.get(cid);
      if (!st) return;

      st.total++;
      if (Number(sub.status) === SUBMISSION_ACCEPTED) {
        st.doneCount++;
      } else {
        st.notDoneCount++;
      }
    }, 1500, (q) => {
      if (startDate) q = q.gte('created_at', startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        q = q.lte('created_at', end.toISOString());
      }
      return q;
    });

    let result = Array.from(catStats.values()).sort((a, b) => b.total - a.total || b.questionCount - a.questionCount);
    
    if (categoryId) {
      result = result.filter(r => String(r.categoryId) === String(categoryId) || (categoryId === 'none' && r.categoryId === null));
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('[DashboardController] getCategoryStats', err);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลหมวดหมู่',
      error: 'SERVER',
      detail: err.message,
    });
  }
};

// getQuestionStats
// ฟังก์ชันคำนวณสถิติการส่งแยกประรายข้อ (Question-level Stats)
// 1. ดึงรายการโจทย์ทั้งหมดพร้อมไอดีและรหัสโค้ด
// 2. กรองข้อมูลเบื้องต้นด้วยคำค้นหา (Search) 
// 3. สะสมสถิติการส่งสำเร็จ (Done) และไม่สำเร็จ (Not Done) สำหรับโจทย์แต่ละข้อ
// 4. จัดเรียงลำดับตามจำนวนการส่งสูงสุด
// Security: ใช้ chunked reading เพื่อให้ระบบเสถียรเมื่อข้อมูลเฉลยมีขนาดใหญ่มาก
const getQuestionStats = async (req, res) => {
  try {
    if (!req.user || req.user.role_id !== ADMIN_ROLE_ID) {
      return res.status(403).json({ message: 'Forbidden. Admins only.', error: 'FORBIDDEN' });
    }

    const { startDate, endDate, search } = req.query;

    const { data: qCats, error: qErr } = await from(TABLE_NAMES.QUESTIONS)
      .select('id, title, code');
    if (qErr) throw qErr;

    const qMap = new Map();
    qCats.forEach((q) => {
      qMap.set(q.id, {
        id: q.id,
        title: q.title,
        code: q.code
      });
    });

    const qStats = new Map();

    const searchLower = search ? search.toLowerCase() : '';

    await forEachSubmissionChunk((sub) => {
      const qInfo = qMap.get(sub.question_id);
      if (!qInfo) return;
      
      const combinedSearchString = `${qInfo.id} ${qInfo.code || ''} ${qInfo.title || ''}`.toLowerCase();
      if (searchLower && !combinedSearchString.includes(searchLower)) return;

      const qid = qInfo.id;
      if (!qStats.has(qid)) {
        qStats.set(qid, {
          questionId: qInfo.id,
          code: qInfo.code,
          title: qInfo.title,
          notDoneCount: 0,
          doneCount: 0,
          total: 0
        });
      }

      const st = qStats.get(qid);
      st.total++;
      if (Number(sub.status) === SUBMISSION_ACCEPTED) {
        st.doneCount++;
      } else {
        st.notDoneCount++;
      }
    }, 1500, (q) => {
      if (startDate) q = q.gte('created_at', startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        q = q.lte('created_at', end.toISOString());
      }
      return q;
    });

    const result = Array.from(qStats.values()).sort((a, b) => b.total - a.total);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[DashboardController] getQuestionStats', err);
    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลคำถาม',
      error: 'SERVER',
      detail: err.message,
    });
  }
};

module.exports = { getSummary, getCategoryStats, getQuestionStats };
