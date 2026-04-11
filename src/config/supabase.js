require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
  console.error('The app cannot start without these variables. Please set them in your Railway Dashboard.');
  process.exit(1);
}

// ต้องมี service_role เพื่อ bypass RLS (ถ้าเปิด RLS อยู่) — ไม่ใส่จะ insert/update ตารางไม่ได้
if (!supabaseServiceRoleKey) {
  console.error('❌ CRITICAL ERROR: Missing SUPABASE_SERVICE_ROLE_KEY in environment');
  console.error('Get it from Supabase Dashboard → Project Settings → API → service_role (secret)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });

console.log('Supabase initialized: OK');

module.exports = { supabase, supabaseAdmin };
