const { from, TABLE_NAMES } = require('../models/index');
const { normalizeInArray } = require('./BaseController');
const fs = require('fs');
const path = require('path');

const questionAssetDir = path.resolve(__dirname, '../../uploads/questions');
const QUESTION_CODE_PREFIX = 'QT';
const QUESTION_CODE_PAD = 5;

const decodePdfBase64 = (input) => {
  if (!input || typeof input !== 'string') return null;
  let payload = input.trim();
  if (!payload) return null;

  if (payload.startsWith('data:application/pdf;base64,')) {
    payload = payload.slice('data:application/pdf;base64,'.length);
  }

  // Accept URL-encoded payloads and base64url variants.
  try {
    payload = decodeURIComponent(payload);
  } catch (_) {
    // keep original when not URI encoded
  }
  payload = payload.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');

  const mod = payload.length % 4;
  if (mod > 0) payload = payload.padEnd(payload.length + (4 - mod), '=');

  try {
    const buffer = Buffer.from(payload, 'base64');
    if (buffer.length < 4) return null;
    if (buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) return null;
    return buffer;
  } catch (_) {
    return null;
  }
};

const savePdfAsset = (uriValue, file) => {
  if (file?.filename) return `/assets/questions/${file.filename}`;
  if (!uriValue || typeof uriValue !== 'string') return null;

  const raw = uriValue.trim();
  if (!raw) return null;
  const buffer = decodePdfBase64(raw);
  if (!buffer) return null;

  fs.mkdirSync(questionAssetDir, { recursive: true });
  const filename = `${Date.now()}-question.pdf`;
  fs.writeFileSync(path.join(questionAssetDir, filename), buffer);
  return `/assets/questions/${filename}`;
};

const generateQuestionCode = async () => {
  const { data: latest, error } = await from(TABLE_NAMES.QUESTIONS)
    .select('code')
    .like('code', `${QUESTION_CODE_PREFIX}%`)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const latestCode = latest?.[0]?.code || '';
  const current = Number(latestCode.replace(QUESTION_CODE_PREFIX, '')) || 0;
  const next = String(current + 1).padStart(QUESTION_CODE_PAD, '0');
  return `${QUESTION_CODE_PREFIX}${next}`;
};

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
};

const resolveTagIds = async (tags) => {
  const rawTags = [...new Set(normalizeInArray(tags))];
  if (rawTags.length === 0) return { tagIds: [], missing: [] };

  const numericIds = rawTags.filter((item) => /^\d+$/.test(String(item)));
  const names = rawTags.filter((item) => !/^\d+$/.test(String(item)));
  const collected = new Set();

  if (numericIds.length > 0) {
    const { data, error } = await from(TABLE_NAMES.TAGS).select('id').in('id', numericIds);
    if (error) throw error;
    (data || []).forEach((tag) => collected.add(String(tag.id)));
  }

  if (names.length > 0) {
    const { data, error } = await from(TABLE_NAMES.TAGS).select('id, name').in('name', names);
    if (error) throw error;
    (data || []).forEach((tag) => collected.add(String(tag.id)));
  }

  const missing = rawTags.filter((item) => {
    if (/^\d+$/.test(String(item))) return !collected.has(String(item));
    return false;
  });

  // For name values, verify by count (exact match by .in)
  if (names.length > 0) {
    const { data } = await from(TABLE_NAMES.TAGS).select('name').in('name', names);
    const foundNames = new Set((data || []).map((t) => t.name));
    names.forEach((name) => {
      if (!foundNames.has(name)) missing.push(name);
    });
  }

  return { tagIds: [...collected], missing };
};

const normalizeTestCases = (testCases = []) => {
  if (!Array.isArray(testCases)) return [];
  return testCases
    .map((tc) => ({
      input_data: tc?.input_data ?? '',
      output_data: tc?.output_data ?? '',
      case_order: toNullableNumber(tc?.case_order),
      is_simple: tc?.is_simple === true,
      status: tc?.status !== false,
    }))
    .filter((tc) => tc.input_data !== '' && tc.output_data !== '');
};

const dbErrorResponse = (res, error) => {
  if (error?.code === '23503') {
    return res.status(400).json({
      message: 'ข้อมูลอ้างอิงไม่ถูกต้อง (Foreign key)',
      error: 'VALIDATION',
      code: error.code,
      detail: error.detail || null,
    });
  }
  return res.status(400).json({
    message: 'เกิดข้อผิดพลาดจากระบบ',
    error: 'DB',
    code: error?.code,
    detail: error?.detail || null,
  });
};

const list = async (req, res, next) => {
  try {
    const {
      category_id = null,
      search = null,
      difficulty = null,
      tag = [],
      status = 1,
      page = 1,
      limit = 10,
    } = req.query;
    const hasTagFilter = req.query.tag !== undefined && req.query.tag !== null && req.query.tag !== '';
    const tagFilterRelation = hasTagFilter ? ', matched_tags:question_tag!inner(tag_id)' : '';

    let query = from(TABLE_NAMES.QUESTIONS)
      .select(`
        id, code, title, description, constraints, solution, uri,
        difficulty, expected_complexity, time_limit, memory_limit, status,
        category_id,
        question_categories(name),
        question_tag!left(tag_id, tags(name))
        ${tagFilterRelation}
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    const pageNumber = Math.max(Number(page) || 1, 1);
    const pageSize = Math.max(Number(limit) || 10, 1);
    const fromIndex = (pageNumber - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    if (category_id) query = query.eq('category_id', category_id);
    if (difficulty) query = query.eq('difficulty', difficulty);
    if (status !== null && status !== undefined && status !== '') query = query.eq('status', status);

    const tagIds = [...new Set(normalizeInArray(tag))];
    if (hasTagFilter && tagIds.length > 0) query = query.in('matched_tags.tag_id', tagIds);

    if (search) query = query.or(`code.ilike.%${search}%,title.ilike.%${search}%`);
    query = query.range(fromIndex, toIndex);

    const { data: questions, error, count } = await query;
    if (error) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }

    const rows = (questions || []).map((question) => ({
      code: question.code,
      category_name: question.question_categories?.name || null,
      title: question.title,
      description: question.description,
      constraints: question.constraints,
      solution: question.solution,
      uri: question.uri,
      difficulty: question.difficulty,
      expected_complexity: question.expected_complexity,
      time_limit: question.time_limit,
      memory_limit: question.memory_limit,
      status: question.status,
      tags: (question.question_tag || []).map((item) => item.tags?.name).filter(Boolean),
    }));

    const total = count || 0;
    const total_pages = Math.ceil(total / pageSize);

    return res.status(200).json({
      data: rows,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        total_pages,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

const getByCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const { data: question, error } = await from(TABLE_NAMES.QUESTIONS)
      .select(`
        id, code, title, description, constraints, solution, uri,
        difficulty, expected_complexity, time_limit, memory_limit, status,
        category_id, created_at,
        question_categories(name),
        question_tag!left(tag_id, tags(name))
      `)
      .eq('code', code)
      .single();
    if (error) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }

    const { data: testCases, error: testCasesError } = await from(TABLE_NAMES.TEST_CASES)
      .select('id, input_data, output_data, case_order, is_simple, status')
      .eq('question_id', question.id)
      .order('case_order', { ascending: true });
    if (testCasesError) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: testCasesError.code });
    }

    const row = {
      code: question.code,
      category_id: question.category_id,
      category_name: question.question_categories?.name || null,
      title: question.title,
      description: question.description,
      constraints: question.constraints,
      solution: question.solution,
      uri: question.uri,
      difficulty: question.difficulty,
      expected_complexity: question.expected_complexity,
      time_limit: question.time_limit,
      memory_limit: question.memory_limit,
      status: question.status,
      tags: (question.question_tag || []).map((item) => item.tags?.name).filter(Boolean),
      created_at: question.created_at,
      test_cases: testCases,
    };
    return res.status(200).json(row);
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

const create = async (req, res, next) => {
  try {
    const {
      category_id,
      title,
      description = null,
      constraints = null,
      solution = null,
      uri,
      difficulty = null,
      expected_complexity = null,
      time_limit = null,
      memory_limit = null,
      status = true,
      tag = [],
    } = req.body || {};

    if (!category_id || !title) {
      return res.status(400).json({ message: 'กรุณาระบุ category_id, title', error: 'VALIDATION' });
    }

    const assetUri = savePdfAsset(uri, req.file);
    if (!assetUri) {
      return res.status(400).json({
        message: 'uri ไม่ถูกต้อง: ต้องเป็น PDF file หรือ base64/base64url ของไฟล์ PDF',
        error: 'VALIDATION',
      });
    }

    const code = await generateQuestionCode();
    const categoryId = toNullableNumber(category_id);
    if (!categoryId) {
      return res.status(400).json({ message: 'category_id ไม่ถูกต้อง', error: 'VALIDATION' });
    }

    const { data: category, error: categoryError } = await from(TABLE_NAMES.QUESTION_CATEGORIES)
      .select('id')
      .eq('id', categoryId)
      .single();
    if (categoryError || !category) {
      return res.status(400).json({ message: 'ไม่พบ category_id ที่ส่งมา', error: 'VALIDATION' });
    }

    const payload = {
      code: String(code).trim(),
      category_id: categoryId,
      title: String(title).trim(),
      description,
      constraints,
      solution,
      uri: assetUri,
      difficulty: toNullableNumber(difficulty),
      expected_complexity,
      time_limit: toNullableNumber(time_limit),
      memory_limit: toNullableNumber(memory_limit),
      status: status !== false,
      created_by: req.user.id,
      updated_by: req.user.id,
    };

    const { data: question, error } = await from(TABLE_NAMES.QUESTIONS)
      .insert(payload)
      .select('id, code, title, uri')
      .single();
    if (error) {
      return dbErrorResponse(res, error);
    }

    const { tagIds, missing } = await resolveTagIds(tag);
    if (missing.length > 0) {
      return res.status(400).json({
        message: 'ไม่พบบาง tag ที่ส่งมา',
        error: 'VALIDATION',
        detail: { missing_tags: missing },
      });
    }
    if (tagIds.length > 0) {
      const relationRows = tagIds.map((tagId) => ({ question_id: question.id, tag_id: tagId }));
      const { error: tagError } = await from(TABLE_NAMES.QUESTION_TAG).insert(relationRows);
      if (tagError) {
        return dbErrorResponse(res, tagError);
      }
    }

    const testCases = normalizeTestCases(req.body?.test_cases);
    if (testCases.length > 0) {
      const rows = testCases.map((tc) => ({
        question_id: question.id,
        input_data: tc.input_data,
        output_data: tc.output_data,
        case_order: tc.case_order,
        is_simple: tc.is_simple,
        status: tc.status,
        created_by: req.user.id,
        updated_by: req.user.id,
      }));
      const { error: testCaseError } = await from(TABLE_NAMES.TEST_CASES).insert(rows);
      if (testCaseError) {
        return dbErrorResponse(res, testCaseError);
      }
    }

    return res.status(201).json({ message: 'สร้างคำถามสำเร็จ', question_id: question.id, code: question.code });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

const update = async (req, res, next) => {
  try {
    const { code } = req.params;
    const {
      category_id,
      title,
      description,
      constraints,
      solution,
      uri,
      difficulty,
      expected_complexity,
      time_limit,
      memory_limit,
      status,
      tag,
      test_cases,
    } = req.body || {};

    const patch = { updated_by: req.user.id, updated_at: new Date().toISOString() };
    if (category_id !== undefined) {
      const categoryId = toNullableNumber(category_id);
      if (!categoryId) {
        return res.status(400).json({ message: 'category_id ไม่ถูกต้อง', error: 'VALIDATION' });
      }
      const { data: category, error: categoryError } = await from(TABLE_NAMES.QUESTION_CATEGORIES)
        .select('id')
        .eq('id', categoryId)
        .single();
      if (categoryError || !category) {
        return res.status(400).json({ message: 'ไม่พบ category_id ที่ส่งมา', error: 'VALIDATION' });
      }
      patch.category_id = categoryId;
    }
    if (title !== undefined) patch.title = title;
    if (description !== undefined) patch.description = description;
    if (constraints !== undefined) patch.constraints = constraints;
    if (solution !== undefined) patch.solution = solution;
    const assetUri = savePdfAsset(uri, req.file);
    if (assetUri) patch.uri = assetUri;
    if (difficulty !== undefined) patch.difficulty = toNullableNumber(difficulty);
    if (expected_complexity !== undefined) patch.expected_complexity = expected_complexity;
    if (time_limit !== undefined) patch.time_limit = toNullableNumber(time_limit);
    if (memory_limit !== undefined) patch.memory_limit = toNullableNumber(memory_limit);
    if (status !== undefined) patch.status = status;

    const { data: target, error: targetError } = await from(TABLE_NAMES.QUESTIONS)
      .select('id')
      .eq('code', code)
      .single();
    if (targetError || !target) {
      return res.status(404).json({ message: 'ไม่พบคำถาม', error: 'NOT_FOUND' });
    }

    if (Object.keys(patch).length > 2) {
      const { error: updateError } = await from(TABLE_NAMES.QUESTIONS)
        .update(patch)
        .eq('id', target.id);
      if (updateError) {
        return dbErrorResponse(res, updateError);
      }
    }

    if (tag !== undefined) {
      const { tagIds, missing } = await resolveTagIds(tag);
      if (missing.length > 0) {
        return res.status(400).json({
          message: 'ไม่พบบาง tag ที่ส่งมา',
          error: 'VALIDATION',
          detail: { missing_tags: missing },
        });
      }
      const { error: deleteTagError } = await from(TABLE_NAMES.QUESTION_TAG)
        .delete()
        .eq('question_id', target.id);
      if (deleteTagError) {
        return dbErrorResponse(res, deleteTagError);
      }

      if (tagIds.length > 0) {
        const relationRows = tagIds.map((tagId) => ({ question_id: target.id, tag_id: tagId }));
        const { error: insertTagError } = await from(TABLE_NAMES.QUESTION_TAG).insert(relationRows);
        if (insertTagError) {
          return dbErrorResponse(res, insertTagError);
        }
      }
    }

    if (test_cases !== undefined) {
      const cases = normalizeTestCases(test_cases);
      const { error: deleteCasesError } = await from(TABLE_NAMES.TEST_CASES)
        .delete()
        .eq('question_id', target.id);
      if (deleteCasesError) {
        return dbErrorResponse(res, deleteCasesError);
      }

      if (cases.length > 0) {
        const rows = cases.map((tc) => ({
          question_id: target.id,
          input_data: tc.input_data,
          output_data: tc.output_data,
          case_order: tc.case_order,
          is_simple: tc.is_simple,
          status: tc.status,
          created_by: req.user.id,
          updated_by: req.user.id,
        }));
        const { error: insertCasesError } = await from(TABLE_NAMES.TEST_CASES).insert(rows);
        if (insertCasesError) {
          return dbErrorResponse(res, insertCasesError);
        }
      }
    }

    return res.status(200).json({ message: 'อัปเดตคำถามสำเร็จ' });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

const remove = async (req, res, next) => {
  try {
    const { code } = req.params;
    const { data, error } = await from(TABLE_NAMES.QUESTIONS)
      .update({ status: false, updated_by: req.user.id, updated_at: new Date().toISOString() })
      .eq('code', code)
      .select('id')
      .single();
    if (error) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }
    if (!data) {
      return res.status(404).json({ message: 'ไม่พบคำถาม', error: 'NOT_FOUND' });
    }
    return res.status(200).json({ message: 'ลบคำถามสำเร็จ (soft delete)' });
  } catch (err) {
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER', code: err.code });
  }
};

module.exports = { list, getByCode, create, update, remove };
