-- Create system_settings table to store global configurable app parameters
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: CodeArea uses Custom JWT Auth and bypasses Supabase RLS natively 
-- via `supabaseAdmin` in the Node.js backend. 
-- Thus, complex Postgres RLS Auth policies are not required here and authorization
-- is safely handled by `requireAuth` in the backend Express controllers.

-- Initial payload for executor settings
-- INSERT INTO public.system_settings (key, value) VALUES ('executor_config', '{"type": "piston", "url": "http://localhost:5000/api/executor"}'::jsonb);
