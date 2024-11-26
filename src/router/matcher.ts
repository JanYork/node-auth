import { match } from 'path-to-regexp';
import { isAsyncFunction } from '../util';

/**
 * 路由匹配器
 *
 * @author JanYork
 * @email <747945307@qq.com>
 * @date 2024/11/25 15:56
 */
export class RouterMatcher {
  /**
   * 路由匹配规则
   * @private
   */
  private routes: Array<{ rule: string; fn: () => void | Promise<void> }> = [];

  /**
   * 添加一个路由匹配规则
   *
   * @param rule 规则
   * @param fn 回调
   * @example
   * add('/user/{*path}', () => {});
   * @return this
   */
  public add(rule: string, fn: () => void | Promise<void>): this {
    RouterMatcher.validateRouteRule(rule);
    this.routes.push({ rule, fn });
    return this;
  }

  /**
   * 实例方法：匹配路由
   *
   * @param route 路由
   * @example
   * router.match('/user/123');
   * @see {https://github.com/pillarjs/path-to-regexp}
   * @return Promise<void>
   */
  public async match(route: string): Promise<void> {
    for (const { rule, fn } of this.routes) {
      const matchFn = match(rule, { decode: decodeURIComponent });
      if (matchFn(route)) {
        const isAsync = isAsyncFunction(fn);
        if (isAsync) {
          await fn();
        } else {
          fn();
        }
      }
    }
  }

  /**
   * 匹配路由
   *
   * @param route 路由
   * @param rule 规则
   * @param fn 回调
   * @example
   * match('/user/123', '/user/{*path}', () => {}) => true
   * match('/user/123', '/user/:id', () => {}) => true
   * @see isMatched
   */
  public static async match(
    route: string,
    rule: string,
    fn: () => void | Promise<void>
  ) {
    if (this.isMatched(route, rule)) {
      const isAsync = isAsyncFunction(fn);
      if (isAsync) {
        await fn();
      } else {
        fn();
      }
    }
  }

  /**
   * 是否匹配路由
   *
   * @param route 路由(支持通配符)
   * @param rule 规则(支持通配符)
   * @example
   * isMatched('/user/123', '/user/{*path}') => true
   * isMatched('/user/123', '/user/:id') => true
   * isMatched('/user/123', '/user/123') => true
   * isMatched('/user/123', '/user/124') => false
   * isMatched('/user/123', '/user') => false
   * isMatched('/user/123', '/user/:id/detail') => false
   * isMatched('/user/123', '/user/{*path}') => true
   * isMatched('/user/123', '/user/:id') => true
   * isMatched('/user/123', '/user/123') => true
   * isMatched('/user/123', '/user/124') => false
   * isMatched('/user/123', '/user') => false
   * isMatched('/user/123', '/user/:id/detail') => false
   * @return 是否匹配
   * @see {https://github.com/pillarjs/path-to-regexp}
   * @private
   */
  private static isMatched(route: string, rule: string): boolean {
    try {
      const matchFn = match(rule, { decode: decodeURIComponent });
      return !!matchFn(route);
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  /**
   * 验证路由规则
   *
   * @param rule 规则
   * @private
   */
  private static validateRouteRule(rule: string) {
    // 检查非法占位符模式
    const invalidPattern = /:(\/|[^a-zA-Z0-9_])|:$/; // 修改正则
    if (invalidPattern.test(rule)) {
      throw new Error(`Invalid route rule: ${rule}`);
    }
  }
}
