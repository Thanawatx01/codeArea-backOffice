require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
}

// ต้องมี service_role เพื่อ bypass RLS (ถ้าเปิด RLS อยู่) — ไม่ใส่จะ insert/update ตารางไม่ได้
if (!supabaseServiceRoleKey) {
  throw new Error(
    'Missing SUPABASE_SERVICE_ROLE_KEY in .env — required when RLS is enabled. ' +
    'Get it from Supabase Dashboard → Project Settings → API → service_role (secret)'
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });

module.exports = { supabase, supabaseAdmin };
