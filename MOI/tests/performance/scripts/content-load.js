import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '2m', target: 15 }, // Ramp up to 15 users
    { duration: '5m', target: 15 }, // Stay at 15 users
    { duration: '2m', target: 30 }, // Ramp up to 30 users
    { duration: '5m', target: 30 }, // Stay at 30 users
    { duration: '2m', target: 60 }, // Ramp up to 60 users
    { duration: '5m', target: 60 }, // Stay at 60 users
    { duration: '5m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1000ms
    http_req_failed: ['rate<0.1'],     // Error rate should be less than 10%
    errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002';
const AUTH_URL = __ENV.AUTH_URL || 'http://localhost:3001';

// Test content templates
const contentTemplates = [
  "🚀 Exciting news about our latest product launch! Check it out: {link}",
  "💡 Here's a quick tip for improving your productivity: {tip}",
  "🌟 Customer spotlight: Amazing feedback from our community!",
  "📊 Weekly stats: Our platform continues to grow with your support!",
  "🎯 New feature alert: We've added something amazing to enhance your experience!",
  "🔥 Trending now: The latest industry insights you need to know",
  "💬 Let's discuss: What's your biggest challenge in social media management?",
  "🎉 Celebrating our community: Thank you for being awesome!",
  "📈 Growth hack: Simple strategies that actually work",
  "🛠️ Behind the scenes: How we build features you love"
];

const platforms = ['twitter', 'facebook', 'linkedin', 'instagram'];
const contentTypes = ['post', 'story', 'reel', 'article'];

export function setup() {
  // Create test user and get authentication token
  console.log('Setting up test user for content load testing...');
  
  const registerPayload = {
    username: 'contentloaduser',
    email: 'contentload@example.com',
    password: 'ContentLoad123!',
  };

  // Try to register user (might already exist)
  const registerResponse = http.post(
    `${AUTH_URL}/api/auth/register`,
    JSON.stringify(registerPayload),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  // Login to get token
  const loginPayload = {
    email: 'contentload@example.com',
    password: 'ContentLoad123!',
  };

  const loginResponse = http.post(
    `${AUTH_URL}/api/auth/login`,
    JSON.stringify(loginPayload),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (loginResponse.status === 200) {
    const body = JSON.parse(loginResponse.body);
    return { token: body.token };
  }

  throw new Error('Failed to setup test user');
}

export default function(data) {
  if (!data.token) {
    console.error('No authentication token available');
    return;
  }

  // Test content creation
  testContentCreation(data.token);
  sleep(1);

  // Test content listing with various filters
  testContentListing(data.token);
  sleep(1);

  // Test AI content generation
  testAIContentGeneration(data.token);
  sleep(1);

  // Test content updates
  testContentUpdate(data.token);
  sleep(1);

  // Test content analytics
  testContentAnalytics(data.token);
  sleep(1);

  // Test bulk operations
  testBulkOperations(data.token);
  sleep(2);
}

function testContentCreation(token) {
  const template = contentTemplates[Math.floor(Math.random() * contentTemplates.length)];
  const selectedPlatforms = platforms.slice(0, Math.floor(Math.random() * platforms.length) + 1);
  const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];

  const payload = {
    type: contentType,
    content: template,
    platforms: selectedPlatforms,
    scheduledFor: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Random time in next 7 days
    tags: ['loadtest', 'performance', 'automated'],
  };

  const response = http.post(
    `${BASE_URL}/api/content`,
    JSON.stringify(payload),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      tags: { name: 'create_content' },
    }
  );

  const result = check(response, {
    'content creation status is 201': (r) => r.status === 201,
    'content creation response has ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.content && body.content._id;
      } catch (e) {
        return false;
      }
    },
    'content creation response time < 1500ms': (r) => r.timings.duration < 1500,
  });

  errorRate.add(!result);

  if (response.status === 201) {
    try {
      const body = JSON.parse(response.body);
      return body.content._id;
    } catch (e) {
      return null;
    }
  }

  return null;
}

function testContentListing(token) {
  const filters = [
    '?status=draft',
    '?status=approved',
    '?platform=twitter',
    '?type=post',
    '?limit=20&page=1',
    '?sortBy=createdAt&sortOrder=desc',
  ];

  const filter = filters[Math.floor(Math.random() * filters.length)];

  const response = http.get(`${BASE_URL}/api/content${filter}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { name: 'list_content' },
  });

  const result = check(response, {
    'content listing status is 200': (r) => r.status === 200,
    'content listing response has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.content);
      } catch (e) {
        return false;
      }
    },
    'content listing response time < 800ms': (r) => r.timings.duration < 800,
  });

  errorRate.add(!result);
}

function testAIContentGeneration(token) {
  const topics = [
    'technology trends',
    'productivity tips',
    'marketing strategies',
    'customer success stories',
    'industry insights',
  ];

  const tones = ['professional', 'casual', 'enthusiastic', 'informative'];
  
  const topic = topics[Math.floor(Math.random() * topics.length)];
  const tone = tones[Math.floor(Math.random() * tones.length)];
  const targetPlatforms = platforms.slice(0, Math.floor(Math.random() * platforms.length) + 1);

  const payload = {
    topic: topic,
    tone: tone,
    platforms: targetPlatforms,
    maxLength: 280,
  };

  const response = http.post(
    `${BASE_URL}/api/content/ai-generate`,
    JSON.stringify(payload),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      tags: { name: 'ai_generate_content' },
    }
  );

  const result = check(response, {
    'AI generation status is 200': (r) => r.status === 200,
    'AI generation response has content': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.content && body.content.length > 0;
      } catch (e) {
        return false;
      }
    },
    'AI generation response time < 3000ms': (r) => r.timings.duration < 3000,
  });

  errorRate.add(!result);
}

function testContentUpdate(token) {
  // First, create content to update
  const contentId = testContentCreation(token);
  
  if (!contentId) {
    errorRate.add(true);
    return;
  }

  sleep(0.5);

  const updatePayload = {
    content: 'Updated content for load testing',
    status: 'approved',
    platforms: ['twitter', 'linkedin'],
  };

  const response = http.put(
    `${BASE_URL}/api/content/${contentId}`,
    JSON.stringify(updatePayload),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      tags: { name: 'update_content' },
    }
  );

  const result = check(response, {
    'content update status is 200': (r) => r.status === 200,
    'content update response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!result);
}

function testContentAnalytics(token) {
  const response = http.get(`${BASE_URL}/api/content/analytics`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { name: 'content_analytics' },
  });

  const result = check(response, {
    'analytics status is 200': (r) => r.status === 200,
    'analytics response has metrics': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.metrics !== undefined;
      } catch (e) {
        return false;
      }
    },
    'analytics response time < 1200ms': (r) => r.timings.duration < 1200,
  });

  errorRate.add(!result);
}

function testBulkOperations(token) {
  // Create multiple content items first
  const contentIds = [];
  for (let i = 0; i < 3; i++) {
    const id = testContentCreation(token);
    if (id) contentIds.push(id);
    sleep(0.2);
  }

  if (contentIds.length === 0) {
    errorRate.add(true);
    return;
  }

  // Test bulk approve
  const bulkPayload = {
    contentIds: contentIds,
    action: 'approve',
  };

  const response = http.post(
    `${BASE_URL}/api/content/bulk`,
    JSON.stringify(bulkPayload),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      tags: { name: 'bulk_operations' },
    }
  );

  const result = check(response, {
    'bulk operation status is 200': (r) => r.status === 200,
    'bulk operation response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  errorRate.add(!result);
}

export function teardown(data) {
  console.log('Content load test completed');
  // Cleanup could be performed here if needed
}
