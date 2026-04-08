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
      console.log("Handling /start command...");
      await sendTelegram(TELEGRAM_TOKEN, chatId, "<b>Welcome to Streakr!</b> 🚀\n\nI'll check your LeetCode streak every night at 8 PM.\n\n<b>To Register:</b> Reply with JUST your LeetCode username.");
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

      await sendTelegram(TELEGRAM_TOKEN, chatId, `✅ <b>Successfully Registered!</b>\n\nI am now tracking: <code>${text}</code>\n\nYou'll get a reminder at 8:00 PM IST if you haven't solved a problem today.`);
    }

    return res.status(200).json({ status: 'success' });

  } catch (err) {
    console.error("Execution Error:", err.message);
    await sendTelegram(TELEGRAM_TOKEN, chatId, `❌ <b>Registration Error:</b> ${err.message}`);
    return res.status(200).json({ status: 'error', message: err.message });
  }
};

async function sendTelegram(token, chatId, text) {
  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    });
  } catch (err) {
    console.error("Telegram Send Error:", err.response ? JSON.stringify(err.response.data) : err.message);
  }
}
