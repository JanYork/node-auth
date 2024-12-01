import Redis from 'ioredis';

/**
 * 移除token前缀
 *
 * @param token Token
 * @param prefix 前缀
 * @param space 是否去除空格
 * @example
 * removeToken('Bearer 123abc','Bearer')
 * // => '123abc'
 * @return string
 */
export const removeTokenPrefix = (
  token: string,
  prefix: string,
  space: boolean = true
): string => {
  if (space) {
    return token.replace(prefix, '').trim();
  }

  return token.replace(prefix, '');
};

/**
 * 是否异步函数
 *
 * @param fn 函数
 * @example
 * isAsyncFunction(async () => {})
 * // => true
 * @example
 * isAsyncFunction(() => {})
 * // => false
 * @example
 * isAsyncFunction(function () {return new Promise(() => {})}) !!!
 * // => false
 * @example
 * isAsyncFunction(function () {})
 * // => false
 * @return boolean
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const isAsyncFunction = (fn: Function): boolean => {
  return Object.prototype.toString.call(fn) === '[object AsyncFunction]';
};

/**
 * 检查Redis multi是否有错误
 *
 * @param result
 * @return Error | null (第一个错误/没有错误)
 */
export const isRmultiHasErr = (
  result: [error: Error | null, result: unknown][]
): Error | null => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [error, _] of result) {
    if (error) {
      return error;
    }
  }
  return null;
};

/**
 * 扫描Redis中有指定前缀的键
 *
 * @param prefix 前缀
 * @param redis Redis实例
 */
export const scanHasPrefixRedisKeys = async (prefix: string, redis: Redis) => {
  // 初始化游标
  let cursor = '0';
  // 存储键的数组
  const results: string[] = [];

  do {
    // 使用 SCAN 命令进行迭代查找匹配的键
    const result = await redis.scan(cursor, 'MATCH', `${prefix}*`);
    // 获取新的游标
    cursor = result[0];
    // 获取键列表
    const keys = result[1];

    if (keys.length) {
      results.push(...keys);
    }
  } while (cursor !== '0'); // 当游标为 '0' 时，结束循环

  return results;
};
