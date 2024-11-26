import { VerifierLogic } from './verifier-logic';
import { NauthConfiguration, NauthManager, UserDO } from '.';
import { IDBAdapter } from '../db';
import { Redis } from 'ioredis';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import RedisMock from 'ioredis-mock';
import { NotLoginException } from '../exception';
import { RedisDBAdapter } from '../db/redis-db.adapter';

describe('VerifierLogic', () => {
  let db: IDBAdapter;
  let logic: VerifierLogic;
  let redis: Redis;
  let config: NauthConfiguration;

  beforeEach(() => {
    redis = new RedisMock();
    db = new RedisDBAdapter(redis);

    config = new NauthConfiguration();
    NauthManager.setConfiguration(config);
    NauthManager.setDB(db);

    logic = new VerifierLogic('test');
  });

  afterEach(() => {
    redis.disconnect();
  });

  // 登录
  describe('login', () => {
    // 测试登录并验证用户数据
    it('should generate and save a token for the user', async () => {
      const userId = 'user1';
      const token = await logic.login(userId);

      expect(token).toBeDefined();

      // 检查保存用户数据是否正确
      const user = await logic.info(userId);
      expect(user).not.toBeNull();
      expect(user!.token).toBe(token);
    });

    // 测试未初始化配置抛出异常
    it('should throw error if the configuration is not set', () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      NauthManager.setConfiguration(undefined);
      expect(() => new VerifierLogic('test')).toThrowError(
        'The configuration is not set'
      );
    });
  });

  // 退出登录
  describe('logout', () => {
    // 测试退出登录并验证用户数据
    it('should remove the token from the database', async () => {
      const userId = 'user1';
      await logic.login(userId);
      const info = await logic.info(userId);
      expect(info).not.toBeNull();
      expect(await logic.checkLogin(userId)).toBeUndefined();
      await logic.logout(userId);
      await expect(logic.checkLogin(userId)).rejects.toThrowError(
        NotLoginException
      );
    });
  });

  // 踢出
  describe('kickout', () => {
    // 测试踢出用户并验证用户数据
    it('should mark the user as kicked', async () => {
      const userId = 'user1';
      await logic.login(userId);
      await logic.kickout(userId);
      const info = await logic.info(userId);
      expect(info).not.toBeNull();
      expect(info!.kicked).toBe(true);
      await expect(logic.checkLogin(userId)).rejects.toThrowError(
        NotLoginException
      );

      const info2 = await logic.info(userId);
      expect(info2).toBeNull();
    });
  });

  // 禁用
  describe('disable', () => {
    // 测试禁用用户并验证用户数据
    it('should disable the user with a specific duration', async () => {
      const userId = 'user1';
      const duration = 1; // 2s
      await logic.login(userId);
      await logic.disable(userId, duration);
      const info = await logic.info(userId);
      expect(info).not.toBeNull();
      expect(info!.disabled).toBe(true);
      await expect(logic.checkDisable(userId)).rejects.toThrowError(
        NotLoginException
      );

      await new Promise((resolve) => setTimeout(resolve, 2000));
      await expect(logic.checkDisable(userId)).resolves.not.toThrow();
      const info2 = await logic.info(userId);
      expect(info2).not.toBeNull();
      expect(info2!.duration).toBe(0);
    });

    // 测试永久禁用用户
    it('should disable the user permanently', async () => {
      const userId = 'user1';
      await logic.login(userId);
      await logic.disable(userId, -1);
      const info = await logic.info(userId);
      expect(info).not.toBeNull();
      expect(info!.disabled).toBe(true);
      expect(info!.duration).toBe(-1);
      await expect(logic.checkDisable(userId)).rejects.toThrowError(
        NotLoginException
      );
    });
  });

  // 启用
  describe('enable', () => {
    // 测试启用用户并验证用户数据
    it('should enable the user and remove the duration', async () => {
      const userId = 'user1';
      await logic.login(userId);
      await logic.disable(userId, -1);
      await logic.enable(userId);

      const info = await logic.info(userId);
      expect(info).not.toBeNull();
      expect(info!.disabled).toBe(false);
      expect(info!.duration).toBe(0);
      await expect(logic.checkDisable(userId)).resolves.not.toThrow();
    });
  });

  // 是否登录
  describe('isLogin', () => {
    // 测试用户已登录
    it('should return true if the user is logged in', async () => {
      const userId = 'user1';
      db.exists = jest.fn().mockResolvedValue(true);
      db.find = jest
        .fn()
        .mockResolvedValue(
          new UserDO(userId, 'test', 'token123', Date.now() + 10000)
        );

      const result = await logic.isLogin(userId);
      expect(result).toBe(true);
    });

    // 测试用户未登录
    it('should return false if the user is not logged in', async () => {
      const userId = 'user1';
      db.exists = jest.fn().mockResolvedValue(false);

      const result = await logic.isLogin(userId);
      expect(result).toBe(false);
    });
  });

  // 检查登录
  describe('checkLogin', () => {
    // 测试用户未登录抛出异常
    it('should throw NotLoginException if the user is not logged in', async () => {
      const userId = 'user1';
      db.exists = jest.fn().mockResolvedValue(false);

      await expect(logic.checkLogin(userId)).rejects.toThrow(NotLoginException);
    });

    // 测试用户已登录不抛出异常
    it('should not throw an error if the user is logged in', async () => {
      const userId = 'user1';
      db.exists = jest.fn().mockResolvedValue(true);
      db.find = jest
        .fn()
        .mockResolvedValue(
          new UserDO(userId, 'test', 'token123', Date.now() + 10000)
        );

      await expect(logic.checkLogin(userId)).resolves.not.toThrow();
    });
  });
});
