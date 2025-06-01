# MOI Staging Environment - Testing Guide

## 🎯 Overview

This guide provides comprehensive testing strategies for your MOI staging environment. Testing staging is crucial to ensure your application works correctly before production deployment.

## 🧪 Testing Strategy

### 1. **Automated Test Suites**

We've created several automated testing scripts to validate different aspects of your staging environment:

#### **Full Infrastructure Testing**
```bash
./scripts/test-staging.sh
```
**What it tests:**
- Docker and dependencies
- Database connectivity (MongoDB + Redis)
- Service health checks
- API endpoint availability
- Environment configuration
- Basic security measures
- Performance benchmarks

#### **End-to-End User Flow Testing**
```bash
./scripts/test-user-flows.sh
```
**What it tests:**
- Complete user workflows
- Authentication flows
- Content creation workflows
- AI integration workflows
- Social media workflows
- Frontend functionality
- Database operations
- Error handling

#### **Quick Health Check**
```bash
./scripts/test-staging.sh --quick
```
**What it tests:**
- Essential services only
- Database connectivity
- Core health endpoints

#### **Security Testing**
```bash
./scripts/test-staging.sh --security
```
**What it tests:**
- Authentication requirements
- Input validation
- CORS configuration
- Sensitive data exposure

### 2. **Manual Testing Workflows**

#### **Frontend Testing**

1. **Access the Application**
   ```
   http://localhost:3000
   ```

2. **Test Key Pages:**
   - [ ] Dashboard loads correctly
   - [ ] Content management interface works
   - [ ] Campaign management interface works
   - [ ] Social accounts page loads
   - [ ] Analytics dashboard displays
   - [ ] Settings page functions

3. **Test User Interactions:**
   - [ ] Navigation between pages
   - [ ] Modal dialogs open/close
   - [ ] Forms validation
   - [ ] Button clicks and responses
   - [ ] Search and filtering

#### **API Testing with curl**

1. **Test Authentication Endpoints:**
   ```bash
   # Test registration endpoint
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123","firstName":"Test","lastName":"User"}'
   
   # Test login endpoint
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

2. **Test Content Endpoints:**
   ```bash
   # Test content listing (should require auth)
   curl http://localhost:3002/api/content
   
   # Test content creation (should require auth)
   curl -X POST http://localhost:3002/api/content \
     -H "Content-Type: application/json" \
     -d '{"title":"Test","text":"Test content","platform":"linkedin"}'
   ```

3. **Test AI Endpoints:**
   ```bash
   # Test AI generation (should require auth)
   curl -X POST http://localhost:3003/api/ai/generate \
     -H "Content-Type: application/json" \
     -d '{"topic":"test","platform":"linkedin","contentType":"post"}'
   
   # Test AI health
   curl http://localhost:3003/health
   ```

#### **Database Testing**

1. **Test MongoDB Operations:**
   ```bash
   # Connect to MongoDB
   docker exec -it $(docker ps -q -f "name=mongodb") mongosh moi_staging -u staginguser -p stagingpassword
   
   # Test basic operations
   db.test.insertOne({test: "staging", timestamp: new Date()})
   db.test.find({test: "staging"})
   db.test.updateOne({test: "staging"}, {$set: {updated: true}})
   db.test.deleteOne({test: "staging"})
   ```

2. **Test Redis Operations:**
   ```bash
   # Connect to Redis
   docker exec -it $(docker ps -q -f "name=redis") redis-cli
   
   # Test basic operations
   SET staging-test "test-value"
   GET staging-test
   DEL staging-test
   ```

### 3. **Browser Testing**

#### **Cross-Browser Compatibility**
Test in multiple browsers:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (if on macOS)
- [ ] Edge (if available)

#### **Responsive Design Testing**
Test different screen sizes:
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

#### **JavaScript Console Testing**
1. Open browser developer tools (F12)
2. Check Console tab for errors
3. Verify no critical errors appear
4. Test network requests in Network tab

### 4. **Performance Testing**

#### **Load Testing with curl**
```bash
# Test concurrent requests
for i in {1..10}; do
  curl -s http://localhost:3000 &
done
wait

# Test response times
curl -w "Response time: %{time_total}s\n" -o /dev/null -s http://localhost:3000
```

#### **Memory and CPU Monitoring**
```bash
# Monitor Docker containers
docker stats

# Monitor system resources
top -p $(pgrep -f "node.*src/app.js" | tr '\n' ',' | sed 's/,$//')
```

### 5. **Integration Testing**

#### **Service Communication Testing**
1. **Frontend to Backend:**
   - Open browser developer tools
   - Navigate through the application
   - Verify API calls in Network tab
   - Check for proper error handling

2. **Backend to Database:**
   - Monitor database connections
   - Check service logs for database operations
   - Verify data persistence

#### **OAuth Flow Testing**
1. **Google OAuth (if configured):**
   ```
   http://localhost:3001/api/auth/google
   ```
   - Should redirect to Google
   - After auth, should redirect back to app

2. **Social Media OAuth:**
   - Test LinkedIn, Twitter, Instagram connections
   - Verify callback handling
   - Check account status updates

## 📊 Testing Checklist

### **Pre-Deployment Checklist**

#### **Infrastructure** ✅
- [ ] All services start successfully
- [ ] Databases are accessible
- [ ] Health checks pass
- [ ] Environment variables loaded correctly

#### **Functionality** ✅
- [ ] User registration works
- [ ] User login works
- [ ] Content creation works
- [ ] AI generation works (with OpenAI key)
- [ ] Social account connections work
- [ ] All pages load without errors

#### **Security** ✅
- [ ] Protected endpoints require authentication
- [ ] Sensitive data is not exposed
- [ ] CORS is properly configured
- [ ] Input validation works

#### **Performance** ✅
- [ ] Page load times < 3 seconds
- [ ] API response times < 1 second
- [ ] No memory leaks detected
- [ ] Concurrent users supported

#### **Integration** ✅
- [ ] Frontend-backend communication works
- [ ] Database operations succeed
- [ ] External API integrations work
- [ ] Error handling is graceful

## 🔧 Testing Tools & Commands

### **Quick Commands**
```bash
# Start staging environment
./scripts/start-staging-simple.sh

# Run full test suite
./scripts/test-staging.sh

# Test user flows
./scripts/test-user-flows.sh

# Monitor services
./scripts/monitor-staging.sh

# Collect logs
./scripts/aggregate-logs.sh

# Stop all services
pkill -f "node.*src/app.js"; docker-compose -f docker-compose.simple-staging.yml down
```

### **Useful Testing URLs**
- **Frontend:** http://localhost:3000
- **Auth API:** http://localhost:3001/health
- **Content API:** http://localhost:3002/health
- **AI API:** http://localhost:3003/health
- **Social API:** http://localhost:3004/health

## 🐛 Troubleshooting

### **Common Issues**

1. **Services Won't Start**
   ```bash
   # Check logs
   ./scripts/aggregate-logs.sh
   
   # Check ports
   lsof -i :3001,3002,3003,3004,3000
   
   # Restart services
   pkill -f "node"; ./scripts/start-staging-simple.sh
   ```

2. **Database Connection Issues**
   ```bash
   # Check MongoDB
   docker exec -it $(docker ps -q -f "name=mongodb") mongosh --eval "db.runCommand('ping')"
   
   # Check Redis
   docker exec -it $(docker ps -q -f "name=redis") redis-cli ping
   
   # Restart databases
   docker-compose -f docker-compose.simple-staging.yml restart
   ```

3. **Frontend Issues**
   ```bash
   # Check React compilation
   tail -f /tmp/frontend.log
   
   # Clear npm cache
   cd client/web && npm start
   ```

### **Test Failure Investigation**

1. **Check Service Logs:**
   ```bash
   tail -f "/tmp/Auth Service.log"
   tail -f "/tmp/Content Service.log"
   tail -f "/tmp/AI Service.log"
   tail -f "/tmp/Social Service.log"
   ```

2. **Check Docker Logs:**
   ```bash
   docker logs $(docker ps -q -f "name=mongodb")
   docker logs $(docker ps -q -f "name=redis")
   ```

3. **Verify Environment:**
   ```bash
   cat .env.staging | grep -v PASSWORD | grep -v SECRET
   ```

## 🚀 Ready for Production?

Your staging environment is ready for production when:

- [ ] All automated tests pass
- [ ] Manual testing is successful
- [ ] Performance meets requirements
- [ ] Security validation complete
- [ ] Cross-browser testing complete
- [ ] Load testing successful
- [ ] Error handling verified
- [ ] Monitoring and logging work
- [ ] Database operations stable
- [ ] External integrations functional

## 📋 Test Reports

Test results are automatically saved to:
- **Infrastructure Tests:** `/tmp/moi-staging-test-report-[timestamp].txt`
- **User Flow Tests:** `/tmp/moi-e2e-tests/e2e-test-report-[timestamp].md`
- **Log Analysis:** `/tmp/moi-staging-logs/SUMMARY_[timestamp].md`

Review these reports after each test run to identify and fix issues before production deployment.