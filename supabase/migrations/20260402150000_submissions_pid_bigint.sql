-- pid ฝั่งแอปเป็น microtime (จำนวนเต็ม ~10^15) เกินขอบเขต int4
ALTER TABLE public.submissions
  ALTER COLUMN pid TYPE bigint USING COALESCE(pid, 0)::bigint;
