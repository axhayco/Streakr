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
    let { data: users, error } = await supabase.from('users').select('*');

    if (error) {
        console.error("Failed to fetch users from database:", error.message);
        users = []; // Fallback to empty array so default user still runs
    } else if (!users) {
        users = [];
    }

    // --- Inject Default User ---
    const defaultChatId = process.env.TELEGRAM_CHAT_ID;
    const defaultUsername = 'axhayco';

    if (defaultChatId) {
        // Prevent duplicate messages if the default user already registered via the bot
        const isDefaultInDb = users.some(u => u.telegram_chat_id === defaultChatId);
        if (!isDefaultInDb) {
            users.push({
                telegram_chat_id: defaultChatId,
                leetcode_username: defaultUsername
            });
            console.log(`Injected default user ${defaultUsername} into the queue.`);
        }
    }

    if (users.length === 0) {
        console.log("No registered users found in the database. Exiting.");
        return;
    }

    console.log(`Found ${users.length} users! Checking streaks...`);

    // Filter users whose reminder_time matches the current window
    // (If running index.js manually, maybe we just want to run for EVERYONE? Let's assume manual run checks everyone and reports their specific time)
    // Wait, let's just make it show the customized time instead of 8 PM.
    for (const user of users) {
        const username = user.leetcode_username;
        const chatId = user.telegram_chat_id;
        const userTime = user.reminder_time || '20:00';

        console.log(`\n--- Checking ${username} ---`);

        const hasSubmittedToday = await checkLeetcodeSubmission(username);

        if (hasSubmittedToday) {
            console.log(`[${username}] Safe. Sending confirmation...`);
            await sendTelegramMessage(chatId, `✅Ayy, streak secured! ✅ You actually cooked today. No cap, we love to see the grind. Sleep easy, bruhh ${username}. Keep it up!`);
        } else {
            console.log(`[${username}] No submission found! Sending alert...`);
            await sendTelegramMessage(chatId, `🚨 Bro!! It’s ${userTime} IST and you still haven't done your LeetCode? That’s crazy. Stop slacking and go solve a problem right now. Don't let the streak die, it's giving 'unemployed' energy 🏃‍♂️💨`);
        }
    }

    console.log("\nFinished processing all users.");
}

main();
