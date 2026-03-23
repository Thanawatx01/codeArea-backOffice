-- Seed sample test cases for question code = 'q1'
-- Safe to run multiple times (checks by question_id + case_order)

WITH target_question AS (
  SELECT id, created_by
  FROM public.questions
  WHERE code = 'q1'
  LIMIT 1
),
seed_cases AS (
  SELECT
    tq.id AS question_id,
    tq.created_by,
    1 AS case_order,
    true AS is_simple,
    '3 3
1 3 5
2 4 6' AS input_data,
    '1 2 3 4 5 6' AS output_data
  FROM target_question tq
  UNION ALL
  SELECT
    tq.id,
    tq.created_by,
    2,
    true,
    '4 2
1 2 3 4
5 6',
    '1 2 3 4 5 6'
  FROM target_question tq
  UNION ALL
  SELECT
    tq.id,
    tq.created_by,
    3,
    false,
    '5 5
1 2 2 7 9
0 2 3 8 10',
    '0 1 2 2 2 3 7 8 9 10'
  FROM target_question tq
)
INSERT INTO public.test_cases (
  question_id,
  input_data,
  output_data,
  case_order,
  is_simple,
  status,
  created_by
)
SELECT
  sc.question_id,
  sc.input_data,
  sc.output_data,
  sc.case_order,
  sc.is_simple,
  true,
  sc.created_by
FROM seed_cases sc
WHERE NOT EXISTS (
  SELECT 1
  FROM public.test_cases tc
  WHERE tc.question_id = sc.question_id
    AND tc.case_order = sc.case_order
);
