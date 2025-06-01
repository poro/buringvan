#!/bin/bash

# MOI Social Media Management Platform - Cloud Deployment Script
# Deploys backend services to Railway and frontend to Vercel

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}🚀 MOI Cloud Deployment${NC}"
    echo "=================================================="
    echo "Deploying to production cloud infrastructure..."
    echo ""
}

print_step() {
    echo -e "${YELLOW}Step $1:${NC} $2"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_requirements() {
    print_step "1" "Checking deployment requirements"
    
    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI not found. Install with: npm install -g @railway/cli"
        echo "Visit: https://railway.app"
        return 1
    fi
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI not found. Install with: npm install -g vercel"
        echo "Visit: https://vercel.com"
        return 1
    fi
    
    print_success "Deployment tools are available"
    echo ""
    return 0
}

setup_cloud_databases() {
    print_step "2" "Setting up cloud databases"
    
    echo "📊 MongoDB Atlas Setup:"
    echo "1. Visit https://cloud.mongodb.com"
    echo "2. Create cluster: moi-cluster"
    echo "3. Create database user: moi-prod-user"
    echo "4. Whitelist all IPs (0.0.0.0/0) for now"
    echo "5. Get connection string and update .env.production"
    echo ""
    
    echo "🔴 Redis Cloud Setup:"
    echo "1. Visit https://redis.com/redis-enterprise-cloud/"
    echo "2. Create free Redis database"
    echo "3. Get connection URL and update .env.production"
    echo ""
    
    read -p "Have you set up cloud databases? (y/n): " db_ready
    if [[ $db_ready != "y" ]]; then
        print_error "Please set up cloud databases first"
        return 1
    fi
    
    print_success "Cloud databases configured"
    echo ""
    return 0
}

deploy_backend_services() {
    print_step "3" "Deploying backend services to Railway"
    
    # Login to Railway
    echo "Logging into Railway..."
    railway login
    
    # Deploy each service
    local services=("auth-service" "content-service" "ai-service" "social-service")
    
    for service in "${services[@]}"; do
        echo ""
        echo -e "${BLUE}Deploying $service...${NC}"
        
        cd "server/$service"
        
        # Initialize Railway project if not exists
        if [ ! -f "railway.json" ]; then
            railway init
        fi
        
        # Upload environment variables
        railway variables set NODE_ENV=production
        railway variables set MONGODB_URI="$MONGODB_URI"
        railway variables set REDIS_URL="$REDIS_URL"
        railway variables set OPENAI_API_KEY="$OPENAI_API_KEY"
        railway variables set JWT_SECRET="$JWT_SECRET"
        
        # Deploy
        railway up
        
        if [ $? -eq 0 ]; then
            print_success "$service deployed successfully"
        else
            print_error "$service deployment failed"
        fi
        
        cd ../..
    done
    
    echo ""
    print_success "Backend services deployment completed"
    echo ""
}

deploy_frontend() {
    print_step "4" "Deploying frontend to Vercel"
    
    cd client/web
    
    # Login to Vercel
    echo "Logging into Vercel..."
    vercel login
    
    # Set up environment variables
    vercel env add REACT_APP_API_BASE_URL
    echo "Enter the Railway auth service URL (e.g., https://your-auth-service.railway.app)"
    
    # Deploy to production
    echo "Deploying to Vercel..."
    vercel --prod
    
    if [ $? -eq 0 ]; then
        print_success "Frontend deployed successfully"
        vercel --prod | grep "https://" | tail -1
    else
        print_error "Frontend deployment failed"
    fi
    
    cd ../..
    echo ""
}

test_production_deployment() {
    print_step "5" "Testing production deployment"
    
    echo "🧪 Manual testing required:"
    echo "1. Visit your Vercel frontend URL"
    echo "2. Test user registration/login"
    echo "3. Test content creation"
    echo "4. Test AI generation"
    echo "5. Check all API endpoints respond"
    echo ""
    
    print_success "Deployment testing instructions provided"
}

update_cors_and_urls() {
    print_step "6" "Updating CORS and service URLs"
    
    echo "⚠️  Important: Update the following after deployment:"
    echo "1. Update CORS_ORIGIN in Railway services with actual Vercel URL"
    echo "2. Update SERVICE_URL variables with actual Railway URLs"
    echo "3. Update frontend API endpoints with actual backend URLs"
    echo ""
}

main() {
    print_header
    
    if [ ! -f "package.json" ]; then
        print_error "Please run this script from the MOI project root directory"
        exit 1
    fi
    
    # Load production environment
    if [ -f ".env.production" ]; then
        export $(cat .env.production | grep -v '^#' | xargs)
    else
        print_error ".env.production file not found"
        exit 1
    fi
    
    # Run deployment steps
    check_requirements || exit 1
    setup_cloud_databases || exit 1
    deploy_backend_services || exit 1
    deploy_frontend || exit 1
    test_production_deployment
    update_cors_and_urls
    
    echo ""
    echo -e "${GREEN}🎉 MOI Cloud Deployment Complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Test all functionality on production URLs"
    echo "2. Set up monitoring and alerting"
    echo "3. Configure custom domains"
    echo "4. Set up CI/CD pipelines"
    echo ""
}

main "$@"