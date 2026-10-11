const http = require('http');

const data = JSON.stringify({
  repoId: 'b11c8310-d573-43e7-b014-8e7ec26c6045',
  messages: [{ role: 'user', content: 'what repository' }]
});

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/consultant/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);

  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
