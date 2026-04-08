const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Vercel automatically injects the variables you added to the dashboard
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

module.exports = async (req, res) => {
  // Only allow POST requests from Telegram
  if (req.method !== 'POST') {
    return res.status(200).send('Streakr Bot is Online 🚀');
  }

  const message = req.body.message;
  if (!message || !message.text) return res.status(200).send('ok');

  const chatId = message.chat.id.toString();
  const userInput = message.text.trim();

  try {
    if (userInput === '/start') {
      await sendTelegram(chatId, "Welcome to Streakr! 🚀\n\nReply with your LeetCode username to start tracking.");
    } else {
      // Save or Update user in Supabase
      const { error } = await supabase
        .from('users')
        .upsert({ 
          telegram_chat_id: chatId, 
          leetcode_username: userInput 
        }, { onConflict: 'telegram_chat_id' });

      if (error) throw error;

      await sendTelegram(chatId, `✅ Registered! I'm now tracking: ${userInput}\n\nYou'll get a reminder at 8 PM IST if you haven't solved a problem.`);
    }
  } catch (err) {
    console.error("Webhook Error:", err.message);
    await sendTelegram(chatId, "❌ Database error. Make sure your RLS policies are off!");
  }

  return res.status(200).json({ status: 'ok' });
};

async function sendTelegram(chatId, text) {
  return axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    chat_id: chatId,
    text: text
  });
}
