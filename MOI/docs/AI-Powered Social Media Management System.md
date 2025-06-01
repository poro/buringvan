# AI-Powered Social Media Management System
## Implementation Guide for Cursor

This document provides structured implementation guidance for developing an AI-powered social media management system using Cursor. It includes code examples, implementation priorities, and technical specifications optimized for AI-assisted development.

## Project Overview

The system automates social media content generation and management across LinkedIn, X (Twitter), Instagram, TikTok, and YouTube Shorts with the following key features:

- AI-powered content generation based on specified themes
- Manual approval workflow for all content
- Learning capabilities that adapt to user feedback
- Web and mobile applications with consistent interfaces
- Integration with multiple social media platforms

## Implementation Approach

This guide follows a modular, component-based approach to facilitate parallel development and incremental delivery. Each section includes:

1. Component description
2. Implementation priorities
3. Code examples
4. Testing guidance

## Tech Stack

```
Frontend:
- Web: React + TypeScript + Tailwind CSS
- Mobile: React Native

Backend:
- API: Node.js with Express
- AI Services: Python with Flask
- Database: MongoDB
- Caching: Redis
- Media Storage: AWS S3

DevOps:
- Containerization: Docker
- Orchestration: Kubernetes
- CI/CD: GitHub Actions
```

## Project Structure

```
/
├── client/                  # Frontend applications
│   ├── web/                 # React web application
│   └── mobile/              # React Native mobile application
├── server/                  # Backend services
│   ├── api-gateway/         # API Gateway service
│   ├── auth-service/        # Authentication service
│   ├── content-service/     # Content management service
│   ├── ai-service/          # AI and learning service
│   ├── social-service/      # Social media integration service
│   ├── analytics-service/   # Analytics and reporting service
│   └── notification-service/# Notification service
└── infrastructure/          # Infrastructure as code
    ├── docker/              # Docker configurations
    ├── kubernetes/          # Kubernetes manifests
    └── terraform/           # Infrastructure provisioning
```

## Implementation Priorities

### Phase 1: Foundation (Weeks 1-4)
1. Project setup and infrastructure
2. Authentication service
3. Content management service
4. Basic web application
5. Initial AI integration

### Phase 2: Core Features (Weeks 5-8)
1. LinkedIn and X integration
2. Content approval workflow
3. Mobile application foundation
4. Learning engine development

### Phase 3: Expansion (Weeks 9-12)
1. Instagram and TikTok integration
2. Enhanced mobile experience
3. Advanced analytics
4. YouTube Shorts integration

## Component Implementation Guide

### 1. Authentication Service

**Description**: Handles user authentication, authorization, and session management.

**Implementation Priority**: High (Phase 1)

**Key Files**:
```
server/auth-service/
├── src/
│   ├── controllers/
│   │   └── auth.controller.js
│   ├── models/
│   │   └── user.model.js
│   ├── routes/
│   │   └── auth.routes.js
│   ├── services/
│   │   └── auth.service.js
│   ├── middleware/
│   │   └── auth.middleware.js
│   └── app.js
├── Dockerfile
└── package.json
```

**Code Example - User Model**:
```javascript
// server/auth-service/src/models/user.model.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  preferences: {
    themes: [String],
    platforms: [String],
    notificationPreferences: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
```

**Code Example - Auth Controller**:
```javascript
// server/auth-service/src/controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const config = require('../config');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      config.jwtSecret,
      { expiresIn: '1d' }
    );
    
    // Generate refresh token
    const refreshToken = jwt.sign(
      { id: user._id },
      config.refreshTokenSecret,
      { expiresIn: '7d' }
    );
    
    res.status(200).json({
      token,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        preferences: user.preferences
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token is required' });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.refreshTokenSecret);
    
    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    
    // Generate new access token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      config.jwtSecret,
      { expiresIn: '1d' }
    );
    
    res.status(200).json({ token });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

exports.logout = (req, res) => {
  // Client-side should remove tokens
  res.status(200).json({ message: 'Logged out successfully' });
};
```

**Testing Guidance**:
- Unit test user model methods
- Test authentication endpoints with valid and invalid credentials
- Verify token generation and validation
- Test refresh token functionality
- Ensure proper error handling

### 2. Content Generation Service

**Description**: Handles AI-powered content generation and learning from user feedback.

**Implementation Priority**: High (Phase 1)

**Key Files**:
```
server/ai-service/
├── src/
│   ├── controllers/
│   │   └── content.controller.py
│   ├── models/
│   │   ├── content_generator.py
│   │   └── learning_engine.py
│   ├── routes/
│   │   └── content_routes.py
│   ├── services/
│   │   ├── ai_service.py
│   │   └── feedback_service.py
│   └── app.py
├── Dockerfile
└── requirements.txt
```

**Code Example - Content Generator**:
```python
# server/ai-service/src/models/content_generator.py
import os
import openai
from typing import Dict, List, Optional

class ContentGenerator:
    def __init__(self):
        openai.api_key = os.getenv("OPENAI_API_KEY")
        self.model = "gpt-4"  # or appropriate model
        
    def generate_content(self, 
                         theme: str, 
                         platform: str, 
                         content_type: str,
                         user_style: Dict[str, any],
                         previous_feedback: Optional[List[Dict]] = None) -> Dict:
        """
        Generate content based on theme, platform, and user style
        
        Args:
            theme: Content theme (e.g., "AI and games")
            platform: Target platform (e.g., "linkedin", "twitter")
            content_type: Type of content (e.g., "post", "article", "video_script")
            user_style: Dictionary containing user style preferences
            previous_feedback: List of previous feedback for learning
            
        Returns:
            Dictionary containing generated content
        """
        # Construct prompt based on parameters
        prompt = self._construct_prompt(theme, platform, content_type, user_style, previous_feedback)
        
        # Generate content using OpenAI
        response = openai.ChatCompletion.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an expert social media content creator."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        # Process and format the response
        content = self._process_response(response, platform, content_type)
        
        return content
    
    def _construct_prompt(self, 
                          theme: str, 
                          platform: str, 
                          content_type: str,
                          user_style: Dict[str, any],
                          previous_feedback: Optional[List[Dict]]) -> str:
        """Construct prompt for content generation"""
        
        # Platform-specific instructions
        platform_instructions = {
            "linkedin": "Professional tone, up to 3000 characters, focused on industry insights",
            "twitter": "Concise, engaging, up to 280 characters, with hashtags",
            "instagram": "Visual-focused, engaging caption up to 2200 characters with hashtags",
            "tiktok": "Trendy, attention-grabbing, brief caption with hashtags",
            "youtube": "Engaging title and description that drives views"
        }
        
        # Content type instructions
        content_type_instructions = {
            "post": "Create a social media post",
            "article": "Create an outline for an article",
            "video_script": "Create a script for a short video"
        }
        
        # Base prompt
        prompt = f"""
        {content_type_instructions.get(content_type, "Create content")} about {theme} for {platform}.
        
        Platform guidelines: {platform_instructions.get(platform, "")}
        
        Style preferences:
        - Tone: {user_style.get('tone', 'professional')}
        - Voice: {user_style.get('voice', 'authoritative')}
        - Humor level: {user_style.get('humor_level', 'moderate')}
        - Technical depth: {user_style.get('technical_depth', 'moderate')}
        
        The content should be original, engaging, and aligned with current trends in this topic.
        """
        
        # Add previous feedback if available
        if previous_feedback:
            prompt += "\n\nBased on previous feedback, please note:"
            for feedback in previous_feedback:
                prompt += f"\n- {feedback['feedback_type']}: {feedback['feedback_text']}"
        
        return prompt
    
    def _process_response(self, response, platform, content_type):
        """Process and format the AI response"""
        content_text = response.choices[0].message.content.strip()
        
        # Basic processing based on platform and content type
        if platform == "twitter" and len(content_text) > 280:
            content_text = content_text[:277] + "..."
            
        # Structure the response
        result = {
            "text": content_text,
            "platform": platform,
            "content_type": content_type,
            "hashtags": self._extract_hashtags(content_text),
            "media_suggestions": []  # Would be populated by a media suggestion service
        }
        
        return result
    
    def _extract_hashtags(self, text):
        """Extract hashtags from text"""
        # Simple extraction - would be more sophisticated in production
        words = text.split()
        hashtags = [word for word in words if word.startswith("#")]
        return hashtags
```

**Code Example - Learning Engine**:
```python
# server/ai-service/src/models/learning_engine.py
from typing import Dict, List, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class LearningEngine:
    def __init__(self):
        self.vectorizer = TfidfVectorizer()
        self.user_style_profile = {
            'tone': 'professional',
            'voice': 'authoritative',
            'humor_level': 'moderate',
            'technical_depth': 'moderate',
            'vocabulary': [],
            'sentence_length': 'medium',
            'content_structure': 'balanced'
        }
        self.feedback_history = []
        
    def process_feedback(self, 
                         original_content: str, 
                         edited_content: Optional[str] = None,
                         approval_status: str = 'approved',
                         feedback_notes: Optional[str] = None) -> Dict:
        """
        Process user feedback to update the learning model
        
        Args:
            original_content: Original AI-generated content
            edited_content: User-edited content (if any)
            approval_status: 'approved', 'edited', or 'rejected'
            feedback_notes: Additional feedback notes
            
        Returns:
            Updated user style profile
        """
        # Record feedback
        feedback_item = {
            'original_content': original_content,
            'edited_content': edited_content,
            'approval_status': approval_status,
            'feedback_notes': feedback_notes,
            'processed': False
        }
        self.feedback_history.append(feedback_item)
        
        # Update style profile based on feedback
        if approval_status == 'approved':
            # Content was good as-is, reinforce current style
            self._reinforce_current_style(original_content)
        elif approval_status == 'edited' and edited_content:
            # Compare original and edited to learn preferences
            self._learn_from_edits(original_content, edited_content)
        elif approval_status == 'rejected':
            # Learn what to avoid
            self._learn_from_rejection(original_content, feedback_notes)
        
        # Mark as processed
        feedback_item['processed'] = True
        
        return self.user_style_profile
    
    def _reinforce_current_style(self, content: str) -> None:
        """Reinforce current style based on approved content"""
        # Update vocabulary
        words = set(content.lower().split())
        self.user_style_profile['vocabulary'] = list(
            set(self.user_style_profile['vocabulary']).union(words)
        )
        
        # Analyze sentence length
        sentences = content.split('.')
        avg_sentence_length = np.mean([len(s.split()) for s in sentences if s.strip()])
        
        if avg_sentence_length < 10:
            self.user_style_profile['sentence_length'] = 'short'
        elif avg_sentence_length > 20:
            self.user_style_profile['sentence_length'] = 'long'
        else:
            self.user_style_profile['sentence_length'] = 'medium'
    
    def _learn_from_edits(self, original: str, edited: str) -> None:
        """Learn from user edits"""
        # Compare tone and style
        if self._calculate_similarity(original, edited) < 0.7:
            # Significant changes - analyze differences
            self._analyze_tone_differences(original, edited)
        
        # Update vocabulary based on edited content
        words = set(edited.lower().split())
        self.user_style_profile['vocabulary'] = list(
            set(self.user_style_profile['vocabulary']).union(words)
        )
        
        # Analyze sentence structure
        original_sentences = original.split('.')
        edited_sentences = edited.split('.')
        
        if len(edited_sentences) > len(original_sentences) * 1.2:
            # User prefers shorter sentences
            self.user_style_profile['sentence_length'] = 'shorter'
        elif len(edited_sentences) < len(original_sentences) * 0.8:
            # User prefers longer sentences
            self.user_style_profile['sentence_length'] = 'longer'
    
    def _learn_from_rejection(self, content: str, feedback: Optional[str]) -> None:
        """Learn from rejected content"""
        # If feedback is provided, analyze it
        if feedback:
            if 'too formal' in feedback.lower():
                self._adjust_tone_formality(-1)
            elif 'too casual' in feedback.lower():
                self._adjust_tone_formality(1)
            
            if 'too technical' in feedback.lower():
                self.user_style_profile['technical_depth'] = 'lower'
            elif 'not technical enough' in feedback.lower():
                self.user_style_profile['technical_depth'] = 'higher'
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two texts"""
        try:
            tfidf = self.vectorizer.fit_transform([text1, text2])
            return cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
        except:
            return 0.5  # Default if calculation fails
    
    def _analyze_tone_differences(self, original: str, edited: str) -> None:
        """Analyze tone differences between original and edited content"""
        # This would be more sophisticated in production
        # Simple implementation for demonstration
        original_lower = original.lower()
        edited_lower = edited.lower()
        
        # Check for formality changes
        formal_indicators = ['therefore', 'however', 'consequently', 'furthermore']
        casual_indicators = ['just', 'pretty', 'really', 'actually', 'basically']
        
        original_formal_count = sum(1 for word in formal_indicators if word in original_lower)
        edited_formal_count = sum(1 for word in formal_indicators if word in edited_lower)
        
        original_casual_count = sum(1 for word in casual_indicators if word in original_lower)
        edited_casual_count = sum(1 for word in casual_indicators if word in edited_lower)
        
        if edited_formal_count > original_formal_count and edited_casual_count < original_casual_count:
            self._adjust_tone_formality(1)  # More formal
        elif edited_formal_count < original_formal_count and edited_casual_count > original_casual_count:
            self._adjust_tone_formality(-1)  # More casual
    
    def _adjust_tone_formality(self, direction: int) -> None:
        """Adjust tone formality (1 = more formal, -1 = more casual)"""
        tone_scale = ['casual', 'conversational', 'neutral', 'professional', 'formal']
        current_index = tone_scale.index(self.user_style_profile['tone']) if self.user_style_profile['tone'] in tone_scale else 2
        
        new_index = max(0, min(len(tone_scale) - 1, current_index + direction))
        self.user_style_profile['tone'] = tone_scale[new_index]
    
    def get_learning_insights(self) -> Dict:
        """Get insights from learning process"""
        total_feedback = len(self.feedback_history)
        approvals = sum(1 for item in self.feedback_history if item['approval_status'] == 'approved')
        edits = sum(1 for item in self.feedback_history if item['approval_status'] == 'edited')
        rejections = sum(1 for item in self.feedback_history if item['approval_status'] == 'rejected')
        
        approval_rate = approvals / total_feedback if total_feedback > 0 else 0
        
        return {
            'total_feedback': total_feedback,
            'approval_rate': approval_rate,
            'user_style_profile': self.user_style_profile,
            'learning_progress': min(1.0, total_feedback / 50)  # Simple progress metric
        }
```

**Testing Guidance**:
- Test content generation with various themes and platforms
- Verify learning engine updates style profile correctly
- Test feedback processing with different scenarios
- Ensure content meets platform-specific requirements
- Validate integration with OpenAI API

### 3. Web Application Frontend

**Description**: React-based web application for content management and approval.

**Implementation Priority**: High (Phase 1)

**Key Files**:
```
client/web/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── content/
│   │   │   ├── ContentApproval.tsx
│   │   │   ├── ContentEditor.tsx
│   │   │   └── ContentList.tsx
│   │   ├── dashboard/
│   │   │   ├── Dashboard.tsx
│   │   │   └── PerformanceMetrics.tsx
│   │   └── common/
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── NotificationCenter.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── ContentContext.tsx
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.service.ts
│   │   └── content.service.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   └── validators.ts
│   ├── App.tsx
│   └── index.tsx
├── public/
│   └── index.html
├── package.json
└── tsconfig.json
```

**Code Example - Content Approval Component**:
```tsx
// client/web/src/components/content/ContentApproval.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useContentContext } from '../../contexts/ContentContext';
import { Button, Card, Tabs, Tab, TextArea, Select, Toggle } from '../ui';
import PlatformPreview from './PlatformPreview';

interface ContentApprovalProps {
  contentId?: string;
}

const ContentApproval: React.FC<ContentApprovalProps> = ({ contentId }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getContent, approveContent, rejectContent, updateContent } = useContentContext();
  
  const [content, setContent] = useState<any>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');
  const [isScheduling, setIsScheduling] = useState<boolean>(false);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const contentData = await getContent(contentId || id);
        setContent(contentData);
        setEditedContent(contentData.text);
        setSelectedPlatform(contentData.platforms[0]?.platform || '');
        setLoading(false);
      } catch (err) {
        setError('Failed to load content');
        setLoading(false);
      }
    };
    
    fetchContent();
  }, [contentId, id, getContent]);
  
  const handleApprove = async () => {
    try {
      if (editedContent !== content.text) {
        // Content was edited
        await updateContent(content.id, {
          text: editedContent,
          platforms: content.platforms
        });
      }
      
      const scheduledDateTime = isScheduling ? 
        new Date(`${scheduledDate}T${scheduledTime}`) : null;
      
      await approveContent(content.id, {
        scheduledAt: scheduledDateTime,
        platforms: content.platforms
      });
      
      navigate('/content');
    } catch (err) {
      setError('Failed to approve content');
    }
  };
  
  const handleReject = async () => {
    try {
      await rejectContent(content.id, {
        feedbackNotes
      });
      navigate('/content');
    } catch (err) {
      setError('Failed to reject content');
    }
  };
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!content) return <div>Content not found</div>;
  
  return (
    <div className="content-approval">
      <h1>Review Content</h1>
      
      <Card>
        <Tabs>
          <Tab label="Edit">
            <div className="edit-container">
              <TextArea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={10}
                label="Content"
              />
              
              <div className="platform-selector">
                <Select
                  label="Preview Platform"
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  options={content.platforms.map((p: any) => ({
                    value: p.platform,
                    label: p.platform.charAt(0).toUpperCase() + p.platform.slice(1)
                  }))}
                />
              </div>
            </div>
          </Tab>
          
          <Tab label="Preview">
            <PlatformPreview
              platform={selectedPlatform}
              content={editedContent}
              hashtags={content.hashtags}
            />
          </Tab>
        </Tabs>
      </Card>
      
      <Card className="scheduling-section">
        <Toggle
          label="Schedule for later"
          checked={isScheduling}
          onChange={() => setIsScheduling(!isScheduling)}
        />
        
        {isScheduling && (
          <div className="schedule-controls">
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>
        )}
      </Card>
      
      <Card className="feedback-section">
        <TextArea
          label="Feedback Notes (required for rejection)"
          value={feedbackNotes}
          onChange={(e) => setFeedbackNotes(e.target.value)}
          rows={3}
          placeholder="Provide feedback to help the AI learn your preferences"
        />
      </Card>
      
      <div className="action-buttons">
        <Button variant="secondary" onClick={() => navigate('/content')}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleReject} disabled={!feedbackNotes}>
          Reject
        </Button>
        <Button variant="primary" onClick={handleApprove}>
          {isScheduling ? 'Approve & Schedule' : 'Approve & Publish'}
        </Button>
      </div>
    </div>
  );
};

export default ContentApproval;
```

**Testing Guidance**:
- Test component rendering with various content types
- Verify form validation and submission
- Test platform preview functionality
- Ensure proper handling of edited content
- Test scheduling functionality
- Verify navigation and state management

### 4. Social Media Integration Service

**Description**: Handles integration with social media platforms for content publishing.

**Implementation Priority**: Medium (Phase 2)

**Key Files**:
```
server/social-service/
├── src/
│   ├── controllers/
│   │   └── platform.controller.js
│   ├── models/
│   │   └── platform-account.model.js
│   ├── services/
│   │   ├── linkedin.service.js
│   │   ├── twitter.service.js
│   │   ├── instagram.service.js
│   │   ├── tiktok.service.js
│   │   └── youtube.service.js
│   ├── utils/
│   │   ├── media-optimizer.js
│   │   └── error-handler.js
│   └── app.js
├── Dockerfile
└── package.json
```

**Code Example - LinkedIn Service**:
```javascript
// server/social-service/src/services/linkedin.service.js
const axios = require('axios');
const { LinkedInClient } = require('@linkedin/api-client');
const PlatformAccount = require('../models/platform-account.model');
const logger = require('../utils/logger');
const mediaOptimizer = require('../utils/media-optimizer');

class LinkedInService {
  constructor() {
    this.baseUrl = 'https://api.linkedin.com/v2';
  }
  
  async getClient(userId) {
    try {
      // Get user's LinkedIn credentials
      const account = await PlatformAccount.findOne({
        userId,
        platform: 'linkedin'
      });
      
      if (!account || !account.accessToken) {
        throw new Error('LinkedIn account not connected');
      }
      
      // Check if token is expired
      if (new Date(account.tokenExpiry) <= new Date()) {
        // Refresh token
        await this.refreshToken(account);
      }
      
      // Create LinkedIn client
      const client = new LinkedInClient({
        accessToken: account.accessToken
      });
      
      return client;
    } catch (error) {
      logger.error(`LinkedIn client error: ${error.message}`);
      throw error;
    }
  }
  
  async refreshToken(account) {
    try {
      const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', {
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET
      });
      
      // Update account with new tokens
      account.accessToken = response.data.access_token;
      account.refreshToken = response.data.refresh_token || account.refreshToken;
      account.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);
      
      await account.save();
    } catch (error) {
      logger.error(`LinkedIn token refresh error: ${error.message}`);
      throw new Error('Failed to refresh LinkedIn token');
    }
  }
  
  async publishPost(userId, content) {
    try {
      const client = await this.getClient(userId);
      
      // Get user's LinkedIn profile
      const profile = await client.me();
      
      // Prepare post content
      const postContent = {
        author: `urn:li:person:${profile.id}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content.text
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };
      
      // Add media if provided
      if (content.mediaUrls && content.mediaUrls.length > 0) {
        const mediaAssets = await this.prepareMediaAssets(client, content.mediaUrls);
        
        postContent.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 
          mediaAssets.length > 1 ? 'CAROUSEL' : 'IMAGE';
        
        postContent.specificContent['com.linkedin.ugc.ShareContent'].media = mediaAssets;
      }
      
      // Publish post
      const response = await client.posts.create(postContent);
      
      return {
        platformPostId: response.id,
        status: 'published',
        publishedAt: new Date()
      };
    } catch (error) {
      logger.error(`LinkedIn publish error: ${error.message}`);
      throw new Error(`Failed to publish to LinkedIn: ${error.message}`);
    }
  }
  
  async prepareMediaAssets(client, mediaUrls) {
    const mediaAssets = [];
    
    for (const url of mediaUrls) {
      // Optimize media for LinkedIn
      const optimizedMedia = await mediaOptimizer.optimize(url, 'linkedin');
      
      // Register media upload
      const registerResponse = await client.media.registerUpload({
        registerUploadRequest: {
          owner: 'urn:li:person:' + client.me().id,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent'
            }
          ]
        }
      });
      
      // Upload media
      await client.media.upload({
        uploadUrl: registerResponse.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl,
        media: optimizedMedia.buffer
      });
      
      // Add to media assets
      mediaAssets.push({
        status: 'READY',
        description: {
          text: optimizedMedia.alt || ''
        },
        media: registerResponse.value.asset
      });
    }
    
    return mediaAssets;
  }
  
  async getPostAnalytics(userId, platformPostId) {
    try {
      const client = await this.getClient(userId);
      
      const analytics = await client.posts.getAnalytics(platformPostId);
      
      return {
        impressions: analytics.totalShareStatistics.impressionCount,
        engagements: analytics.totalShareStatistics.engagement,
        clicks: analytics.totalShareStatistics.clickCount,
        likes: analytics.totalShareStatistics.likeCount,
        comments: analytics.totalShareStatistics.commentCount,
        shares: analytics.totalShareStatistics.shareCount
      };
    } catch (error) {
      logger.error(`LinkedIn analytics error: ${error.message}`);
      throw new Error('Failed to get LinkedIn post analytics');
    }
  }
}

module.exports = new LinkedInService();
```

**Testing Guidance**:
- Test authentication and token refresh
- Verify post publishing with and without media
- Test error handling for API rate limits
- Validate media optimization
- Test analytics retrieval
- Ensure proper error logging

### 5. Mobile Application

**Description**: React Native mobile app for content approval and management.

**Implementation Priority**: Medium (Phase 2)

**Key Files**:
```
client/mobile/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── content/
│   │   │   ├── ContentApproval.tsx
│   │   │   ├── ContentList.tsx
│   │   │   └── PlatformPreview.tsx
│   │   └── common/
│   │       ├── Header.tsx
│   │       └── NotificationBadge.tsx
│   ├── navigation/
│   │   ├── AppNavigator.tsx
│   │   └── AuthNavigator.tsx
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── ContentScreen.tsx
│   │   ├── ApprovalScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── services/
│   │   ├── api.ts
│   │   └── push-notifications.ts
│   ├── App.tsx
│   └── index.js
├── android/
├── ios/
└── package.json
```

**Code Example - Approval Screen**:
```tsx
// client/mobile/src/screens/ApprovalScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { TextInput, Button, Chip, Card } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import PlatformPreview from '../components/content/PlatformPreview';
import { useContentContext } from '../contexts/ContentContext';

const ApprovalScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { getContent, approveContent, rejectContent, updateContent } = useContentContext();
  const { contentId } = route.params;
  
  const [content, setContent] = useState(null);
  const [editedText, setEditedText] = useState('');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        const contentData = await getContent(contentId);
        setContent(contentData);
        setEditedText(contentData.text);
        setSelectedPlatform(contentData.platforms[0]?.platform || '');
        setLoading(false);
      } catch (err) {
        setError('Failed to load content');
        setLoading(false);
      }
    };
    
    loadContent();
  }, [contentId, getContent]);
  
  const handleApprove = async () => {
    try {
      if (editedText !== content.text) {
        // Content was edited
        await updateContent(content.id, {
          text: editedText
        });
      }
      
      const approvalData = {
        platforms: content.platforms
      };
      
      if (isScheduling) {
        approvalData.scheduledAt = scheduledDate.toISOString();
      }
      
      await approveContent(content.id, approvalData);
      
      navigation.navigate('Content', { refresh: true });
    } catch (err) {
      Alert.alert('Error', 'Failed to approve content');
    }
  };
  
  const handleReject = async () => {
    if (!feedbackNotes) {
      Alert.alert('Error', 'Please provide feedback for rejection');
      return;
    }
    
    try {
      await rejectContent(content.id, {
        feedbackNotes
      });
      
      navigation.navigate('Content', { refresh: true });
    } catch (err) {
      Alert.alert('Error', 'Failed to reject content');
    }
  };
  
  const togglePlatform = (platform) => {
    setSelectedPlatform(platform);
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Review Content" />
        <Card.Content>
          <TextInput
            mode="outlined"
            label="Content"
            value={editedText}
            onChangeText={setEditedText}
            multiline
            numberOfLines={6}
            style={styles.textInput}
          />
          
          <Text style={styles.sectionTitle}>Platforms</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.platformsContainer}>
            {content.platforms.map((platform) => (
              <Chip
                key={platform.platform}
                selected={selectedPlatform === platform.platform}
                onPress={() => togglePlatform(platform.platform)}
                style={styles.platformChip}
                icon={getPlatformIcon(platform.platform)}
              >
                {platform.platform}
              </Chip>
            ))}
          </ScrollView>
          
          <TouchableOpacity 
            style={styles.previewToggle}
            onPress={() => setShowPreview(!showPreview)}
          >
            <Text style={styles.previewToggleText}>
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Text>
            <Icon 
              name={showPreview ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#0066cc" 
            />
          </TouchableOpacity>
          
          {showPreview && (
            <View style={styles.previewContainer}>
              <PlatformPreview
                platform={selectedPlatform}
                content={editedText}
                hashtags={content.hashtags}
              />
            </View>
          )}
          
          <View style={styles.schedulingContainer}>
            <TouchableOpacity 
              style={styles.schedulingToggle}
              onPress={() => setIsScheduling(!isScheduling)}
            >
              <Icon 
                name={isScheduling ? 'checkbox-marked' : 'checkbox-blank-outline'} 
                size={24} 
                color="#0066cc" 
              />
              <Text style={styles.schedulingToggleText}>
                Schedule for later
              </Text>
            </TouchableOpacity>
            
            {isScheduling && (
              <View style={styles.datePickerContainer}>
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Icon name="calendar" size={24} color="#0066cc" />
                  <Text style={styles.datePickerText}>
                    {scheduledDate.toLocaleString()}
                  </Text>
                </TouchableOpacity>
                
                {showDatePicker && (
                  <DateTimePicker
                    value={scheduledDate}
                    mode="datetime"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        setScheduledDate(selectedDate);
                      }
                    }}
                    minimumDate={new Date()}
                  />
                )}
              </View>
            )}
          </View>
          
          <TextInput
            mode="outlined"
            label="Feedback Notes (required for rejection)"
            value={feedbackNotes}
            onChangeText={setFeedbackNotes}
            multiline
            numberOfLines={3}
            style={styles.feedbackInput}
          />
        </Card.Content>
      </Card>
      
      <View style={styles.actionButtons}>
        <Button 
          mode="outlined" 
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
        <Button 
          mode="contained" 
          onPress={handleReject}
          style={styles.rejectButton}
          disabled={!feedbackNotes}
        >
          Reject
        </Button>
        <Button 
          mode="contained" 
          onPress={handleApprove}
          style={styles.approveButton}
        >
          {isScheduling ? 'Schedule' : 'Approve'}
        </Button>
      </View>
    </ScrollView>
  );
};

const getPlatformIcon = (platform) => {
  switch (platform.toLowerCase()) {
    case 'linkedin':
      return 'linkedin';
    case 'twitter':
    case 'x':
      return 'twitter';
    case 'instagram':
      return 'instagram';
    case 'tiktok':
      return 'music-note';
    case 'youtube':
      return 'youtube';
    default:
      return 'earth';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  textInput: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  platformsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  platformChip: {
    marginRight: 8,
  },
  previewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginBottom: 16,
  },
  previewToggleText: {
    color: '#0066cc',
    marginRight: 8,
    fontSize: 16,
  },
  previewContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
  },
  schedulingContainer: {
    marginBottom: 16,
  },
  schedulingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  schedulingToggleText: {
    marginLeft: 8,
    fontSize: 16,
  },
  datePickerContainer: {
    marginLeft: 32,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
  },
  datePickerText: {
    marginLeft: 8,
  },
  feedbackInput: {
    marginTop: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  rejectButton: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#ff3b30',
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#34c759',
  },
});

export default ApprovalScreen;
```

**Testing Guidance**:
- Test on both iOS and Android devices
- Verify responsive layout on different screen sizes
- Test date picker functionality
- Ensure platform previews render correctly
- Verify form validation and submission
- Test navigation flow

## Database Setup

**MongoDB Schema Setup**:

```javascript
// server/database/init.js
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    logger.info('MongoDB connected');
    
    // Create indexes
    await createIndexes();
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

const createIndexes = async () => {
  const db = mongoose.connection;
  
  // Users collection indexes
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  
  // Platform accounts indexes
  await db.collection('platformaccounts').createIndex({ userId: 1, platform: 1 }, { unique: true });
  
  // Content items indexes
  await db.collection('contentitems').createIndex({ userId: 1 });
  await db.collection('contentitems').createIndex({ 'platforms.platform': 1 });
  await db.collection('contentitems').createIndex({ 'platforms.status': 1 });
  await db.collection('contentitems').createIndex({ 'platforms.scheduledTime': 1 });
  
  // Analytics data indexes
  await db.collection('analyticsdata').createIndex({ contentId: 1 });
  await db.collection('analyticsdata').createIndex({ platform: 1 });
  
  logger.info('Database indexes created');
};

module.exports = connectDB;
```

## API Gateway Setup

```javascript
// server/api-gateway/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const authMiddleware = require('./middleware/auth.middleware');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Auth routes (no auth required)
app.use('/api/auth', createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '/'
  }
}));

// Protected routes
app.use('/api/content', authMiddleware, createProxyMiddleware({
  target: process.env.CONTENT_SERVICE_URL || 'http://content-service:3002',
  changeOrigin: true,
  pathRewrite: {
    '^/api/content': '/'
  }
}));

app.use('/api/platforms', authMiddleware, createProxyMiddleware({
  target: process.env.SOCIAL_SERVICE_URL || 'http://social-service:3003',
  changeOrigin: true,
  pathRewrite: {
    '^/api/platforms': '/'
  }
}));

app.use('/api/analytics', authMiddleware, createProxyMiddleware({
  target: process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:3004',
  changeOrigin: true,
  pathRewrite: {
    '^/api/analytics': '/'
  }
}));

app.use('/api/notifications', authMiddleware, createProxyMiddleware({
  target: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3005',
  changeOrigin: true,
  pathRewrite: {
    '^/api/notifications': '/'
  }
}));

// Error handling
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
});

module.exports = app;
```

## Docker Setup

**Docker Compose**:

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Frontend services
  web-client:
    build:
      context: ./client/web
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - api-gateway
    environment:
      - REACT_APP_API_URL=http://localhost:3000/api
    networks:
      - frontend-network
      - api-network

  # Backend services
  api-gateway:
    build:
      context: ./server/api-gateway
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - auth-service
      - content-service
      - social-service
      - analytics-service
      - notification-service
    environment:
      - NODE_ENV=production
      - AUTH_SERVICE_URL=http://auth-service:3001
      - CONTENT_SERVICE_URL=http://content-service:3002
      - SOCIAL_SERVICE_URL=http://social-service:3003
      - ANALYTICS_SERVICE_URL=http://analytics-service:3004
      - NOTIFICATION_SERVICE_URL=http://notification-service:3005
    networks:
      - api-network

  auth-service:
    build:
      context: ./server/auth-service
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/social-automation
      - JWT_SECRET=your-jwt-secret
      - REFRESH_TOKEN_SECRET=your-refresh-token-secret
    depends_on:
      - mongo
    networks:
      - api-network
      - db-network

  content-service:
    build:
      context: ./server/content-service
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/social-automation
      - AI_SERVICE_URL=http://ai-service:3006
    depends_on:
      - mongo
      - ai-service
    networks:
      - api-network
      - db-network

  social-service:
    build:
      context: ./server/social-service
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/social-automation
      - LINKEDIN_CLIENT_ID=your-linkedin-client-id
      - LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
      - TWITTER_API_KEY=your-twitter-api-key
      - TWITTER_API_SECRET=your-twitter-api-secret
      - INSTAGRAM_APP_ID=your-instagram-app-id
      - INSTAGRAM_APP_SECRET=your-instagram-app-secret
      - TIKTOK_CLIENT_KEY=your-tiktok-client-key
      - TIKTOK_CLIENT_SECRET=your-tiktok-client-secret
      - YOUTUBE_API_KEY=your-youtube-api-key
    depends_on:
      - mongo
    networks:
      - api-network
      - db-network

  ai-service:
    build:
      context: ./server/ai-service
      dockerfile: Dockerfile
    environment:
      - OPENAI_API_KEY=your-openai-api-key
      - MONGODB_URI=mongodb://mongo:27017/social-automation
    depends_on:
      - mongo
    networks:
      - api-network
      - db-network

  analytics-service:
    build:
      context: ./server/analytics-service
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/social-automation
    depends_on:
      - mongo
    networks:
      - api-network
      - db-network

  notification-service:
    build:
      context: ./server/notification-service
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/social-automation
      - SENDGRID_API_KEY=your-sendgrid-api-key
      - FIREBASE_CREDENTIALS=your-firebase-credentials
    depends_on:
      - mongo
      - redis
    networks:
      - api-network
      - db-network

  # Database services
  mongo:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    networks:
      - db-network

  redis:
    image: redis:latest
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - db-network

networks:
  frontend-network:
  api-network:
  db-network:

volumes:
  mongo-data:
  redis-data:
```

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

#### Week 1: Project Setup
- Initialize project repositories
- Set up development environment
- Configure CI/CD pipelines
- Create basic project structure

#### Week 2: Authentication and User Management
- Implement authentication service
- Create user management functionality
- Set up JWT token handling
- Develop basic API gateway

#### Week 3: Content Management
- Implement content database schema
- Create content management API
- Develop basic AI integration
- Set up content approval workflow

#### Week 4: Web Application Foundation
- Create React application structure
- Implement authentication UI
- Develop dashboard layout
- Build content management interface

### Phase 2: Core Features (Weeks 5-8)

#### Week 5: LinkedIn and X Integration
- Implement LinkedIn API integration
- Develop X/Twitter API integration
- Create platform-specific content formatting
- Build publishing workflow

#### Week 6: Content Approval Workflow
- Enhance content approval interface
- Implement feedback collection
- Develop scheduling functionality
- Create platform preview components

#### Week 7: Mobile Application Foundation
- Set up React Native project
- Implement authentication and navigation
- Create content review interface
- Develop notification handling

#### Week 8: Learning Engine Development
- Implement feedback processing
- Develop model update mechanism
- Create style analysis components
- Build content improvement pipeline

### Phase 3: Expansion (Weeks 9-12)

#### Week 9: Instagram and TikTok Integration
- Implement Instagram API integration
- Develop TikTok API integration
- Create media optimization for visual platforms
- Build platform-specific analytics

#### Week 10: Enhanced Mobile Experience
- Implement advanced mobile features
- Develop offline capabilities
- Create mobile-specific UI enhancements
- Build push notification system

#### Week 11: Advanced Analytics
- Implement detailed performance metrics
- Develop trend analysis
- Create recommendation engine
- Build comprehensive dashboards

#### Week 12: YouTube Shorts Integration
- Implement YouTube API integration
- Develop video content optimization
- Create YouTube-specific content formatting
- Build YouTube analytics

## Testing Strategy

### Unit Testing
- Use Jest for JavaScript/TypeScript components
- Use pytest for Python services
- Aim for 80% code coverage
- Focus on business logic and data transformations

### Integration Testing
- Test API endpoints with supertest
- Verify service interactions
- Test database operations
- Validate external API integrations

### UI Testing
- Test React components with React Testing Library
- Perform end-to-end testing with Cypress
- Test mobile app with Detox
- Verify cross-browser compatibility

### Performance Testing
- Load testing with k6
- Stress testing critical components
- Benchmark API response times
- Test scalability with increasing load

## Conclusion

This implementation guide provides a comprehensive blueprint for developing an AI-powered social media management system using Cursor. By following the component-based approach and implementation priorities, you can efficiently build a robust system that meets all requirements.

The modular architecture allows for parallel development and incremental delivery, ensuring that core functionality can be delivered quickly while additional features are added in later phases.

For any questions or clarifications during implementation, refer to the detailed technical specification or contact the project team.
