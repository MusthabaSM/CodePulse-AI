const http = require('http');

const payload = JSON.stringify({
  messages: [{ role: 'user', content: 'Say hello world' }],
  model: 'gemini-2.5-flash',
  provider: 'gemini',
  organizationId: 'test-org-id'
});

const req = http.request({
  hostname: 'localhost',
  port: 4000,
  path: '/api/consultant/chat',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer test-token',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", body);
  });
});

req.on('error', console.error);
req.write(payload);
req.end();
