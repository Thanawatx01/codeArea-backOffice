const { requireAuth } = require('../middlewares');
// สมมติ db คือ connection ของคุณ (เช่น mysql2/promise หรือ knex)
// const db = require('../config/db'); 

/**
 * @description List all categories with question count (LeetCode Style: Join & Aggregate)
 * @endpoint GET /api/question-categories/list
 */
const list = async (req, res, next) => {
    try {
        const query = `
            SELECT c.id, c.name, c.description, c.status, COUNT(q.id) AS category_count
            FROM question_categories c
            LEFT JOIN questions q ON c.id = q.category_id
            WHERE c.status != 0
            GROUP BY c.id
        `;
        const [rows] = await db.execute(query);

        res.status(200).json({ status: 200, message: "OK", data: rows });
    } catch (err) {
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};

/**
 * @description Search categories by name or status
 * @endpoint POST /api/question-categories/search
 */
const search = async (req, res, next) => {
    try {
        const { name, status } = req.body;
        let sql = "SELECT * FROM question_categories WHERE 1=1";
        const params = [];

        if (name) {
            sql += " AND name LIKE ?";
            params.push(`%${name}%`);
        }
        if (status !== undefined) {
            sql += " AND status = ?";
            params.push(status);
        }

        const [rows] = await db.execute(sql, params);
        res.status(200).json({ status: 200, message: "OK", data: rows });
    } catch (err) {
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};

/**
 * @description Create new category
 * @endpoint POST /api/question-categories/create
 */
const create = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        
        // Validation Rule
        if (!name) return res.status(400).json({ status: 400, message: "Bad Request: Name is required" });

        const [result] = await db.execute(
            "INSERT INTO question_categories (name, description, status) VALUES (?, ?, 1)",
            [name, description]
        );

        res.status(201).json({ status: 201, message: "Created", data: { id: result.insertId } });
    } catch (err) {
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};

const getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        // สมมติ Logic เบื้องต้น
        res.status(200).json({ status: 200, message: `Get Data ID: ${id}` });
    } catch (err) {
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};

/**
 * @description Update category details
 * @endpoint PATCH /api/question-categories/update/:id
 */
const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const [result] = await db.execute(
            "UPDATE question_categories SET name = ?, description = ? WHERE id = ?",
            [name, description, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 404, message: "Not Found" });
        }

        res.status(200).json({ status: 200, message: "OK" });
    } catch (err) {
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};

/**
 * @description Soft delete (Set status to 0)
 * @endpoint DELETE /api/question-categories/delete/:id
 */
const remove = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await db.execute(
            "UPDATE question_categories SET status = 0 WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 404, message: "Not Found" });
        }

        res.status(200).json({ status: 200, message: "OK (Soft Deleted)" });
    } catch (err) {
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};

module.exports = { list, search, create, getById, update, remove };