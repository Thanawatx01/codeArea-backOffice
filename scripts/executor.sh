#!/bin/zsh

# Script to manage the Judge0 code executor from the backend root
# Usage: ./scripts/executor.sh {setup|up|down|logs|status|restart}

# Base directory for the executor relative to the backend root
EXECUTOR_DIR="src/utils/executor"

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

case "$1" in
    setup)
        echo "⚙️  Setting up executor configuration files..."
        if [ ! -f "$EXECUTOR_DIR/.env" ]; then
            cp "$EXECUTOR_DIR/.env.example" "$EXECUTOR_DIR/.env"
            echo "✅ Created $EXECUTOR_DIR/.env"
        else
            echo "ℹ️  $EXECUTOR_DIR/.env already exists."
        fi

        if [ ! -f "$EXECUTOR_DIR/judge0.conf" ]; then
            cp "$EXECUTOR_DIR/judge0.conf.example" "$EXECUTOR_DIR/judge0.conf"
            echo "✅ Created $EXECUTOR_DIR/judge0.conf"
        else
            echo "ℹ️  $EXECUTOR_DIR/judge0.conf already exists."
        fi
        echo "🚀 Setup complete. Please review the configurations if needed."
        ;;
    up)
        echo "🚀 Starting Judge0 executor services..."
        $DOCKER_COMPOSE_CMD -f "$EXECUTOR_DIR/docker-compose.yml" up -d
        ;;
    down)
        echo "🛑 Stopping Judge0 executor services..."
        $DOCKER_COMPOSE_CMD -f "$EXECUTOR_DIR/docker-compose.yml" down
        ;;
    logs)
        echo "📋 Showing logs (Ctrl+C to stop)..."
        $DOCKER_COMPOSE_CMD -f "$EXECUTOR_DIR/docker-compose.yml" logs -f
        ;;
    status)
        echo "📊 Executor Service Status:"
        $DOCKER_COMPOSE_CMD -f "$EXECUTOR_DIR/docker-compose.yml" ps
        ;;
    restart)
        echo "🔄 Restarting Judge0 executor services..."
        $DOCKER_COMPOSE_CMD -f "$EXECUTOR_DIR/docker-compose.yml" restart
        ;;
    *)
        echo "Usage: $0 {setup|up|down|logs|status|restart}"
        exit 1
        ;;
esac
