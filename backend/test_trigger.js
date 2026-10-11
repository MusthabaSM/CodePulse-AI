const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:4000/api/analysis/trigger', {
      url: 'https://github.com/expressjs/express',
      owner: 'expressjs',
      repo: 'express'
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}
test();
