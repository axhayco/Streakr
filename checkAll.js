const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

async function checkLeetCode(username) {
  const query = `
    query userPublicProfile($username: String!) {
      matchedUser(username: $username) {
        submitStatsGlobal {
          acSubmissionNum { difficulty count }
        }
      }
      recentSubmissionList(username: $username, limit: 1) {
        timestamp
      }
    }`;

  try {
    const response = await axios.post('https://leetcode.com/graphql', {
      query,
      variables: { username }
    });

    const recentSubmission = response.data.data.recentSubmissionList[0];
    if (!recentSubmission) return false;

    const submissionDate = new Date(recentSubmission.timestamp * 1000).toDateString();
    const today = new Date().toDateString();
    return submissionDate === today;
  } catch (err) {
    console.error(`Error checking ${username}:`, err.message);
    return true; // Skip if error to avoid false alarms
  }
}

async function main() {
  // 1. Get all users from Supabase
  const { data: users, error } = await supabase.from('users').select('*');
  
  if (error) {
    console.error("Could not fetch users:", error);
    return;
  }

  console.log(`Checking ${users.length} users...`);

  // 2. Loop through them
  for (const user of users) {
    const hasSolved = await checkLeetCode(user.leetcode_username);
    
    if (!hasSolved) {
      console.log(`Roasting ${user.leetcode_username}...`);
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        chat_id: user.telegram_chat_id,
        text: `YOOO!! 🚨 It’s late and you still haven't cooked today? Don't let the streak die, it's giving 'unemployed' energy. 🏃‍♂️💨`
      });
    } else {
      console.log(`${user.leetcode_username} is safe. ✅`);
    }
  }
}

main();
