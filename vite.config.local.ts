import baseConfig from './vite.config';

/**
 * TEMPORARY local preview config — proxies /api and /uploads to the live
 * production API so localhost preview works without CORS issues.
 * Safe to delete; not used by builds or deployment.
 */
export default {
  ...baseConfig,
  server: {
    ...(baseConfig.server || {}),
    proxy: {
      '/api': { target: 'https://decksalone.com', changeOrigin: true },
      '/uploads': { target: 'https://decksalone.com', changeOrigin: true },
    },
  },
};
