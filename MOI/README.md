# AI-Powered Social Media Management System (MOI)

A comprehensive, microservices-based social media management platform that leverages AI to automate content generation, scheduling, and publishing across multiple social media platforms including LinkedIn, X/Twitter, Instagram, TikTok, and YouTube Shorts.

## 🚀 Features

### Core Capabilities
- **AI-Powered Content Generation**: Automated content creation using OpenAI GPT-4
- **Multi-Platform Publishing**: Support for LinkedIn, X/Twitter, Instagram, TikTok, YouTube Shorts
- **Content Approval Workflow**: Manual review and approval system with platform previews
- **Analytics & Reporting**: Comprehensive performance tracking and insights
- **Campaign Management**: Organized content campaigns with scheduling
- **Real-time Notifications**: Multi-channel notifications (email, SMS, push, in-app)
- **Learning System**: AI learns from user preferences and approval patterns

### Applications
- **Web Application**: React-based responsive web interface
- **Mobile Application**: React Native cross-platform mobile app
- **API Gateway**: Centralized API management and routing

## 🏗️ Architecture

### Microservices Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Mobile Client  │    │   API Gateway   │
│   (React)       │    │ (React Native)  │    │   (Express)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Auth Service   │    │ Content Service │    │   AI Service    │
│   (Express)     │    │   (Express)     │    │   (Express)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Social Service  │    │Analytics Service│    │Notification Svc │
│   (Express)     │    │   (Express)     │    │   (Express)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
    ┌─────────┐          ┌──────────────┐        ┌──────────────┐
    │ MongoDB │          │    Redis     │        │  File Storage│
    │Database │          │    Cache     │        │   (Local)    │
    └─────────┘          └──────────────┘        └──────────────┘
```

## 🛠️ Technology Stack

### Backend Services
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis for sessions and caching
- **Authentication**: JWT tokens with bcrypt
- **AI Integration**: OpenAI GPT-4 API
- **Social Media APIs**: Platform-specific SDKs
- **Email**: Nodemailer with SMTP
- **SMS**: Twilio integration
- **File Upload**: Multer for media handling

### Frontend Applications
- **Web**: React 18 with TypeScript
- **Mobile**: React Native with TypeScript
- **UI Framework**: Material-UI (Web) / React Native Paper (Mobile)
- **State Management**: Context API + Hooks
- **Forms**: React Hook Form with validation
- **Charts**: Chart.js (Web) / React Native Chart Kit (Mobile)
- **Icons**: Material Community Icons

### DevOps & Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Kubernetes with Helm charts
- **Reverse Proxy**: Nginx
- **Monitoring**: Health checks and logging
- **Deployment**: Automated scripts with environment management

## 📁 Project Structure

```
MOI/
├── client/                     # Frontend Applications
│   ├── web/                   # React Web Application
│   │   ├── src/
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── pages/         # Page components
│   │   │   ├── contexts/      # React contexts
│   │   │   ├── services/      # API services
│   │   │   └── utils/         # Utility functions
│   │   ├── public/            # Static assets
│   │   ├── Dockerfile         # Web app containerization
│   │   └── nginx.conf         # Nginx configuration
│   └── mobile/                # React Native Mobile App
│       ├── src/
│       │   ├── components/    # Reusable components
│       │   ├── screens/       # Screen components
│       │   ├── navigation/    # Navigation setup
│       │   ├── contexts/      # React contexts
│       │   └── services/      # API services
│       ├── android/           # Android configuration
│       ├── ios/              # iOS configuration
│       └── README.md         # Mobile app documentation
├── server/                    # Backend Microservices
│   ├── gateway/              # API Gateway
│   ├── auth/                 # Authentication Service
│   ├── content/              # Content Management Service
│   ├── ai/                   # AI Content Generation Service
│   ├── social/               # Social Media Integration Service
│   ├── analytics/            # Analytics & Reporting Service
│   └── notifications/        # Notification Service
├── database/                  # Database Configuration
│   ├── init/                 # MongoDB initialization
│   └── seed/                 # Sample data
├── k8s/                      # Kubernetes Manifests
│   ├── base/                 # Base configurations
│   ├── overlays/             # Environment-specific configs
│   └── README.md             # Deployment guide
├── scripts/                  # Deployment & Utility Scripts
├── docker-compose.yml        # Local development setup
├── .env.example             # Environment variables template
└── README.md                # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js (>= 16.x)
- Docker & Docker Compose
- MongoDB (or Docker)
- Redis (or Docker)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd MOI
cp .env.example .env
# Edit .env with your configuration
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start with Docker (Recommended)
```bash
docker-compose up -d
```

### 4. Manual Setup (Development)
```bash
# Start databases
docker-compose up -d mongodb redis

# Start backend services
npm run start:services

# Start web application
npm run start:web

# Start mobile application (in separate terminal)
npm run start:mobile
```

### 5. Access Applications
- **Web App**: http://localhost:3001
- **API Gateway**: http://localhost:3000
- **Mobile App**: Use React Native development setup

## 📱 Mobile Application

The React Native mobile application provides full functionality on iOS and Android:

### Features
- Native authentication with biometric support
- Real-time notifications with push notifications
- Offline content drafting and sync
- Platform-specific content previews
- Touch-optimized approval workflow
- Analytics with interactive charts

### Setup
```bash
cd client/mobile
npm install

# iOS (macOS only)
cd ios && pod install && cd ..
npm run ios

# Android
npm run android
```

See [Mobile App README](client/mobile/README.md) for detailed setup instructions.

## 🔧 Configuration

### Environment Variables
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/moi
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Social Media APIs
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
TWITTER_API_KEY=your-twitter-api-key
TWITTER_API_SECRET=your-twitter-api-secret
INSTAGRAM_ACCESS_TOKEN=your-instagram-token
TIKTOK_CLIENT_KEY=your-tiktok-client-key
YOUTUBE_API_KEY=your-youtube-api-key

# Notification Services
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
TWILIO_SID=your-twilio-sid
TWILIO_TOKEN=your-twilio-token
```

## 🔐 API Documentation

### Authentication
All API endpoints require JWT authentication except for login/register.

```bash
# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

# Register
POST /api/auth/register
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "password"
}
```

### Content Management
```bash
# Generate AI content
POST /api/ai/generate
{
  "prompt": "Create a LinkedIn post about AI in marketing",
  "platform": "linkedin",
  "tone": "professional"
}

# Approve content
PUT /api/content/:id/approve
{
  "approved": true,
  "scheduledFor": "2024-01-15T10:00:00Z"
}
```

See individual service READMEs for complete API documentation.

## 🚀 Deployment

### Kubernetes Deployment
```bash
# Apply base configurations
kubectl apply -k k8s/base

# Deploy to staging
kubectl apply -k k8s/overlays/staging

# Deploy to production
kubectl apply -k k8s/overlays/production
```

### Docker Deployment
```bash
# Build all services
docker-compose build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

### Automated Deployment
```bash
./scripts/deploy.sh production
```

## 📊 Monitoring & Analytics

### Health Checks
- **Gateway**: http://localhost:3000/health
- **Services**: Each service exposes `/health` endpoint
- **Database**: Connection monitoring included

### Metrics
- Request/response times
- Error rates and types
- User engagement analytics
- Content performance metrics
- Social media reach and engagement

### Logging
- Structured JSON logging
- Request/response logging
- Error tracking and alerting
- Performance monitoring

## 🧪 Testing

### Backend Tests
```bash
# Run all service tests
npm run test

# Run specific service tests
npm run test:auth
npm run test:content
```

### Frontend Tests
```bash
# Web application tests
cd client/web && npm test

# Mobile application tests
cd client/mobile && npm test
```

### E2E Tests
```bash
# Web E2E tests
npm run test:e2e:web

# Mobile E2E tests
npm run test:e2e:mobile
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes and add tests**
4. **Commit changes**: `git commit -m 'Add amazing feature'`
5. **Push to branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Write unit tests for new features
- Update documentation as needed
- Follow the existing code style
- Test on both web and mobile platforms

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [Architecture Guide](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](k8s/README.md)
- [Mobile App Guide](client/mobile/README.md)

### Issues & Support
- Create an issue for bugs or feature requests
- Check existing issues before creating new ones
- Provide detailed reproduction steps for bugs

## 🗺️ Roadmap

### Phase 1: Core Features ✅
- [x] Microservices architecture
- [x] AI content generation
- [x] Social media integration
- [x] Web and mobile applications
- [x] Basic analytics

### Phase 2: Advanced Features 🚧
- [ ] Advanced AI features (image generation, video editing)
- [ ] Team collaboration features
- [ ] Advanced analytics and insights
- [ ] A/B testing for content
- [ ] Social listening and sentiment analysis

### Phase 3: Enterprise Features 📋
- [ ] Multi-tenant architecture
- [ ] Advanced security features
- [ ] Custom AI model training
- [ ] Workflow automation
- [ ] Integration marketplace

## 🎯 Use Cases

### Content Creators
- Automate daily social media posting
- Generate content ideas and variations
- Track performance across platforms
- Schedule content in advance

### Marketing Teams
- Coordinate campaigns across platforms
- Analyze content performance
- Collaborate on content approval
- Track ROI and engagement metrics

### Agencies
- Manage multiple client accounts
- Bulk content generation and scheduling
- Client reporting and analytics
- Team collaboration tools

### Small Businesses
- Maintain consistent social presence
- Generate professional content without expertise
- Track customer engagement
- Automate routine posting tasks

---

**Built with ❤️ by the MOI Team**
