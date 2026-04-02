#!/bin/zsh

# Script to manage code executors from the backend root
# Usage: ./scripts/executor.sh {setup|up|down|logs|status|restart} [--executor=piston|judge0]

# Default settings
EXECUTOR="piston"

# Parse arguments (keep the first command and find flags)
CMD=$1
shift

for i in "$@"; do
    case $i in
        --executor=*)
            EXECUTOR="${i#*=}"
            ;;
    esac
done

# Set directory based on selected executor
if [ "$EXECUTOR" = "judge0" ]; then
    EXECUTOR_DIR="src/utils/executor/judge0"
else
    EXECUTOR_DIR="src/utils/executor/piston"
    EXECUTOR="piston" # Ensure it's piston if something else is passed
fi

# Always use port 5050 for both executors on the host
PORT=5050

# Ensure we're in the backend root
if [ ! -d "$EXECUTOR_DIR" ]; then
    echo "Error: Could not find $EXECUTOR_DIR. Please run this script from the backend root."
    exit 1
fi

# Function to check for docker compose command and return as an array
get_docker_compose() {
    if docker compose version > /dev/null 2>&1; then
        echo "docker" "compose"
    elif docker-compose version > /dev/null 2>&1; then
        echo "docker-compose"
    else
        echo "Error: Neither 'docker compose' nor 'docker-compose' was found. Please install Docker." >&2
        exit 1
    fi
}

# Use an array to store the command to handle spaces correctly in zsh
DOCKER_COMPOSE_CMD=($(get_docker_compose))

case "$CMD" in
    setup)
        echo "⚙️  Setting up $EXECUTOR configuration..."
        if [ "$EXECUTOR" = "judge0" ]; then
            if [ ! -f "$EXECUTOR_DIR/.env" ]; then
                cp "$EXECUTOR_DIR/.env.example" "$EXECUTOR_DIR/.env"
                echo "✅ Created $EXECUTOR_DIR/.env"
            fi
            if [ ! -f "$EXECUTOR_DIR/judge0.conf" ]; then
                cp "$EXECUTOR_DIR/judge0.conf.example" "$EXECUTOR_DIR/judge0.conf"
                echo "✅ Created $EXECUTOR_DIR/judge0.conf"
            fi
        else
            # Piston setup - install languages via API
            echo "📦 Installing default languages (Node.js, TypeScript, Python, GCC)..."
            # Ensure container is running before installing
            if ! docker ps | grep -q "piston-api"; then
                echo "🚀 Starting Piston first..."
                $DOCKER_COMPOSE_CMD -f "$EXECUTOR_DIR/docker-compose.yml" up -d
                sleep 5
            fi
            
            # Use the API to install packages instead of pman
            # Using port 5050 as it's the host port mapped to Piston
            PISTON_API_URL="http://localhost:5050/api/v2/packages"
            
            install_package() {
                local lang=$1
                local version=$2
                echo "Installing $lang $version..."
                curl -s -X POST "$PISTON_API_URL" \
                    -H "Content-Type: application/json" \
                    -d "{\"language\": \"$lang\", \"version\": \"$version\"}"
                echo ""
            }

            install_package "node" "20.11.1"
            install_package "typescript" "5.0.3"
            install_package "python" "3.12.0"
            install_package "gcc" "10.2.0"

            echo "✅ Language installation requests sent."
        fi
        echo "🚀 Setup for $EXECUTOR complete."
        ;;
        up)
        echo "🚀 Starting $EXECUTOR services..."
        # Use the global PORT variable set earlier
        $DOCKER_COMPOSE_CMD -f "$EXECUTOR_DIR/docker-compose.yml" up -d --build --remove-orphans
        echo "✅ Services started. Port: $PORT"
        ;;
    down)
        echo "🛑 Stopping $EXECUTOR services..."
        $DOCKER_COMPOSE_CMD -f "$EXECUTOR_DIR/docker-compose.yml" down --remove-orphans
        ;;
    logs)
        echo "📋 Showing $EXECUTOR logs (Ctrl+C to stop)..."
        $DOCKER_COMPOSE_CMD -f "$EXECUTOR_DIR/docker-compose.yml" logs -f
        ;;
    status)
        echo "📊 $EXECUTOR Service Status:"
        $DOCKER_COMPOSE_CMD -f "$EXECUTOR_DIR/docker-compose.yml" ps
        ;;
    restart)
        echo "🔄 Restarting $EXECUTOR services..."
        $DOCKER_COMPOSE_CMD -f "$EXECUTOR_DIR/docker-compose.yml" restart
        ;;
    *)
        echo "Usage: $0 {setup|up|down|logs|status|restart} [--executor=piston|judge0]"
        exit 1
        ;;
esac
