require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Secrets now come from environment variables (.env locally, GitHub Secrets in CI)
// instead of being hardcoded in the file.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY environment variables.');
    console.error('   Create a .env file locally with these values, or set them as GitHub Secrets.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
    const { data: users, error } = await supabase.from('users').select('*');
    if (error) {
        console.error(error.message);
    } else {
        console.log(JSON.stringify(users, null, 2));
    }
})();
