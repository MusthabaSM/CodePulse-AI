const fetch = require('node-fetch');

async function run() {
  const payload = { name: 'VerifiedOrg', industry: 'verified-industry' };
  console.log("SENDING PATCH /api/settings/organization");
  const res = await fetch('http://localhost:4000/api/settings/organization', {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  console.log("STATUS:", res.status);
  const text = await res.text();
  console.log("RESPONSE:", text);
}

run();
