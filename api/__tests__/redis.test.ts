import redisClient, { getCache, setCache } from '../utils/redis';

// Mock the redis client
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
  }));
});

describe('Redis Cache Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(redisClient).toBeDefined();
    expect(typeof getCache).toBe('function');
    expect(typeof setCache).toBe('function');
  });

  it('should gracefully handle getCache when no data exists', async () => {
    (redisClient.get as jest.Mock).mockResolvedValueOnce(null);
    const data = await getCache('test_key');
    expect(data).toBeNull();
    expect(redisClient.get).toHaveBeenCalledWith('test_key');
  });

  it('should parse JSON data on getCache', async () => {
    const mockData = { id: 1, name: 'Test' };
    (redisClient.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockData));
    
    const data = await getCache('test_key');
    expect(data).toEqual(mockData);
  });

  it('should stringify data on setCache', async () => {
    const mockData = { id: 1, name: 'Test' };
    await setCache('test_key', mockData, 3600);
    
    expect(redisClient.set).toHaveBeenCalledWith(
      'test_key',
      JSON.stringify(mockData),
      'EX',
      3600
    );
  });
});
