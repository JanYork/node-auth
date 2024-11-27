import { NauthConfiguration } from './configuration';
import { IDBAdapter } from '../db';
import { VerifierLogic } from './verifier-logic';
import { NauthManager } from './manager';

jest.mock('../db');
jest.mock('./verifier-logic');

// 测试鉴权框架管理器
describe('NauthManager', () => {
  let mockDbAdapter: IDBAdapter;
  let mockVerifierLogic: VerifierLogic;

  beforeEach(() => {
    // 初始化 mock 对象
    mockDbAdapter = {
      /* 模拟适配器方法 */
    } as IDBAdapter;
    mockVerifierLogic = {
      /* 模拟逻辑处理器方法 */
    } as VerifierLogic;

    // 重置 NauthManager 的静态配置和数据库适配器
    NauthManager.setConfiguration(new NauthConfiguration());
    NauthManager.setDB(mockDbAdapter);
  });

  afterEach(() => {
    // 清理静态变量
    NauthManager.configuration = null!;
    NauthManager.dbAdapter = null!;
  });

  // 测试设置和获取配置
  describe('setConfiguration & getConfiguration', () => {
    // 设置和获取配置
    it('should set and get configuration correctly', () => {
      const config = new NauthConfiguration();
      NauthManager.setConfiguration(config);

      const result = NauthManager.getConfiguration();
      expect(result).toBe(config);
    });
  });

  // 测试设置和获取数据库适配器
  describe('setDB & getDB', () => {
    // 设置和获取数据库适配器
    it('should set and get database adapter correctly', () => {
      NauthManager.setDB(mockDbAdapter);
      const result = NauthManager.getDB();
      expect(result).toBe(mockDbAdapter);
    });
  });

  // 测试设置和获取逻辑处理器
  describe('setLogic & getLogic', () => {
    // 设置和获取逻辑处理器
    it('should set and get logic handler correctly', () => {
      const type = 'login';
      NauthManager.setLogic(type, mockVerifierLogic);

      const result = NauthManager.getLogic(type);
      expect(result).toBe(mockVerifierLogic);
    });

    // 获取不存在的逻辑处理器
    it('should return undefined if logic handler is not set', () => {
      const result = NauthManager.getLogic('non-existent-type');
      expect(result).toBeUndefined();
    });
  });

  // 测试检查配置和数据库适配器
  describe('check', () => {
    // 未设置配置时抛出异常
    it('should throw an error if configuration is not set', () => {
      NauthManager.setConfiguration(null!); // 模拟未设置配置
      expect(() => NauthManager.check()).toThrowError(
        'The configuration is not set'
      );
    });

    // 未设置数据库适配器时抛出异常
    it('should throw an error if database adapter is not set', () => {
      const config = new NauthConfiguration();
      NauthManager.setConfiguration(config);
      NauthManager.setDB(null!); // 模拟未设置数据库适配器
      expect(() => NauthManager.check()).toThrowError(
        'The database adapter is not set'
      );
    });

    // 配置和数据库适配器都设置时不抛出异常
    it('should not throw any error if both configuration and database adapter are set', () => {
      const config = new NauthConfiguration();
      NauthManager.setConfiguration(config);
      NauthManager.setDB(mockDbAdapter);

      expect(() => NauthManager.check()).not.toThrow();
    });
  });
});
