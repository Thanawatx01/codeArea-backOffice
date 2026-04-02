# Piston Code Executor (Default)

This directory contains the setup for running [Piston](https://github.com/engineer-man/piston), a high-performance, open-source code execution API engine. It is the default executor for this project.

## 📂 Structure

- `docker-compose.yml`: Docker Compose configuration to easily spin up a local instance of the Piston API.
- `README.md`: This documentation file.

## 🚀 Piston Setup

คุณสามารถจัดการบริการรันโค้ดได้โดยตรงจากโฟลเดอร์ `backend` (root) ผ่านคำสั่ง `npm`:

1.  **Start Services**:
    ```bash
    npm run executor:up
    ```
    *(Default จะใช้ Piston หากต้องการระบุชัดเจนใช้ `npm run executor:up -- --executor=piston`)*

2.  **Install Languages** (Required for first time):
    เราได้เตรียมสคริปต์สำหรับติดตั้ง JavaScript, TypeScript, Python และ C++ (GCC) ไว้ให้แล้ว:
    ```bash
    npm run executor:setup
    ```
    หรือรันเองผ่าน API:
    ```bash
    curl -X POST http://localhost:5050/api/v2/packages -H "Content-Type: application/json" -d '{"language": "python", "version": "3.12.0"}'
    ```

3.  **Check Status**:
    ```bash
    npm run executor:status
    ```
    *(ตรวจสอบภาษาที่ติดตั้งแล้วได้ที่: http://localhost:5050/api/v2/runtimes)*

## 📦 Supported Languages

โปรเจกต์นี้ตั้งค่าให้รองรับภาษาดังนี้:
- **JavaScript** (Node.js)
- **TypeScript**
- **Python 3**
- **C++** (GCC)

## 📝 Usage

To execute code, you can send a `POST` request to `http://localhost:5050/api/v2/execute`:

```json
POST /api/v2/execute
{
  "language": "python",
  "version": "3.10.0",
  "files": [
    {
      "name": "main.py",
      "content": "print('Hello from Piston!')"
    }
  ]
}
```

> **Note for Apple Silicon Users:** Piston is generally more stable than Judge0 on ARM architecture for Node.js and TypeScript. However, if you encounter any issues, please check the Docker logs.
