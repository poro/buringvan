#!/bin/bash

# MOI Staging Log Aggregation Script
# Collects and formats logs from all services for easy debugging

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

LOG_DIR="/tmp/moi-staging-logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

create_log_directory() {
    print_status "Creating log directory: $LOG_DIR"
    mkdir -p "$LOG_DIR"
}

collect_service_logs() {
    print_status "Collecting service logs..."
    
    local services=("Auth Service" "Content Service" "AI Service" "Social Service" "frontend")
    
    for service in "${services[@]}"; do
        local log_file="/tmp/${service}.log"
        local output_file="$LOG_DIR/${service// /_}_${TIMESTAMP}.log"
        
        if [ -f "$log_file" ]; then
            print_status "Collecting logs for $service"
            cp "$log_file" "$output_file"
            
            # Add header to log file
            {
                echo "=============================================="
                echo "MOI Staging - $service Logs"
                echo "Collected at: $(date)"
                echo "=============================================="
                echo ""
                cat "$output_file"
            } > "${output_file}.tmp" && mv "${output_file}.tmp" "$output_file"
        else
            print_warning "No log file found for $service"
            echo "No logs available for $service at $(date)" > "$output_file"
        fi
    done
}

collect_docker_logs() {
    print_status "Collecting Docker container logs..."
    
    # MongoDB logs
    local mongo_container=$(docker ps -q -f "name=mongodb")
    if [ ! -z "$mongo_container" ]; then
        print_status "Collecting MongoDB logs"
        docker logs "$mongo_container" > "$LOG_DIR/mongodb_${TIMESTAMP}.log" 2>&1
    else
        print_warning "MongoDB container not found"
    fi
    
    # Redis logs
    local redis_container=$(docker ps -q -f "name=redis")
    if [ ! -z "$redis_container" ]; then
        print_status "Collecting Redis logs"
        docker logs "$redis_container" > "$LOG_DIR/redis_${TIMESTAMP}.log" 2>&1
    else
        print_warning "Redis container not found"
    fi
}

generate_system_info() {
    print_status "Generating system information..."
    
    local info_file="$LOG_DIR/system_info_${TIMESTAMP}.txt"
    
    {
        echo "=============================================="
        echo "MOI Staging Environment - System Information"
        echo "Generated at: $(date)"
        echo "=============================================="
        echo ""
        
        echo "--- Docker Containers ---"
        docker ps -a
        echo ""
        
        echo "--- Docker Images ---"
        docker images | grep -E "(moi|mongo|redis|node|nginx)"
        echo ""
        
        echo "--- Port Usage ---"
        lsof -i :3000 2>/dev/null || echo "Port 3000: Not in use"
        lsof -i :3001 2>/dev/null || echo "Port 3001: Not in use"
        lsof -i :3002 2>/dev/null || echo "Port 3002: Not in use"
        lsof -i :3003 2>/dev/null || echo "Port 3003: Not in use"
        lsof -i :3004 2>/dev/null || echo "Port 3004: Not in use"
        lsof -i :27017 2>/dev/null || echo "Port 27017: Not in use"
        lsof -i :6379 2>/dev/null || echo "Port 6379: Not in use"
        echo ""
        
        echo "--- Environment Variables ---"
        env | grep -E "(NODE_ENV|MONGODB_URI|REDIS_URL|OPENAI)" | sed 's/=.*/=***REDACTED***/'
        echo ""
        
        echo "--- Disk Usage ---"
        df -h
        echo ""
        
        echo "--- Memory Usage ---"
        free -h 2>/dev/null || vm_stat | head -10
        echo ""
        
        echo "--- Node.js Processes ---"
        ps aux | grep node | grep -v grep
        echo ""
        
    } > "$info_file"
    
    print_status "System information saved to: $info_file"
}

create_health_report() {
    print_status "Creating health report..."
    
    local health_file="$LOG_DIR/health_report_${TIMESTAMP}.txt"
    
    {
        echo "=============================================="
        echo "MOI Staging Environment - Health Report"
        echo "Generated at: $(date)"
        echo "=============================================="
        echo ""
        
        echo "--- Service Health Checks ---"
        
        # Check backend services
        for port in 3001 3002 3003 3004; do
            local service_name=""
            case $port in
                3001) service_name="Auth Service" ;;
                3002) service_name="Content Service" ;;
                3003) service_name="AI Service" ;;
                3004) service_name="Social Service" ;;
            esac
            
            if curl -f -s http://localhost:$port/health > /dev/null 2>&1; then
                echo "✅ $service_name (Port $port): Healthy"
                # Get detailed health info
                curl -s http://localhost:$port/health 2>/dev/null | jq '.' 2>/dev/null || echo "   Response: $(curl -s http://localhost:$port/health 2>/dev/null)"
            else
                echo "❌ $service_name (Port $port): Down"
            fi
            echo ""
        done
        
        # Check frontend
        if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
            echo "✅ Frontend (Port 3000): Healthy"
        else
            echo "❌ Frontend (Port 3000): Down"
        fi
        echo ""
        
        # Check databases
        local mongo_container=$(docker ps -q -f "name=mongodb")
        if [ ! -z "$mongo_container" ]; then
            if docker exec -i "$mongo_container" mongosh --quiet --eval 'db.runCommand("ping")' > /dev/null 2>&1; then
                echo "✅ MongoDB: Healthy"
            else
                echo "❌ MongoDB: Connection failed"
            fi
        else
            echo "❌ MongoDB: Container not running"
        fi
        
        local redis_container=$(docker ps -q -f "name=redis")
        if [ ! -z "$redis_container" ]; then
            if docker exec -i "$redis_container" redis-cli ping > /dev/null 2>&1; then
                echo "✅ Redis: Healthy"
            else
                echo "❌ Redis: Connection failed"
            fi
        else
            echo "❌ Redis: Container not running"
        fi
        
    } > "$health_file"
    
    print_status "Health report saved to: $health_file"
}

create_summary_report() {
    print_status "Creating summary report..."
    
    local summary_file="$LOG_DIR/SUMMARY_${TIMESTAMP}.md"
    
    {
        echo "# MOI Staging Environment - Log Summary"
        echo ""
        echo "**Generated at:** $(date)"
        echo "**Environment:** Staging"
        echo "**Log Collection Period:** Last session"
        echo ""
        
        echo "## 📁 Collected Files"
        echo ""
        ls -la "$LOG_DIR" | grep -v "^total" | awk '{print "- " $9 " (" $5 " bytes)"}'
        echo ""
        
        echo "## 🔍 Quick Analysis"
        echo ""
        
        # Count errors in logs
        local error_count=0
        for log_file in "$LOG_DIR"/*.log; do
            if [ -f "$log_file" ]; then
                local file_errors=$(grep -c -i "error\|exception\|failed" "$log_file" 2>/dev/null || echo 0)
                error_count=$((error_count + file_errors))
            fi
        done
        
        echo "- **Total Errors Found:** $error_count"
        
        # Check for specific issues
        if grep -q "ECONNREFUSED" "$LOG_DIR"/*.log 2>/dev/null; then
            echo "- **⚠️ Connection Issues:** Database connection failures detected"
        fi
        
        if grep -q "EADDRINUSE" "$LOG_DIR"/*.log 2>/dev/null; then
            echo "- **⚠️ Port Conflicts:** Port already in use errors detected"
        fi
        
        if grep -q "404\|500\|502\|503" "$LOG_DIR"/*.log 2>/dev/null; then
            echo "- **⚠️ HTTP Errors:** HTTP error responses detected"
        fi
        
        echo ""
        echo "## 📋 Recommendations"
        echo ""
        echo "1. Review health_report_${TIMESTAMP}.txt for service status"
        echo "2. Check system_info_${TIMESTAMP}.txt for environment details"
        echo "3. Examine individual service logs for specific errors"
        echo "4. Verify database connectivity and authentication"
        echo ""
        echo "## 🚀 Next Steps"
        echo ""
        echo "To restart the staging environment:"
        echo "\`\`\`bash"
        echo "./scripts/start-staging-simple.sh"
        echo "\`\`\`"
        echo ""
        echo "To monitor services in real-time:"
        echo "\`\`\`bash"
        echo "./scripts/monitor-staging.sh"
        echo "\`\`\`"
        
    } > "$summary_file"
    
    print_status "Summary report saved to: $summary_file"
}

# Main execution
main() {
    echo -e "${BLUE}🔍 MOI Staging Log Aggregation${NC}"
    echo "=========================================="
    
    create_log_directory
    collect_service_logs
    collect_docker_logs
    generate_system_info
    create_health_report
    create_summary_report
    
    echo ""
    print_status "🎉 Log aggregation complete!"
    print_status "📁 All logs saved to: $LOG_DIR"
    print_status "📋 Start with: cat $LOG_DIR/SUMMARY_${TIMESTAMP}.md"
    echo ""
    echo "To view logs:"
    echo "  ls -la $LOG_DIR"
    echo "  cat $LOG_DIR/SUMMARY_${TIMESTAMP}.md"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the MOI project root directory"
    exit 1
fi

main "$@"