# codeArea-backOffice

ระบบจัดการ API ส่วนหลังบ้าน (API Back-office) พัฒนาด้วย Node.js, Express และใช้ Supabase เป็นระบบฐานข้อมูล

## 📂 โครงสร้างโปรเจกต์ (Project Structure)

```text
backend/
├── scripts/               # สคริปต์สำหรับควบคุมระบบ เช่น การจัดการระบบรันโค้ด
├── src/
│   ├── controllers/       # ส่วนควบคุมการทำงาน (Auth, Questions, Submissions, Users, etc.)
│   ├── middlewares/       # มิดเดิลแวร์ (authMiddleware, error-handler)
│   ├── models/            # โครงสร้างตารางและโมเดลข้อมูล (Prisma)
│   ├── routes/            # การกำหนดเส้นทาง API (questions.js, auth.js, etc.)
│   ├── utils/             # ฟังก์ชันช่วยเหลือทั่วไป (Common utilities)
│   │   └── executor/judge0 # ระบบรันโค้ด Judge0 (Docker, .env, README, config)
│   ├── app.js             # การตั้งค่าหลักของแอปพลิเคชัน Express
│   └── server.js          # จุดเริ่มต้นในการรัน API (Entry point)
├── supabase/
│   └── migrations/        # ไฟล์ SQL สำหรับสร้างโครงสร้างฐานข้อมูล (PostgreSQL migrations)
├── .env.example           # ไฟล์แม่แบบสำหรับตั้งค่าตัวแปรสภาพแวดล้อม
└── package.json           # การจัดการไลบรารีและสคริปต์ NPM
```

## 🛠️ การติดตั้งและตั้งค่า (Setup)

1. คัดลอกไฟล์ `.env.example` เป็น `.env` และตั้งค่าข้อมูลให้ครบถ้วน
2. รัน Redis (เช่น ใช้ `redis-server` หรือผ่าน Docker)
3. ติดตั้งโปรแกรมที่จำเป็น: `npm install`
4. รัน Supabase migrations (ดูขั้นตอนด้านล่าง)
5. เริ่มต้นรันระบบ: `npm run dev` หรือ `npm start`

## ตัวแปรสภาพแวดล้อม (.env) ที่สำคัญ

- **Supabase:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (สำหรับข้ามขีดจำกัด RLS)
- **Auth:** `JWT_SECRET` (ควรมีความยาวอย่างน้อย 32 ตัวอักษร), `JWT_EXPIRES_IN` (เช่น `7d`, `24h`), `REDIS_URL` (เช่น `redis://localhost:6379`)

## การจัดการฐานข้อมูล Supabase (Migrations)

- ไฟล์ตั้งค่าจะอยู่ในโฟลเดอร์ `supabase/migrations/`
- รันไฟล์ตามลำดับใน SQL Editor ของ Supabase Dashboard หรือใช้คำสั่ง `supabase db push`
- หลังจากสร้าง Schema พื้นฐานแล้ว ต้องรันไฟล์ `20250306120000_custom_auth_email_password.sql` เพื่อเพิ่มฟิลด์ `email` และ `password_hash` ในตาราง `users`

## ระบบตรวจสอบสิทธิ์ (Auth: Login / Register) — JWT + Redis

- **สมัครสมาชิก (Register):** เข้ารหัสรหัสผ่านด้วย bcrypt → บันทึกลงใน `public.users` (เก็บ `email`, `password_hash`) → สร้าง JWT → เก็บข้อมูล Token ลงใน Redis เพื่อตรวจสอบความถูกต้อง (โดยใช้ jti เป็นตัวระบุและตั้งเวลา TTL เท่ากับอายุของ JWT)
- **เข้าสู่ระบบ (Login):** ตรวจสอบรหัสผ่าน → ออก JWT → บันทึกลงใน Redis
- **ออกจากระบบ (Logout):** ลบข้อมูล Token ออกจาก Redis
- **ข้อมูลผู้ใช้งาน (Me):** ตรวจสอบสิทธิ์จาก JWT และเช็คสถานะจาก Redis ว่า Token ยังใช้งานได้อยู่หรือไม่

### พิกัด API (Endpoints):
- `POST /api/auth/register` — ส่งข้อมูล: `email`, `password` (อย่างน้อย 6 ตัว), `display_name?`, `role_id?` (รองรับรูปแบบ JSON และ form-data)
- `POST /api/auth/login` — ส่งข้อมูล: `email`, `password`
- `POST /api/auth/logout` — ต้องแนบ Header: `Authorization: Bearer <token>`
- `GET /api/auth/me` — ต้องแนบ Header: `Authorization: Bearer <token>`

รูปแบบการตอบกลับหลังการ Login/Register: `{ token, expires_in, user: { id, email, display_name, role_id } }`

ใช้งานมิดเดิลแวร์ `requireAuth` สำหรับเส้นทาง API ที่ต้องมีการล็อกอิน (จะได้รับข้อมูลผู้ใช้งานผ่าน `req.user`)

## 🚀 การจัดการระบบรันโค้ด (Code Executor Setup)

ระบบรองรับการรันโค้ดผ่าน 2 รูปแบบหลัก (ค่าเริ่มต้นคือ **Piston**):

### 1. Piston (แนะนำ / ค่าเริ่มต้น)
เป็นระบบรันโค้ดที่มีประสิทธิภาพสูงและรองรับภาษาเขียนโปรแกรมที่หลากหลายได้ง่าย
- **การติดตั้ง**: `npm run executor:setup`
- **เริ่มทำงาน**: `npm run executor:up`
- **ภาษาที่รองรับ**: JavaScript, TypeScript, Python, C++
- ดูรายละเอียดเพิ่มเติม: [เอกสารประกอบ Piston (Piston README)](src/utils/executor/piston/README.md)

### 2. Judge0 (ตัวเลือกเสริม)
ระบบ Sandbox ที่มีความปลอดภัยสูงและทำงานแยกส่วนกันอย่างชัดเจน (ใช้งาน `isolate`)
- **การติดตั้ง**: `npm run executor:setup -- --executor=judge0`
- **เริ่มทำงาน**: `npm run executor:up -- --executor=judge0`
- ดูรายละเอียดเพิ่มเติม: [เอกสารประกอบ Judge0 (Judge0 README)](src/utils/executor/judge0/README.md)

---

### 📖 คำสั่งจัดการระบบที่ใช้บ่อย (Common Management Commands)
คุณสามารถจัดการระบบรันโค้ดได้โดยตรงจากโฟลเดอร์หลักผ่านคำสั่ง `npm`:

1.  **ตั้งค่าไฟล์ CONFIG**: `npm run executor:setup`
2.  **เปิดใช้งานระบบ**: `npm run executor:up`
3.  **ตรวจสอบสถานะ**: `npm run executor:status`
4.  **หยุดการทำงาน**: `npm run executor:down`

*หมายเหตุ: ทุกคำสั่งสามารถระบุตัวรันโค้ดที่ต้องการได้โดยใช้ `-- --executor=piston` หรือ `-- --executor=judge0` (หากไม่ระบุระบบจะใช้ piston เป็นค่าเริ่มต้น)*
