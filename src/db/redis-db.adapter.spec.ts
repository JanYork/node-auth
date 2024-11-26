import { NauthConfiguration, NauthManager, UserDO } from '../core';
import { Redis } from 'ioredis';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import RedisMock from 'ioredis-mock';
import { RedisDBAdapter } from './redis-db.adapter'; // 假设路径正确

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
