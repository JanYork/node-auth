/**
 * 用户会话
 *
 * @author JanYork
 * @email <747945307@qq.com>
 * @date 2024/11/25 14:39
 */
export class Session {
  /**
   * 存储用户对象时建议使用的 key
   */
  public static readonly USER = 'USER';

  /**
   * 存储角色列表时建议使用的 key
   */
  public static readonly ROLE_LIST = 'ROLE_LIST';

  /**
   * 存储权限列表时建议使用的 key
   */
  public static readonly PERMISSION_LIST = 'PERMISSION_LIST';
}
