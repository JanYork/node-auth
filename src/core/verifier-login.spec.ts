import { EVENT_TYPE, VerifierLogic } from './verifier-logic';
import { NauthConfiguration, NauthManager, UserDO } from '.';
import { IDBAdapter } from '../db';
import { Redis } from 'ioredis';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import RedisMock from 'ioredis-mock';
import { NotLoginException } from '../exception';
import { RedisDBAdapter } from '../db';

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
      const userId = 'user2';
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

  // 长期有效
  describe('permanent', () => {
    // 测试设置用户为长期有效
    it('should set the user as permanent', async () => {
      const userId = 'user1';
      await logic.login(userId);
      await logic.permanent(userId);

      const info = await logic.info(userId);
      expect(info).not.toBeNull();
      expect(info!.permanent).toBe(true);
    });

    // 测试设置用户为非长期有效
    it('should set the user as non-permanent', async () => {
      const userId = 'user1';
      await logic.login(userId);
      await logic.permanent(userId);
      await logic.nonPermanent(userId);

      const info = await logic.info(userId);
      expect(info).not.toBeNull();
      expect(info!.permanent).toBe(false);
    });

    // 长期有效情况下，及时已经过期，也会续期
    it('should renew the user even if it has expired', async () => {
      const userId = 'user1';
      await logic.login(userId);
      await logic.permanent(userId);

      // 设置过期时间
      const db = NauthManager.dbAdapter;
      const key = `${logic.TYPE.toUpperCase()}_LOGIN:${userId}`;
      await db.update({
        id: key,
        expireTime: Date.now() - 1000,
      });

      await logic.checkLogin(userId);

      const info = await logic.info(userId);
      expect(info).not.toBeNull();
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

    // 非长期有效情况下，过期测试
    it('should throw NotLoginException if the user is expired', async () => {
      const userId = 'user-1';
      const token = await logic.login(userId);

      const uid = await logic.loginID(token);
      expect(uid).toBe(userId);

      // 设置过期时间
      const db = NauthManager.dbAdapter;
      const key = `${logic.TYPE.toUpperCase()}_LOGIN:${userId}`;
      await db.update({
        id: key,
        expireTime: Date.now() - 1000,
      });

      await expect(logic.checkLogin(userId)).rejects.toThrow(NotLoginException);

      const info = await logic.info(userId);
      expect(info).toBeNull();
      const ctx = await logic.ctx(userId);
      expect(ctx).not.toBeNull();
      expect(Object.keys(ctx!).length).toBe(0);

      const uid2 = await logic.loginID(token);
      expect(uid2).toBeNull();
    });
  });

  // 上下文
  describe('context', () => {
    // 测试设置上下文
    it('should set the context', async () => {
      const userId = 'user1';
      await logic.login(userId);
      const info = await logic.info(userId);
      expect(info).not.toBeNull();

      const ctx = await logic.ctx(userId);
      expect(ctx).not.toBeNull();
      expect(Object.keys(ctx!).length).toBe(0);

      await logic.set(userId, 'test', 'test');
      await logic.set(userId, 'test2', 'test2');
      const ctx2 = await logic.ctx(userId);
      expect(ctx2).not.toBeNull();
      expect(ctx2!.test).toBe('test');

      await logic.del(userId, 'test');
      const ctx3 = await logic.ctx(userId);
      expect(ctx3).not.toBeNull();
      expect(ctx3!.test).toBeUndefined();

      await logic.clear(userId);
      const ctx4 = await logic.ctx(userId);
      expect(ctx4).not.toBeNull();
      expect(ctx4!.test2).toBeUndefined();
      expect(Object.keys(ctx4!).length).toBe(0);
    });
  });

  // 订阅事件
  describe('subscribe', () => {
    // 测试订阅事件
    it('should subscribe to the event', async () => {
      const subscribe = logic.subject;
      subscribe.subscribe((event) => {
        switch (event.type) {
          case EVENT_TYPE.LOGIN:
            expect(event).not.toBeNull();
            break;
          case EVENT_TYPE.LOGOUT:
            expect(event).not.toBeNull();
            break;
          case EVENT_TYPE.EXPIRED:
            expect(event).not.toBeNull();
            break;
          case EVENT_TYPE.KICKOUT:
            expect(event).not.toBeNull();
            break;
          case EVENT_TYPE.KICKOUT_FEEDBACK:
            expect(event).not.toBeNull();
            break;
          case EVENT_TYPE.OFFLINE_ALL:
            expect(event).not.toBeNull();
            break;
        }
      });

      const db = NauthManager.dbAdapter;

      // 登录
      const user1 = 'user1';
      await logic.login(user1);

      // 退出登录
      const user2 = 'user2';
      await logic.login(user2);
      await logic.logout(user2);

      // 过期
      const user3 = 'user3';
      await logic.login(user3);
      const key = `${logic.TYPE.toUpperCase()}_LOGIN:${user3}`;
      await db.update({
        id: key,
        expireTime: Date.now() - 1000,
      });
      await expect(logic.checkLogin(user3)).rejects.toThrow(NotLoginException);

      // 踢出
      const user4 = 'user4';
      await logic.login(user4);
      await logic.kickout(user4);

      // 踢出反馈
      await expect(logic.checkLogin(user4)).rejects.toThrow(NotLoginException);

      // 全部下线
      await logic.offlineFull();
      await expect(logic.checkLogin(user1)).rejects.toThrow(NotLoginException);
    });
  });

  // 其他
  describe('other', () => {
    // 测试使用ID获取用户Token
    it('should call tokenValue method with correct id', async () => {
      const userId = 'user1';
      const token = await logic.login(userId);
      const result = await logic.tokenValue(userId);
      expect(result).toBe(token);
    });

    // 测试使用Token获取用户ID
    it('should call loginID method with correct token', async () => {
      const userId = 'user1';
      const token = await logic.login(userId);
      const result = await logic.loginID(token);
      expect(result).toBe(userId);
    });

    // 测试使用ID获取用户信息
    it('should call info method with correct id', async () => {
      const userId = 'user1';
      await logic.login(userId);
      const result = await logic.info(userId);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(`TEST_LOGIN:${userId}`);
    });

    // 测试清理登录
    it('should call cleanLogin method with correct id', async () => {
      const userId = 'user1';
      await logic.login(userId);
      await logic.cleanLogin(userId);
      await expect(logic.checkLogin(userId)).rejects.toThrowError(
        NotLoginException
      );
    });

    // 测试续期
    it('should renew the user', async () => {
      const userId = 'user1';
      await logic.login(userId);
      const info = await logic.info(userId);
      info!.expireTime = Date.now() - 1000;
      await logic.renew(userId);
      const info2 = await logic.info(userId);
      expect(info2!.expireTime).toBeGreaterThan(Date.now());
      expect(info2!.renewCount).toBe(info!.renewCount + 1);
    });

    // 测试获取超时时间
    it('should return the timeout value', async () => {
      const date = Date.now() + config.tokenTimeout * 1000;
      const userId = 'user1';
      await logic.login(userId);
      const info = await logic.info(userId);
      const result = await logic.timeout(userId);
      expect(result).toBeGreaterThanOrEqual(date);
      expect(result).toBe(info!.expireTime);
    });

    // 测试获取剩余过期时间
    it('should return the remaining expiration time', async () => {
      const userId = 'user-1';
      await logic.login(userId);
      const info = await logic.info(userId);
      const result = await logic.remain(userId);
      expect(result).toBeGreaterThan(0);
      const date = info!.expireTime - Date.now();
      expect(result).toBeGreaterThanOrEqual(Math.floor(date / 1000) - 2);
      expect(result).toBeLessThanOrEqual(Math.floor(date / 1000) + 2);
    });

    // 测试去除Token前缀
    it('should return the token without prefix', async () => {
      const userId = 'user1';
      const token = await logic.login(userId);
      const prefixToken = config.tokenPrefix + token;
      const result = logic.tokenNoPrefix(prefixToken);
      expect(result).toBe(token);
    });
  });
});
