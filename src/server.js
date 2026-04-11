require('./config');
const app = require('./app');
const { port } = require('./config');

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const shutdown = (signal) => {
  console.log(`${signal} received, closing HTTP server...`);
  server.close((err) => {
    if (err) {
      console.error('Error during server close:', err);
      process.exit(1);
    }
    console.log('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
