# Judge0 Code Executor

This directory contains the setup for the Judge0 code execution engine.

## 📂 Structure

- `docker/`: Contains the `Dockerfile` for the Judge0 server and worker.
- `docker-compose.yml`: Docker Compose configuration for the entire stack (Server, Worker, DB, Redis).
- `judge0.conf`: Configuration file for Judge0.
- `.env`: Environment variables for the database.

## 🍎 Apple Silicon & ARM Compatibility

If you are developing on an ARM-based machine (e.g., Apple M1/M2/M3), please be aware of the following environment limitations:

- **Supported Runtimes**: Python 3 and C++ (Clang/GCC) are fully supported and optimized for ARM.
- **Currently Unsupported**: **Node.js** and **TypeScript** execution within the sandbox may fail with a `Runtime Error (NZEC)` or `Compilation Error`.
  - **Why?**: The current version of Judge0 (1.13.1) relies on `isolate` with cgroup v1 features that are missing or incompatible with modern ARM kernels in Docker Desktop for macOS.
- **Workaround**: Use **Python 3** or **C++** for testing and development in this environment.

For more details on management, use the `scripts/executor.sh` in the project root.
