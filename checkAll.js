const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

// Standardized Env Vars
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!TELEGRAM_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing required environment variables!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkLeetCode(username) {
  // Robust GraphQL query (Recent Submissions)
  const query = `
    query recentSubmissionList($username: String!, $limit: Int!) {
      recentSubmissionList(username: $username, limit: $limit) {
        timestamp
        statusDisplay
      }
    }`;

  try {
    const response = await axios.post('https://leetcode.com/graphql', {
      query,
      variables: { username, limit: 10 } // Check last 10 just in case multiple submissions happened today
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Referer': 'https://leetcode.com/',
            'User-Agent': 'Mozilla/5.0'
        }
    });

    const submissions = response.data.data.recentSubmissionList;
    if (!submissions || submissions.length === 0) return false;

    // Check if any submission happened today (UTC-based logic, LeetCode uses UTC timestamps)
    const todayStr = new Date().toDateString();

    return submissions.some(sub => {
      // LeetCode timestamp is in seconds
      return new Date(sub.timestamp * 1000).toDateString() === todayStr && sub.statusDisplay === "Accepted";
    });

  } catch (err) {
    console.error(`Error checking ${username}:`, err.message);
    return true; // Assume safe on error to avoid spamming
  }
}

async function main() {
  console.log("--- STARTING DAILY STREAK CHECK ---");

  // 1. Fetch all users
  const { data: users, error } = await supabase.from('users').select('*');
  
  if (error) {
    console.error("Supabase error:", error.message);
    return;
  }

  // 2. Add Default User (from Env) if not in DB
  let targetUsers = users || [];
  const defaultChatId = process.env.TELEGRAM_CHAT_ID;
  if (defaultChatId && !targetUsers.some(u => u.telegram_chat_id === defaultChatId)) {
    targetUsers.push({ telegram_chat_id: defaultChatId, leetcode_username: 'axhayco' });
    console.log("Added default user to check queue.");
  }

  console.log(`Checking streaks for ${targetUsers.length} users...`);

  // 3. Sequential check
  for (const user of targetUsers) {
    const username = user.leetcode_username;
    const chatId = user.telegram_chat_id;

    console.log(`Checking [${username}]...`);
    const hasSolved = await checkLeetCode(username);
    
    if (!hasSolved) {
      console.log(`Alerting ${username}...`);
      await sendReminder(chatId, `🚨 **YOOO!!** It’s 8 PM and you still haven't done your LeetCode? That’s crazy. Stop slacking and go solve a problem right now. Don't let the streak die, it's giving 'unemployed' energy 🏃‍♂️💨`);
    } else {
      console.log(`${username} is safe. ✅`);
      // Optional: send positive reinforcement once a day? Skipping for now to avoid spam.
    }
  }

  console.log("--- CHECK COMPLETE ---");
}

async function sendReminder(chatId, text) {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    });
  } catch (err) {
    console.error(`Failed to message ${chatId}:`, err.message);
  }
}

main();
