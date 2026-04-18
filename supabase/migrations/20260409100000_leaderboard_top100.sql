-- Leaderboard: อันดับจากคะแนนสะสมสูงสุดต่อ user (MAX(total_point) จาก point_logs) + จำนวนข้อที่ได้คะแนน
CREATE OR REPLACE FUNCTION public.leaderboard_top_100()
RETURNS TABLE (
  rank bigint,
  user_id bigint,
  total_point integer,
  solved_count bigint,
  display_name varchar,
  email varchar
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scores AS (
    SELECT
      pl.user_id,
      MAX(pl.total_point)::int AS total_point,
      COUNT(DISTINCT pl.question_id)::bigint AS solved_count
    FROM public.point_logs pl
    GROUP BY pl.user_id
  ),
  ranked AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY s.total_point DESC, s.user_id ASC)::bigint AS rank,
      s.user_id,
      s.total_point,
      s.solved_count
    FROM scores s
  )
  SELECT
    r.rank,
    r.user_id,
    r.total_point,
    r.solved_count,
    u.display_name,
    u.email
  FROM ranked r
  INNER JOIN public.users u ON u.id = r.user_id
  WHERE r.rank <= 100;
$$;

GRANT EXECUTE ON FUNCTION public.leaderboard_top_100() TO service_role;
GRANT EXECUTE ON FUNCTION public.leaderboard_top_100() TO authenticated;
