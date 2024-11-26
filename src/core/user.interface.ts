/**
 * 用户接口
 *
 * @author JanYork
 * @email <747945307@qq.com>
 * @date 2024/11/25 21:11
 */
export interface IUser {
  /**
   * 用户唯一标识
   */
  id: string;

  /**
   * 登录类型
   */
  type: string;

  /**
   * 创建时间
   */
  createTime: number;

  /**
   * 更新时间
   */
  updateTime: number;

  /**
   * 过期时间
   */
  expireTime?: number;

  /**
   * 续期次数
   */
  renewCount: number;

  /**
   * 是否封禁
   */
  disabled: boolean;

  /**
   * 封禁时长(s)
   */
  duration: number;

  /**
   * 是否被踢出
   */
  kicked: boolean;

  /**
   * 是否长期有效
   */
  permanent: boolean;

  /**
   * 用户上下文(其他信息)
   */
  ctx?: Record<string, string>;
}
