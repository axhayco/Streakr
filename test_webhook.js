const axios = require('axios');

async function testVercel() {
  try {
    const response = await axios.post('https://streakr-phi.vercel.app/api/webhook', {
      message: {
        chat: { id: "5035415227" },
        text: "axhayco_test"
      }
    });
    console.log("Status:", response.status);
    console.log("Data:", response.data);
  } catch (err) {
    console.error("Error Status:", err.response ? err.response.status : err.message);
    if (err.response) {
      console.error("Error Data:", err.response.data);
    }
  }
}

testVercel();
