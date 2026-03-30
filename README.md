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

## Judge0 Setup (Code Executor)

ระบบใช้ Judge0 สำหรับรันโค้ด ซึ่งรันแยกเป็น Docker container อยู่ในโฟลเดอร์ `backend/src/utils/executor` โดยได้รับการปรับปรุงให้รองรับ Docker Desktop และ Apple Silicon (M1/M2/M3) อย่างเต็มรูปแบบ

### บริการที่เกี่ยวข้อง (Services)
- **Server:** API endpoint สำหรับรับงานรันโค้ด (Port 2358)
- **Worker:** หน่วยประมวลผลสำหรับรันโค้ดและ sandbox (isolate)
- **DB (PostgreSQL 13):** เก็บข้อมูลการส่งและผลลัพธ์
- **Redis 6.0:** คิวงานสำหรับส่งต่อให้ worker

### ขั้นตอนการติดตั้ง
1. ตรวจสอบว่ามี Docker และ Docker Compose ติดตั้งอยู่ในเครื่อง
2. เข้าไปที่โฟลเดอร์ `backend/src/utils/executor`
3. คัดลอกไฟล์ตั้งค่าตัวอย่าง:
   ```bash
   cp .env.example .env
   cp judge0.conf.example judge0.conf
   ```
4. ตรวจสอบและตั้งค่าไฟล์ `.env` และ `judge0.conf` (โดยปกติค่าเริ่มต้นจะพร้อมใช้งานทันที)
5. สั่งรันด้วยคำสั่ง:
   ```bash
   docker-compose up -d
   ```
   *(หรือ `docker compose up -d` สำหรับ Docker Desktop รุ่นใหม่)*
6. ตรวจสอบการทำงานผ่าน: `http://localhost:2358/languages`

### การรองรับ Apple Silicon (M1/M2/M3)
ระบบถูกตั้งค่าให้รันผ่าน **Rosetta 2** เป็นค่าเริ่มต้น แต่หากต้องการรันแบบ **Native ARM64** เพื่อประสิทธิภาพสูงสุด สามารถทำได้ดังนี้:
1. เปิดไฟล์ `docker-compose.yml`
2. นำ `#` ออกจากบรรทัด `build: .` ในส่วนของ service `server` และ `worker`
3. รันคำสั่ง: `docker-compose up -d --build`

### การแก้ปัญหา (Troubleshooting)

**1. "Rosetta error: mmap_anonymous_rw mmap failed"**
- **สาเหตุ:** `isolate` (sandbox) ใช้เทคนิคการจำกัดหน่วยความจำที่ Rosetta 2 ไม่รองรับเมื่อปิด cgroup management
- **วิธีแก้:** ตรวจสอบว่าใน `judge0.conf` ตั้งค่า `CGROUP_MANAGEMENT=true` และใน `docker-compose.yml` มีการ mount `/sys/fs/cgroup` เรียบร้อยแล้ว (ซึ่งเป็นค่าเริ่มต้นปัจจุบัน)

**2. "Internal Error"**
- ตรวจสอบว่า Docker Container มีสิทธิ์ `privileged: true` (จำเป็นสำหรับ `isolate`)
- หากรันบน Linux (ที่ไม่ใช่ Docker Desktop) ต้องตั้งค่า cgroup v1/v2 ให้ถูกต้อง
- ตรวจสอบ logs ของ worker: `docker-compose logs -f worker`

**3. การเชื่อมต่อ Database/Redis ล้มเหลว**
- ตรวจสอบชื่อ Host ใน `judge0.conf` ว่าตรงกับชื่อ service ใน `docker-compose.yml` (เช่น `POSTGRES_HOST=db`, `REDIS_HOST=redis`)
- ตรวจสอบว่ารหัสผ่านใน `.env` และ `judge0.conf` ตรงกัน

**4. Build Failure ("exit code: 100" during apt-get update)**
- **สาเหตุ:** Base Image เดิม (Debian 10 Buster) หมดอายุการสนับสนุน (EOL) ทำให้ Repository เดิมไม่สามารถเข้าถึงได้
- **วิธีแก้:** เปลี่ยนไปใช้ Base Image ที่ใหม่กว่า เช่น `ruby:2.7.8-slim-bullseye` (ซึ่งได้ปรับปรุงใน Dockerfile เรียบร้อยแล้ว) หากยังพบปัญหาให้ลองรัน `docker-compose build --no-cache`

**5. Runtime Error (NZEC) - "/usr/local/.../node-12.14.0/bin/node: Assertion (0) == (uv_thread_create(...)) failed."**
- **สาเหตุ:** การรัน Node.js ใน sandbox (isolate) โดยปิด cgroup management บน Docker Desktop (macOS/Windows) ทำให้เกิดปัญหาในการสร้าง Thread
 - **วิธีแก้:** ระบบได้ปรับปรุงให้ใช้ `CGROUP_MANAGEMENT=true` และตั้งค่าใน `docker-compose.yml` ให้ mount `/sys/fs/cgroup` แบบ `rw` รวมถึงตั้งค่าใน Frontend (`lib/judge0.ts`) ให้เปิดใช้งาน cgroup-based limits เพื่อความเสถียรสูงสุดสำหรับ Node.js

**6. TypeScript Compilation Error (Syntax Error '??')**
- **สาเหตุ:** Node.js 12 (ที่ Judge0 1.13.1 ใช้เป็นค่าเริ่มต้น) ไม่รองรับ syntax ใหม่ๆ ของ TypeScript รุ่นล่าสุด
- **วิธีแก้:** ระบบได้ทำการติดตั้ง `typescript@3.7.4` ซึ่งเป็นรุ่นที่แนะนำสำหรับ Judge0 1.13.1 และทำงานร่วมกับ Node.js 12 ได้อย่างสมบูรณ์
