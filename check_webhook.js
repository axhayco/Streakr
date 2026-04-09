const axios = require('axios');
(async () => {
  try {
    const res = await axios.get('https://api.telegram.org/bot8782375413:AAGFQ8OZhcLlVq2QCVYM2O6tRgu8vTrxiGs/getWebhookInfo');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(err.message);
  }
})();
