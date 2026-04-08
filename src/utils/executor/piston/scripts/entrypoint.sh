#!/usr/bin/env bash
set -e

# Cgroup v2 Initialization (Required for Isolate)
CGROUP_FS="/sys/fs/cgroup"
if [ ! -e "$CGROUP_FS" ]; then
  echo "[Piston] Cannot find $CGROUP_FS. Please ensure cgroup v2 is enabled on your host."
  exit 1
fi

if [[ ! -d "/sys/fs/cgroup/isolate" ]]; then
    echo "[Piston] Initializing cgroup v2 for Isolate..."
    cd /sys/fs/cgroup && \
    mkdir -p isolate/ && \
    echo 1 > isolate/cgroup.procs && \
    echo '+cpuset +cpu +io +memory +pids' > cgroup.subtree_control && \
    cd isolate && \
    mkdir -p init && \
    echo 1 > init/cgroup.procs && \
    echo '+cpuset +memory' > cgroup.subtree_control && \
    echo "[Piston] Cgroup v2 initialized."
fi

# Ensure correct permissions for the data directory
chown -R piston:piston /piston/data

echo "[Piston] Starting API server..."
# Run as piston user with increased file limits
cd /piston/core/api && su piston -c "ulimit -n 65536 && node src/index.js" &
API_PID=$!

echo "[Piston] Waiting for API to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
until curl -s http://localhost:2000/ > /dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "[Piston] API failed to start in time. Exiting."
        kill $API_PID
        exit 1
    fi
    sleep 1
done
echo "[Piston] API is ready!"

# Automated Package Installation
if [[ ! -z "$PISTON_INSTALL_PACKAGES" ]]; then
    echo "[Piston] Automated language installation requested: $PISTON_INSTALL_PACKAGES"
    
    # Split by comma
    IFS=',' read -ra PKGS <<< "$PISTON_INSTALL_PACKAGES"
    
    # Check currently installed packages
    echo "[Piston] Current packages:"
    cd /piston/core/cli && node index.js ppman list
    
    for pkg in "${PKGS[@]}"; do
        echo "[Piston] Checking package: $pkg"
        # We try to install it - the API handles duplicate installation/skipping if already installed.
        cd /piston/core/cli && node index.js ppman install "$pkg"
    done
    
    echo "[Piston] Finished language setup."
fi

# Bring API back to foreground
echo "[Piston] Monitoring API (PID: $API_PID)..."
wait $API_PID
