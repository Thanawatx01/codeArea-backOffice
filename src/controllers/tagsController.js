const { from, TABLE_NAMES } = require("../models/index");

// GET /tags
const list = async (req, res, next) => {
  try {
    const { data, error } = await from(TABLE_NAMES.TAGS)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res
        .status(400)
        .json({
          message: "เกิดข้อผิดพลาดในการดึงข้อมูล tags",
          error: error.message,
        });
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// GET /tags/:id
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await from(TABLE_NAMES.TAGS)
      .select("*")
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
      return res
        .status(400)
        .json({
          message: "เกิดข้อผิดพลาดในการสร้าง tag",
          error: error.message,
        });
    }
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
      return res
        .status(400)
        .json({
          message: "เกิดข้อผิดพลาดในการแก้ไข tag",
          error: error.message,
        });
    }

    if (!data) {
      return res
        .status(404)
        .json({ message: "ไม่พบข้อมูล tag ที่ต้องการแก้ไข" });
    }

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

    res.json({ message: "ลบข้อมูล tag สำเร็จ", tag: data });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove };
