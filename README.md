# CodeArea — Backoffice

Back-office REST API สำหรับ CodeArea พัฒนาด้วย Node.js + Express เชื่อมต่อฐานข้อมูลผ่าน Supabase (PostgreSQL) ใช้ระบบ Auth แบบ Custom JWT (ไม่ใช้ Supabase Auth)

## 📂 Project Structure

```text
backend/
├── scripts/               # Scripts สำหรับจัดการ Executor (docker-compose wrappers)
├── src/
│   ├── controllers/       # ส่วนควบคุม Logic (Auth, Questions, Submissions, Settings, etc.)
│   ├── middlewares/       # Express Middlewares (requireAuth, error-handler)
│   ├── models/            # โมเดลข้อมูลและการเชื่อมต่อ Supabase
│   ├── routes/            # การกำหนด API Endpoints
│   ├── utils/             # ฟังก์ชันช่วยเหลือ (JWT, Piston executor)
│   ├── app.js             # การตั้งค่าหลักของ Express application
│   └── server.js          # Entry point
├── supabase/
│   └── migrations/        # SQL Migrations (PostgreSQL schema)
├── .env.example           # ไฟล์ต้นแบบ Environment Variables
└── package.json           # Library และ NPM Scripts
```

## 🛠️ Requirements

| Requirement | Badge | Description |
| :--- | :--- | :--- |
| **Node.js** | ![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white) | Runtime v18+ |
| **Express** | ![Express](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB) | Framework หลัก |
| **Supabase** | ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white) | ฐานข้อมูล PostgreSQL |
| **Redis** | ![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white) | Session / Token Store |
| **Docker** | ![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white) | รัน Executor (Piston / Judge0) |
| **JWT** | ![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens) | Stateless Auth |

---

## 📖 Setup Guide

ทำตามขั้นตอนด้านล่างเพื่อเริ่มรันโปรเจคในเครื่อง (Local Development):

1.  **ติดตั้ง Dependencies และ Submodules**:
    ```bash
    npm install
    git submodule update --init --recursive
    ```
    *(หมายเหตุ: หากคุณเชื่อมต่อกับ Hosted Executor อยู่แล้ว ไม่จำเป็นต้องติดตั้ง Submodule)*

2.  **ตั้งค่า Environment**:
    ใช้ setup wizard เพื่อสร้าง `.env` พร้อม `JWT_SECRET` แบบสุ่มใหม่ทุกครั้งที่ setup:
    ```bash
    npm run setup:env
    ```
    หรือคัดลอกไฟล์แม่แบบและกรอกค่าเอง:
    ```bash
    cp .env.example .env
    ```
    ค่าที่ต้องมี:
    - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
    - `SUPABASE_STORAGE_QUESTIONS_BUCKET`, `SUPABASE_STORAGE_PROFILES_BUCKET`
    - `JWT_SECRET` (สุ่มใหม่โดย setup wizard), `JWT_EXPIRES_IN`

3.  **รัน Supabase Migrations**:
    นำไฟล์ SQL จากโฟลเดอร์ `supabase/migrations/` ไปรันตามลำดับใน **Supabase Dashboard → SQL Editor**

4.  **เริ่มต้นรันระบบ**:
    ```bash
    npm run dev
    ```

API พร้อมใช้งานที่ [http://localhost:3100](http://localhost:3100)

## 📖 เอกสารเพิ่มเติม (Documentation)

เพื่อความเข้าใจในการพัฒนาและบริหารจัดการระบบที่ลึกซึ้งยิ่งขึ้น โปรดตรวจสอบเอกสารดังต่อไปนี้:

- 📝 **[รายละเอียด API Endpoints](docs/API.md)**: รายการ API ทั้งหมด ข้อมูลที่ต้องส่ง และผลลัพธ์ที่จะได้รับ
- 🛠️ **[คู่มือการจัดการ Git Submodule](docs/GITSUBMODULES.md)**: วิธีการ Pull/Push และจัดการ Piston และ Judge0 ให้ซิงค์กับโปรเจกต์หลัก

---

## 📜 คำสั่งที่ใช้งานบ่อย (Available Scripts)

- `npm run dev`: เริ่มต้นรันเซิร์ฟเวอร์ในโหมดพัฒนา (Node.js --watch)
- `npm run start`: รัน API Server สำหรับ Production
- `npm run executor:setup`: ติดตั้งและตั้งค่า Code Executor (Piston/Judge0)
- `npm run executor:up`: เปิดใช้งาน Executor Services
- `npm run executor:down`: ปิด Executor Services
- `npm run executor:logs`: ดู Log ของ Executor
- `npm run executor:status`: ตรวจสอบสถานะ Executor
- `npm run submodule:update`: อัปเดต Submodules เป็นเวอร์ชันล่าสุด

## 💻 Tech Stack
<p align="left">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=nodejs,express,supabase,postgres,redis,docker,js,postman,python,fastapi" />
  </a>
</p>

---

## ✨ คุณสมบัติเด่น (Features)

- 🔐 **Custom JWT Auth**: ![Badge](https://img.shields.io/badge/JWT-black?style=flat-square&logo=JSON%20web%20tokens) ระบบ Login/Register แบบ Stateless พร้อม Redis session store
- 🗄️ **Supabase PostgreSQL**: ![Badge](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white) ฐานข้อมูลแบบ Cloud-native พร้อม RLS bypass ผ่าน Service Role
- ⚙️ **Global IDE Executor Config** *(v1.1)*: ตั้งค่า Execution Engine (Piston/Judge0) ผ่านหน้า Dashboard — เก็บไว้ในตาราง `system_settings` มีผลกับผู้ใช้ทุกคน (Admin Only)
- 🤖 **AI Tutor BaaS Integration** *(v1.2)*: บูรณาการระบบ AI Tutor แบบ Backend-as-a-Service โดย Node.js ทำหน้าที่เป็น Proxy บริหารจัดการ Model และ Health Check ผ่าน API กลาง
- 🚀 **Code Execution Proxy**: Backend ทำหน้าที่ Proxy การรันโค้ดผ่าน `/api/executor/execute` เพื่อหลีกเลี่ยงปัญหา CORS

---

## 🔑 Auth Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | สมัครสมาชิก (`email`, `password`, `display_name?`) |
| `POST` | `/api/auth/login` | เข้าสู่ระบบ |
| `POST` | `/api/auth/logout` | ออกจากระบบ |
| `GET` | `/api/auth/me` | ดึงข้อมูลผู้ใช้ปัจจุบัน (ต้องมี Token) |

Response: `{ token, expires_in, user: { id, email, display_name, role_id } }`

> [!TIP]
> **Hosted Executor Ready**: สำหรับเวอร์ชันล่าสุด คุณไม่จำเป็นต้องติดตั้งหรือรัน Piston/Judge0 ในเครื่อง (Local Run) เองอีกต่อไป เนื่องจากระบบรองรับการเชื่อมต่อผ่าน Hosting ภายนอกซึ่งสามารถตั้งค่าได้ทันทีจากหน้า Dashboard

---

## 🚀 Code Executor Setup

🎛️ **Global IDE Configuration**: ตั้งแต่ v1.1 URL ของ Executor จะถูกตั้งค่าจากหน้า Dashboard IDE โดยตรง ผ่านตาราง `system_settings` ในฐานข้อมูล (ไม่ต้องตั้งใน `.env` อีกต่อไป)

ระบบรองรับ Executor 2 รูปแบบ:

### 1. Piston (Recommended)
เป็น Executor ที่ประสิทธิภาพสูง รองรับหลายภาษา จัดการผ่าน Git Submodule เพื่อความสะดวกในการทำ Upstream Sync
- **รายละเอียดการติดตั้งและตั้งค่า**: [Piston README](src/utils/executor/piston/readme.md)

### 2. Judge0 (Alternative)
ระบบ Sandbox ระดับสูง (ใช้ `isolate`) เหมาะสำหรับความปลอดภัยขั้นสูงสุด
- **รายละเอียดการติดตั้งและตั้งค่า**: [Judge0 README](src/utils/executor/judge0/README.md) 

---

## 📜 คำสั่งที่ใช้งานบ่อย (Available Scripts)

คุณสามารถจัดการทั้ง Piston และ Judge0 ผ่านคำสั่งส่วนกลางในโฟลเดอร์ root:

- `npm run executor:setup`: ตั้งค่า Executor (Default: piston)
- `npm run executor:up`: เปิดใช้งาน Services
- `npm run executor:down`: ปิด Services
- `npm run executor:status`: ตรวจสอบสถานะ

*ทุกคำสั่งรองรับ Flag `-- --executor=judge0` หากต้องการสลับไปใช้งาน Judge0*

---

## 🚀 การ Deployment (Railway)

โปรดระลึกเสมอว่า Railway (และแพลตฟอร์มอื่นๆ) จะ **ตรวจจับเฉพาะความเปลี่ยนแปลงใน Repository นี้เท่านั้น** ไม่ได้ตรวจจับการเปลี่ยนแปลงที่เกิดขึ้นภายใน Repository ของ Submodule โดยตรง

### ขั้นตอนการสั่ง Deploy เมื่อมีการอัปเดต Submodule:
หากคุณมีการอัปเดตโค้ดใน Piston หรือ Judge0 และต้องการให้ Railway ทำการ Deploy ใหม่ คุณต้องทำการลากข้อมูลล่าสุดมาที่โปรเจกต์หลักดังนี้:

1.  **อัปเดต Submodule เป็นเวอร์ชันล่าสุด**:
    ```bash
    npm run submodule:update
    ```
2.  **Commit และ Push ไปที่ Branch `development`**:
    ```bash
    git add .
    git commit -m "deploy: sync submodules to latest"
    git push origin development
    ```

### 🤖 ระบบอัตโนมัติ (Official Railway Action):
เราได้เปลี่ยนมาใช้ **Official Railway Action** เพื่อให้การ Deployment มีความเสถียรและรองรับ Submodule ได้อย่างสมบูรณ์ ระบบจะทำงานอัตโนมัติเมื่อคุณ Push ไปที่ `development`

> [!IMPORTANT]
> **การเซ็ตอัพที่จำเป็น (First-time Setup)**: 
> คุณต้องเพิ่ม **`RAILWAY_TOKEN`** เข้าไปใน GitHub Secrets เพื่อให้ Action นี้ทำงานได้:
> 1.  ไปที่ **Railway Dashboard** -> **Project Settings** -> **Tokens** -> **Generate Token**.
> 2.  ไปที่ **GitHub Repository** -> **Settings** -> **Secrets and variables** -> **Actions**.
> 3.  กด **New repository secret** ตั้งชื่อว่า `RAILWAY_TOKEN` และวางค่าที่ก้อปมาลงไป
