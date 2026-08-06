import cluster from 'cluster';
import os from 'os';
import logger from './utils/logger';

const numCPUs = os.cpus().length;

if (cluster.isPrimary && process.env.NODE_ENV === 'production') {
  logger.info(`Primary process ${process.pid} is running`);
  logger.info(`Forking for ${numCPUs} CPUs...`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`);
    logger.info('Starting a new worker...');
    cluster.fork();
  });
} else {
  // Run the main server application
  const app = require('./server');
  // Need to handle both ES modules and CommonJS
  const serverApp = app.default || app;
  const PORT = process.env.PORT || 5000;
  
  serverApp.listen(PORT, () => {
    logger.info(`Worker ${process.pid} running on port ${PORT}`);
  });
}
