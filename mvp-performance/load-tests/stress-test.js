// =============================================================================
// k6 Stress Test — Find the breaking point
// =============================================================================
// Usage: k6 run stress-test.js
// Expected duration: ~15 minutes
// Purpose: Determine maximum throughput before degradation
// =============================================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m',  target: 50 },    // Warm up
    { duration: '2m',  target: 100 },   // Normal load
    { duration: '2m',  target: 200 },   // High load
    { duration: '2m',  target: 300 },   // Very high load
    { duration: '2m',  target: 500 },   // Extreme load
    { duration: '2m',  target: 500 },   // Hold extreme
    { duration: '2m',  target: 200 },   // Scale back
    { duration: '1m',  target: 0 },     // Ramp down
  ],

  thresholds: {
    // Stress test: we expect some degradation but no crashes
    http_req_failed: ['rate<0.10'],      // Allow up to 10% failure
    errors: ['rate<0.10'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://nginx:80';

export default function () {
  const endpoints = [
    `${BASE_URL}/api/products?page=${Math.ceil(Math.random() * 25)}&limit=20`,
    `${BASE_URL}/api/products/${Math.ceil(Math.random() * 500)}`,
    `${BASE_URL}/api/orders?page=${Math.ceil(Math.random() * 50)}&limit=20`,
    `${BASE_URL}/api/orders/${Math.ceil(Math.random() * 1000)}`,
    `${BASE_URL}/api/stats`,
    `${BASE_URL}/api/customers?page=${Math.ceil(Math.random() * 10)}&limit=20`,
  ];

  const url = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(url);

  const success = check(res, {
    'status is 2xx or 404': (r) => r.status >= 200 && r.status < 500,
  });

  errorRate.add(!success);
  sleep(Math.random() * 0.5);  // Minimal think time for maximum stress
}
