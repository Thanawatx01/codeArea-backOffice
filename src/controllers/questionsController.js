const { from, TABLE_NAMES } = require('../models/index');
const { normalizeInArray } = require('./BaseController');
const fs = require('fs');
const path = require('path');

const questionAssetDir = path.resolve(__dirname, '../../uploads/questions');
const QUESTION_CODE_PREFIX = 'QT';
const QUESTION_CODE_PAD = 5;

const savePdfAsset = (uriValue, file) => {
  if (file?.filename) return `/assets/questions/${file.filename}`;
  if (!uriValue || typeof uriValue !== 'string') return null;

  const raw = uriValue.trim();
  if (!raw) return null;

  let base64Payload = null;
  if (raw.startsWith('data:application/pdf;base64,')) {
    base64Payload = raw.split(',')[1];
  } else if (/^[A-Za-z0-9+/=\s]+$/.test(raw)) {
    base64Payload = raw.replace(/\s+/g, '');
  } else {
    return null;
  }

  const buffer = Buffer.from(base64Payload, 'base64');
  if (buffer.length < 4 || buffer.toString('ascii', 0, 4) !== '%PDF') return null;

  fs.mkdirSync(questionAssetDir, { recursive: true });
  const filename = `${Date.now()}-question.pdf`;
  fs.writeFileSync(path.join(questionAssetDir, filename), buffer);
  return `/assets/questions/${filename}`;
};

const generateQuestionCode = async () => {
  const { data: latest, error } = await from(TABLE_NAMES.QUESTIONS)
    .select('code')
    .like('code', `${QUESTION_CODE_PREFIX}%`)
    .order('code', { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const latestCode = latest?.[0]?.code || '';
  const current = Number(latestCode.replace(QUESTION_CODE_PREFIX, '')) || 0;
  const next = String(current + 1).padStart(QUESTION_CODE_PAD, '0');
  return `${QUESTION_CODE_PREFIX}${next}`;
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
      `)
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

    const { data: questions, error } = await query;
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

    return res.status(200).json(rows);
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
        message: 'กรุณาส่ง uri เป็นไฟล์ PDF (field uri) หรือ base64 PDF ใน body.uri',
        error: 'VALIDATION',
      });
    }

    const code = await generateQuestionCode();
    const payload = {
      code: String(code).trim(),
      category_id,
      title: String(title).trim(),
      description,
      constraints,
      solution,
      uri: assetUri,
      difficulty,
      expected_complexity,
      time_limit,
      memory_limit,
      status: status !== false,
      created_by: req.user.id,
      updated_by: req.user.id,
    };

    const { data: question, error } = await from(TABLE_NAMES.QUESTIONS)
      .insert(payload)
      .select('id, code, title, uri')
      .single();
    if (error) {
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }

    const tagIds = [...new Set(normalizeInArray(tag))];
    if (tagIds.length > 0) {
      const relationRows = tagIds.map((tagId) => ({ question_id: question.id, tag_id: tagId }));
      const { error: tagError } = await from(TABLE_NAMES.QUESTION_TAG).insert(relationRows);
      if (tagError) {
        return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: tagError.code });
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
    } = req.body || {};

    const patch = { updated_by: req.user.id, updated_at: new Date().toISOString() };
    if (category_id !== undefined) patch.category_id = category_id;
    if (title !== undefined) patch.title = title;
    if (description !== undefined) patch.description = description;
    if (constraints !== undefined) patch.constraints = constraints;
    if (solution !== undefined) patch.solution = solution;
    const assetUri = savePdfAsset(uri, req.file);
    if (assetUri) patch.uri = assetUri;
    if (difficulty !== undefined) patch.difficulty = difficulty;
    if (expected_complexity !== undefined) patch.expected_complexity = expected_complexity;
    if (time_limit !== undefined) patch.time_limit = time_limit;
    if (memory_limit !== undefined) patch.memory_limit = memory_limit;
    if (status !== undefined) patch.status = status;

    if (Object.keys(patch).length > 2) {
      const { error: updateError } = await from(TABLE_NAMES.QUESTIONS)
        .update(patch)
        .eq('code', code);
      if (updateError) {
        return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: updateError.code });
      }
    }

    if (tag !== undefined) {
      const { data: target, error: targetError } = await from(TABLE_NAMES.QUESTIONS)
        .select('id')
        .eq('code', code)
        .single();
      if (targetError || !target) {
        return res.status(404).json({ message: 'ไม่พบคำถาม', error: 'NOT_FOUND' });
      }

      const tagIds = [...new Set(normalizeInArray(tag))];
      const { error: deleteTagError } = await from(TABLE_NAMES.QUESTION_TAG)
        .delete()
        .eq('question_id', target.id);
      if (deleteTagError) {
        return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: deleteTagError.code });
      }

      if (tagIds.length > 0) {
        const relationRows = tagIds.map((tagId) => ({ question_id: target.id, tag_id: tagId }));
        const { error: insertTagError } = await from(TABLE_NAMES.QUESTION_TAG).insert(relationRows);
        if (insertTagError) {
          return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: insertTagError.code });
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
