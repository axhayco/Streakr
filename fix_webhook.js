require('dotenv').config();
const axios = require('axios');

// Token now comes from an environment variable instead of being hardcoded.
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const WEBHOOK_URL = 'https://streakr-phi.vercel.app/api/webhook'; // Clean URL

if (!TELEGRAM_TOKEN) {
    console.error('❌ Missing TELEGRAM_TOKEN environment variable.');
    console.error('   Create a .env file locally with TELEGRAM_TOKEN=... or set it as a GitHub Secret.');
    process.exit(1);
}

(async () => {
  try {
    const res = await axios.get(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`, {
      params: { url: WEBHOOK_URL }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(err.message);
  }
})();
