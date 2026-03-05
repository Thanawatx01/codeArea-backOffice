-- Custom auth: เพิ่ม email + password_hash ใน users, auth_id เป็น optional (สำหรับ user เก่าที่ย้ายจาก Supabase Auth)

-- ทำให้ auth_id เป็น nullable (user ใหม่จะไม่ใช้)
ALTER TABLE public.users
  ALTER COLUMN auth_id DROP NOT NULL;

-- เพิ่ม email (unique) และ password_hash สำหรับ login เราเอง
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email varchar(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash varchar(255);

-- ถ้ามี user เก่าที่มีแค่ auth_id ให้เพิ่ม constraint แยก: email หรือ auth_id ต้องมีอย่างน้อยหนึ่งอย่าง
-- (optional) สำหรับ user ใหม่เราจะใส่ email + password_hash เท่านั้น

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON public.users(email) WHERE email IS NOT NULL;
