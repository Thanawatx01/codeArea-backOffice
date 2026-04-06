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
    curl -X POST http://localhost:2000/api/v2/packages -H "Content-Type: application/json" -d '{"language": "python", "version": "3.12.0"}'
    ```

3.  **Check Status**:
    ```bash
    npm run executor:status
    ```
    *(ตรวจสอบภาษาที่ติดตั้งแล้วได้ที่: http://localhost:2000/api/v2/runtimes)*

## 📦 Supported Languages

โปรเจกต์นี้ตั้งค่าให้รองรับภาษาดังนี้:
- **JavaScript** (Node.js)
- **TypeScript**
- **Python 3**
- **C++** (GCC)

## 📝 Usage

To execute code, you can send a `POST` request to `http://localhost:2000/api/v2/execute`:

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

> **Note for Apple Silicon Users:** Piston is generally more stable than Judge0 on ARM architecture. However, to ensure full stability and feature parity (including proper resource limiting and threading), the latest version of Piston requires **cgroup v2** in Docker Desktop for macOS:
> 1. Open `~/Library/Group Containers/group.com.docker/settings-store.json` with your favorite editor (e.g., `vim`):
>    ```bash
>    vim "$HOME/Library/Group Containers/group.com.docker/settings-store.json"
>    ```
>    *(If `vim` shows `[New]`, you might have the old file name `settings.json` instead)*
> 2. Find and set `"DeprecatedCgroupv1": false`
> 3. Restart Docker Desktop.
>
> **Verify cgroup version:**
> Run `docker info | grep -i cgroup` in your terminal. If you see `Cgroup Version: 2`, it is successfully using v2. If you see `Cgroup Version: 1`, it is still using v1.
>
> **Bash script for editing settings-store.json (macOS):**
> ```bash
> SETTINGS_FILE="$HOME/Library/Group Containers/group.com.docker/settings-store.json"
> # Use settings.json if settings-store.json doesn't exist
> [ ! -f "$SETTINGS_FILE" ] && SETTINGS_FILE="$HOME/Library/Group Containers/group.com.docker/settings.json"
>
> if [ -f "$SETTINGS_FILE" ]; then
>   # Use sed to change or add the DeprecatedCgroupv1 key (case-sensitive in some versions)
>   if grep -q "deprecatedCgroupv1" "$SETTINGS_FILE" || grep -q "DeprecatedCgroupv1" "$SETTINGS_FILE"; then
>     sed -i '' 's/"deprecatedCgroupv1": true/"deprecatedCgroupv1": false/g' "$SETTINGS_FILE"
>     sed -i '' 's/"DeprecatedCgroupv1": true/"DeprecatedCgroupv1": false/g' "$SETTINGS_FILE"
>   else
>     sed -i '' 's/{/{\n  "DeprecatedCgroupv1": false,/' "$SETTINGS_FILE"
>   fi
>   echo "Successfully updated $SETTINGS_FILE. Please restart Docker Desktop."
> else
>   echo "Settings file not found at $SETTINGS_FILE"
> fi
> ```
