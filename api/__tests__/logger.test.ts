import { logger } from '../utils/logger';

describe('Winston Logger', () => {
  it('should be defined', () => {
    expect(logger).toBeDefined();
  });

  it('should have basic logging methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  // Since Winston outputs to console by default, we just spy on the underlying stream
  // or simple check it doesn't throw.
  it('should not throw when logging', () => {
    expect(() => {
      logger.info('Test log', { test: true });
    }).not.toThrow();
  });
});
