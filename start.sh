#!/bin/bash

echo "============================================"
echo "  AI 3D/Spatial Platform - Starting..."
echo "============================================"

# Load environment variables
set -a
source .env 2>/dev/null
set +a

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Kill processes on used ports
echo ""
echo "🧹 Cleaning up ports $BACKEND_PORT and $FRONTEND_PORT..."
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null
sleep 1
echo "✅ Ports cleaned"

# Check PostgreSQL
echo ""
echo "🐘 Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL not found. Please install it first."
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q 2>/dev/null; then
    echo "⚠️  PostgreSQL is not running. Attempting to start..."
    brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || pg_ctl start -D /usr/local/var/postgres 2>/dev/null || pg_ctl start -D /opt/homebrew/var/postgres 2>/dev/null
    sleep 2
fi

# Create database and user if not exists
echo "📦 Setting up database..."
psql postgres -c "CREATE USER ai3dspatial WITH PASSWORD 'ai3dspatial' CREATEDB;" 2>/dev/null
psql postgres -c "CREATE DATABASE ai3dspatial OWNER ai3dspatial;" 2>/dev/null
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE ai3dspatial TO ai3dspatial;" 2>/dev/null
echo "✅ Database ready"

# Install dependencies
echo ""
echo "📦 Installing backend dependencies..."
npm install --silent

echo ""
echo "📦 Installing frontend dependencies..."
cd client
if [ ! -d "node_modules" ]; then
    npm install --silent
else
    echo "✅ Frontend dependencies already installed"
fi
cd ..

# Seed database
echo ""
echo "🌱 Seeding database..."
node server/seed.js

# Start backend with nodemon for hot reload
echo ""
echo "🚀 Starting backend on port $BACKEND_PORT with hot reload..."
npx nodemon server/index.js &
BACKEND_PID=$!

# Start frontend with hot reload (React default)
echo "🚀 Starting frontend on port $FRONTEND_PORT with hot reload..."
cd client
PORT=$FRONTEND_PORT BROWSER=none npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "============================================"
echo "  AI 3D/Spatial Platform is running!"
echo "  Backend:  http://localhost:$BACKEND_PORT"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo "  Hot reload: enabled for both"
echo "============================================"
echo ""
echo "Press Ctrl+C to stop all services"

# Trap Ctrl+C to clean up
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
