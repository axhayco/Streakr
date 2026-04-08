require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Database credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Telegram Bot Token
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_TOKEN;

/**
 * Checks if the user has made an accepted submission on LeetCode today.
 * @param {string} username The LeetCode username to check.
 * @returns {Promise<boolean>} True if submitted today, false otherwise.
 */
async function checkLeetcodeSubmission(username) {
    const query = `
        query recentAcSubmissions($username: String!, $limit: Int!) {
            recentAcSubmissionList(username: $username, limit: $limit) {
                id
                title
                titleSlug
                timestamp
            }
        }
    `;

    try {
        const response = await axios.post('https://leetcode.com/graphql', {
            query: query,
            variables: {
                username: username,
                limit: 1
            }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://leetcode.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const submissions = response.data?.data?.recentAcSubmissionList;

        if (!submissions || submissions.length === 0) {
            return false;
        }

        const latestSubmissionMs = parseInt(submissions[0].timestamp, 10) * 1000;
        const latestSubmissionDate = new Date(latestSubmissionMs);
        const today = new Date();

        return latestSubmissionDate.getDate() === today.getDate() &&
            latestSubmissionDate.getMonth() === today.getMonth() &&
            latestSubmissionDate.getFullYear() === today.getFullYear();

    } catch (error) {
        console.error(`Error fetching data for ${username}:`, error.message);
        return false;
    }
}

/**
 * Sends a message via Telegram to a specific user.
 * @param {string} chatId The Telegram Chat ID of the user.
 * @param {string} text The message text to send.
 */
async function sendTelegramMessage(chatId, text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: chatId,
            text: text
        });
        console.log(`Message sent to chat ${chatId}!`);
    } catch (error) {
        console.error(`Error sending Telegram message to ${chatId}:`, error.message);
    }
}

/**
 * Main execution function
 */
async function main() {
    console.log("Starting Multi-User LeetCode Streak Check...");

    // Safety check for environment variables
    if (!TELEGRAM_BOT_TOKEN || !supabaseUrl || !supabaseKey) {
        console.error("Missing necessary Environment Variables (Telegram or Supabase).");
        return;
    }

    // 1. Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Fetch all registered users from the database
    const { data: users, error } = await supabase.from('users').select('*');

    if (error) {
        console.error("Failed to fetch users from database:", error.message);
        return;
    }

    if (!users || users.length === 0) {
        console.log("No registered users found in the database. Exiting.");
        return;
    }

    console.log(`Found ${users.length} users! Checking streaks...`);

    // 3. Loop through each user and check their streak
    for (const user of users) {
        const username = user.leetcode_username;
        const chatId = user.telegram_chat_id;

        console.log(`\n--- Checking ${username} ---`);

        const hasSubmittedToday = await checkLeetcodeSubmission(username);

        if (hasSubmittedToday) {
            console.log(`[${username}] Safe. Sending confirmation...`);
            await sendTelegramMessage(chatId, `✅ Streak Safe! You've already done your LeetCode today, ${username}. Keep it up!`);
        } else {
            console.log(`[${username}] No submission found! Sending alert...`);
            await sendTelegramMessage(chatId, `🚨 Bro!! You forgot the streak again, huh?? Go solve one right now! 🏃‍♂️💨`);
        }
    }
    
    console.log("\nFinished processing all users.");
}

main();