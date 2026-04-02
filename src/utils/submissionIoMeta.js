/** คำอธิบายฟิลด์ input/output สำหรับ submission / submission_test_cases (ให้ client ใช้ร่วมกับ payload) */
module.exports = {
  io_meta: {
    submission_test_cases:
      'ผลตรวจแยกตามแต่ละ test case ที่ระบบนำโค้ดผู้ส่งไปรัน (เทสต์ซ่อนเมื่อส่งข้อจริง)',
    'submission_test_case.output_data':
      'stdout (หรือผลลัพธ์ดิบ) ที่ได้จากการรันโค้ดของผู้ส่งเมื่อป้อน input ของเทสต์เคสนั้น',
    'submission_test_case.error_message':
      'ข้อความ error จากผู้ตัดสิน/รัน (ถ้า status เป็น error)',
    'test_case.input_data':
      'input มาตรฐานของข้อนี้ — มักใช้เป็น stdin เป็นสตริง (รูปแบบตามที่โจทย์กำหนด เช่นบรรทัดเดียวหรือหลายบรรทัด)',
    'test_case.output_data':
      'output มาตรฐานที่ต้องได้ (stdout ที่คาดหวัง) — ระบบเปรียบเทียบกับ submission_test_case.output_data',
    'test_case.case_order': 'ลำดับการแสดง/รันเทสต์เคส',
    'test_case.is_simple': 'true = เทสต์ตัวอย่าง (sample), false = เทสต์ซ่อน',
    test_summary:
      'tests_passed / tests_total / tests_wrong_answer / tests_error และค่าเฉลี่ยเวลา-เมมตาม *_note — คะแนนเปอร์เซ็นต์อยู่ที่ฟิลด์ score_percent ระดับบนสุดของ response แยกจาก object นี้',
    score_percent:
      '0–100 จาก tests_passed / tests_total; ไม่มีเทสต์ (total 0) จะเป็น null',
    'enriched.passed': 'true เมื่อ status เท่ากับผ่าน',
    'enriched.actual_output': 'เทียบเท่า output_data ของผลรัน (stdout จริง)',
  },
};
