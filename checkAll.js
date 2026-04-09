const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!TELEGRAM_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing required environment variables!');
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
          'User-Agent': 'Mozilla/5.0',
        },
      }
    );

    const submissions = response.data?.data?.recentAcSubmissionList;
    if (!submissions || submissions.length === 0) return false;

    // Compare using IST date (UTC+5:30)
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayIST = nowIST.toISOString().slice(0, 10); // YYYY-MM-DD

    return submissions.some((sub) => {
      const subDateIST = new Date(sub.timestamp * 1000 + 5.5 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      return subDateIST === todayIST;
    });
  } catch (err) {
    console.error(`Error checking ${username}:`, err.message);
    return true; // Fail safe — don't spam on API error
  }
}

async function sendTelegram(chatId, text) {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
  } catch (err) {
    console.error(`Failed to message ${chatId}:`, err.message);
  }
}

async function main() {
  console.log('--- STARTING DAILY STREAK CHECK ---');

  const { data: users, error } = await supabase.from('users').select('*');

  if (error) {
    console.error('Supabase error:', error.message);
    process.exit(1);
  }

  let targetUsers = users || [];

  // Inject default user if not already in DB
  const defaultChatId = process.env.TELEGRAM_CHAT_ID;
  const defaultUsername = 'axhayco';
  if (defaultChatId && !targetUsers.some((u) => u.telegram_chat_id === defaultChatId)) {
    targetUsers.push({ telegram_chat_id: defaultChatId, leetcode_username: defaultUsername });
    console.log('Injected default user.');
  }

  if (targetUsers.length === 0) {
    console.log('No users found. Exiting.');
    return;
  }

  console.log(`Checking ${targetUsers.length} user(s)...`);

  for (const user of targetUsers) {
    const { leetcode_username: username, telegram_chat_id: chatId } = user;
    console.log(`Checking [${username}]...`);

    const solved = await checkLeetCode(username);

    if (solved) {
      console.log(`${username} ✅ solved today.`);
      await sendTelegram(
        chatId,
        `✅ Streak secured! You actually cooked today, ${username}. Sleep easy 🔥`
      );
    } else {
      console.log(`${username} ❌ no submission. Sending reminder.`);
      await sendTelegram(
        chatId,
        `🚨 <b>Reminder:</b> It's 8 PM and you still haven't done your LeetCode, ${username}? Stop slacking. Go solve something right now 🏃‍♂️💨`
      );
    }
  }

  console.log('--- CHECK COMPLETE ---');
}

main();
