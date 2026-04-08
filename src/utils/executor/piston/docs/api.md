# Piston API Reference (v2)

This document provides a detailed technical reference for the Piston execution engine API.

## 🔗 Quick Navigation
- [**Readme**](../readme.md) | [**Changelog**](../CHANGELOG.md)

---

## 🚀 Code Execution

### Execute Code (REST)
Run code in a secure, sandboxed environment.

**Endpoint:** `POST /api/v2/execute`

**Request Body:**
```json
{
    "language": "python",
    "version": "3.10.0",
    "files": [
        {
            "name": "main.py",
            "content": "print('Hello, Piston!')"
        }
    ],
    "stdin": "",
    "args": ["arg1"],
    "compile_timeout": 10000,
    "run_timeout": 3000,
    "compile_memory_limit": -1,
    "run_memory_limit": -1
}
```

**Response (Success):**
```json
{
    "language": "python",
    "version": "3.10.0",
    "run": {
        "stdout": "Hello, Piston!\n",
        "stderr": "",
        "code": 0,
        "signal": null,
        "output": "Hello, Piston!\n"
    }
}
```

### Connect (WebSocket)
For interactive execution (standard input support).

**Endpoint:** `WS /api/v2/connect`

**Flow:**
1. Send an `init` message with the job details.
2. Receive `data` messages for `stdout`/`stderr`.
3. Receive an `exit` message when completed.

---

## 📦 Runtime Management

### List Runtimes
Get all currently installed and active runtimes.

**Endpoint:** `GET /api/v2/runtimes`

**Response:**
```json
[
    {
        "language": "python",
        "version": "3.10.0",
        "aliases": ["py", "python3"],
        "runtime": "cpython"
    }
]
```

### List Available Packages
Get a list of all packages that *can* be installed from the repository.

**Endpoint:** `GET /api/v2/packages`

### Install Package
Download and install a package.

**Endpoint:** `POST /api/v2/packages`
**Body:** `{"language": "python", "version": "3.10.0"}`

### Uninstall Package
Remove an installed package.

**Endpoint:** `DELETE /api/v2/packages`
**Body:** `{"language": "python", "version": "3.10.0"}`

---
[**Back to Main Readme**](./readme.md)
