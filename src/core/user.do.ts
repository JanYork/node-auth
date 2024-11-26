import { IUser } from './user.interface';

/**
 * 用户数据对象
 *
 * @author JanYork
 * @email <747945307@qq.com>
 * @date 2024/11/25 16:33
 */
export class UserDO implements IUser {
  constructor(
    id: string,
    loginType: string,
    token: string,
    expireTime?: number
  ) {
    this.id = id;
    this.expireTime = expireTime || 15 * 24 * 60 * 60 * 1000 + Date.now();
    this.type = loginType;
    this.token = token;
  }

  /**
   * 用户唯一标识
   */
  id: string;

  /**
   * 登录类型
   */
  type: string;

  /**
   * 认证token
   */
  token: string;

  /**
   * 创建时间
   */
  createTime: number = Date.now();

  /**
   * 更新时间
   */
  updateTime: number = Date.now();

  /**
   * 过期时间
   */
  expireTime: number;

  /**
   * 续期次数
   */
  renewCount: number = 0;

  /**
   * 是否封禁
   */
  disabled: boolean = false;

  /**
   * 封禁时长(s)，-1表示永久封禁，0表示解封，如果DB层适配器不支持永久封禁，那么该字段对永久封禁无效。
   */
  duration: number = 0;

  /**
   * 是否被踢出
   */
  kicked: boolean = false;

  /**
   * 是否长期有效
   */
  permanent: boolean = false;

  /**
   * 用户上下文(其他信息)
   */
  ctx?: Record<string, string>;

  /**
   * 检查新建的用户数据是否有效（在初始化时）
   *
   * @param user 用户数据
   */
  static checkNewUser(user: UserDO) {
    if (!user) {
      throw new Error('The user is not exist');
    }

    if (user.expireTime && user.expireTime < Date.now()) {
      throw new Error('The expire time does not less than now');
    }

    if (user.expireTime && user.expireTime - Date.now() < 30 * 60 * 1000) {
      throw new Error('The expire time does not less than 30 minutes');
    }
  }

  /**
   * 检查更新的用户数据是否有效（在更新时）
   *
   * @param rc 用户数据
   */
  static convert(rc: Record<string, string>) {
    const user = new UserDO(rc.id, rc.type, rc.token, Number(rc.expireTime));
    user.createTime = Number(rc.createTime);
    user.updateTime = Number(rc.updateTime);
    user.renewCount = Number(rc.renewCount);
    user.duration = Number(rc.duration);
    user.kicked = rc.kicked === 'true';
    user.disabled = rc.disabled === 'true';
    user.permanent = rc.permanent === 'true';
    return user;
  }
}
