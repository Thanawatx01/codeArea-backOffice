-- Enable RLS on all tables (restrict direct client access)
-- Backend ควรใช้ SUPABASE_SERVICE_ROLE_KEY เพื่อ bypass RLS และให้ API ทำงานได้

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

-- Helper: current user's public id (bigint)
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- ---------- users ----------
-- อ่าน/แก้ไขได้แค่แถวของตัวเอง
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth_id = auth.uid());

-- Insert ทำจาก backend หลัง signUp (service_role bypass RLS)

-- ---------- languages ----------
-- อ่านได้ทุกคนที่ login แล้ว
CREATE POLICY "languages_select_authenticated" ON public.languages
  FOR SELECT TO authenticated USING (true);

-- อื่นๆ (insert/update/delete) ให้ backend ทำ

-- ---------- question_categories ----------
CREATE POLICY "question_categories_select" ON public.question_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "question_categories_insert" ON public.question_categories
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "question_categories_update" ON public.question_categories
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "question_categories_delete" ON public.question_categories
  FOR DELETE TO authenticated USING (true);

-- ---------- tags ----------
CREATE POLICY "tags_select" ON public.tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "tags_insert" ON public.tags
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "tags_update" ON public.tags
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "tags_delete" ON public.tags
  FOR DELETE TO authenticated USING (true);

-- ---------- questions ----------
CREATE POLICY "questions_select" ON public.questions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "questions_insert" ON public.questions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "questions_update" ON public.questions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "questions_delete" ON public.questions
  FOR DELETE TO authenticated USING (true);

-- ---------- question_tag ----------
CREATE POLICY "question_tag_select" ON public.question_tag
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "question_tag_insert" ON public.question_tag
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "question_tag_delete" ON public.question_tag
  FOR DELETE TO authenticated USING (true);

-- ---------- test_cases ----------
CREATE POLICY "test_cases_select" ON public.test_cases
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "test_cases_insert" ON public.test_cases
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "test_cases_update" ON public.test_cases
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "test_cases_delete" ON public.test_cases
  FOR DELETE TO authenticated USING (true);

-- ---------- submissions (ดู/สร้างได้แค่ของตัวเอง) ----------
CREATE POLICY "submissions_select_own" ON public.submissions
  FOR SELECT TO authenticated USING (user_id = public.current_user_id());

CREATE POLICY "submissions_insert_own" ON public.submissions
  FOR INSERT TO authenticated WITH CHECK (user_id = public.current_user_id());

-- ---------- submission_test_cases ----------
CREATE POLICY "submission_test_cases_select" ON public.submission_test_cases
  FOR SELECT TO authenticated USING (true);

-- ---------- ai_feedback ----------
CREATE POLICY "ai_feedback_select" ON public.ai_feedback
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ai_feedback_insert" ON public.ai_feedback
  FOR INSERT TO authenticated WITH CHECK (true);
