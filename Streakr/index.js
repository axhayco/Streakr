require('dotenv').config();
const axios = require('axios');

// Get credentials from environment variables or provide fallback placeholders
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'YOUR_TELEGRAM_CHAT_ID';

// The LeetCode username to check
const LEETCODE_USERNAME = 'axhayco';

/**
 * Checks if the user has made an accepted submission on LeetCode today.
 * @returns {Promise<boolean>} True if submitted today, false otherwise.
 */
async function checkLeetcodeSubmission() {
    // GraphQL query to fetch recent accepted submissions
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
                username: LEETCODE_USERNAME,
                limit: 1 // We only need the very latest submission
            }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://leetcode.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const submissions = response.data?.data?.recentAcSubmissionList;

        // If no submissions exist
        if (!submissions || submissions.length === 0) {
            return false;
        }

        // LeetCode returns timezone-utc Unix timestamp in seconds
        const latestSubmissionMs = parseInt(submissions[0].timestamp, 10) * 1000;
        const latestSubmissionDate = new Date(latestSubmissionMs);

        // Define 'today' (comparing in the local timezone of the machine running the script)
        const today = new Date();

        const isToday = latestSubmissionDate.getDate() === today.getDate() &&
            latestSubmissionDate.getMonth() === today.getMonth() &&
            latestSubmissionDate.getFullYear() === today.getFullYear();

        return isToday;

    } catch (error) {
        console.error("Error fetching data from LeetCode:", error.message);
        return false;
    }
}

/**
 * Sends a message via Telegram bot.
 * @param {string} text The message text to send.
 */
async function sendTelegramMessage(text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    try {
        const response = await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: text
        });

        if (response.status === 200) {
            console.log("Telegram reminder sent successfully!");
        }
    } catch (error) {
        console.error("Error sending Telegram message:");
        if (error.response) {
            console.error(error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

/**
 * Main execution function
 */
async function main() {
    console.log(`Checking LeetCode submissions for user: ${LEETCODE_USERNAME}...`);

    // Safety check so we don't accidentally send requests with dummy tokens
    if (TELEGRAM_BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN' || TELEGRAM_CHAT_ID === 'YOUR_TELEGRAM_CHAT_ID') {
        console.warn("WARNING: Please set your Telegram bot token and chat ID.");
        console.warn("You can either modify index.js or use a .env file.");
        return;
    }

    const hasSubmittedToday = await checkLeetcodeSubmission();

    if (hasSubmittedToday) {
        console.log("Awesome! A submission was found for today. Streak is safe.");
    } else {
        console.log("No submission found for today! Sending Telegram reminder...");
        await sendTelegramMessage("Bro!! You forgot the streak again, huh??");
    }
}

// Run the script
main();
