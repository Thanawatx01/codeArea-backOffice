-- PDF URLs from Supabase Storage exceed varchar(50)
ALTER TABLE public.questions
  ALTER COLUMN uri TYPE text USING uri::text;
