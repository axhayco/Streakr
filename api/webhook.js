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
    if (text.startsWith('/start')) {
      await sendTelegram(
        TELEGRAM_TOKEN,
        chatId,
        "<b>Welcome to Streakr!</b> 🚀\n\nI'll remind you to solve your LeetCode problem if you haven't done it by your set time (Default: 8 PM IST).\n\n<b>Commands:</b>\n1. Reply with your <b>LeetCode username</b> to register.\n2. <code>/settime HH:MM</code> to change reminder time (e.g. <code>/settime 21:30</code>)"
      );
    } else if (text.startsWith('/settime')) {
      const timeMatch = text.match(/^(\/settime)\s+([01]\d|2[0-3]):([0-5]\d)$/);
      if (!timeMatch) {
        return await sendTelegram(
          TELEGRAM_TOKEN,
          chatId,
          `❌ <b>Invalid Format!</b> You sent: "${text}"\n\nPlease use <code>/settime HH:MM</code> (24-hour format, e.g., <code>/settime 21:00</code>).`
        );
      }
      const newTime = timeMatch[2] + ':' + timeMatch[3];

      const { error } = await supabase
        .from('users')
        .update({ reminder_time: newTime })
        .eq('telegram_chat_id', chatId);

      if (error) throw new Error(`DB error: ${error.message}`);

      await sendTelegram(
        TELEGRAM_TOKEN,
        chatId,
        `✅ <b>Time Updated!</b>\n\nYou'll now be nudged at <b>${newTime} IST</b> if you haven't solved a problem today.`
      );
    } else {
      // Assume Registration: could be just "username" or "username 21:00"
      const parts = text.split(/\s+/);
      const username = parts[0];
      let newTime = '20:00';

      if (parts.length > 1) {
        const timeMatch = parts[1].match(/^([01]\d|2[0-3]):([0-5]\d)$/);
        if (timeMatch) {
          newTime = parts[1];
        } else {
          return await sendTelegram(
            TELEGRAM_TOKEN,
            chatId,
            `❌ <b>Invalid Format!</b> You sent: "${text}"\n\nIf you want to set a time while registering, please use <code>username HH:MM</code> (24-hour format, e.g., <code>axhayco 21:00</code>).`
          );
        }
      }

      const { error } = await supabase
        .from('users')
        .upsert(
          { telegram_chat_id: chatId, leetcode_username: username, reminder_time: newTime },
          { onConflict: 'telegram_chat_id' }
        );

      if (error) {
        // Send the error message directly to the chat so they aren't met with silence
        await sendTelegram(
          TELEGRAM_TOKEN,
          chatId,
          `❌ <b>Database Error:</b> ${error.message}\n\nDid you forget to add the 'reminder_time' column to your Supabase table?`
        );
        throw new Error(`DB error: ${error.message}`);
      }

      await sendTelegram(
        TELEGRAM_TOKEN,
        chatId,
        `✅ <b>Registered!</b>\n\nNow tracking: <code>${username}</code>\n\nYou'll get a nudge at <b>${newTime} IST</b>. Use <code>/settime HH:MM</code> later if you ever want to change it! 💪`
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
