# 📝 รายละเอียด API Endpoints (Backend Reference)

เอกสารฉบับนี้รวบรวมรายการ Endpoints ทั้งหมดของระบบ Backoffice API เพื่อใช้ในการอ้างอิงสำหรับการพัฒนา Frontend หรือการทดสอบระบบ

## 🔐 Authentication (`/api/auth`)

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | No | สมัครสมาชิกใหม่ (`email`, `password`, `display_name`) |
| `POST` | `/login` | No | เข้าสู่ระบบ และรับ JWT Token |
| `POST` | `/logout` | Yes | ออกจากระบบ (ล้าง Session ใน Redis) |
| `GET` | `/me` | Yes | ดึงข้อมูลโปรไฟล์ของผู้ใช้ปัจจุบัน |

---

## 📚 โจทย์และหมวดหมู่ (`/api/questions` & `/api/question-categories`)

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/questions` | Yes | ดึงรายการโจทย์ทั้งหมด (รองรับ Filter & Sort) |
| `GET` | `/questions/:code` | Yes | ดึงรายละเอียดโจทย์รายข้อตาม Code |
| `POST` | `/questions` | Admin | สร้างโจทย์ใหม่ |
| `PUT` | `/questions/:code` | Admin | แก้ไขข้อมูลโจทย์ |
| `DELETE` | `/questions/:code` | Admin | ลบโจทย์ออกจากระบบ |
| `GET` | `/question-categories` | Yes | ดึงรายการหมวดหมู่ทั้งหมด |

---

## 🚀 การส่งคำตอบและการประมวลผล (`/api/submissions` & `/api/executor`)

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/submissions` | Yes | ส่งโค้ดคำตอบเพื่อตรวจ (Submit) |
| `GET` | `/submissions` | Yes | ดูประวัติการส่งคำตอบของผู้ใช้ |
| `POST` | `/executor/execute` | Yes | รันโค้ดแบบ Sandbox (ใช้ในหน้า IDE) |

---

## ⚙️ การตั้งค่าระบบ (`/api/settings`)

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/settings/executor` | Yes | ดึงค่าคอนฟิกการเชื่อมต่อ Engine ปัจจุบัน |
| `POST` | `/settings/executor` | Admin | แก้ไขค่าคอนฟิก Engine ส่วนกลาง |
| `DELETE` | `/settings/executor` | Admin | ล้างค่าคอนฟิก และกลับไปใช้ค่าเริ่มต้น |

---

## 👥 ผู้ใช้งานและกิจกรรม (`/api/users`)

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/users/leaderboard` | Yes | ดึงอันดับผู้ใช้ (Leaderboard) |
| `GET` | `/users/activity` | Yes | ดึงกิจกรรมล่าสุดในระบบ |

---

> [!NOTE]
> - ทุก Endpoint ที่ต้องใช้ **Authorization** จะต้องส่ง Header: `Authorization: Bearer <TOKEN>`
> - สิทธิ์ **Admin** คือผู้ใช้ที่มี `role_id === 2`
