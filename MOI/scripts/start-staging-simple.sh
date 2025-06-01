#!/bin/bash

echo "🚀 Starting Simple MOI Staging Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Stop any existing development processes
print_status "Stopping existing development processes..."
pkill -f "node.*src/app.js" || true
pkill -f "react-scripts start" || true

# Start databases
print_status "Starting staging databases..."
docker-compose -f docker-compose.simple-staging.yml up -d

# Wait for databases to be ready
print_status "Waiting for databases to be ready..."
sleep 10

# Test database connections
print_status "Testing database connections..."
if ! docker exec moi_staging_network_mongodb_1 2>/dev/null || docker exec $(docker ps -q -f "name=mongodb") mongosh --eval "db.runCommand('ping')" > /dev/null 2>&1; then
    print_warning "MongoDB connection test failed, but continuing..."
fi

# Load staging environment variables
print_status "Loading staging environment configuration..."
if [ -f ".env.staging" ]; then
    # Export all variables from .env.staging
    set -a  # automatically export all variables
    source .env.staging
    set +a  # stop automatically exporting
    print_status "✅ Staging environment variables loaded"
else
    print_error ".env.staging file not found!"
    exit 1
fi

print_status "Starting backend services with staging configuration..."

# Function to start a service
start_service() {
    local service_name=$1
    local service_path=$2
    local service_port=$3
    local health_path=${4:-"/health"}
    
    print_status "Starting $service_name on port $service_port..."
    
    if [ -d "$service_path" ]; then
        cd "$service_path"
        npm start > "/tmp/$service_name.log" 2>&1 &
        local pid=$!
        cd - > /dev/null
        
        # Wait for service to start
        sleep 8
        
        # Test health endpoint
        local health_url="http://localhost:$service_port$health_path"
        if curl -f "$health_url" > /dev/null 2>&1; then
            print_status "✅ $service_name is healthy"
            echo $pid
        else
            print_warning "⚠️ $service_name health check failed"
            print_warning "   Check logs: tail -f /tmp/$service_name.log"
            echo $pid
        fi
    else
        print_error "Service directory not found: $service_path"
        echo "0"
    fi
}

# Start backend services
AUTH_PID=$(start_service "Auth Service" "server/auth-service" "3001")
CONTENT_PID=$(start_service "Content Service" "server/content-service" "3002") 
AI_PID=$(start_service "AI Service" "server/ai-service" "3003")
SOCIAL_PID=$(start_service "Social Service" "server/social-service" "3004")

# Start frontend (different health check)
print_status "Starting Frontend on port 3000..."
if [ -d "client/web" ]; then
    cd client/web
    npm start > /tmp/frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd - > /dev/null
    
    # Wait longer for frontend to compile
    print_status "Waiting for frontend to compile..."
    sleep 15
    
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_status "✅ Frontend is healthy"
    else
        print_warning "⚠️ Frontend health check failed"
        print_warning "   Check logs: tail -f /tmp/frontend.log"
    fi
else
    print_error "Frontend directory not found: client/web"
    FRONTEND_PID=0
fi

# Wait for frontend
sleep 10
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_status "✅ Frontend is healthy"
else
    print_warning "⚠️ Frontend health check failed"
fi

echo ""
print_status "🎉 MOI Staging Environment Started!"
echo ""
echo "Access your application:"
echo "Frontend: http://localhost:3000"
echo "Auth API: http://localhost:3001"
echo "Content API: http://localhost:3002"
echo "AI API: http://localhost:3003"
echo "Social API: http://localhost:3004"
echo ""
echo "Database access:"
echo "MongoDB: mongodb://staginguser:stagingpassword@localhost:27017/moi_staging"
echo "Redis: redis://localhost:6379"
echo ""
echo "To stop all services:"
echo "kill $AUTH_PID $CONTENT_PID $AI_PID $SOCIAL_PID $FRONTEND_PID"
echo "docker-compose -f docker-compose.simple-staging.yml down"
echo ""
print_status "Press Ctrl+C to stop all services"

# Wait for user to stop
trap "print_status 'Stopping all services...' && kill $AUTH_PID $CONTENT_PID $AI_PID $SOCIAL_PID $FRONTEND_PID 2>/dev/null && docker-compose -f docker-compose.simple-staging.yml down && exit 0" INT

# Keep script running
while true; do
    sleep 60
    print_status "All services running... (Ctrl+C to stop)"
done