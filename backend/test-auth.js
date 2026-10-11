const { createClerkClient } = require('@clerk/backend');
const clerk = createClerkClient({ secretKey: 'sk_test_tcEYsxPVgaiIQaMsb9S9aMhe1tOtldpNGGbeHxURjx' });
async function run() {
  try {
    const token = await clerk.tokens.createSignInToken({ userId: 'user_123' });
    console.log("TOKEN:", token.token);
  } catch (e) {
    console.error(e);
  }
}
run();
