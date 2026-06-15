require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabasePublishableKey || !supabaseSecretKey) {
  console.error('❌ CRITICAL ERROR: Missing SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, or SUPABASE_SECRET_KEY in environment');
  console.error('The app cannot start without these variables. Please set them in your Railway Dashboard.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabasePublishableKey, { auth: { persistSession: false } });
const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, { auth: { persistSession: false } });

console.log('Supabase initialized: OK');

module.exports = { supabase, supabaseAdmin };
