-- Update leaderboard_top_100 to include avatar_url
CREATE OR REPLACE FUNCTION "public"."leaderboard_top_100"() 
RETURNS TABLE("rank" bigint, "user_id" bigint, "total_point" integer, "solved_count" bigint, "display_name" character varying, "email" character varying, "avatar_url" text)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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
    u.email,
    u.avatar_url
  FROM ranked r
  INNER JOIN public.users u ON u.id = r.user_id
  WHERE r.rank <= 100;
$$;
