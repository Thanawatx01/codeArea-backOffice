const { requireAuth } = require('../middlewares');

const list = async (req, res, next) => {
    try {
        // ใช้คำสั่ง SQL ดึงข้อมูล (สมมติว่าคุณ setup pool ไว้ที่อื่น)
        const result = await pool.query('SELECT id, name, email FROM users ORDER BY id ASC');
        
        res.status(200).json({ 
            status: 200, 
            message: "Success", 
            data: result.rows // PostgreSQL จะเก็บข้อมูลไว้ใน .rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};

const getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Logic: ค้นหา User ตาม id
        const userExists = false; // ตัวอย่างสมมติ
        if (!userExists) {
            return res.status(404).json({ status: 404, message: "User Not Found" });
        }
        res.status(200).json({ status: 200, message: "Success", data: {} });
    } catch (err) {
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};

const create = async (req, res, next) => {
    try {
        const { name, email } = req.body;
        if (!name || !email) {
            return res.status(400).json({ status: 400, message: "Bad Request: Missing required fields" });
        }
        res.status(201).json({ status: 201, message: "Created Successfully" });
    } catch (err) {
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};

const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Logic: อัปเดตข้อมูล
        res.status(200).json({ status: 200, message: "Updated Successfully" });
    } catch (err) {
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};

const remove = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Logic: ลบข้อมูล (Delete)
        res.status(200).json({ status: 200, message: "Deleted Successfully" });
    } catch (err) {
        res.status(500).json({ status: 500, message: "Internal Server Error" });
    }
};

module.exports = { list, getById, create, update, remove };