#!/bin/bash

# MOI Staging Environment Monitor
# This script provides real-time monitoring of all staging services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    clear
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}    MOI Staging Environment Monitor${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo -e "${YELLOW}Last updated: $(date)${NC}"
    echo ""
}

check_service() {
    local service_name=$1
    local port=$2
    local endpoint=${3:-"/health"}
    
    if curl -f -s http://localhost:$port$endpoint > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $service_name${NC} (Port $port)"
        return 0
    else
        echo -e "${RED}❌ $service_name${NC} (Port $port)"
        return 1
    fi
}

check_database() {
    local db_name=$1
    local test_command=$2
    
    if eval $test_command > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $db_name${NC}"
        return 0
    else
        echo -e "${RED}❌ $db_name${NC}"
        return 1
    fi
}

get_service_metrics() {
    local port=$1
    local response=$(curl -s http://localhost:$port/health 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        # Try to extract uptime from response
        local uptime=$(echo $response | grep -o '"uptime":[^,]*' | cut -d':' -f2 | tr -d ' "')
        if [ ! -z "$uptime" ]; then
            echo "Uptime: ${uptime}s"
        else
            echo "Running"
        fi
    else
        echo "Down"
    fi
}

monitor_loop() {
    while true; do
        print_header
        
        echo -e "${BLUE}📊 Service Status:${NC}"
        echo "----------------------------------------"
        
        # Check backend services
        local services_up=0
        local total_services=4
        
        if check_service "Auth Service" "3001"; then ((services_up++)); fi
        echo "   $(get_service_metrics 3001)"
        
        if check_service "Content Service" "3002"; then ((services_up++)); fi
        echo "   $(get_service_metrics 3002)"
        
        if check_service "AI Service" "3003"; then ((services_up++)); fi
        echo "   $(get_service_metrics 3003)"
        
        if check_service "Social Service" "3004"; then ((services_up++)); fi
        echo "   $(get_service_metrics 3004)"
        
        echo ""
        echo -e "${BLUE}🌐 Frontend Status:${NC}"
        echo "----------------------------------------"
        check_service "React Frontend" "3000" "/"
        
        echo ""
        echo -e "${BLUE}🗄️ Database Status:${NC}"
        echo "----------------------------------------"
        check_database "MongoDB" "docker exec -i \$(docker ps -q -f 'name=mongodb') mongosh --quiet --eval 'db.runCommand(\"ping\")'"
        check_database "Redis" "docker exec -i \$(docker ps -q -f 'name=redis') redis-cli ping"
        
        echo ""
        echo -e "${BLUE}📈 System Summary:${NC}"
        echo "----------------------------------------"
        echo "Backend Services: $services_up/$total_services running"
        
        if [ $services_up -eq $total_services ]; then
            echo -e "${GREEN}✅ All systems operational${NC}"
        elif [ $services_up -gt 0 ]; then
            echo -e "${YELLOW}⚠️ Partial system outage${NC}"
        else
            echo -e "${RED}❌ System down${NC}"
        fi
        
        echo ""
        echo -e "${BLUE}🔧 Quick Actions:${NC}"
        echo "----------------------------------------"
        echo "Press 'r' to restart all services"
        echo "Press 'l' to view logs"
        echo "Press 's' to stop all services"
        echo "Press 'q' to quit monitor"
        echo ""
        echo "Auto-refresh in 10 seconds..."
        
        # Wait for input with timeout
        read -t 10 -n 1 key
        case $key in
            r|R) restart_services ;;
            l|L) view_logs ;;
            s|S) stop_services && exit 0 ;;
            q|Q) exit 0 ;;
        esac
    done
}

restart_services() {
    print_header
    echo -e "${YELLOW}🔄 Restarting all services...${NC}"
    
    # Kill existing processes
    pkill -f "node.*src/app.js" || true
    pkill -f "react-scripts start" || true
    
    # Restart databases
    cd /Users/mollila1/Documents/src/MOI
    docker-compose -f docker-compose.simple-staging.yml restart
    
    sleep 5
    echo -e "${GREEN}✅ Services restarted. Returning to monitor...${NC}"
    sleep 3
}

view_logs() {
    print_header
    echo -e "${BLUE}📝 Service Logs:${NC}"
    echo "----------------------------------------"
    echo "1. Auth Service"
    echo "2. Content Service"
    echo "3. AI Service"
    echo "4. Social Service"
    echo "5. Frontend"
    echo "6. MongoDB"
    echo "7. Redis"
    echo "0. Back to monitor"
    echo ""
    read -p "Select log to view (0-7): " choice
    
    case $choice in
        1) tail -f /tmp/Auth\ Service.log ;;
        2) tail -f /tmp/Content\ Service.log ;;
        3) tail -f /tmp/AI\ Service.log ;;
        4) tail -f /tmp/Social\ Service.log ;;
        5) tail -f /tmp/frontend.log ;;
        6) docker logs -f $(docker ps -q -f "name=mongodb") ;;
        7) docker logs -f $(docker ps -q -f "name=redis") ;;
        0|*) return ;;
    esac
}

stop_services() {
    print_header
    echo -e "${RED}🛑 Stopping all services...${NC}"
    
    # Kill Node.js processes
    pkill -f "node.*src/app.js" || true
    pkill -f "react-scripts start" || true
    
    # Stop databases
    cd /Users/mollila1/Documents/src/MOI
    docker-compose -f docker-compose.simple-staging.yml down
    
    echo -e "${GREEN}✅ All services stopped.${NC}"
}

# Handle Ctrl+C
trap "stop_services && exit 0" INT

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from the MOI project root directory${NC}"
    exit 1
fi

# Start monitoring
monitor_loop