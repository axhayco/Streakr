const axios = require('axios');
const token = '8782375413:AAGFQ8OZhcLlVq2QCVYM2O6tRgu8vTrxiGs';
const url = 'https://streakr-phi.vercel.app/api/webhook'; // Clean URL

(async () => {
  try {
    const res = await axios.get(`https://api.telegram.org/bot${token}/setWebhook?url=${url}`);
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(err.message);
  }
})();
