# codeArea-backOffice

Back-office API (Supabase + Node.js + Express). Auth ใช้ระบบเราเอง: JWT + Redis (ไม่ใช้ Supabase Auth).

## 📂 Project Structure

```text
backend/
├── scripts/               # Scripts สำหรับควบคุมระบบ เช่น executor management
├── src/
│   ├── controllers/       # ส่วนควบคุม Logic (Auth, Questions, Submissions, Users, etc.)
│   ├── middlewares/       # Middlewares (authMiddleware, error-handler)
│   ├── models/            # โครงสร้างตารางและโมเดลข้อมูล (Prisma)
│   ├── routes/            # การกำหนด API Endpoints (questions.js, auth.js, etc.)
│   ├── utils/             # ฟังก์ชันช่วยเหลือทั่วไป (Common utilities)
│   │   └── executor/judge0 # ระบบรันโค้ด Judge0 (Docker, .env, README, config)
│   ├── app.js             # การตั้งค่าหลักของ Express application
│   └── server.js          # จุดเริ่มต้นการรัน API (Entry point)
├── supabase/
│   └── migrations/        # SQL สำหรับสร้างโครงสร้างฐานข้อมูล (PostgreSQL migrations)
├── .env.example           # ไฟล์ต้นแบบสำหรับ Environment Variables
└── package.json           # การจัดการ Library และ NPM Scripts
```

## 🛠️ Setup

1. Copy `.env.example` to `.env` แล้วตั้งค่าให้ครบ
2. รัน Redis (เช่น `redis-server` หรือ Docker)
3. `npm install`
4. รัน Supabase migrations (ดูด้านล่าง)
5. `npm run dev` หรือ `npm start`

## .env ที่ต้องมี

- **Supabase:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (สำหรับ bypass RLS)
- **Auth:** `JWT_SECRET` (อย่างน้อย 32 ตัวอักษร), `JWT_EXPIRES_IN` (เช่น `7d`, `24h`), `REDIS_URL` (เช่น `redis://localhost:6379`)

## Supabase migrations

- อยู่ใน `supabase/migrations/`
- รันตามลำดับใน SQL Editor ของ Supabase Dashboard หรือใช้ `supabase db push`
- หลัง schema ต้นทางแล้วต้องรัน `20250306120000_custom_auth_email_password.sql` เพื่อเพิ่ม `email`, `password_hash` ใน `users`

## Auth (login / register) — JWT + Redis

- **Register:** hash password (bcrypt) → เก็บใน `public.users` (email, password_hash) → ออก JWT → เก็บ token ใน Redis (key = jti, TTL = หมดอายุเท่า JWT)
- **Login:** ตรวจ password → ออก JWT → เก็บใน Redis
- **Logout:** ลบ token ออกจาก Redis
- **Me:** ตรวจ JWT + ดูว่า jti ยังอยู่ใน Redis หรือไม่

Endpoints:

- `POST /api/auth/register` — body: `email`, `password` (อย่างน้อย 6 ตัว), `display_name?`, `role_id?` (รองรับ JSON และ form-data)
- `POST /api/auth/login` — body: `email`, `password`
- `POST /api/auth/logout` — header: `Authorization: Bearer <token>`
- `GET /api/auth/me` — header: `Authorization: Bearer <token>`

Response หลัง login/register: `{ token, expires_in, user: { id, email, display_name, role_id } }`

ใช้ middleware `requireAuth` สำหรับ route ที่ต้องล็อกอิน (จะได้ `req.user`)

## 🚀 Code Executor Setup

ระบบรองรับการรันโค้ดผ่าน 2 รูปแบบหลัก (Default คือ **Piston**):

### 1. Piston (Recommended / Default)
เป็น Executor ที่ประสิทธิภาพสูงและรองรับภาษาหลากหลายได้ง่ายกว่า
- **Setup**: `npm run executor:setup`
- **Start**: `npm run executor:up`
- **Languages**: JavaScript, TypeScript, Python, C++
- ดูรายละเอียดเพิ่มเติมที่: [Piston README](src/utils/executor/piston/README.md)

### 2. Judge0 (Alternative)
ระบบ Sandbox ที่มีความละเอียดสูง (ใช้ `isolate`)
- **Setup**: `npm run executor:setup -- --executor=judge0`
- **Start**: `npm run executor:up -- --executor=judge0`
- ดูรายละเอียดเพิ่มเติมที่: [Judge0 README](src/utils/executor/judge0/README.md)

---

### 📖 Common Management Commands
คุณสามารถจัดการบริการรันโค้ดได้โดยตรงจากโฟลเดอร์ `backend` (root) ผ่านคำสั่ง `npm`:

1.  **Initialize Config**: `npm run executor:setup`
2.  **Start Services**: `npm run executor:up`
3.  **Check Status**: `npm run executor:status`
4.  **Stop Services**: `npm run executor:down`

*หมายเหตุ: ทุกคำสั่งสามารถระบุตัวรันได้โดยใช้ `-- --executor=piston` หรือ `-- --executor=judge0` (Default คือ piston)*

---

