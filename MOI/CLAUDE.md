# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MOI is an AI-powered social media management platform built with a microservices architecture. It automates content generation using OpenAI GPT-4, manages approval workflows, and publishes to multiple social platforms (LinkedIn, X/Twitter, Instagram, TikTok, YouTube Shorts).

## Architecture

### Microservices Structure
- **API Gateway** (port 3000) - Central routing
- **Auth Service** (port 3001) - JWT authentication with bcrypt
- **Content Service** (port 3002) - Content lifecycle and approval workflows
- **AI Service** (port 3003) - OpenAI GPT-4 integration and learning engine
- **Social Service** (port 3004) - Multi-platform social media integrations
- **Analytics Service** (port 3005) - Performance tracking and reporting
- **Notification Service** (port 3006) - Email, SMS, and push notifications

### Client Applications
- **Web App**: React 18 + TypeScript + Material-UI (port 3001 in dev)
- **Mobile App**: React Native + TypeScript + React Native Paper

### Data Layer
- **MongoDB** with Mongoose ODM for primary data
- **Redis** for sessions, caching, and real-time features

## Development Commands

### Root Level Commands
```bash
# Development
npm run dev              # Start all backend services
npm run dev:all          # Start all services + web frontend
npm run dev:web          # Web app only
npm run dev:mobile       # React Native metro bundler

# Individual services
npm run dev:auth         # Auth service only
npm run dev:ai           # AI service only
npm run dev:content      # Content service only

# Mobile development
npm run ios              # Run iOS simulator
npm run android          # Run Android emulator

# Testing
npm run test             # All services tests
npm run test:mobile      # Mobile app tests
npm run test:web         # Web app tests
npm run test:integration # Cross-service integration tests

# Docker
npm run docker:up        # Start with Docker Compose
npm run docker:down      # Stop containers
```

### Service-Level Commands (in each server/* directory)
```bash
npm run dev              # Development with nodemon
npm run test             # Unit tests with Jest
npm run test:coverage    # Test coverage reports
npm run lint             # ESLint checks
npm run lint:fix         # Auto-fix linting issues
```

## Key Development Patterns

### Service Communication
- All services use Express.js with consistent middleware stack
- JWT authentication validated via auth.middleware.js
- Input validation using Joi schemas in validation.middleware.js
- Consistent error handling and logging across services

### Database Patterns
- Mongoose models with validation schemas
- Consistent naming: `*.model.js` for schemas
- Database config in `config/database.js` per service

### AI Integration
- OpenAI GPT-4 API integration in ai-service
- Learning engine that adapts to user feedback
- Platform-specific content formatting

### Testing Strategy
- Jest for unit tests with 80%+ coverage target
- Integration tests for service-to-service communication
- Cypress for web E2E tests, Detox for mobile E2E
- Performance testing with Artillery.io

## Environment Setup

### Required Environment Variables
```bash
# Core Services
MONGODB_URI=mongodb://localhost:27017/moi
REDIS_URL=redis://localhost:6379
JWT_SECRET=<64-character-random-string>
OPENAI_API_KEY=sk-proj-<your-key>

# Social Media APIs
LINKEDIN_CLIENT_ID=<linkedin-app-id>
TWITTER_API_KEY=<twitter-api-key>
INSTAGRAM_APP_ID=<instagram-app-id>
TIKTOK_CLIENT_KEY=<tiktok-client-key>
YOUTUBE_API_KEY=<youtube-api-key>

# Notifications
SENDGRID_API_KEY=<sendgrid-key>
TWILIO_ACCOUNT_SID=<twilio-sid>
FIREBASE_PROJECT_ID=<firebase-project>
```

### Quick Local Setup
```bash
# Start databases
docker-compose up -d mongodb redis

# Install dependencies
npm run install:all

# Start development environment
npm run dev:all
```

## Code Conventions

### Backend Services
- Use Express.js with standard middleware stack (helmet, cors, morgan)
- Controllers in `controllers/`, models in `models/`, routes in `routes/`
- Services in `services/` for business logic
- Validation middleware using Joi schemas
- Error handling with consistent status codes

### Frontend (Web & Mobile)
- TypeScript with strict typing
- Component structure: screens/, components/, contexts/, services/
- State management: React Query (web), Zustand (mobile)
- Navigation: React Router (web), React Navigation (mobile)

### Testing
- Place tests in `__tests__/` directories or alongside source files
- Use descriptive test names and group with `describe` blocks
- Mock external dependencies and API calls
- Aim for high test coverage, especially for business logic

## Deployment

### Local Development
Use Docker Compose: `docker-compose up -d` for full environment

### Production
- Kubernetes deployment with Kustomize overlays (k8s/ directory)
- Three environments: development, staging, production
- Use `./scripts/deploy.sh <environment>` for automated deployment