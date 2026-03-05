# codeArea-backOffice

Back-office API (Supabase + Node.js + Express). Auth ใช้ระบบเราเอง: JWT + Redis (ไม่ใช้ Supabase Auth).

## Setup

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
