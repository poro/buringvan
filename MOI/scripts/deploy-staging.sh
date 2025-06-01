#!/bin/bash

echo "🚀 Starting MOI Staging Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if .env.staging exists
if [ ! -f ".env.staging" ]; then
    print_error ".env.staging file not found. Please create it first."
    exit 1
fi

print_status "Stopping any existing staging containers..."
docker-compose -f docker-compose.staging.yml down

print_status "Removing old images to ensure fresh build..."
docker-compose -f docker-compose.staging.yml down --rmi all --volumes --remove-orphans

print_status "Building staging images..."
docker-compose -f docker-compose.staging.yml build --no-cache

print_status "Starting staging environment..."
docker-compose -f docker-compose.staging.yml up -d

print_status "Waiting for services to be healthy..."
sleep 30

# Check health of each service
services=("auth-service" "content-service" "ai-service" "social-service" "web-frontend")
all_healthy=true

for service in "${services[@]}"; do
    print_status "Checking health of $service..."
    
    # Get the port for each service
    case $service in
        "auth-service") port=3001 ;;
        "content-service") port=3002 ;;
        "ai-service") port=3003 ;;
        "social-service") port=3004 ;;
        "web-frontend") port=3000 ;;
    esac
    
    # Try to connect to health endpoint
    if [ "$service" = "web-frontend" ]; then
        # Frontend doesn't have /health endpoint, just check if it responds
        if curl -f http://localhost:$port > /dev/null 2>&1; then
            print_status "✅ $service is healthy"
        else
            print_error "❌ $service is not responding"
            all_healthy=false
        fi
    else
        # Backend services have /health endpoints
        if curl -f http://localhost:$port/health > /dev/null 2>&1; then
            print_status "✅ $service is healthy"
        else
            print_error "❌ $service health check failed"
            all_healthy=false
        fi
    fi
done

if [ "$all_healthy" = true ]; then
    print_status "🎉 All services are healthy!"
    echo ""
    echo "Staging environment is ready at:"
    echo "Frontend: http://localhost:3000"
    echo "Auth API: http://localhost:3001"
    echo "Content API: http://localhost:3002"
    echo "AI API: http://localhost:3003"
    echo "Social API: http://localhost:3004"
    echo ""
    echo "To view logs: docker-compose -f docker-compose.staging.yml logs -f"
    echo "To stop: docker-compose -f docker-compose.staging.yml down"
else
    print_error "Some services are not healthy. Check logs with:"
    echo "docker-compose -f docker-compose.staging.yml logs"
    exit 1
fi