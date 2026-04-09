/**
 * Taskflow Backend - Performance Validation Script
 * 
 * Usage:
 * 1. Install autocannon: npm install -g autocannon
 * 2. Run: node scripts/load-test.js <API_URL> <AUTH_TOKEN> <CONCURRENT_USERS>
 * 
 * Example:
 * node scripts/load-test.js http://localhost:9001 your_jwt_token 500
 */

const autocannon = require('autocannon');
const http = require('http');

const url = process.argv[2] || 'http://localhost:9001';
const token = process.argv[3];
const connections = parseInt(process.argv[4]) || 100;
const monitoringKey = process.env.MONITORING_API_KEY || 'tf_track_2024_secure_key_123';

if (!token) {
  console.error('Error: Please provide a JWT token as the second argument.');
  process.exit(1);
}

const config = {
  url: `${url}/tasks`,
  connections: connections,
  duration: 30, // 30 seconds
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  title: `Taskflow Load Test - ${connections} Users`
};

const healthStats = {
  maxEventLoopLag: 0,
  maxWaitingDbRequests: 0,
  maxRedisBacklog: 0,
  samples: []
};

function checkHealth() {
  const options = {
    headers: { 'x-api-key': monitoringKey }
  };
  
  http.get(`${url}/monitoring/status`, options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        healthStats.maxEventLoopLag = Math.max(healthStats.maxEventLoopLag, json.eventLoopLag.p99);
        healthStats.maxWaitingDbRequests = Math.max(healthStats.maxWaitingDbRequests, json.database.waitingRequests);
        healthStats.maxRedisBacklog = Math.max(healthStats.maxRedisBacklog, json.redis.backlog);
        healthStats.samples.push(json);
      } catch (e) {}
    });
  }).on('error', () => {});
}

console.log(`Starting Load Test on ${config.url}`);
console.log(`Concurrency: ${connections} concurrent users`);
console.log(`Duration: 30 seconds\n`);

// Start health monitoring poller
const healthPoller = setInterval(checkHealth, 5000);

const instance = autocannon(config, (err, result) => {
  clearInterval(healthPoller);
  if (err) {
    console.error('Test Failed:', err);
    return;
  }

  console.log('\n--- 🚀 Traffic Results ---');
  console.log(`Throughput: ${result.requests.average} req/sec`);
  console.log(`P50 Latency: ${result.latency.p50} ms`);
  console.log(`P95 Latency: ${result.latency.p95} ms`);
  console.log(`P99 Latency: ${result.latency.p99} ms`);
  console.log(`Error/Timeout Rate: ${((result.errors + result.timeouts) / result.requests.total * 100).toFixed(2)}%`);

  console.log('\n--- 🩺 System Health Summary (Observed during peak) ---');
  console.log(`Max Event Loop Lag: ${healthStats.maxEventLoopLag.toFixed(2)} ms`);
  console.log(`Max DB Pool Waiting: ${healthStats.maxWaitingDbRequests}`);
  console.log(`Max Redis Backlog: ${healthStats.maxRedisBacklog}`);
  
  if (healthStats.maxWaitingDbRequests > 0) {
    console.log('⚠️  ALERT: Database pool is saturating. Increase pool size or check for slow queries.');
  }
  if (healthStats.maxEventLoopLag > 50) {
    console.log('⚠️  ALERT: High Event Loop Lag detected. Check for CPU-blocking code.');
  }
});

autocannon.track(instance, { renderProgressBar: true });
