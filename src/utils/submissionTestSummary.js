const { TEST_PASS, TEST_WRONG, TEST_ERROR } = require('./submissionJudge');

/**
 * สรุปจำนวนเทสต์ผ่าน/ไม่ผ่าน/error และคะแนนเปอร์เซ็นต์ (เต็ม 100 จากสัดส่วนผ่าน/ทั้งหมด)
 * @param {{ status: number }[]} rows
 */
function summarizeTestCaseRowStatuses(rows) {
  if (!rows?.length) {
    return {
      tests_total: 0,
      tests_passed: 0,
      tests_wrong_answer: 0,
      tests_error: 0,
    };
  }
  let passed = 0;
  let wrong = 0;
  let err = 0;
  for (const r of rows) {
    if (r.status === TEST_PASS) passed += 1;
    else if (r.status === TEST_ERROR) err += 1;
    else wrong += 1;
  }
  const total = rows.length;
  return {
    tests_total: total,
    tests_passed: passed,
    tests_wrong_answer: wrong,
    tests_error: err,
  };
}

/** คะแนน 0–100 จาก tests_passed / tests_total — ส่งแยกจาก test_summary ตาม API */
function computeScorePercent(summaryLike) {
  const total = summaryLike?.tests_total;
  const passed = summaryLike?.tests_passed;
  if (typeof total !== 'number' || total <= 0 || typeof passed !== 'number') return null;
  return Math.round((passed / total) * 100);
}

function averageNumbers(values) {
  const nums = values.filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/**
 * รวม input/expected/actual และ label เวลา-เมมชัดเจนต่อเทสต์
 * @param {object} row แถวจาก Supabase (submission_test_cases + nested test_cases)
 */
function enrichSubmissionTestCaseRow(row) {
  if (!row || typeof row !== 'object') return row;
  const tc = row.test_cases;
  return {
    ...row,
    passed: row.status === TEST_PASS,
    input_data: tc?.input_data ?? null,
    expected_output: tc?.output_data ?? null,
    actual_output: row.output_data,
    run_time_ms: row.run_time,
    memory_used_bytes: row.memory_used,
  };
}

/** สำหรับ sample-run: แต่ละผลมี run_time/memory ต่อเทสต์ + ค่าเฉลี่ย */
function summarizeSampleRunResults(results) {
  const statusRows = (results || []).map((r) => ({ status: r.status }));
  const summary = summarizeTestCaseRowStatuses(statusRows);
  const avgRun = averageNumbers((results || []).map((r) => r.run_time));
  const avgMem = averageNumbers((results || []).map((r) => r.memory_used));
  return {
    ...summary,
    avg_run_time_ms: avgRun,
    avg_memory_used_bytes: avgMem,
    per_test_run_time_memory_note:
      'ในแต่ละรายการของ results: run_time = เวลารัน (ms) ของเทสต์นั้น, memory_used = หน่วยความจำ (bytes) ของเทสต์นั้น — ไม่ใช่ค่าเฉลี่ย',
    avg_note:
      'avg_run_time_ms และ avg_memory_used_bytes คิดเป็นค่าเฉลี่ยจากทุกเทสต์ในรอบ sample-run นี้',
  };
}

/** สำหรับแถว submission: DB run_time/memory เป็นเฉลี่ยต่อเทสต์หลัง judge; แต่ละ submission_test_cases เป็นค่าต่อเทสต์ */
function buildSubmissionTestSummary(submissionRow, enrichedStcRows) {
  const fromCases = summarizeTestCaseRowStatuses(enrichedStcRows.map((r) => ({ status: r.status })));
  const avgFromCases = {
    avg_run_time_ms: averageNumbers(enrichedStcRows.map((r) => r.run_time)),
    avg_memory_used_bytes: averageNumbers(enrichedStcRows.map((r) => r.memory_used)),
  };
  return {
    ...fromCases,
    ...avgFromCases,
    run_time_submission_ms: submissionRow.run_time,
    memory_used_submission_bytes: submissionRow.memory_used,
    submission_run_time_memory_note:
      'run_time และ memory_used บนแถว submission (จาก DB) เป็นค่าเฉลี่ยต่อ 1 เทสต์ หลังตัดสินเทสต์ซ่อนเมื่อส่งข้อ',
    avg_from_cases_note:
      'avg_run_time_ms / avg_memory_used_bytes คิดจากค่าต่อเทสต์ใน submission_test_cases ของ submission นี้',
    per_test_run_time_memory_note:
      'ใน submission_test_cases แต่ละรายการ: run_time / memory_used (และ run_time_ms / memory_used_bytes) เป็นของเทสต์นั้นโดยตรง',
  };
}

/** สรุปเมื่อ API ส่งแค่รายการ submission_test_cases (ไม่มีแถว submission) */
function buildStandaloneStcListSummary(rows) {
  const r = rows || [];
  const summary = summarizeTestCaseRowStatuses(r);
  return {
    ...summary,
    avg_run_time_ms: averageNumbers(r.map((x) => x.run_time)),
    avg_memory_used_bytes: averageNumbers(r.map((x) => x.memory_used)),
    avg_note: 'avg_* คือค่าเฉลี่ยจาก run_time / memory_used ของแต่ละเทสต์ในรายการ data',
    per_test_note: 'แต่ละรายการ: run_time, memory_used (และ run_time_ms, memory_used_bytes) เป็นของเทสต์นั้นโดยตรง',
  };
}

module.exports = {
  summarizeTestCaseRowStatuses,
  computeScorePercent,
  enrichSubmissionTestCaseRow,
  summarizeSampleRunResults,
  buildSubmissionTestSummary,
  buildStandaloneStcListSummary,
};
