import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 50 }, // Ramp up to 50 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '5m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.05'],   // Error rate should be less than 5%
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// Test data
const users = [
  { email: 'loadtest1@example.com', password: 'LoadTest123!' },
  { email: 'loadtest2@example.com', password: 'LoadTest123!' },
  { email: 'loadtest3@example.com', password: 'LoadTest123!' },
  { email: 'loadtest4@example.com', password: 'LoadTest123!' },
  { email: 'loadtest5@example.com', password: 'LoadTest123!' },
];

export function setup() {
  // Create test users for load testing
  console.log('Setting up test users...');
  
  users.forEach((user, index) => {
    const payload = {
      username: `loadtestuser${index + 1}`,
      email: user.email,
      password: user.password,
    };

    const response = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status !== 201 && response.status !== 409) { // 409 = user already exists
      console.error(`Failed to create user ${user.email}: ${response.status}`);
    }
  });

  return { users };
}

export default function(data) {
  // Select random user for this iteration
  const user = data.users[Math.floor(Math.random() * data.users.length)];

  // Test user registration (new users)
  testUserRegistration();
  sleep(1);

  // Test user login
  const token = testUserLogin(user);
  sleep(1);

  if (token) {
    // Test token validation
    testTokenValidation(token);
    sleep(1);

    // Test user profile retrieval
    testUserProfile(token);
    sleep(1);

    // Test token refresh
    testTokenRefresh(token);
    sleep(1);

    // Test logout
    testUserLogout(token);
  }

  sleep(1);
}

function testUserRegistration() {
  const timestamp = Date.now();
  const payload = {
    username: `testuser${timestamp}`,
    email: `test${timestamp}@example.com`,
    password: 'TestPassword123!',
  };

  const response = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify(payload),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'register' },
    }
  );

  const result = check(response, {
    'registration status is 201': (r) => r.status === 201,
    'registration response has token': (r) => {
      const body = JSON.parse(r.body);
      return body.token !== undefined;
    },
    'registration response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!result);
}

function testUserLogin(user) {
  const payload = {
    email: user.email,
    password: user.password,
  };

  const response = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify(payload),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' },
    }
  );

  const result = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login response has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token !== undefined;
      } catch (e) {
        return false;
      }
    },
    'login response time < 800ms': (r) => r.timings.duration < 800,
  });

  errorRate.add(!result);

  if (response.status === 200) {
    try {
      const body = JSON.parse(response.body);
      return body.token;
    } catch (e) {
      return null;
    }
  }

  return null;
}

function testTokenValidation(token) {
  const response = http.get(`${BASE_URL}/api/auth/validate`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { name: 'validate_token' },
  });

  const result = check(response, {
    'token validation status is 200': (r) => r.status === 200,
    'token validation response time < 300ms': (r) => r.timings.duration < 300,
  });

  errorRate.add(!result);
}

function testUserProfile(token) {
  const response = http.get(`${BASE_URL}/api/auth/profile`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { name: 'get_profile' },
  });

  const result = check(response, {
    'profile status is 200': (r) => r.status === 200,
    'profile response has user data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.user && body.user.email;
      } catch (e) {
        return false;
      }
    },
    'profile response time < 400ms': (r) => r.timings.duration < 400,
  });

  errorRate.add(!result);
}

function testTokenRefresh(token) {
  const response = http.post(
    `${BASE_URL}/api/auth/refresh`,
    null,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      tags: { name: 'refresh_token' },
    }
  );

  const result = check(response, {
    'token refresh status is 200': (r) => r.status === 200,
    'token refresh response has new token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token !== undefined;
      } catch (e) {
        return false;
      }
    },
    'token refresh response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!result);
}

function testUserLogout(token) {
  const response = http.post(
    `${BASE_URL}/api/auth/logout`,
    null,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      tags: { name: 'logout' },
    }
  );

  const result = check(response, {
    'logout status is 200': (r) => r.status === 200,
    'logout response time < 300ms': (r) => r.timings.duration < 300,
  });

  errorRate.add(!result);
}

export function teardown(data) {
  console.log('Cleaning up test data...');
  // In a real scenario, you might want to clean up the test users
  // However, for load testing, it's often better to keep them for subsequent runs
}
