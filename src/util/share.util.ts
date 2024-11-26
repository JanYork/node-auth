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
