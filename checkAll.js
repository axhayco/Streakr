require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!TELEGRAM_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing required environment variables! (TELEGRAM_TOKEN, SUPABASE_URL, or SUPABASE_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkLeetCode(username) {
  const query = `
    query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        timestamp
      }
    }`;

  try {
    const response = await axios.post(
      'https://leetcode.com/graphql',
      { query, variables: { username, limit: 5 } },
      {
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000
      }
    );

    const submissions = response.data?.data?.recentAcSubmissionList;
    if (!submissions || submissions.length === 0) return false;

    // Compare using IST date (UTC+5:30)
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayIST = nowIST.toISOString().slice(0, 10); 

    return submissions.some((sub) => {
      const subDateIST = new Date(sub.timestamp * 1000 + 5.5 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      return subDateIST === todayIST;
    });
  } catch (err) {
    console.error(`⚠️ Error checking ${username}:`, err.message);
    return true; // Fail safe — don't nag if API is down
  }
}

async function sendTelegram(chatId, text) {
  try {
    const response = await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
    if (response.data.ok) {
      console.log(`✅ Message sent to ${chatId}`);
    } else {
      console.error(`❌ Telegram responded with error for ${chatId}:`, response.data);
    }
  } catch (err) {
    console.error(`❌ Failed to message ${chatId}:`, err.response?.data?.description || err.message);
  }
}

async function main() {
  console.log('--- 🚀 STARTING DAILY STREAK CHECK ---');
  console.log(`Time (IST): ${new Date(Date.now() + 5.5 * 60 * 60 * 1000).toLocaleString('en-IN')}`);

  const { data: users, error } = await supabase.from('users').select('*');

  if (error) {
    console.error('❌ Supabase error:', error.message);
    process.exit(1);
  }

  let targetUsers = users || [];

  // Inject default user if not already in DB
  const defaultChatId = process.env.TELEGRAM_CHAT_ID;
  const defaultUsername = 'axhayco';
  if (defaultChatId && !targetUsers.some((u) => u.telegram_chat_id == defaultChatId)) {
    targetUsers.push({ telegram_chat_id: defaultChatId, leetcode_username: defaultUsername });
    console.log(`ℹ️ Injected default user: ${defaultUsername}`);
  }

  if (targetUsers.length === 0) {
    console.log('ℹ️ No users found. Exiting.');
    return;
  }

  console.log(`🔍 Checking ${targetUsers.length} user(s)...`);

  for (const user of targetUsers) {
    const { leetcode_username: username, telegram_chat_id: chatId } = user;
    console.log(`\n--- Checking [${username}] ---`);

    const solved = await checkLeetCode(username);

    if (solved) {
      console.log(`✅ ${username} solved today.`);
      await sendTelegram(
        chatId,
        `✅ <b>Streak secured!</b> You actually cooked today, ${username}. Sleep easy 🔥`
      );
    } else {
      console.log(`❌ ${username} no submission found. Sending reminder.`);
      await sendTelegram(
        chatId,
        `🚨 <b>Reminder:</b> You still haven't done your LeetCode, ${username}? Stop slacking. Go solve something right now 🏃‍♂️💨`
      );
    }
  }

  console.log('\n--- ✨ CHECK COMPLETE ---');
}

main().catch(err => {
  console.error('🔥 Fatal error in main loop:', err);
  process.exit(1);
});
