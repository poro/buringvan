#!/bin/bash

# Quick deployment script for MOI platform
# This script helps you deploy quickly by guiding through the process

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 MOI Quick Deployment Setup${NC}"
echo "=============================================="
echo ""

echo -e "${YELLOW}Prerequisites:${NC}"
echo "✅ Railway CLI installed"
echo "✅ Vercel CLI installed"
echo "✅ OpenAI API key available"
echo ""

echo -e "${YELLOW}Required Cloud Accounts:${NC}"
echo "1. Railway (https://railway.app) - for backend services"
echo "2. Vercel (https://vercel.com) - for frontend"
echo "3. MongoDB Atlas (https://cloud.mongodb.com) - for database"
echo "4. Redis Cloud (https://redis.com) - for cache"
echo ""

echo -e "${BLUE}Deployment Steps:${NC}"
echo ""

echo "1. 🗄️  Set up MongoDB Atlas:"
echo "   - Go to https://cloud.mongodb.com"
echo "   - Create cluster: 'moi-cluster'"
echo "   - Create user: 'moi-prod-user'"
echo "   - Get connection string"
echo ""

echo "2. 🔴 Set up Redis Cloud:"
echo "   - Go to https://redis.com/redis-enterprise-cloud/"
echo "   - Create free database"
echo "   - Get connection URL"
echo ""

echo "3. 🖥️  Deploy Backend (Railway):"
echo "   - Run: railway login"
echo "   - Deploy each service in server/ directory"
echo "   - Set environment variables"
echo ""

echo "4. 🌐 Deploy Frontend (Vercel):"
echo "   - Run: vercel login"
echo "   - Deploy from client/web directory"
echo "   - Set environment variables"
echo ""

echo -e "${GREEN}Ready to deploy?${NC}"
echo "Run: ./scripts/deploy-to-cloud.sh"
echo ""
echo "Or follow the detailed guide:"
echo "docs/PRODUCTION_DEPLOYMENT_GUIDE.md"