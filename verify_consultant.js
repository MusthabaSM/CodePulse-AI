// Using native fetch in Node 24

async function run() {
  const repoId = 'b11c8310-d573-43e7-b014-8e7ec26c6045'; // Decentralized-Voting-System

  console.log("=== Testing Repository Mode ===");
  const repoRes = await fetch('http://localhost:4000/api/consultant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repoId,
      messages: [{ role: 'user', content: 'What repository are you analyzing?' }]
    })
  });
  console.log(await repoRes.text());

  console.log("\n=== Testing Organization Mode ===");
  const orgRes = await fetch('http://localhost:4000/api/consultant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationId: 'frontend-triggered',
      messages: [{ role: 'user', content: 'Which repository is highest risk?' }]
    })
  });
  console.log(await orgRes.text());
}

run();
