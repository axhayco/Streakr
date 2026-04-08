const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Vercel automatically injects the variables you added to the dashboard
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

module.exports = async (req, res) => {
  console.log("--- WEBHOOK REQUEST RECEIVED ---");
  
  if (req.method !== 'POST') {
    return res.status(200).send('Streakr Bot is Online 🚀');
  }

  const message = req.body.message;
  if (!message || !message.text) {
    console.log("No valid message or text in body:", req.body);
    return res.status(200).send('ok');
  }

  const chatId = message.chat.id.toString();
  const userInput = message.text.trim();
  console.log(`Received text: "${userInput}" from chatId: ${chatId}`);

  try {
    if (userInput === '/start') {
      console.log("Handling /start command...");
      await sendTelegram(chatId, "Welcome to Streakr! 🚀\n\nReply with your LeetCode username to start tracking.");
    } else {
      console.log(`Attempting to upsert user ${userInput} into Supabase...`);
      // Save or Update user in Supabase
      const { data, error } = await supabase
        .from('users')
        .upsert({ 
          telegram_chat_id: chatId, 
          leetcode_username: userInput 
        }, { onConflict: 'telegram_chat_id' });

      if (error) {
        console.error("Supabase Error:", error.message);
        throw error;
      }
      
      console.log("Supabase upsert successful.");
      await sendTelegram(chatId, `✅ Registered! I'm now tracking: ${userInput}\n\nYou'll get a reminder at 8 PM IST if you haven't solved a problem.`);
    }
  } catch (err) {
    console.error("Webhook Execution Error:", err.message);
    // Be careful with recursive errors here if credentials are bad
    try {
      await sendTelegram(chatId, "❌ Error saving to database. Check your Supabase RLS policies and environment variables.");
    } catch (sendErr) {
      console.error("Failed to even send error message via Telegram:", sendErr.message);
    }
  }

  return res.status(200).json({ status: 'ok' });
};

async function sendTelegram(chatId, text) {
  return axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    chat_id: chatId,
    text: text
  });
}
