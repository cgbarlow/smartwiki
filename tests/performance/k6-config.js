import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');
export let responseTimeTrend = new Trend('response_time');

// Test configuration
export let options = {
  stages: [
    // Ramp up
    { duration: '30s', target: 10 },  // 10 users for 30s
    { duration: '1m', target: 20 },   // 20 users for 1m
    { duration: '2m', target: 50 },   // 50 users for 2m
    // Peak load
    { duration: '5m', target: 100 },  // 100 users for 5m
    // Ramp down
    { duration: '2m', target: 20 },   // Back to 20 users
    { duration: '1m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    // 95% of requests should complete within 2s
    http_req_duration: ['p(95)<2000'],
    // 99% of requests should complete within 5s
    'http_req_duration{expected_response:true}': ['p(99)<5000'],
    // Error rate should be less than 1%
    http_req_failed: ['rate<0.01'],
    // Custom thresholds
    errors: ['rate<0.1'],
    response_time: ['p(95)<2000'],
  },
};

// Base configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api`;

// Test data
const testUsers = [
  { email: 'test1@example.com', password: 'password123' },
  { email: 'test2@example.com', password: 'password123' },
  { email: 'test3@example.com', password: 'password123' },
];

// Authentication helper
function authenticate() {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  const loginRes = http.post(`${API_BASE}/auth/login`, {
    email: user.email,
    password: user.password,
  }, {
    headers: { 'Content-Type': 'application/json' },
  });

  const success = check(loginRes, {
    'login successful': (r) => r.status === 200,
    'token received': (r) => r.json('token') !== undefined,
  });

  if (!success) {
    errorRate.add(1);
    return null;
  }

  return loginRes.json('token');
}

// Main test scenarios
export default function () {
  // Authenticate user
  const token = authenticate();
  if (!token) {
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Scenario 1: Browse documents (70% of traffic)
  if (Math.random() < 0.7) {
    testBrowseDocuments(headers);
  }
  // Scenario 2: Create/edit documents (20% of traffic)
  else if (Math.random() < 0.9) {
    testCreateDocument(headers);
  }
  // Scenario 3: Search functionality (10% of traffic)
  else {
    testSearchDocuments(headers);
  }

  sleep(1); // Think time between requests
}

function testBrowseDocuments(headers) {
  const startTime = Date.now();

  // Get document list
  const listRes = http.get(`${API_BASE}/documents?page=1&limit=20`, { headers });
  
  const listSuccess = check(listRes, {
    'document list loaded': (r) => r.status === 200,
    'response time < 1s': (r) => r.timings.duration < 1000,
  });

  if (!listSuccess) {
    errorRate.add(1);
    return;
  }

  const documents = listRes.json('data') || [];
  
  if (documents.length > 0) {
    // View a random document
    const randomDoc = documents[Math.floor(Math.random() * documents.length)];
    const docRes = http.get(`${API_BASE}/documents/${randomDoc.id}`, { headers });
    
    check(docRes, {
      'document loaded': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });
  }

  const totalTime = Date.now() - startTime;
  responseTimeTrend.add(totalTime);
}

function testCreateDocument(headers) {
  const startTime = Date.now();

  const newDocument = {
    title: `Performance Test Document ${Date.now()}`,
    content: `# Test Document\n\nThis is a performance test document created at ${new Date().toISOString()}`,
    tags: ['performance', 'test', 'k6'],
    category: 'testing',
    isPublic: false,
  };

  const createRes = http.post(`${API_BASE}/documents`, JSON.stringify(newDocument), { headers });
  
  const success = check(createRes, {
    'document created': (r) => r.status === 201,
    'response time < 2s': (r) => r.timings.duration < 2000,
    'document has ID': (r) => r.json('data.id') !== undefined,
  });

  if (!success) {
    errorRate.add(1);
    return;
  }

  const documentId = createRes.json('data.id');

  // Update the document
  const updateData = {
    title: `Updated ${newDocument.title}`,
    content: `${newDocument.content}\n\n## Updated\nThis document was updated during performance testing.`,
  };

  const updateRes = http.put(`${API_BASE}/documents/${documentId}`, JSON.stringify(updateData), { headers });
  
  check(updateRes, {
    'document updated': (r) => r.status === 200,
    'response time < 1.5s': (r) => r.timings.duration < 1500,
  });

  const totalTime = Date.now() - startTime;
  responseTimeTrend.add(totalTime);
}

function testSearchDocuments(headers) {
  const startTime = Date.now();

  const searchTerms = ['test', 'document', 'content', 'performance', 'wiki'];
  const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

  const searchRes = http.get(`${API_BASE}/documents?search=${randomTerm}`, { headers });
  
  const success = check(searchRes, {
    'search completed': (r) => r.status === 200,
    'response time < 1s': (r) => r.timings.duration < 1000,
    'results returned': (r) => r.json('data') !== undefined,
  });

  if (!success) {
    errorRate.add(1);
  }

  const totalTime = Date.now() - startTime;
  responseTimeTrend.add(totalTime);
}

// Setup function
export function setup() {
  console.log('🚀 Starting SmartWiki performance tests...');
  console.log(`📊 Target: ${BASE_URL}`);
  console.log(`👥 Users: ${testUsers.length} test accounts`);
  return { startTime: Date.now() };
}

// Teardown function
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`✅ Performance tests completed in ${duration}s`);
}