// =============================================================================
// k6 Load Test — MVP Performance API
// =============================================================================
// Usage:
//   k6 run load-test.js                    # Default load test
//   k6 run --vus 100 --duration 5m load-test.js  # Custom params
//   docker compose --profile loadtest up    # Via Docker Compose
// =============================================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const productLatency = new Trend('product_latency', true);
const orderLatency = new Trend('order_latency', true);
const statsLatency = new Trend('stats_latency', true);
const cachedRequests = new Counter('cached_requests');

// Test configuration
export const options = {
  stages: [
    // Ramp-up
    { duration: '30s', target: 10 },   // Warm up
    { duration: '1m',  target: 50 },   // Ramp to 50 VUs
    { duration: '3m',  target: 50 },   // Hold at 50 VUs (steady state)
    { duration: '1m',  target: 100 },  // Ramp to 100 VUs (stress)
    { duration: '2m',  target: 100 },  // Hold at 100 VUs
    { duration: '30s', target: 0 },    // Ramp down
  ],

  thresholds: {
    // SLA requirements
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // p95 < 500ms, p99 < 1s
    errors: ['rate<0.01'],                             // Error rate < 1%
    http_req_failed: ['rate<0.01'],                    // HTTP failure rate < 1%
    product_latency: ['p(95)<300'],                    // Product endpoint p95 < 300ms
    order_latency: ['p(95)<800'],                      // Order endpoint p95 < 800ms
    stats_latency: ['p(95)<200'],                      // Stats endpoint p95 < 200ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://nginx:80';

export default function () {
  // Simulate real user behavior with weighted API calls
  const random = Math.random();

  if (random < 0.30) {
    // 30% — Browse products (most common)
    browseProducts();
  } else if (random < 0.50) {
    // 20% — View specific product (cached)
    viewProduct();
  } else if (random < 0.70) {
    // 20% — List orders
    listOrders();
  } else if (random < 0.85) {
    // 15% — View specific order
    viewOrder();
  } else {
    // 15% — Dashboard stats
    viewStats();
  }

  // Think time: simulate real user pauses between actions
  sleep(Math.random() * 2 + 0.5);  // 0.5-2.5 seconds
}

function browseProducts() {
  group('Browse Products', function () {
    const page = Math.ceil(Math.random() * 10);
    const categories = ['Electronics', 'Clothing', 'Books', 'Food', 'Tools'];
    const category = categories[Math.floor(Math.random() * categories.length)];

    const res = http.get(
      `${BASE_URL}/api/products?page=${page}&limit=20&category=${category}`,
      { tags: { endpoint: 'products-list' } }
    );

    const success = check(res, {
      'products: status 200': (r) => r.status === 200,
      'products: has data': (r) => {
        const body = r.json();
        return body && body.data && body.data.length > 0;
      },
      'products: has pagination': (r) => {
        const body = r.json();
        return body && body.pagination && body.pagination.total > 0;
      },
    });

    productLatency.add(res.timings.duration);
    errorRate.add(!success);
  });
}

function viewProduct() {
  group('View Product', function () {
    const productId = Math.ceil(Math.random() * 500);
    const res = http.get(
      `${BASE_URL}/api/products/${productId}`,
      { tags: { endpoint: 'product-detail' } }
    );

    const success = check(res, {
      'product: status 200': (r) => r.status === 200,
      'product: has name': (r) => {
        const body = r.json();
        return body && body.name;
      },
    });

    // Track if response came from cache (fast response = likely cached)
    if (res.timings.duration < 10) {
      cachedRequests.add(1);
    }

    productLatency.add(res.timings.duration);
    errorRate.add(!success);
  });
}

function listOrders() {
  group('List Orders', function () {
    const page = Math.ceil(Math.random() * 20);
    const statuses = ['pending', 'processing', 'completed', ''];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    let url = `${BASE_URL}/api/orders?page=${page}&limit=20`;
    if (status) url += `&status=${status}`;

    const res = http.get(url, { tags: { endpoint: 'orders-list' } });

    const success = check(res, {
      'orders: status 200': (r) => r.status === 200,
      'orders: has data': (r) => {
        const body = r.json();
        return body && body.data;
      },
    });

    orderLatency.add(res.timings.duration);
    errorRate.add(!success);
  });
}

function viewOrder() {
  group('View Order', function () {
    const orderId = Math.ceil(Math.random() * 1000);
    const res = http.get(
      `${BASE_URL}/api/orders/${orderId}`,
      { tags: { endpoint: 'order-detail' } }
    );

    const success = check(res, {
      'order: status 200 or 404': (r) => r.status === 200 || r.status === 404,
    });

    orderLatency.add(res.timings.duration);
    errorRate.add(!success);
  });
}

function viewStats() {
  group('Dashboard Stats', function () {
    const res = http.get(
      `${BASE_URL}/api/stats`,
      { tags: { endpoint: 'stats' } }
    );

    const success = check(res, {
      'stats: status 200': (r) => r.status === 200,
      'stats: has product count': (r) => {
        const body = r.json();
        return body && body.products > 0;
      },
    });

    statsLatency.add(res.timings.duration);
    errorRate.add(!success);
  });
}

// =============================================================================
// SUMMARY
// =============================================================================
export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] || 'N/A';
  const p99 = data.metrics.http_req_duration?.values?.['p(99)'] || 'N/A';
  const avgDuration = data.metrics.http_req_duration?.values?.avg || 'N/A';
  const totalRequests = data.metrics.http_reqs?.values?.count || 0;
  const rps = data.metrics.http_reqs?.values?.rate || 0;
  const errors = data.metrics.errors?.values?.rate || 0;

  console.log('\n' + '='.repeat(60));
  console.log('  MVP PERFORMANCE TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`  Total Requests:  ${totalRequests}`);
  console.log(`  RPS:             ${rps.toFixed(1)}`);
  console.log(`  Avg Latency:     ${avgDuration.toFixed(1)}ms`);
  console.log(`  P95 Latency:     ${p95.toFixed(1)}ms`);
  console.log(`  P99 Latency:     ${p99.toFixed(1)}ms`);
  console.log(`  Error Rate:      ${(errors * 100).toFixed(2)}%`);
  console.log('='.repeat(60) + '\n');

  return {};
}
