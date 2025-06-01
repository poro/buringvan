# Environment Setup Guide

This guide provides detailed instructions for obtaining all required API keys, secrets, and configuration values for the MOI AI-Powered Social Media Management System.

## Table of Contents
1. [Database Configuration](#database-configuration)
2. [JWT Secrets](#jwt-secrets)
3. [OpenAI API Key](#openai-api-key)
4. [Social Media Platform APIs](#social-media-platform-apis)
5. [Notification Services](#notification-services)
6. [Service URLs](#service-urls)
7. [Complete .env Template](#complete-env-template)

---

## Database Configuration

### MongoDB URI
**Local Development:**
```bash
MONGODB_URI=mongodb://localhost:27017/moi
```

**MongoDB Atlas (Cloud - Recommended):**
1. Visit [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account
3. Create a new cluster (free tier available)
4. Go to "Database Access" → Create a database user with username/password
5. Go to "Network Access" → Add your IP address (or 0.0.0.0/0 for development)
6. Go to "Clusters" → Click "Connect" → "Connect your application"
7. Copy the connection string and replace `<password>` with your database user password
```bash
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/moi?retryWrites=true&w=majority
```

### Redis URL
**Local Development:**
```bash
REDIS_URL=redis://localhost:6379
```

**Redis Cloud (Recommended):**
1. Visit [Redis Cloud](https://redis.com/try-free/)
2. Create a free account
3. Create a new database (free tier: 30MB)
4. Go to "Databases" → Select your database
5. Copy the "Public endpoint" URL
```bash
REDIS_URL=redis://default:password@redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345
```

---

## JWT Secrets

Generate secure random strings for JWT tokens:

**Method 1: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Method 2: Using OpenSSL**
```bash
openssl rand -hex 64
```

**Method 3: Online Generator**
Visit [Random.org](https://www.random.org/strings/) and generate a 64-character string

```bash
JWT_SECRET=your_generated_64_character_random_string_here
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=another_different_64_character_random_string_here
```

---

## OpenAI API Key

### Getting Your OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Go to [API Keys page](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Give it a name (e.g., "MOI Social Media App")
6. Copy the key immediately (you won't be able to see it again)

```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4  # or gpt-3.5-turbo for lower costs
```

**Important Notes:**
- Keep this key secure and never commit it to version control
- Monitor your usage at [OpenAI Usage Dashboard](https://platform.openai.com/usage)
- Set usage limits to avoid unexpected charges

---

## Social Media Platform APIs

### LinkedIn API

1. **Create LinkedIn Developer App:**
   - Visit [LinkedIn Developer Portal](https://developer.linkedin.com/)
   - Sign in with your LinkedIn account
   - Click "Create App"
   - Fill in app details:
     - App name: "MOI Social Media Manager"
     - LinkedIn Page: Your company page (create one if needed)
     - App description: "AI-powered social media content management"
     - Upload app logo (optional)

2. **Configure App Settings:**
   - Go to "Auth" tab
   - Add redirect URLs:
     - `http://localhost:3000/auth/linkedin/callback`
     - `https://yourdomain.com/auth/linkedin/callback` (for production)
   - Under "Application credentials", copy:

```bash
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback
```

3. **Request Additional Permissions:**
   - Go to "Products" tab
   - Apply for "Marketing Developer Platform" (required for posting)
   - This may require approval from LinkedIn

### X (Twitter) API

1. **Create Twitter Developer Account:**
   - Visit [Twitter Developer Portal](https://developer.twitter.com/)
   - Apply for a developer account (may take 1-2 days for approval)
   - Explain your use case: "Building an AI-powered social media management tool"

2. **Create a New App:**
   - Go to [Developer Dashboard](https://developer.twitter.com/en/portal/dashboard)
   - Click "Create Project" or "Create App"
   - Fill in app details:
     - App name: "MOI Social Media Manager"
     - Description: "AI-powered content scheduling and management"
     - Website URL: `http://localhost:3000` (for development)

3. **Get API Keys:**
   - Go to "Keys and tokens" tab
   - Generate/copy the following:

```bash
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
```

4. **Configure App Permissions:**
   - Set permissions to "Read and Write" to enable posting
   - Add callback URL: `http://localhost:3000/auth/twitter/callback`

### Instagram API (Meta/Facebook)

1. **Create Facebook Developer Account:**
   - Visit [Facebook Developers](https://developers.facebook.com/)
   - Create a developer account
   - Verify your account (phone number required)

2. **Create a New App:**
   - Click "Create App"
   - Choose "Consumer" or "Business"
   - Fill in app details:
     - App name: "MOI Social Media Manager"
     - Contact email: your email
     - Purpose: "Content management and scheduling"

3. **Add Instagram Basic Display:**
   - Go to app dashboard
   - Click "Add Product" → "Instagram Basic Display"
   - Click "Set Up"
   - Go to "Basic Display" settings

4. **Configure Instagram App:**
   - Add redirect URI: `http://localhost:3000/auth/instagram/callback`
   - Get your credentials:

```bash
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/auth/instagram/callback
```

### TikTok API

1. **Apply for TikTok for Developers:**
   - Visit [TikTok for Developers](https://developers.tiktok.com/)
   - Create an account
   - Apply for API access (requires business verification)

2. **Create an App:**
   - After approval, create a new app
   - Fill in app details and use case
   - Request "Content Posting API" access

```bash
TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
TIKTOK_REDIRECT_URI=http://localhost:3000/auth/tiktok/callback
```

**Note:** TikTok API access is limited and may require business verification.

### YouTube API (Google)

1. **Create Google Cloud Project:**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Name: "MOI Social Media Manager"

2. **Enable YouTube Data API:**
   - Go to "APIs & Services" → "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"

3. **Create Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the API key
   - Optionally restrict the key to YouTube Data API

4. **OAuth 2.0 for Video Uploads:**
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Choose "Web application"
   - Add redirect URI: `http://localhost:3000/auth/youtube/callback`

```bash
YOUTUBE_API_KEY=your_youtube_api_key
YOUTUBE_CLIENT_ID=your_youtube_oauth_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_oauth_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/auth/youtube/callback
```

---

## Notification Services

### Email (SendGrid - Recommended)

1. **Create SendGrid Account:**
   - Visit [SendGrid](https://sendgrid.com/)
   - Sign up for free account (100 emails/day free)
   - Verify your account

2. **Create API Key:**
   - Go to "Settings" → "API Keys"
   - Click "Create API Key"
   - Choose "Restricted Access"
   - Give permissions for "Mail Send"
   - Copy the API key

```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=MOI Social Media Manager
```

### Alternative: SMTP (Gmail Example)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=MOI Social Media Manager
```

### SMS (Twilio)

1. **Create Twilio Account:**
   - Visit [Twilio](https://www.twilio.com/)
   - Sign up for free account (trial credits included)
   - Verify your phone number

2. **Get Credentials:**
   - Go to Twilio Console
   - Find "Account SID" and "Auth Token"
   - Get a phone number from "Phone Numbers" → "Manage" → "Buy a number"

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Push Notifications (Firebase)

1. **Create Firebase Project:**
   - Visit [Firebase Console](https://console.firebase.google.com/)
   - Click "Create a project"
   - Name: "MOI Social Media Manager"
   - Disable Google Analytics (optional)

2. **Add App to Project:**
   - Click "Add app" → Choose platform (Web/Android/iOS)
   - Register app with bundle ID
   - Download config files

3. **Get Server Key:**
   - Go to Project Settings → "Cloud Messaging"
   - Copy "Server key"

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
```

---

## Service URLs

### Development (Default)
```bash
# API Gateway
API_GATEWAY_URL=http://localhost:3000

# Microservices (internal communication)
AUTH_SERVICE_URL=http://localhost:3001
CONTENT_SERVICE_URL=http://localhost:3002
SOCIAL_SERVICE_URL=http://localhost:3003
ANALYTICS_SERVICE_URL=http://localhost:3004
NOTIFICATION_SERVICE_URL=http://localhost:3005
AI_SERVICE_URL=http://localhost:3006

# Frontend URLs
WEB_CLIENT_URL=http://localhost:3001
MOBILE_CLIENT_URL=http://localhost:19006
```

### Docker Compose (Internal Docker Network)
```bash
AUTH_SERVICE_URL=http://auth-service:3001
CONTENT_SERVICE_URL=http://content-service:3002
SOCIAL_SERVICE_URL=http://social-service:3003
ANALYTICS_SERVICE_URL=http://analytics-service:3004
NOTIFICATION_SERVICE_URL=http://notification-service:3005
AI_SERVICE_URL=http://ai-service:3006
```

### Production (Replace with your domains)
```bash
API_GATEWAY_URL=https://api.yourdomain.com
WEB_CLIENT_URL=https://app.yourdomain.com
```

---

## Complete .env Template

Create a `.env` file in your project root with the following content:

```bash
# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
MONGODB_URI=mongodb://localhost:27017/moi
REDIS_URL=redis://localhost:6379

# =============================================================================
# JWT CONFIGURATION
# =============================================================================
JWT_SECRET=your_64_character_random_string_here
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=another_64_character_random_string_here

# =============================================================================
# AI SERVICES
# =============================================================================
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4

# =============================================================================
# LINKEDIN API
# =============================================================================
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback

# =============================================================================
# TWITTER/X API
# =============================================================================
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret
TWITTER_BEARER_TOKEN=your_twitter_bearer_token

# =============================================================================
# INSTAGRAM API (Meta/Facebook)
# =============================================================================
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/auth/instagram/callback

# =============================================================================
# TIKTOK API
# =============================================================================
TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
TIKTOK_REDIRECT_URI=http://localhost:3000/auth/tiktok/callback

# =============================================================================
# YOUTUBE API (Google)
# =============================================================================
YOUTUBE_API_KEY=your_youtube_api_key
YOUTUBE_CLIENT_ID=your_youtube_oauth_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_oauth_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/auth/youtube/callback

# =============================================================================
# EMAIL CONFIGURATION (Choose one)
# =============================================================================
# SendGrid (Recommended)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=MOI Social Media Manager

# SMTP Alternative
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=MOI Social Media Manager

# =============================================================================
# SMS CONFIGURATION (Twilio)
# =============================================================================
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# =============================================================================
# PUSH NOTIFICATIONS (Firebase)
# =============================================================================
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id

# =============================================================================
# SERVICE URLS
# =============================================================================
# Development URLs
API_GATEWAY_URL=http://localhost:3000
AUTH_SERVICE_URL=http://localhost:3001
CONTENT_SERVICE_URL=http://localhost:3002
SOCIAL_SERVICE_URL=http://localhost:3003
ANALYTICS_SERVICE_URL=http://localhost:3004
NOTIFICATION_SERVICE_URL=http://localhost:3005
AI_SERVICE_URL=http://localhost:3006

# Frontend URLs
WEB_CLIENT_URL=http://localhost:3001
MOBILE_CLIENT_URL=http://localhost:19006

# =============================================================================
# ENVIRONMENT
# =============================================================================
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# =============================================================================
# SECURITY
# =============================================================================
CORS_ORIGIN=http://localhost:3001,http://localhost:19006
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# =============================================================================
# FILE STORAGE
# =============================================================================
# Local storage (development)
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# AWS S3 (production)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=moi-social-media-uploads
```

## Security Notes

1. **Never commit .env files to version control**
2. **Use different secrets for development and production**
3. **Regularly rotate API keys and secrets**
4. **Use environment-specific configurations**
5. **Monitor API usage and set billing alerts**
6. **Use service accounts with minimal required permissions**

## Testing Your Configuration

After setting up your `.env` file, you can test the configuration by:

1. Starting the services: `npm run dev`
2. Checking service health endpoints:
   - API Gateway: `http://localhost:3000/health`
   - Individual services: `http://localhost:PORT/health`
3. Testing API key validity through the application logs
4. Verifying database connections in the console output

## Troubleshooting

### Common Issues:

1. **Database Connection Errors:**
   - Check if MongoDB/Redis are running
   - Verify connection strings and credentials
   - Check network access (especially for cloud databases)

2. **API Key Errors:**
   - Verify keys are correctly copied (no extra spaces)
   - Check if APIs require additional verification/approval
   - Ensure billing is set up for paid services

3. **Social Media API Issues:**
   - Some APIs require app review/approval process
   - Check rate limits and usage quotas
   - Verify redirect URIs match exactly

4. **JWT/Auth Issues:**
   - Ensure JWT secrets are long and random
   - Check token expiration settings
   - Verify CORS settings for frontend

For additional help, check the service logs and refer to the official documentation for each service provider.