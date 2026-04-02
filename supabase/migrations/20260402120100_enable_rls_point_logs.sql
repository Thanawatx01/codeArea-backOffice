-- point_logs: อ่านได้เฉพาะของตัวเอง; insert/update ผ่าน service role
ALTER TABLE public.point_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "point_logs_select_own" ON public.point_logs
  FOR SELECT TO authenticated USING (user_id = public.current_user_id());
