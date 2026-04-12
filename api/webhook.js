const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

module.exports = async (req, res) => {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  console.log(`--- Webhook Request: ${req.method} ---`);

  // Health check
  if (req.method !== 'POST') {
    return res.status(200).send('Streakr Bot is Online 🚀');
  }

  const message = req.body?.message;
  if (!message || !message.text) {
    console.log('No message or text found, ignoring.');
    return res.status(200).json({ status: 'ignored' });
  }

  const chatId = message.chat.id.toString();
  const text = message.text.trim();

  console.log(`Incoming message from ${chatId}: "${text}"`);

  if (!TELEGRAM_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('CRITICAL: Missing environment variables!');
    return res.status(500).json({ error: 'Server configuration missing' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    if (text === '/start') {
      await sendTelegram(
        TELEGRAM_TOKEN,
        chatId,
        "<b>Welcome to Streakr!</b> 🚀\n\nI'll remind you every night if you haven't solved a LeetCode problem.\n\n<b>To register:</b> Reply with JUST your LeetCode username (e.g., <code>axhayco</code>)."
      );
    } else if (text.startsWith('/')) {
        await sendTelegram(TELEGRAM_TOKEN, chatId, "Unknown command. Just send your LeetCode username to register.");
    } else {
      console.log(`Registering/Updating user: ${text} for chat: ${chatId}`);
      
      const { data, error } = await supabase
        .from('users')
        .upsert(
          { telegram_chat_id: chatId, leetcode_username: text, reminder_time: '20:00' },
          { onConflict: 'telegram_chat_id' }
        )
        .select();

      if (error) {
        console.error('Supabase error:', error.message);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('Upsert successful:', data);

      await sendTelegram(
        TELEGRAM_TOKEN,
        chatId,
        `✅ <b>Registered!</b>\n\nNow tracking: <code>${text}</code>\n\nYou'll get a nudge before night if you haven't solved a problem today. Good luck! 💪`
      );
    }

    return res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('Webhook Runtime Error:', err.message);
    
    // Attempt to notify user of failure if possible
    try {
        await sendTelegram(TELEGRAM_TOKEN, chatId, "⚠️ Sorry, there was an error processing your request. Please try again later.");
    } catch (sendErr) {
        console.error('Failed to send error notification:', sendErr.message);
    }

    return res.status(200).json({ status: 'error', message: err.message });
  }
};

async function sendTelegram(token, chatId, text) {
  try {
    const res = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
    console.log(`Telegram response for ${chatId}: ${res.status}`);
  } catch (err) {
    console.error(`Telegram send error [${chatId}]:`, err.response?.data || err.message);
    throw err; // Re-throw to be caught by the main handler
  }
}
