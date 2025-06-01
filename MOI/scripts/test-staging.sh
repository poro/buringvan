#!/bin/bash

# MOI Staging Environment Test Suite
# Comprehensive testing of all services and workflows

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

print_header() {
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}    MOI Staging Environment Test Suite${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo -e "${YELLOW}Started at: $(date)${NC}"
    echo ""
}

print_test_header() {
    echo -e "${BLUE}🧪 $1${NC}"
    echo "----------------------------------------"
}

run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="${3:-0}"
    
    ((TOTAL_TESTS++))
    echo -n "Testing: $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        local result=$?
        if [ $result -eq $expected_result ]; then
            echo -e "${GREEN}✅ PASS${NC}"
            ((PASSED_TESTS++))
            return 0
        else
            echo -e "${RED}❌ FAIL${NC} (Exit code: $result)"
            ((FAILED_TESTS++))
            return 1
        fi
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((FAILED_TESTS++))
        return 1
    fi
}

run_test_with_output() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    ((TOTAL_TESTS++))
    echo -n "Testing: $test_name... "
    
    local output=$(eval "$test_command" 2>&1)
    local result=$?
    
    if [ $result -eq 0 ] && [[ "$output" =~ $expected_pattern ]]; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED_TESTS++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "  Expected pattern: $expected_pattern"
        echo "  Actual output: $output"
        ((FAILED_TESTS++))
        return 1
    fi
}

skip_test() {
    local test_name="$1"
    local reason="$2"
    
    ((TOTAL_TESTS++))
    ((SKIPPED_TESTS++))
    echo -e "Testing: $test_name... ${YELLOW}⏭️  SKIP${NC} ($reason)"
}

# Infrastructure Tests
test_infrastructure() {
    print_test_header "Infrastructure & Dependencies"
    
    run_test "Docker is running" "docker info"
    run_test "Docker Compose is available" "docker-compose --version"
    run_test "Node.js is installed" "node --version"
    run_test "npm is available" "npm --version"
    run_test "curl is available" "curl --version"
    
    echo ""
}

# Database Tests
test_databases() {
    print_test_header "Database Connectivity"
    
    # Check if MongoDB container is running
    local mongo_container=$(docker ps -q -f "name=mongodb")
    if [ ! -z "$mongo_container" ]; then
        run_test "MongoDB container is running" "docker ps -q -f 'name=mongodb'"
        run_test "MongoDB accepts connections" "docker exec -i $mongo_container mongosh --quiet --eval 'db.runCommand(\"ping\")'"
        run_test "MongoDB staging database exists" "docker exec -i $mongo_container mongosh moi_staging --quiet --eval 'db.runCommand(\"ping\")'"
        run_test "MongoDB staging user can authenticate" "docker exec -i $mongo_container mongosh moi_staging -u staginguser -p stagingpassword --quiet --eval 'db.runCommand(\"ping\")'"
    else
        skip_test "MongoDB tests" "MongoDB container not running"
    fi
    
    # Check if Redis container is running
    local redis_container=$(docker ps -q -f "name=redis")
    if [ ! -z "$redis_container" ]; then
        run_test "Redis container is running" "docker ps -q -f 'name=redis'"
        run_test "Redis accepts connections" "docker exec -i $redis_container redis-cli ping"
        run_test "Redis can set/get data" "docker exec -i $redis_container redis-cli set staging-test 'test-value' && docker exec -i $redis_container redis-cli get staging-test"
    else
        skip_test "Redis tests" "Redis container not running"
    fi
    
    echo ""
}

# Service Health Tests
test_service_health() {
    print_test_header "Service Health Checks"
    
    local services=(
        "Auth Service:3001:/health"
        "Content Service:3002:/health"
        "AI Service:3003:/health"
        "Social Service:3004:/health"
    )
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r service_name port endpoint <<< "$service_info"
        
        # Check if port is open
        if lsof -i :$port > /dev/null 2>&1; then
            run_test "$service_name port is open" "lsof -i :$port"
            run_test "$service_name health endpoint responds" "curl -f -s http://localhost:$port$endpoint"
            
            # Test health endpoint returns valid JSON
            run_test_with_output "$service_name returns valid health data" \
                "curl -s http://localhost:$port$endpoint" \
                '"status".*("success"|"healthy")'
        else
            skip_test "$service_name tests" "Service not running on port $port"
        fi
    done
    
    # Frontend test
    if lsof -i :3000 > /dev/null 2>&1; then
        run_test "Frontend port is open" "lsof -i :3000"
        run_test "Frontend serves HTML" "curl -f -s http://localhost:3000"
        run_test_with_output "Frontend serves MOI app" \
            "curl -s http://localhost:3000" \
            "MOI.*Social Media"
    else
        skip_test "Frontend tests" "Frontend not running on port 3000"
    fi
    
    echo ""
}

# API Endpoint Tests
test_api_endpoints() {
    print_test_header "API Endpoint Testing"
    
    # Auth Service API Tests
    if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
        run_test "Auth service health endpoint" "curl -f -s http://localhost:3001/health"
        
        # Test registration endpoint exists (should return method not allowed or similar)
        run_test "Auth registration endpoint exists" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/auth/register" 200
        
        # Test login endpoint exists
        run_test "Auth login endpoint exists" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/auth/login" 200
    else
        skip_test "Auth API tests" "Auth service not healthy"
    fi
    
    # Content Service API Tests
    if curl -f -s http://localhost:3002/health > /dev/null 2>&1; then
        run_test "Content service health endpoint" "curl -f -s http://localhost:3002/health"
        
        # Test content endpoints exist
        run_test "Content API endpoint exists" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3002/api/content" 401
    else
        skip_test "Content API tests" "Content service not healthy"
    fi
    
    # AI Service API Tests
    if curl -f -s http://localhost:3003/health > /dev/null 2>&1; then
        run_test "AI service health endpoint" "curl -f -s http://localhost:3003/health"
        
        # Test AI endpoints exist
        run_test "AI generation endpoint exists" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3003/api/ai/generate" 401
    else
        skip_test "AI API tests" "AI service not healthy"
    fi
    
    # Social Service API Tests  
    if curl -f -s http://localhost:3004/health > /dev/null 2>&1; then
        run_test "Social service health endpoint" "curl -f -s http://localhost:3004/health"
        
        # Test social endpoints exist
        run_test "Social accounts endpoint exists" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3004/api/social/accounts" 401
    else
        skip_test "Social API tests" "Social service not healthy"
    fi
    
    echo ""
}

# Environment Configuration Tests
test_environment_config() {
    print_test_header "Environment Configuration"
    
    run_test ".env.staging file exists" "[ -f .env.staging ]"
    
    if [ -f ".env.staging" ]; then
        run_test "NODE_ENV is set to staging" "grep -q 'NODE_ENV=staging' .env.staging"
        run_test "MongoDB URI is configured" "grep -q 'MONGODB_URI=' .env.staging"
        run_test "Redis URL is configured" "grep -q 'REDIS_URL=' .env.staging"
        run_test "OpenAI API key is configured" "grep -q 'OPENAI_API_KEY=' .env.staging"
        run_test "JWT secrets are configured" "grep -q 'JWT_SECRET=' .env.staging"
    else
        skip_test "Environment variable tests" ".env.staging file missing"
    fi
    
    echo ""
}

# Frontend Functionality Tests
test_frontend_functionality() {
    print_test_header "Frontend Functionality"
    
    if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
        # Check for key frontend routes/pages
        run_test_with_output "Frontend loads main app" \
            "curl -s http://localhost:3000" \
            "<div id=\"root\">"
        
        run_test_with_output "Frontend includes Material-UI" \
            "curl -s http://localhost:3000" \
            "fonts.googleapis.com.*Material"
        
        run_test_with_output "Frontend has correct title" \
            "curl -s http://localhost:3000" \
            "<title>MOI.*Social Media"
        
        # Test static assets are served
        run_test "Frontend serves static assets" "curl -f -s http://localhost:3000/static/js/bundle.js"
    else
        skip_test "Frontend functionality tests" "Frontend not accessible"
    fi
    
    echo ""
}

# Integration Tests
test_integration() {
    print_test_header "Integration Testing"
    
    # Test if services can communicate with databases
    if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
        # This would require the auth service to actually connect to DB for health check
        run_test "Auth service connects to database" "curl -s http://localhost:3001/health | grep -q 'database.*connected'"
    else
        skip_test "Database integration tests" "Services not healthy"
    fi
    
    # Test CORS configuration
    run_test_with_output "CORS headers are set" \
        "curl -s -H 'Origin: http://localhost:3000' -I http://localhost:3001/health" \
        "Access-Control-Allow-Origin"
    
    echo ""
}

# Performance Tests
test_performance() {
    print_test_header "Basic Performance Testing"
    
    if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
        # Test response times
        local frontend_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:3000)
        if (( $(echo "$frontend_time < 2.0" | bc -l) )); then
            echo -e "Testing: Frontend response time... ${GREEN}✅ PASS${NC} (${frontend_time}s)"
            ((PASSED_TESTS++))
        else
            echo -e "Testing: Frontend response time... ${YELLOW}⚠️  SLOW${NC} (${frontend_time}s)"
        fi
        ((TOTAL_TESTS++))
    fi
    
    # Test concurrent requests
    if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
        run_test "Auth service handles concurrent requests" "for i in {1..5}; do curl -f -s http://localhost:3001/health & done; wait"
    fi
    
    echo ""
}

# Security Tests
test_security() {
    print_test_header "Basic Security Testing"
    
    # Test that sensitive endpoints require authentication
    run_test "Content creation requires auth" "[ \$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3002/api/content -X POST) -eq 401 ]"
    run_test "AI generation requires auth" "[ \$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3003/api/ai/generate -X POST) -eq 401 ]"
    
    # Test that health endpoints don't expose sensitive info
    run_test_with_output "Health endpoints don't leak secrets" \
        "curl -s http://localhost:3001/health" \
        "^((?!password|secret|key).)*$"
    
    echo ""
}

# Cleanup and Test Environment
cleanup_test_data() {
    print_test_header "Cleanup Test Data"
    
    # Clean up any test data created during testing
    local mongo_container=$(docker ps -q -f "name=mongodb")
    if [ ! -z "$mongo_container" ]; then
        run_test "Clean test collections" "docker exec -i $mongo_container mongosh moi_staging -u staginguser -p stagingpassword --quiet --eval 'db.test_data.drop()'"
    fi
    
    local redis_container=$(docker ps -q -f "name=redis")
    if [ ! -z "$redis_container" ]; then
        run_test "Clean test cache keys" "docker exec -i $redis_container redis-cli del staging-test"
    fi
    
    echo ""
}

# Generate Test Report
generate_report() {
    local report_file="/tmp/moi-staging-test-report-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "=============================================="
        echo "MOI Staging Environment - Test Report"
        echo "=============================================="
        echo "Generated at: $(date)"
        echo ""
        echo "Test Summary:"
        echo "  Total Tests: $TOTAL_TESTS"
        echo "  Passed: $PASSED_TESTS"
        echo "  Failed: $FAILED_TESTS"
        echo "  Skipped: $SKIPPED_TESTS"
        echo ""
        
        local success_rate=0
        if [ $TOTAL_TESTS -gt 0 ]; then
            success_rate=$(( (PASSED_TESTS * 100) / (TOTAL_TESTS - SKIPPED_TESTS) ))
        fi
        
        echo "Success Rate: $success_rate%"
        echo ""
        
        if [ $FAILED_TESTS -eq 0 ]; then
            echo "🎉 All tests passed! Staging environment is ready."
        elif [ $FAILED_TESTS -lt 3 ]; then
            echo "⚠️ Minor issues detected. Review failed tests."
        else
            echo "❌ Major issues detected. Staging environment needs attention."
        fi
        
        echo ""
        echo "Recommendations:"
        if [ $FAILED_TESTS -gt 0 ]; then
            echo "1. Review failed tests and fix underlying issues"
            echo "2. Check service logs for detailed error information"
            echo "3. Verify database connectivity and authentication"
        fi
        echo "4. Run tests again after fixes"
        echo "5. Consider load testing before production deployment"
        
    } > "$report_file"
    
    echo -e "${GREEN}📊 Test report saved to: $report_file${NC}"
    cat "$report_file"
}

# Main test execution
main() {
    print_header
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        echo -e "${RED}Error: Please run this script from the MOI project root directory${NC}"
        exit 1
    fi
    
    # Run all test suites
    test_infrastructure
    test_databases
    test_environment_config
    test_service_health
    test_api_endpoints
    test_frontend_functionality
    test_integration
    test_performance
    test_security
    cleanup_test_data
    
    # Generate summary
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}              Test Summary${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    echo -e "Skipped: ${YELLOW}$SKIPPED_TESTS${NC}"
    echo ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed! Staging environment is ready.${NC}"
        generate_report
        exit 0
    else
        echo -e "${RED}❌ $FAILED_TESTS test(s) failed. Please review and fix issues.${NC}"
        generate_report
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --quick)
        echo "Running quick test suite..."
        test_infrastructure
        test_databases
        test_service_health
        ;;
    --security)
        echo "Running security test suite..."
        test_security
        ;;
    --performance)
        echo "Running performance test suite..."
        test_performance
        ;;
    --help)
        echo "MOI Staging Test Suite"
        echo ""
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  (no args)    Run full test suite"
        echo "  --quick      Run quick essential tests only"
        echo "  --security   Run security tests only"
        echo "  --performance Run performance tests only"
        echo "  --help       Show this help message"
        exit 0
        ;;
    *)
        main
        ;;
esac