const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

module.exports = async (req, res) => {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  // Health check — GET request means the endpoint is alive
  if (req.method !== 'POST') {
    return res.status(200).send('Streakr Bot is Online 🚀');
  }

  const message = req.body?.message;
  if (!message || !message.text) {
    return res.status(200).json({ status: 'ignored' });
  }

  const chatId = message.chat.id.toString();
  const text = message.text.trim();

  if (!TELEGRAM_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('CRITICAL: Missing environment variables in Vercel!');
    return res.status(200).json({ error: 'Config missing' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    if (text === '/start') {
      await sendTelegram(
        TELEGRAM_TOKEN,
        chatId,
        "<b>Welcome to Streakr!</b> 🚀\n\nI'll remind you every night at 8 PM IST if you haven't solved a LeetCode problem.\n\n<b>To register:</b> Reply with just your LeetCode username."
      );
    } else {
      const { error } = await supabase
        .from('users')
        .upsert(
          { telegram_chat_id: chatId, leetcode_username: text },
          { onConflict: 'telegram_chat_id' }
        );

      if (error) throw new Error(`DB error: ${error.message}`);

      await sendTelegram(
        TELEGRAM_TOKEN,
        chatId,
        `✅ <b>Registered!</b>\n\nNow tracking: <code>${text}</code>\n\nYou'll get a nudge at 8:00 PM IST if you haven't solved a problem today. Good luck! 💪`
      );
    }

    return res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(200).json({ status: 'error', message: err.message });
  }
};

async function sendTelegram(token, chatId, text) {
  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
  } catch (err) {
    console.error('Telegram send error:', err.response?.data || err.message);
  }
}
