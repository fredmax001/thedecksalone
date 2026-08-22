jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    setex: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
    status: 'ready',
  }));
});

describe('Redis Cache Utility', () => {
  let redisClient: { get: jest.Mock; setex: jest.Mock };
  let getCache: (key: string) => Promise<unknown>;
  let setCache: (key: string, data: unknown, ttlSeconds?: number) => Promise<void>;

  beforeEach(() => {
    jest.resetModules();
    process.env.REDIS_URL = 'redis://localhost:6379';

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const redisModule = require('../utils/redis');
    redisClient = redisModule.default;
    getCache = redisModule.getCache;
    setCache = redisModule.setCache;

    jest.clearAllMocks();
  });

  afterAll(() => {
    delete process.env.REDIS_URL;
  });

  it('should be defined', () => {
    expect(redisClient).toBeDefined();
    expect(typeof getCache).toBe('function');
    expect(typeof setCache).toBe('function');
  });

  it('should gracefully handle getCache when no data exists', async () => {
    redisClient.get.mockResolvedValueOnce(null);
    const data = await getCache('test_key');
    expect(data).toBeNull();
    expect(redisClient.get).toHaveBeenCalledWith('test_key');
  });

  it('should parse JSON data on getCache', async () => {
    const mockData = { id: 1, name: 'Test' };
    redisClient.get.mockResolvedValueOnce(JSON.stringify(mockData));

    const data = await getCache('test_key');
    expect(data).toEqual(mockData);
  });

  it('should stringify data on setCache', async () => {
    const mockData = { id: 1, name: 'Test' };
    await setCache('test_key', mockData, 3600);

    expect(redisClient.setex).toHaveBeenCalledWith(
      'test_key',
      3600,
      JSON.stringify(mockData)
    );
  });
});
