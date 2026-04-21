const { from, TABLE_NAMES } = require("../models/index");
const { logAudit } = require("../utils/auditLogger");

// GET /tags
const list = async (req, res, next) => {
  try {
    const { name, status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let query = from(TABLE_NAMES.TAGS).select(`
      *, 
      question_tag(count),
      users!tags_created_by_fkey(display_name),
      updater:users!tags_updated_by_fkey(display_name)
    `, {
      count: "exact",
    });

    if (name) {
      query = query.ilike("name", `%${name}%`);
    }

    if (status !== undefined && status !== "") {
      const statusStr = String(status).toLowerCase();
      if (statusStr === "true" || statusStr === "1") {
        query = query.eq("status", true);
      } else if (statusStr === "false" || statusStr === "0") {
        query = query.eq("status", false);
      }
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(400).json({
        message: "เกิดข้อผิดพลาดในการดึงข้อมูล tags",
        error: error.message,
      });
    }

    const mappedData = data.map((tag) => {
      const questionCount = tag.question_tag?.[0]?.count || 0;
      const { question_tag, users, updater, ...restTag } = tag;
      return {
        ...restTag,
        question_count: questionCount,
        created_by_name: users?.display_name || "System",
        updated_by_name: updater?.display_name || users?.display_name || "System",
      };
    });

    const total_page = Math.ceil((count || 0) / limit);

    res.json({
      data: mappedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_page: total_page === 0 ? 1 : total_page,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /tags/:id
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await from(TABLE_NAMES.TAGS)
      .select("*, users!tags_created_by_fkey(display_name), updater:users!tags_updated_by_fkey(display_name)")
      .eq("id", id)
      .single();

    if (error) {
      return res
        .status(404)
        .json({ message: "ไม่พบข้อมูล tag นี้", error: error.message });
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// POST /tags
const create = async (req, res, next) => {
  try {
    const { name, status } = req.body;

    if (!name) {
      return res.status(400).json({ message: "กรุณาระบุชื่อ tag" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { data, error } = await from(TABLE_NAMES.TAGS)
      .insert([
        {
          name,
          status: status !== undefined ? status : true,
          created_by: userId,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        message: "เกิดข้อผิดพลาดในการสร้าง tag",
        error: error.message,
      });
    }

    // Audit Log
    await logAudit({
      userId,
      actionType: 'TAG_CREATE',
      details: { tagId: data.id, tagName: data.name },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

// PUT /tags/:id
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const updateData = {
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await from(TABLE_NAMES.TAGS)
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        message: "เกิดข้อผิดพลาดในการแก้ไข tag",
        error: error.message,
      });
    }

    if (!data) {
      return res
        .status(404)
        .json({ message: "ไม่พบข้อมูล tag ที่ต้องการแก้ไข" });
    }

    // Audit Log
    await logAudit({
      userId,
      actionType: 'TAG_UPDATE',
      details: { tagId: id, updateData },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// DELETE /tags/:id
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await from(TABLE_NAMES.TAGS)
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res
        .status(400)
        .json({ message: "เกิดข้อผิดพลาดในการลบ tag", error: error.message });
    }

    if (!data) {
      return res.status(404).json({ message: "ไม่พบข้อมูล tag ที่ต้องการลบ" });
    }

    // Audit Log
    await logAudit({
      userId: req.user?.id,
      actionType: 'TAG_DELETE',
      details: { tagId: id, tagName: data.name },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: "ลบข้อมูล tag สำเร็จ", tag: data });
  } catch (err) {
    next(err);
  }
};

// PUT /tags/:id/restore
const restore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { data, error } = await from(TABLE_NAMES.TAGS)
      .update({
        status: true,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        message: "เกิดข้อผิดพลาดในการกู้คืน tag",
        error: error.message,
      });
    }

    if (!data) {
      return res
        .status(404)
        .json({ message: "ไม่พบข้อมูล tag ที่ต้องการกู้คืน" });
    }

    // Audit Log
    await logAudit({
      userId,
      actionType: 'TAG_RESTORE',
      details: { tagId: id },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: "กู้คืนข้อมูล tag สำเร็จ", tag: data });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove, restore };
