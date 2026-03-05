// Central error handler — ส่ง error เป็นภาษาไทย
const errorHandler = (err, req, res, next) => {
  const status = err.status ?? err.statusCode ?? 500;
  const message = status >= 500 ? 'เกิดข้อผิดพลาดในระบบ' : (err.message || 'เกิดข้อผิดพลาด');
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && err.stack && { stack: err.stack }),
  });
};

module.exports = { errorHandler };
