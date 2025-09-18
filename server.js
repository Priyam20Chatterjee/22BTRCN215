const app = require('./src/app');
const { logger } = require('./src/middleware/logger');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const server = app.listen(PORT, HOST, () => {
  logger.info('URL Shortener Microservice started', {
    port: PORT,
    host: HOST,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
  
  console.log(`\n🚀 URL Shortener Microservice is running!`);
  console.log(`📡 Server: http://localhost:${PORT}`);
});

server.on('error', (error) => {
  logger.error('Server error', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});