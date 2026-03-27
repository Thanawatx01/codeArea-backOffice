const { requireAuth } = require('../middlewares');

const list = async (req, res, next) => {
    try {
        // 1. รับค่าจาก Query Params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const name = req.query.name || '';
        const status = req.query.status; // รับค่า 0 หรือ 1

        const offset = (page - 1) * limit;

        // 2. สร้างเงื่อนไข WHERE แบบ Dynamic
        let whereClause = "WHERE 1=1";
        const queryArgs = [];

        if (name) {
            queryArgs.push(`%${name}%`);
            whereClause += ` AND name ILIKE $${queryArgs.length}`; // ค้นหาชื่อแบบไม่สนใจตัวพิมพ์เล็ก-ใหญ่
        }
        if (status !== undefined && status !== '') {
            queryArgs.push(status);
            whereClause += ` AND status = $${queryArgs.length}`;
        }

        // 3. หาจำนวนรวม (Total) ทั้งหมดตาม Filter
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM question_categories ${whereClause}`, 
            queryArgs
        );
        const total = parseInt(countResult.rows[0].count);

        // 4. ดึงข้อมูลจริงตาม Page และ Limit
        const dataQuery = `
            SELECT * FROM question_categories 
            ${whereClause} 
            ORDER BY id DESC 
            LIMIT $${queryArgs.length + 1} OFFSET $${queryArgs.length + 2}
        `;
        const result = await pool.query(dataQuery, [...queryArgs, limit, offset]);

        const total_page = Math.ceil(total / limit);

        res.status(200).json({
            status: 200,
            message: "Success",
            data: result.rows,
            pagination: { page, limit, total, total_page }
        });
    } catch (err) {
        next(err);
    }
};

const create = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        // ดึง ID จาก token (ที่ requireAuth เก็บไว้ใน req.user)
        const userId = req.user.id; 

        if (!name) return res.status(400).json({ status: 400, message: "Name is required" });

        const result = await pool.query(
            `INSERT INTO question_categories 
            (name, description, status, created_by, updated_by, created_at, updated_at) 
            VALUES ($1, $2, 1, $3, $3, NOW(), NOW()) 
            RETURNING *`,
            [name, description, userId]
        );

        res.status(201).json({ status: 201, message: "Created", data: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const userId = req.user.id; // ใครเป็นคนกดเซฟรอบนี้

        const result = await pool.query(
            `UPDATE question_categories 
             SET name = $1, description = $2, updated_by = $3, updated_at = NOW() 
             WHERE id = $4 
             RETURNING *`,
            [name, description, userId, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ status: 404, message: "Not Found" });
        }

        res.status(200).json({ status: 200, message: "OK", data: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

const remove = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id; // <--- ต้องเพิ่มบรรทัดนี้
        // Soft Delete
        const result = await pool.query(
            "UPDATE question_categories SET status = 0, updated_by = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
            [userId, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ status: 404, message: "Not Found" });
        }

        res.status(200).json({ status: 200, message: "OK (Soft Deleted)" });
    } catch (err) {
        next(err);
    }
};

const restore = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id; // <--- ต้องเพิ่มบรรทัดนี้ด้วย
        // อัปเดต status กลับเป็น 1 (Active)
        const result = await pool.query(
            "UPDATE question_categories SET status = 1, updated_by = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
            [userId, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ status: 404, message: "Category Not Found" });
        }

        res.status(200).json({ 
            status: 200, 
            message: "Restore Successfully", 
            data: result.rows[0] 
        });
    } catch (err) {
        next(err);
    }
};

const getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // ถ้าใช้ PostgreSQL (pgAdmin)
        const result = await pool.query("SELECT * FROM question_categories WHERE id = $1", [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ status: 404, message: "Category Not Found" });
        }
        
        res.status(200).json({ 
            status: 200, 
            message: "Success", 
            data: result.rows[0] 
        });
    } catch (err) {
        next(err); // ส่ง error ไปที่ errorHandler
    }
};

module.exports = { list, search: list, create, getById, update, remove, restore };