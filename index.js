require('dotenv').config();
const axios = require('axios');

// Updated to match your GitHub Secrets and .yml file naming
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const LEETCODE_USERNAME = 'axhayco';

/**
 * Checks if the user has made an accepted submission on LeetCode today.
 */
async function checkLeetcodeSubmission() {
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
        console.error("Error fetching data from LeetCode:", error.message);
        return false;
    }
}

async function sendTelegramMessage(text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: text
        });
        console.log("Message sent to Telegram!");
    } catch (error) {
        console.error("Error sending Telegram message:", error.message);
    }
}

async function main() {
    console.log(`Checking LeetCode submissions for: ${LEETCODE_USERNAME}...`);

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error("Missing Telegram credentials in Environment Variables.");
        return;
    }

    const hasSubmittedToday = await checkLeetcodeSubmission();

    if (hasSubmittedToday) {
        // POSITIVE MESSAGE
        console.log("Streak safe! Sending confirmation...");
        await sendTelegramMessage("✅ Streak Safe! You've already done your LeetCode today. Keep it up, King!");
    } else {
        // REMINDER MESSAGE
        console.log("No submission found! Sending alert...");
        await sendTelegramMessage("🚨 Bro!! You forgot the streak again, huh?? Go solve one right now! 🏃‍♂️💨");
    }
}

main();
