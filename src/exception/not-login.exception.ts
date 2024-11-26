import { AUTH_CODE } from '../constant';

/**
 * 未登录异常，表示未能通过登录认证校验
 *
 * @author JanYork
 * @email <747945307@qq.com>
 * @date 2024/11/25 14:22
 */
export class NotLoginException extends Error {
  /**
   * 状态码
   */
  public readonly code: AUTH_CODE;

  constructor(err: Error | string, code: AUTH_CODE = AUTH_CODE.NOT_LOGIN) {
    super(err instanceof Error ? err.message : err);
    this.code = code;
  }
}
