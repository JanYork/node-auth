import { Redis } from 'ioredis';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import RedisMock from 'ioredis-mock';
import {
  isRmultiHasErr,
  removeTokenPrefix,
  scanHasPrefixRedisKeys,
} from './share.util';
import { isAsyncFunction } from 'node:util/types';

describe('Share Utility Function Tests', () => {
  // 测试移除Token前缀
  describe('removeTokenPrefix', () => {
    // 移除前缀并默认去除空格
    it('should remove the prefix and trim spaces by default', () => {
      const token = 'Bearer 123abc';
      const result = removeTokenPrefix(token, 'Bearer');
      expect(result).toBe('123abc');
    });

    // 移除前缀并不去除空格
    it('should remove the prefix without trimming spaces when space is false', () => {
      const token = 'Bearer   123abc';
      const result = removeTokenPrefix(token, 'Bearer', false);
      expect(result).toBe('   123abc'); // 空格保留
    });

    // 前缀未找到时返回原始Token
    it('should return the original token if the prefix is not found', () => {
      const token = 'Token 123abc';
      const result = removeTokenPrefix(token, 'Bearer');
      expect(result).toBe('Token 123abc');
    });
  });

  // 测试是否异步函数
  describe('isAsyncFunction', () => {
    // 异步函数返回 true
    it('should return true for an async function', () => {
      const asyncFn = async () => {};
      expect(isAsyncFunction(asyncFn)).toBe(true);
    });

    // 普通函数返回 false
    it('should return false for a normal function', () => {
      const normalFn = () => {};
      expect(isAsyncFunction(normalFn)).toBe(false);
    });

    // 返回 Promise 的函数返回 false
    it('should return false for a function returning a Promise', () => {
      const promiseFn = function () {
        return new Promise<void>((resolve) => resolve());
      };
      expect(isAsyncFunction(promiseFn)).toBe(false);
    });
  });

  // 测试检查 Redis multi 是否有错误
  describe('isRmultiHasErr', () => {
    // 返回 Redis multi 结果中的第一个错误
    it('should return the first error if present in Redis multi result', async () => {
      const mockResult: [Error | null, unknown][] = [
        [null, 'OK'],
        [new Error('Test error'), null],
        [null, 'OK'],
      ];

      const result = isRmultiHasErr(mockResult);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe('Test error');
    });

    // 返回 null 如果 Redis multi 结果中没有错误
    it('should return null if there are no errors in Redis multi result', async () => {
      const mockResult: [Error | null, unknown][] = [
        [null, 'OK'],
        [null, 'OK'],
      ];

      const result = isRmultiHasErr(mockResult);
      expect(result).toBeNull();
    });

    // 返回 null 如果 Redis multi 结果为空
    it('should test ioredis-mock with multi commands', async () => {
      const redis: Redis = new RedisMock();

      // 使用 Multi 批量执行命令
      const mockPipeline = redis.multi();
      mockPipeline.set('key1', 'value1');
      mockPipeline.set('key2', 'value2');
      mockPipeline.get('key1');

      const result = await mockPipeline.exec();

      // 模拟检查错误逻辑
      const errCheck = isRmultiHasErr(result as [Error | null, unknown][]);

      expect(errCheck).toBeNull(); // 检查是否没有错误
      expect(result).toBeDefined(); // 检查结果是否定义
      expect(result?.[0][1]).toBe('OK'); // 第一个命令结果是 OK
      expect(result?.[1][1]).toBe('OK'); // 第二个命令结果是 OK
    });
  });

  // 测试扫描 Redis 中有指定前缀的键
  describe('scanHasPrefixRedisKeys', () => {
    // 存在指定前缀的键时扫描 Redis
    it('should scan Redis keys with the specified prefix', async () => {
      const redis: Redis = new RedisMock();
      redis.flushdb();
      await redis.set('test:1', 'value1');
      await redis.set('test:2', 'value2');
      await redis.set('another:1', 'value3');

      const result = await scanHasPrefixRedisKeys('test:', redis);
      expect(result).toEqual(['test:1', 'test:2']);
    });

    // 没有匹配前缀时返回空数组
    it('should return an empty array if no keys match the prefix', async () => {
      const redis: Redis = new RedisMock();
      redis.flushdb();
      await redis.set('another:1', 'value1');
      await redis.set('another:2', 'value2');

      const result = await scanHasPrefixRedisKeys('test:', redis);
      expect(result).toEqual([]);
    });
  });
});
