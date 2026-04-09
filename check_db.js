const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://twmusbvqxjwohfnmgfnr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bXVzYnZxeGp3b2hmbm1nZm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTU0ODEsImV4cCI6MjA5MTIzMTQ4MX0.RnsCK_Qmz25zn-ZpsiQBEnfFRTRq0YrvW7SyWs7IwBY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
    const { data: users, error } = await supabase.from('users').select('*');
    if (error) {
        console.error(error.message);
    } else {
        console.log(JSON.stringify(users, null, 2));
    }
})();
