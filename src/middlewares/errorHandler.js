// Central error handler — ส่ง error เป็นภาษาไทย
const errorHandler = (err, req, res, next) => {
  if (err?.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'ไฟล์มีขนาดใหญ่เกินกำหนด (สูงสุด 10MB)'
      : 'อัปโหลดไฟล์ไม่สำเร็จ';
    return res.status(400).json({ error: message });
  }
  if (err?.message === 'อนุญาตเฉพาะไฟล์ PDF เท่านั้น') {
    return res.status(400).json({ error: err.message });
  }

  const status = err.status ?? err.statusCode ?? 500;
  const message = status >= 500 ? 'เกิดข้อผิดพลาดในระบบ' : (err.message || 'เกิดข้อผิดพลาด');
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && err.stack && { stack: err.stack }),
  });
};

module.exports = { errorHandler };
