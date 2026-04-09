const webhook = require('./api/webhook.js');

const req = {
  method: 'POST',
  body: {
    message: {
      chat: { id: 5035415227 },
      text: '/start'
    }
  }
};

const res = {
  status: (code) => ({
    send: (msg) => console.log(`Status ${code}: ${msg}`),
    json: (obj) => console.log(`Status ${code}:`, JSON.stringify(obj, null, 2))
  })
};

// Set env vars for the test
process.env.TELEGRAM_TOKEN = '8782375413:AAGFQ8OZhcLlVq2QCVYM2O6tRgu8vTrxiGs';
process.env.SUPABASE_URL = 'https://twmusbvqxjwohfnmgfnr.supabase.co';
process.env.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bXVzYnZxeGp3b2hmbm1nZm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTU0ODEsImV4cCI6MjA5MTIzMTQ4MX0.RnsCK_Qmz25zn-ZpsiQBEnfFRTRq0YrvW7SyWs7IwBY';

webhook(req, res).then(() => {
  console.log('Webhook test completed.');
});
