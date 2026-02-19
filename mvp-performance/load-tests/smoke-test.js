// =============================================================================
// k6 Smoke Test — Quick health validation (for CI/CD per-PR gate)
// =============================================================================
// Usage: k6 run smoke-test.js
// Expected duration: ~30 seconds
// =============================================================================

import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://nginx:80';

export default function () {
  // Health check
  const health = http.get(`${BASE_URL}/healthz/live`);
  check(health, { 'health: status 200': (r) => r.status === 200 });

  // Products list
  const products = http.get(`${BASE_URL}/api/products?page=1&limit=5`);
  check(products, {
    'products: status 200': (r) => r.status === 200,
    'products: has data': (r) => r.json().data.length > 0,
  });

  // Product detail
  const product = http.get(`${BASE_URL}/api/products/1`);
  check(product, { 'product: status 200': (r) => r.status === 200 });

  // Orders list
  const orders = http.get(`${BASE_URL}/api/orders?page=1&limit=5`);
  check(orders, { 'orders: status 200': (r) => r.status === 200 });

  // Stats
  const stats = http.get(`${BASE_URL}/api/stats`);
  check(stats, {
    'stats: status 200': (r) => r.status === 200,
    'stats: has products': (r) => r.json().products > 0,
  });
}
