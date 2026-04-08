require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

// 1. Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY in environment.");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Initialize Telegram Bot (polling mode for interactive bot)
const token = process.env.TELEGRAM_TOKEN;
if (!token) {
  console.error("Missing TELEGRAM_TOKEN in environment.");
  process.exit(1);
}
const bot = new TelegramBot(token, { polling: true });

console.log("LeetCode Bot is running! Waiting for messages...");

// 3. User State Tracking (Temporary memory for onboarding)
const userStates = {};

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  // Handle /start command
  if (text === '/start') {
    bot.sendMessage(chatId, "Welcome to Streakr! 🚀\n\nWhat is your LeetCode username?");
    userStates[chatId] = 'WAITING_FOR_USERNAME';
    return;
  }

  // Handle registration flow
  if (userStates[chatId] === 'WAITING_FOR_USERNAME') {
    const username = text;
    
    // Save to Database
    const { data, error } = await supabase
      .from('users')
      .upsert([
        { telegram_chat_id: chatId.toString(), leetcode_username: username }
      ], { onConflict: 'telegram_chat_id' });

    if (error) {
      console.error("Error inserting to Supabase:", error);
      bot.sendMessage(chatId, "⚠️ Oops, encountered a database error. Please try again later.");
    } else {
      bot.sendMessage(chatId, `✅ Successfully registered! I will track the LeetCode streak for *${username}* and remind you every day at 8 PM IST.`, { parse_mode: "Markdown" });
      delete userStates[chatId]; // Clear the state
    }
  }
});
