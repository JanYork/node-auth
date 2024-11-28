/**
 * 权限错误码
 *
 * @author JanYork
 * @email <747945307@qq.com>
 * @date 2024/11/27 20:01
 */
export enum AUTH_CODE {
  /**
   * 未登录
   */
  NOT_LOGIN = '1001',
  /**
   * 无权限
   */
  NOT_PERMISSION = '1002',
  /**
   * 登录过期
   */
  LOGIN_EXPIRED = '1003',
  /**
   * 被踢出
   */
  KICKED_OUT = '1004',
  /**
   * 封禁
   */
  BANNED = '1005',
  /**
   * 短时间禁用
   */
  SHORT_BAN = '1006',
}
