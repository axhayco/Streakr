require('dotenv').config();
const axios = require('axios');

// Token/secret now come from environment variables instead of being hardcoded.
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET; // must match Vercel env var of the same name


if (!TELEGRAM_TOKEN) {
    console.error('❌ Missing TELEGRAM_TOKEN environment variable.');
    process.exit(1);
}
if (!WEBHOOK_SECRET) {
    console.error('❌ Missing TELEGRAM_WEBHOOK_SECRET environment variable.');
    console.error('   Generate a long random string (e.g. `openssl rand -hex 32`),');
    console.error('   put it in your .env AND in Vercel\'s env vars, then re-run this script.');
    process.exit(1);
}

(async () => {
  try {
    const res = await axios.get(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`, {
      params: {
        url: WEBHOOK_URL,
        secret_token: WEBHOOK_SECRET, // Telegram will echo this back on every request
      }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(err.message);
  }
})();
