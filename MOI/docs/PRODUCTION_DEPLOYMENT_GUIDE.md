# MOI Production Deployment Guide

## 🚀 Overview

This guide walks you through deploying the MOI Social Media Management Platform to production using:
- **Backend Services**: Railway (Node.js microservices)
- **Frontend**: Vercel (React application)
- **Databases**: MongoDB Atlas + Redis Cloud

## 📋 Prerequisites

### 1. Install Deployment Tools
```bash
# Install Railway CLI
npm install -g @railway/cli

# Install Vercel CLI
npm install -g vercel
```

### 2. Create Cloud Accounts
- [Railway](https://railway.app) - Backend hosting
- [Vercel](https://vercel.com) - Frontend hosting
- [MongoDB Atlas](https://cloud.mongodb.com) - Cloud database
- [Redis Cloud](https://redis.com/redis-enterprise-cloud/) - Redis hosting

## 🗄️ Database Setup

### MongoDB Atlas
1. Create a new cluster: `moi-cluster`
2. Create database user: `moi-prod-user` with password
3. Whitelist all IPs: `0.0.0.0/0` (or specific IPs for better security)
4. Get connection string:
   ```
   mongodb+srv://moi-prod-user:PASSWORD@moi-cluster.mongodb.net/moi_production
   ```

### Redis Cloud
1. Create a free Redis database
2. Get connection URL:
   ```
   rediss://default:PASSWORD@endpoint.redislabs.com:PORT
   ```

## 🛠️ Backend Deployment (Railway)

### Deploy Each Service

```bash
# Auth Service
cd server/auth-service
railway login
railway init
railway up

# Content Service
cd ../content-service
railway init
railway up

# AI Service
cd ../ai-service
railway init
railway up

# Social Service
cd ../social-service
railway init
railway up
```

### Set Environment Variables
For each Railway service, set these variables:
```bash
railway variables set NODE_ENV=production
railway variables set MONGODB_URI="your-mongodb-atlas-url"
railway variables set REDIS_URL="your-redis-cloud-url"
railway variables set OPENAI_API_KEY="your-openai-key"
railway variables set JWT_SECRET="your-jwt-secret"
```

## 🌐 Frontend Deployment (Vercel)

```bash
cd client/web
vercel login
vercel --prod
```

Set environment variables in Vercel dashboard:
- `REACT_APP_API_BASE_URL`: Your Railway auth service URL
- `REACT_APP_ENVIRONMENT`: production

## 🔧 Configuration Updates

### 1. Update Service URLs
After deployment, update `.env.production` with actual URLs:
```env
AUTH_SERVICE_URL=https://your-auth-service.railway.app
CONTENT_SERVICE_URL=https://your-content-service.railway.app
AI_SERVICE_URL=https://your-ai-service.railway.app
SOCIAL_SERVICE_URL=https://your-social-service.railway.app
CLIENT_URL=https://your-app.vercel.app
```

### 2. Update CORS Settings
In each backend service, update CORS origin:
```javascript
cors: {
  origin: 'https://your-app.vercel.app'
}
```

### 3. Update Frontend API Endpoints
Update API base URL in frontend configuration.

## 🧪 Testing Production

### Health Check URLs
- Auth: `https://your-auth-service.railway.app/health`
- Content: `https://your-content-service.railway.app/health`
- AI: `https://your-ai-service.railway.app/health`
- Social: `https://your-social-service.railway.app/health`

### Functional Testing
1. Visit your Vercel frontend URL
2. Test user registration/login
3. Test content creation
4. Test AI generation
5. Test social media integrations

## 📊 Monitoring & Maintenance

### Railway Monitoring
- View logs: `railway logs`
- Monitor metrics in Railway dashboard
- Set up alerts for service downtime

### Vercel Monitoring
- Monitor in Vercel dashboard
- Check build logs for issues
- Set up custom domains

## 🔒 Security Considerations

### Production Security
- Use strong, unique passwords for all services
- Enable 2FA on all cloud accounts
- Restrict database access to specific IPs when possible
- Use HTTPS everywhere
- Regularly rotate secrets and API keys

### Environment Variables
- Never commit `.env.production` to version control
- Use platform-specific environment variable management
- Audit and rotate secrets regularly

## 🚀 Automated Deployment

Consider setting up CI/CD with GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - uses: railway/cli@v1
        with:
          command: up
```

## 📈 Scaling Considerations

### Database Scaling
- Monitor MongoDB Atlas usage
- Consider upgrading to dedicated clusters for high traffic
- Implement database indexing for performance

### Service Scaling
- Railway auto-scales based on traffic
- Monitor CPU and memory usage
- Consider splitting services further if needed

### CDN Setup
- Use Vercel's built-in CDN for frontend
- Consider CloudFlare for additional performance

## 🆘 Troubleshooting

### Common Issues
- **Service not starting**: Check logs and environment variables
- **Database connection errors**: Verify connection strings and IP whitelist
- **CORS errors**: Ensure frontend URL is added to backend CORS settings
- **API calls failing**: Check service URLs and ensure all services are deployed

### Useful Commands
```bash
# Railway
railway logs --service auth-service
railway status
railway variables

# Vercel
vercel logs
vercel ls
vercel env ls
```

## ✅ Deployment Checklist

- [ ] MongoDB Atlas cluster created and configured
- [ ] Redis Cloud database created
- [ ] All backend services deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set on all platforms
- [ ] CORS configured correctly
- [ ] All health endpoints responding
- [ ] Frontend can communicate with backend
- [ ] User registration/login working
- [ ] AI content generation working
- [ ] Social media integrations tested
- [ ] Custom domains configured (optional)
- [ ] Monitoring and alerts set up

## 🎉 Success!

Your MOI Social Media Management Platform is now live in production! 

Access your application at your Vercel URL and start managing social media content with AI-powered assistance.