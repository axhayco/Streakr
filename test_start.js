const axios = require('axios');

async function triggerStart() {
  try {
    const response = await axios.post('https://streakr-phi.vercel.app/api/webhook', {
      message: {
        chat: { id: "5035415227" },
        text: "/start"
      }
    });
    console.log("Status:", response.status);
    console.log("Data:", response.data);
  } catch (err) {
    console.error("Error Status:", err.response ? err.response.status : err.message);
  }
}

triggerStart();
