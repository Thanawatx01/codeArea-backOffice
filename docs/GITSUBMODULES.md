# 🛠️ คู่มือการใช้งาน Git Submodules (Piston & Judge0)

> [!NOTE]
> **สำคัญ**: ในเวอร์ชันล่าสุด หากคุณมีการตั้งค่าเชื่อมต่อกับ Hosted Executor อยู่แล้ว คุณ **ไม่จำเป็น** ต้องตั้งค่าหรือรัน Submodules เหล่านี้ในเครื่อง (Local) คู่มือนี้มีไว้สำหรับผู้ที่ต้องการรันเซิร์ฟเวอร์ Executor ของตนเองหรือต้องการพัฒนาตัวเครื่องมือเท่านั้น

โปรเจกต์นี้มีการแยกเครื่องมือ Code Executor (Piston และ Judge0) ออกเป็น Repository ย่อยเพื่อความสะดวกในการบริหารจัดการ หากคุณต้องการพัฒนาหรืออัปเดตเครื่องมือเหล่านี้ สามารถทำได้ตามคู่มือนี้

## 📥 การเรียกใช้ครั้งแรก (First-time setup)

เมื่อคุณทำการ `clone` โปรเจกต์หลักมาครั้งแรก โฟลเดอร์ใน `src/utils/executor/` จะว่างเปล่า คุณต้องรันคำสั่ง:

```bash
git submodule update --init --recursive
```

---

## 🔄 การดึงข้อมูลล่าสุด (Pulling Updates)

หากมีการอัปเดตบน Repository ของ Piston หรือ Judge0 ใน GitHub และคุณต้องการดึงความเปลี่ยนแปลงมาใช้ในโปรเจกต์นี้:

```bash
# สำหรับ Piston
cd src/utils/executor/piston
git pull origin main

# สำหรับ Judge0
cd src/utils/executor/judge0
git pull origin master
```

หลังจากดึงข้อมูลแล้ว อย่าลืมกลับมาที่ Root ของ Backend และทำการ Commit การเปลี่ยนแปลงของ Submodule ชี้ไปยังรีพอร์ตล่าสุดด้วย

---

## 📤 การส่งข้อมูลกลับ (Pushing Changes)

หากคุณแก้ไขโค้ดที่อยู่ใน `piston` หรือ `judge0` และต้องการส่งกลับไปยัง GitHub ของคุณเอง:

1.  เข้าไปที่โฟลเดอร์ของ Submodule นั้นๆ
2.  ทำการ `git add` และ `git commit` ตามปกติภายในโฟลเดอร์นั้น
3.  รันคำสั่ง `git push origin [branch_name]`

---

## ⚠️ ข้อควรระวัง (Things to know)

- **Nested Git**: อย่าพยายามลบโฟลเดอร์ `.git` ภายใน Submodule เพราะจะทำให้ลิงก์ความเชื่อมโยงขาดหายไป
- **Detached HEAD**: บางครั้งเมื่อคุณสลับ Branch ในโปรเจกต์หลัก Submodule อาจจะอยู่ในสถานะ "Detached HEAD" ให้ทำการ `git checkout main` (หรือ master) ภายในโฟลเดอร์นั้นก่อนเริ่มทำงาน
- **Commit Reference**: เมื่อคุณอัปเดต Submodule โปรเจกต์หลักจะมองว่ามีการเปลี่ยนแปลง (Change in pointer) คุณต้องทำการ Commit ในโปรเจกต์หลักด้วยเพื่อให้คนอื่นในทีมได้รับเวอร์ชันเดียวกัน

---

> [!TIP]
> หากต้องการอัปเดต Submodule ทั้งหมดในคำสั่งเดียวจาก Root:
> `git submodule update --remote --merge`
