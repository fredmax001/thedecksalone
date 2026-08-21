import cluster from 'cluster';
import os from 'os';
import logger from './utils/logger';

const numCPUs = os.cpus().length;

// Load the server module once. It exports the Express app and the background
// job scheduler, but it only starts listening when explicitly told to.
const serverModule = require('./server');
const app = serverModule.default || serverModule;
const PORT = process.env.PORT || 5000;

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

  // Run background jobs on the primary process only so they are not duplicated
  // across every worker instance.
  if (typeof app.startBackgroundJobs === 'function') {
    app.startBackgroundJobs();
  }
} else {
  // Run the main server application
  app.listen(PORT, () => {
    const label = cluster.isWorker ? `Worker ${process.pid}` : 'Server';
    logger.info(`${label} running on port ${PORT}`);

    // In non-production (single-process) mode, background jobs run here.
    // In production cluster mode, they run on the primary process above.
    if (!cluster.isWorker && typeof app.startBackgroundJobs === 'function') {
      app.startBackgroundJobs();
    }
  });
}
