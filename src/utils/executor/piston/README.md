# 🟢 Piston (Personal Edition)

เครื่องมือรันโค้ดประสิทธิภาพสูง (Code Execution Engine) ที่ถูกปรับแต่งมาเพื่อใช้งานส่วนตัวโดยเฉพาะ บริหารจัดการผ่าน Docker ทั้งหมด รองรับการรันโค้ดที่หลากหลายภาษาในสภาพแวดล้อมที่ปลอดภัย (Sandboxed Environment)

## 📂 Project Structure

```text
piston/
├── core/
│   ├── api/               # ตัวขับเคลื่อนหลักของ API (Execution Engine)
│   ├── cli/               # เครื่องมือ CLI สำหรับจัดการ Package ภายใน
│   └── repo/              # แหล่งเก็บข้อมูล Package (Optional)
├── data/                  # ข้อมูลที่บันทึกถาวร (Packages, Logs)
├── packages/              # สูตรการ Build สำหรับภาษาต่างๆ (Docker-based)
├── scripts/               # สคริปต์ช่วยจัดการระบบภายใน
├── tests/                 # ระบบทดสอบความปลอดภัยและการทำงาน
├── docker-compose.yml     # ไฟล์กำหนดค่า Container ทั้งหมด
└── .env.example           # ไฟล์ต้นแบบค่าคอนฟิก
```

## 🛠️ Requirements

| Requirement | Badge | Description |
| :--- | :--- | :--- |
| **Docker** | ![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white) | Engine หลักสำหรับรัน API และ Sandbox |
| **Node.js** | ![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white) | สำหรับใช้งาน CLI ภายใน |
| **Cgroup v2** | ![Linux](https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black) | จำเป็นสำหรับการทำ Sandboxing |
| **Arch** | ![Support](https://img.shields.io/badge/Architecture-x86__64%20%7C%20ARM64-blue?style=for-the-badge) | รองรับทั้ง Intel/AMD และ Apple Silicon |

---

## 📖 Setup Guide

ทำตามขั้นตอนด้านล่างเพื่อเริ่มรัน Piston ในเครื่อง:

1.  **ติดตั้งล่วงหน้า**: ตรวจสอบว่าเครื่องมี Docker และ Docker Compose พร้อมใช้งาน

2.  **ตั้งค่า Environment**:
    คัดลอกไฟล์แม่แบบและกำหนดภาษาที่ต้องการติดตั้ง:
    ```bash
    cp .env.example .env
    ```
    เปิดไฟล์ `.env` และกำหนด `PISTON_INSTALL_PACKAGES` (เช่น `python,node,gcc`)

3.  **Build Image**: (จำเป็นสำหรับการติดตั้งครั้งแรก)
    ```bash
    docker-compose build api
    ```

4.  **เริ่มต้นระบบ**:
    ```bash
    docker-compose up -d
    ```
    *ระบบจะทำการดาวน์โหลดและติดตั้งภาษาที่ระบุโดยอัตโนมัติ คุณสามารถดูความคืบหน้าได้จาก `docker-compose logs -f`*

---

## 📜 คำสั่งที่ใช้งานบ่อย (Usage)

| คำสั่ง | คำอธิบาย |
| :--- | :--- |
| `docker-compose up -d` | สั่งเริ่มทำงานในเบื้องหลัง |
| `docker-compose stop` | หยุดการทำงานชั่วคราว |
| `docker-compose logs -f` | ดู Log การทำงานแบบ Real-time |
| `docker-compose build api` | Build Image ใหม่ (หลังแก้โค้ดหรือเปลี่ยน Config) |
| `docker-compose exec api /bin/bash` | เข้าไปจัดการภายใน Container |

## 💻 Tech Stack
<p align="left">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=docker,nodejs,linux,bash,js" />
  </a>
</p>

---

## ✨ คุณสมบัติเด่น (Features)

- 🔒 **Robust Sandboxing**: ![Badge](https://img.shields.io/badge/Isolate-Security-red?style=flat-square) ใช้ [Isolate](https://www.ucw.cz/moe/isolate.1.html) ตลอดเวลา เพื่อจำกัด CPU, Memory, และตัดการเชื่อมต่อเครือข่ายภายนอก
- 📦 **Multi-language Support**: ติดตั้งและจัดการภาษาได้มากกว่า 70+ ภาษาผ่านระบบ Package Manager (ppman)
- 🍎 **Apple Silicon Ready**: ปรับแต่งมาเป็นพิเศษเพื่อให้รันบนชิป M1/M2/M3 ได้อย่างไร้รอยต่อ
- ⚡ **API Optimized**: ออกแบบมาให้มีความหน่วงต่ำ (Low Latency) เหมาะสำหรับการทำ IDE หรือ Online Judge

---

## 🌐 API Reference

Piston ทำงานที่พอร์ต **2000** โดยเริ่มต้น

### Execute Code
`POST /api/v2/execute`

**Request Body Example:**
```json
{
    "language": "python",
    "version": "3.10.0",
    "files": [{ "name": "main.py", "content": "print('Hello, Piston!')" }]
}
```

### Get Runtimes
`GET /api/v2/runtimes`
คืนค่ารายการภาษาและเวอร์ชันที่ติดตั้งอยู่ในปัจจุบัน

---
*เนื้อหาถูกดัดแปลงจากต้นฉบับ [EngineerMan/Piston](https://github.com/engineer-man/piston) เพื่อความเหมาะสมในโปรเจกต์ CodeArea*