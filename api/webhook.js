const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

module.exports = async (req, res) => {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  console.log("--- WEBHOOK TRIGGERED ---");

  // 1. Health Check
  if (req.method !== 'POST') {
    return res.status(200).send('Streakr Webhook is Active 🚀');
  }

  // 2. Body Validation
  const message = req.body && req.body.message;
  if (!message || !message.text) {
    console.log("Empty or invalid body received. Ignoring.");
    return res.status(200).json({ status: 'ignored' });
  }

  const chatId = message.chat.id.toString();
  const text = message.text.trim();
  console.log(`Received: "${text}" from ${chatId}`);

  // 3. Environment Variable Check
  if (!TELEGRAM_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error("CRITICAL: Missing Environment Variables in Vercel!");
    return res.status(200).json({ error: 'Config missing' }); 
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    if (text === '/start') {
      await sendTelegram(TELEGRAM_TOKEN, chatId, "Yooo! Welcome to Streakr! 🚀\n\nI'll roast you every night at 8 PM if you haven't done your LeetCode.\n\n**Reply with your LeetCode username** to register!");
    } else {
      console.log(`Registering ${text}...`);
      
      const { error } = await supabase
        .from('users')
        .upsert({ 
          telegram_chat_id: chatId, 
          leetcode_username: text 
        }, { onConflict: 'telegram_chat_id' });

      if (error) {
        console.error("Supabase Error:", error.message);
        throw new Error(`Database Error: ${error.message}`);
      }

      await sendTelegram(TELEGRAM_TOKEN, chatId, `✅ Got it! I'm now tracking: **${text}**\n\nI'll check your streak every day at 8:00 PM IST. Stay consistent! 🏃‍♂️💨`);
    }

    return res.status(200).json({ status: 'success' });

  } catch (err) {
    console.error("Execution Error:", err.message);
    await sendTelegram(TELEGRAM_TOKEN, chatId, `❌ Error: ${err.message}\n\nHint: Check if your Supabase RLS policies are disabled!`);
    return res.status(200).json({ status: 'error', message: err.message });
  }
};

async function sendTelegram(token, chatId, text) {
  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    });
  } catch (err) {
    console.error("Telegram Send Error:", err.response ? err.response.data : err.message);
  }
}
