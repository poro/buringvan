# MOI Staging Environment Setup Guide

## 🎯 Overview
This guide walks you through setting up a complete staging environment for the MOI social media management platform.

## 📋 Prerequisites
- Docker & Docker Compose installed
- Git repository access
- Basic command line knowledge

## 🗄️ Step 1: Set Up Cloud Databases

### MongoDB Atlas (Free Tier)
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a free account
3. Create a new cluster (M0 Sandbox - Free)
4. Name it: `moi-staging`
5. Create a database user:
   - Username: `staging-user`
   - Password: `generate-secure-password`
6. Add IP address: `0.0.0.0/0` (for staging only)
7. Get connection string:
   ```
   mongodb+srv://staging-user:password@cluster.mongodb.net/moi_staging
   ```

### Redis Cloud (Free Tier)
1. Go to [Redis Cloud](https://redis.com/try-free/)
2. Create a free account
3. Create a new database:
   - Name: `moi-staging`
   - Plan: Free (30MB)
4. Get connection details:
   ```
   redis://username:password@host:port
   ```

## 🔑 Step 2: Update Environment Variables

Update `.env.staging` with your cloud database URLs:

```bash
# Replace these with your actual cloud database URLs
MONGODB_URI=mongodb+srv://staging-user:your-password@your-cluster.mongodb.net/moi_staging
REDIS_URL=redis://your-redis-url:port
```

## 🚀 Step 3: Deploy Staging Environment

Run the deployment script:

```bash
cd /path/to/MOI
./scripts/deploy-staging.sh
```

This script will:
- Build all Docker images
- Start all services
- Run health checks
- Provide access URLs

## 🔍 Step 4: Verify Deployment

### Check Service Health
```bash
# Auth Service
curl http://localhost:3001/health

# Content Service  
curl http://localhost:3002/health

# AI Service
curl http://localhost:3003/health

# Social Service
curl http://localhost:3004/health

# Frontend
curl http://localhost:3000
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.staging.yml logs -f

# Specific service
docker-compose -f docker-compose.staging.yml logs -f auth-service
```

## 🧪 Step 5: Test Complete Flow

1. **Access Frontend**: http://localhost:3000
2. **Register/Login**: Test user authentication
3. **Generate AI Content**: Test OpenAI integration
4. **Connect Social Account**: Test OAuth flow
5. **Create Content**: Test full content workflow

## 🔧 Step 6: Cloud Deployment Options

### Option A: Railway (Recommended for beginners)
1. Sign up at [Railway](https://railway.app/)
2. Connect your GitHub repository
3. Deploy each service separately
4. Use Railway's PostgreSQL/Redis add-ons

### Option B: Render
1. Sign up at [Render](https://render.com/)
2. Connect your GitHub repository
3. Create web services for each backend service
4. Create static site for frontend

### Option C: DigitalOcean App Platform
1. Sign up at [DigitalOcean](https://www.digitalocean.com/)
2. Use App Platform for easy deployment
3. Deploy from GitHub repository

## 🐛 Troubleshooting

### Common Issues

**Services not starting:**
```bash
# Check Docker daemon
docker info

# Check logs
docker-compose -f docker-compose.staging.yml logs service-name
```

**Database connection issues:**
- Verify MongoDB connection string format
- Check IP whitelist in MongoDB Atlas
- Verify Redis connection URL format

**Port conflicts:**
```bash
# Check what's using ports
lsof -i :3001
lsof -i :3002
# etc.

# Kill processes if needed
sudo kill -9 PID
```

**Build failures:**
```bash
# Clean Docker cache
docker system prune -a

# Rebuild specific service
docker-compose -f docker-compose.staging.yml build --no-cache service-name
```

## 📊 Monitoring

### Health Check Dashboard
Create a simple health monitoring script:

```bash
#!/bin/bash
echo "=== MOI Staging Health Check ==="
services=(3001 3002 3003 3004 3000)
for port in "${services[@]}"; do
    if curl -f http://localhost:$port/health > /dev/null 2>&1; then
        echo "✅ Port $port: Healthy"
    else
        echo "❌ Port $port: Down"
    fi
done
```

## 🔄 Updating Staging

To update staging with new code:

```bash
# Pull latest changes
git pull origin main

# Redeploy
./scripts/deploy-staging.sh
```

## 🚀 Next Steps: Production Deployment

Once staging is working perfectly:
1. Set up production databases (higher tier)
2. Configure SSL certificates
3. Set up monitoring (DataDog, New Relic)
4. Configure CI/CD pipeline
5. Set up backup strategies
6. Implement logging aggregation

## 📞 Support

If you run into issues:
1. Check the logs first
2. Verify environment variables
3. Test database connections manually
4. Check Docker container status