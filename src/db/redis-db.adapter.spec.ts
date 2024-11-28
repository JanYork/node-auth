import { NauthConfiguration, NauthManager, UserDO } from '../core';
import { Redis } from 'ioredis';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import RedisMock from 'ioredis-mock';
import { RedisDBAdapter } from './redis-db.adapter';

describe('RedisDBAdapter', () => {
  let db: RedisDBAdapter;
  let redis: Redis;

  beforeEach(() => {
    redis = new RedisMock();
    db = new RedisDBAdapter(redis);
    NauthManager.setConfiguration(new NauthConfiguration());
    NauthManager.setDB(db);
  });

  afterEach(() => {
    redis.disconnect();
  });

  // 测试获取公平锁
  describe('acquireLock', () => {
    // 测试如果没有其他请求持有锁，则成功获取锁
    it('should acquire lock successfully if no other request holds the lock', async () => {
      const id = 'user123';
      const lockTimeout = 5000; // 5 seconds
      const acquireTimeout = 1500; // 1.5 seconds

      // Mock set to return 'OK' when lock is acquired
      redis.set = jest.fn().mockResolvedValue('OK');

      const releaseLock = await db.acquireLock(id, lockTimeout, acquireTimeout);
      expect(releaseLock).toBeDefined();

      // Check if the lock was acquired by checking Redis for the lock key
      const lockKey = `NAUTH:${id}:lock`;
      const lockValue = await redis.get(lockKey);
      expect(lockValue).toBeDefined(); // Lock should be set in Redis

      // Call releaseLock function and check if the lock is removed
      await releaseLock();
      const lockAfterRelease = await redis.get(lockKey);
      expect(lockAfterRelease).toBeNull(); // Lock should be removed after release
    });

    // 测试如果无法在指定的获取超时时间内获取锁，则超时
    it('should timeout if unable to acquire lock within the specified acquireTimeout', async () => {
      const id = 'user123';
      const lockTimeout = 5000;
      const acquireTimeout = 1500;

      // Simulate that the lock is already held (mock Redis response)
      redis.set = jest.fn().mockResolvedValue('BUSY');

      // Try acquiring the lock, should throw a timeout error
      await expect(
        db.acquireLock(id, lockTimeout, acquireTimeout)
      ).rejects.toThrowError(
        'Failed to acquire lock within the timeout period'
      );
    });

    // 测试当多个请求排队时，以公平的方式获取锁
    it('should acquire lock in a fair manner when multiple requests are queued', async () => {
      jest.setTimeout(10000); // 延长超时，确保测试能够运行

      const id = 'user123';
      const lockTimeout = 2500; // 2.5秒锁过期时间
      const acquireTimeout = 3500; // 3.5秒获取锁超时

      // 模拟多个请求排队获取锁
      const lockQueue: string[] = [];

      // Mock lpush: 将请求加入队列
      redis.lpush = jest.fn().mockImplementation((key, lockValue) => {
        lockQueue.push(lockValue);
        return Promise.resolve(lockQueue.length);
      });

      // Mock lindex: 获取队列第一个请求的锁值
      redis.lindex = jest.fn().mockImplementation((key, index) => {
        return Promise.resolve(lockQueue[index] || null); // 返回队列中的锁值
      });

      // Mock set: 模拟锁的设置
      redis.set = jest.fn().mockResolvedValue('OK');

      // Mock lpop: 移除队列中的第一个元素（当一个请求成功获得锁时）
      redis.lpop = jest.fn().mockImplementation(() => {
        return Promise.resolve(lockQueue.shift()); // 移除队列中的第一个锁值
      });

      // 第一个请求应该成功获取锁
      const releaseLock1 = await db.acquireLock(
        id,
        lockTimeout,
        acquireTimeout
      );
      expect(redis.lpush).toHaveBeenCalledWith(
        `NAUTH:${id}:fair`,
        expect.any(String)
      );
      expect(redis.lindex).toHaveBeenCalledWith(`NAUTH:${id}:fair`, 0);

      // 第二个请求将被加入队列，并且需要等待第一个请求释放锁
      const releaseLock2Promise = db.acquireLock(
        id,
        lockTimeout,
        acquireTimeout
      );

      // 确保第二个请求等待在队列
      expect(redis.lpush).toHaveBeenCalledWith(
        `NAUTH:${id}:fair`,
        expect.any(String)
      );

      // 模拟第一个请求释放锁
      await releaseLock1();

      // 释放第一个锁后，第二个请求应该能成功获取锁
      const releaseLock2 = await releaseLock2Promise;
      expect(redis.lpop).toHaveBeenCalledWith(`NAUTH:${id}:fair`);

      // 最后释放第二个锁
      await releaseLock2();
    });

    // 测试上锁并释放锁，异步并发
    it('should lock and release the lock asynchronously and concurrently', async () => {
      const id = 'user123';
      const lockTimeout = 5000;
      const acquireTimeout = 1500;

      const releaseLockPromises = await Promise.all([
        db
          .acquireLock(id, lockTimeout, acquireTimeout)
          .then((releaseLock) => releaseLock()),
        db
          .acquireLock(id, lockTimeout, acquireTimeout)
          .then((releaseLock) => releaseLock()),
        db
          .acquireLock(id, lockTimeout, acquireTimeout)
          .then((releaseLock) => releaseLock()),
      ]);

      await Promise.all(releaseLockPromises);

      // 再次上锁能够成功
      const releaseLock = await db.acquireLock(id, lockTimeout, acquireTimeout);
      await releaseLock();

      const lockKey = `NAUTH:${id}:lock`;
      const lockValue = await redis.get(lockKey);
      expect(lockValue).toBeNull();
    });
  });

  // 测试释放锁
  describe('releaseLock', () => {
    // 测试释放锁并从Redis中删除它
    it('should release the lock and remove it from Redis', async () => {
      const id = 'user123';

      // Simulate a lock being set
      redis.set = jest.fn().mockResolvedValue('OK');
      redis.del = jest.fn().mockResolvedValue(1); // Simulate successful deletion

      const releaseLock = await db.acquireLock(id, 5000, 1500);
      await releaseLock(); // Release the lock

      expect(redis.del).toHaveBeenCalledWith(`NAUTH:${id}:lock`);
    });
  });

  describe('save', () => {
    // 测试保存用户数据成功
    it('should save user data successfully', async () => {
      const user = new UserDO('user1', 'type1', 'token123');
      await db.save(user);

      const storedUser = await redis.hgetall(`NAUTH:user1`);
      expect(storedUser).toHaveProperty('id', 'user1');
      expect(storedUser).toHaveProperty('type', 'type1');
      expect(storedUser).toHaveProperty('token', 'token123');
    });

    // 测试用户数据无效时抛出错误
    it('should throw an error if user data is invalid', async () => {
      const invalidUser = new UserDO(
        'user1',
        'user',
        'token123',
        Date.now() - 10000
      );
      await expect(db.save(invalidUser)).rejects.toThrowError(
        'The expire time does not less than now'
      );
    });

    // 测试过期时间和上下文处理
    it('should handle expiration and context correctly', async () => {
      const user = new UserDO(
        'user2',
        'type2',
        'token456',
        Date.now() + 24 * 60 * 60 * 1000
      );
      user.ctx = { key: 'value' };
      await db.save(user);

      const storedCtx = await redis.hgetall(`NAUTH:user2:CTX`);
      expect(storedCtx).toHaveProperty('key', 'value');
    });
  });

  describe('find', () => {
    // 测试查找用户成功
    it('should find a user by id', async () => {
      const user = new UserDO('user1', 'type1', 'token123');
      await db.save(user);

      const foundUser = await db.find('user1');
      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toBe('user1');
    });

    // 测试用户不存在时返回null
    it('should return null if user does not exist', async () => {
      const foundUser = await db.find('nonexistent-user');
      expect(foundUser).toBeNull();
    });

    // 测试空数据处理
    it('should handle empty data correctly', async () => {
      await redis.hset('NAUTH:user1', 'id', 'user1');
      const foundUser = await db.find('user1');
      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toBe('user1');
    });
  });

  describe('update', () => {
    // 测试更新用户数据成功
    it('should update user data successfully', async () => {
      const user = new UserDO('user1', 'type1', 'token123');
      await db.save(user);

      const updatedUserData = { id: 'user1', disabled: true };
      await db.update(updatedUserData);

      const foundUser = await db.find('user1');
      expect(foundUser).not.toBeNull();
      expect(foundUser!.disabled).toBe(true);
    });

    // 测试永久标志处理
    it('should handle permanent flag correctly', async () => {
      const user = new UserDO('user1', 'type1', 'token123');
      await db.save(user);

      // Assert that the expiration time is set
      await expect(redis.pttl(`NAUTH:user1`)).resolves.toBeGreaterThan(-1);
      await expect(redis.pttl(`NAUTH:LOGIN:token123`)).resolves.toBeGreaterThan(
        -1
      );

      const updatedUserData = { id: 'user1', permanent: true };
      await db.update(updatedUserData);

      // Assert that the `persist` command was called (you can mock or spy on Redis commands)
      await expect(redis.exists(`NAUTH:user1`)).resolves.toBe(1);
      await expect(redis.exists(`NAUTH:LOGIN:token123`)).resolves.toBe(1);

      // Assert that the expiration time is removed
      await expect(redis.pttl(`NAUTH:user1`)).resolves.toBe(-1);
      await expect(redis.pttl(`NAUTH:LOGIN:token123`)).resolves.toBe(-1);
    });

    // 测试更新用户数据时用户不存在抛出错误
    it('should throw an error if user does not exist during update', async () => {
      const updatedUserData = { id: 'nonexistent-user', type: 'new-type' };
      await expect(db.update(updatedUserData)).rejects.toThrowError(
        'The user does not exist'
      );
    });

    // 测试过期时间更新
    it('should update expiration correctly when expireTime changes', async () => {
      const user = new UserDO('user1', 'type1', 'token123');
      await db.save(user);

      const updatedUserData = { id: 'user1', expireTime: Date.now() + 3600000 }; // 1 hour later
      await db.update(updatedUserData);

      const storedUser = await redis.hgetall(`NAUTH:user1`);
      expect(storedUser).toHaveProperty('expireTime');
      const expireTime = Number(storedUser['expireTime']);
      expect(expireTime).toBeGreaterThan(Date.now() + 3590000);
    });
  });

  describe('delete', () => {
    // 测试删除用户数据成功
    it('should delete user data successfully', async () => {
      const user = new UserDO('user1', 'type1', 'token123');
      await db.save(user);

      await db.delete('user1');

      const foundUser = await db.find('user1');
      expect(foundUser).toBeNull();
    });

    // 测试删除不存在的用户数据抛出错误
    it('should throw error if user does not exist when deleting', async () => {
      await expect(db.delete('nonexistent-user')).rejects.toThrowError(
        'The redis delete operation failed, the user does not exist or network error'
      );
    });
  });

  describe('field', () => {
    // 测试从用户中检索特定字段
    it('should retrieve specific field from user', async () => {
      const user = new UserDO('user1', 'type1', 'token123');
      await db.save(user);

      const fieldValue = await db.field('user1', 'type');
      expect(fieldValue).toBe('type1');
    });

    // 测试字段不存在时返回null
    it('should return null if field does not exist', async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const fieldValue = await db.field('user1', 'novalue');
      expect(fieldValue).toBeNull();
    });
  });

  describe('ctx', () => {
    // 测试为用户检索上下文
    it('should retrieve context for user', async () => {
      const user = new UserDO('user1', 'type1', 'token123');
      user.ctx = { key: 'value' };
      await db.save(user);

      const ctx = await db.ctx('user1');
      expect(ctx).toHaveProperty('key', 'value');
    });

    // 测试不存在上下文时返回空对象
    it('should return empty object if no context exists', async () => {
      await redis.del(`NAUTH:user1:CTX`);
      const ctx = await db.ctx('user1');
      expect(ctx).toEqual({});
    });
  });

  describe('clear', () => {
    // 测试清除用户上下文数据
    it('should clear user context data', async () => {
      const user = new UserDO('user1', 'type1', 'token123');
      user.ctx = { key: 'value' };
      await db.save(user);

      await db.clear('user1');

      const ctx = await db.ctx('user1');
      expect(ctx).toEqual({});
    });
  });

  describe('del', () => {
    // 测试删除用户的特定上下文键
    it('should delete a specific context key for user', async () => {
      const user = new UserDO('user1', 'type1', 'token123');
      user.ctx = { key: 'value', anotherKey: 'anotherValue' };
      await db.save(user);

      await db.del('user1', 'key');

      const ctx = await db.ctx('user1');
      expect(ctx).not.toHaveProperty('key');
      expect(ctx).toHaveProperty('anotherKey', 'anotherValue');
    });
  });

  describe('get', () => {
    // 测试为用户检索特定上下文键
    it('should get a specific context key for user', async () => {
      const user = new UserDO('user1', 'type1', 'token123');
      user.ctx = { key: 'value' };
      await db.save(user);

      const value = await db.get('user1', 'key');
      expect(value).toBe('value');
    });

    // 测试键不存在时返回null
    it('should return null if key does not exist', async () => {
      const value = await db.get('user1', 'nonexistentKey');
      expect(value).toBeNull();
    });
  });

  describe('key', () => {
    // 测试通过令牌检索用户的Redis键
    it('should retrieve the Redis key for a user by token', async () => {
      const user = new UserDO('user1', 'type1', 'token123');
      await db.save(user);

      const redisKey = await db.key('token123');
      expect(redisKey).toBe('NAUTH:user1');
    });

    // 测试令牌不存在时返回null
    it('should return null if token does not exist', async () => {
      const redisKey = await db.key('nonexistentToken');
      expect(redisKey).toBeNull();
    });
  });
});
