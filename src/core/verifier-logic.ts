import { NauthConfiguration, NauthManager, UserDO, IUser } from '.';
import { IDBAdapter } from '../db';
import { removeTokenPrefix, tokenMake } from '../util';
import { NotLoginException } from '../exception';
import { isEmpty } from 'radash';
import { AUTH_CODE } from '../constant';
import { Subject } from 'rxjs';

/**
 * 订阅事件类型
 *
 * @author JanYork
 * @email <747945307@qq.com>
 * @date 2024/11/28 20:31
 */
export enum EVENT_TYPE {
  /**
   * 登录
   */
  LOGIN,
  /**
   * 登出
   */
  LOGOUT,
  /**
   * 过期
   */
  EXPIRED,
  /**
   * 踢出
   */
  KICKOUT,
  /**
   * 触发踢出反馈
   */
  KICKOUT_FEEDBACK,
  /**
   * 全体下线
   */
  OFFLINE_ALL,
}

/**
 * 事件接口
 *
 * @author JanYork
 * @email <747945307@qq.com>
 * @date 2024/11/28 20:32
 */
export interface Event {
  /**
   * 事件类型
   */
  type: EVENT_TYPE;

  /**
   * 事件载体
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
}

/**
 * 鉴权框架的核心逻辑
 *
 * @author JanYork
 * @email <747945307@qq.com>
 * @date 2024/11/25 17:24
 */
export class VerifierLogic {
  /**
   * 认证类型
   */
  public readonly TYPE: string;

  /**
   * 事件主题
   */
  readonly #_subject = new Subject<Event>();

  /**
   * 持久层适配器
   */
  private db: IDBAdapter = NauthManager.dbAdapter;

  /**
   * 系统配置
   */
  private config: NauthConfiguration = NauthManager.configuration;

  /**
   * 构造函数
   *
   * @param type 认证类型
   */
  constructor(type: string) {
    this.TYPE = type;

    // 自身检查
    this.check();

    // 设置核心逻辑处理器到管理器
    NauthManager.setLogic(type, this);
  }

  /**
   * 设置配置
   *
   * @param config 配置
   */
  public setConfiguration(config: NauthConfiguration) {
    this.config = config;
  }

  /**
   * 设置持久层适配器
   *
   * @param db 持久层适配器
   */
  public setDBAdapter(db: IDBAdapter) {
    this.db = db;
  }

  /**
   * 获取事件主题
   *
   * @return {Subject<Event>} 事件主题
   */
  public get subject(): Subject<Event> {
    return this.#_subject;
  }

  /**
   * 订阅事件
   *
   * @param observer 观察者
   */
  public subscribe(observer: (value: Event) => void) {
    this.#_subject.subscribe(observer);
  }

  /**
   * 检查配置
   */
  public check() {
    if (!this.config) {
      throw new Error('The configuration is not set');
    }

    if (!this.db) {
      throw new Error('The database adapter is not set');
    }
  }

  /**
   * 去除Token前缀
   *
   * @param token Token
   */
  public tokenNoPrefix(token: string): string | null {
    if (isEmpty(token)) {
      throw new Error('The token is empty');
    }
    const prefix = this.config!.tokenPrefix;
    if (prefix) {
      return removeTokenPrefix(token, prefix);
    }

    return null;
  }

  /**
   * 登录
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  public async login(id: string | number | bigint): Promise<string> {
    const key = `${this.TYPE.toUpperCase()}_LOGIN:${id}`;
    const token = tokenMake(this.config!.tokenStyle);
    const expire = Date.now() + this.config!.tokenTimeout * 1000;
    const user = new UserDO(key, this.TYPE, token, expire);
    await this.db!.save(user);

    this.#_subject.next({
      type: EVENT_TYPE.LOGIN,
      payload: user,
    });

    return token;
  }

  /**
   * 注销
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  public async logout(id: string | number | bigint) {
    if (isEmpty(id)) {
      throw new Error('The id is empty or null');
    }

    const isLogin = await this.isLogin(id);
    if (isLogin) {
      const key = `${this.TYPE.toUpperCase()}_LOGIN:${id}`;
      const user = await this.db!.find(key);

      await this.db!.delete(key);

      this.#_subject.next({
        type: EVENT_TYPE.LOGOUT,
        payload: user,
      });
    }
  }

  /**
   * 踢出
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  public async kickout(id: string | number | bigint) {
    const key = `${this.TYPE.toUpperCase()}_LOGIN:${id}`;
    const user: Partial<IUser> & Pick<IUser, 'id'> = {
      id: key,
      kicked: true,
    };
    await this.db!.update(user);

    this.#_subject.next({
      type: EVENT_TYPE.KICKOUT,
      payload: id,
    });
  }

  /**
   * 封禁
   *
   * @param id 用户唯一标识(string | number | bigint)
   * @param duration 封禁时长(s)
   */
  public async disable(id: string | number | bigint, duration: number = -1) {
    const key = `${this.TYPE.toUpperCase()}_LOGIN:${id}`;

    // 转换为毫秒
    if (duration !== -1 && duration !== 0) {
      duration *= 1000 + Date.now();
    }

    const user: Partial<IUser> & Pick<IUser, 'id'> = {
      id: key,
      disabled: true,
      duration,
    };

    await this.db!.update(user);
  }

  /**
   * 解封
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  public async enable(id: string | number | bigint) {
    const key = `${this.TYPE.toUpperCase()}_LOGIN:${id}`;
    const user: Partial<IUser> & Pick<IUser, 'id'> = {
      id: key,
      disabled: false,
      duration: 0,
    };
    await this.db!.update(user);
  }

  /**
   * 设置长期有效
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  public async permanent(id: string | number | bigint) {
    const key = `${this.TYPE.toUpperCase()}_LOGIN:${id}`;
    const user: Partial<IUser> & Pick<IUser, 'id'> = {
      id: key,
      permanent: true,
    };
    await this.db!.update(user);
  }

  /**
   * 设置非长期有效
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  public async nonPermanent(id: string | number | bigint) {
    const key = `${this.TYPE.toUpperCase()}_LOGIN:${id}`;
    const user: Partial<IUser> & Pick<IUser, 'id'> = {
      id: key,
      permanent: false,
    };
    await this.db!.update(user);
  }

  /**
   * 是否登录
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  public async isLogin(id: string | number | bigint): Promise<boolean> {
    try {
      await this.checkLogin(id);
      return true;
    } catch (e) {
      if (e instanceof NotLoginException) {
        return false;
      }

      throw e;
    }
  }

  /**
   * 检查登录
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  public async checkLogin(id: string | number | bigint) {
    const hasKey = await this.db!.exists(
      `${this.TYPE.toUpperCase()}_LOGIN:${id}`,
    );
    if (!hasKey) {
      throw new NotLoginException(
        'The user is not logged in',
        AUTH_CODE.NOT_LOGIN,
      );
    }

    const user = await this.db!.find(`${this.TYPE.toUpperCase()}_LOGIN:${id}`);
    if (user === null) {
      throw new NotLoginException(
        'The user is not logged in',
        AUTH_CODE.NOT_LOGIN,
      );
    }

    // 已被踢出
    if (user.kicked) {
      const user = await this.db!.find(
        `${this.TYPE.toUpperCase()}_LOGIN:${id}`,
      );

      await this.cleanLogin(id);

      this.#_subject.next({
        type: EVENT_TYPE.KICKOUT_FEEDBACK,
        payload: user,
      });

      throw new NotLoginException(
        'The user is kicked out',
        AUTH_CODE.KICKED_OUT,
      );
    }

    // 是否已经过期
    if (user.expireTime! < Date.now() && !user.permanent) {
      await this.cleanLogin(id);

      this.#_subject.next({
        type: EVENT_TYPE.EXPIRED,
        payload: id,
      });

      throw new NotLoginException(
        'The user is expired',
        AUTH_CODE.LOGIN_EXPIRED,
      );
    }

    // 是否需要续期
    if (this.needRenew(user)) {
      await this.renew(id);
    }
  }

  /**
   * 下线所有
   */
  public async offlineFull() {
    await this.db.deleteFull(`${this.TYPE.toUpperCase()}_LOGIN`);

    this.#_subject.next({
      type: EVENT_TYPE.OFFLINE_ALL,
      payload: null,
    });
  }

  /**
   * 清理登录缓存
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  public async cleanLogin(id: string | number | bigint) {
    const isLogin = await this.db!.exists(
      `${this.TYPE.toUpperCase()}_LOGIN:${id}`,
    );
    if (isLogin) {
      await this.db!.delete(`${this.TYPE.toUpperCase()}_LOGIN:${id}`);
    }
  }

  /**
   * 是否需要续期
   *
   * @param user 用户信息
   */
  public needRenew(user: IUser) {
    return (
      user.expireTime! - Date.now() < this.config!.tokenRenewCondition * 1000
    );
  }

  /**
   * 续期
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  public async renew(id: string | number | bigint) {
    const user = await this.db!.find(`${this.TYPE.toUpperCase()}_LOGIN:${id}`);
    if (user === null) {
      throw new NotLoginException('The user is not logged in');
    }

    user.renewCount += 1;
    user.expireTime = user.expireTime! + this.config!.tokenRenew * 1000;

    await this.db!.update(user);
  }

  /**
   * 检查封禁
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  public async checkDisable(id: string | number | bigint) {
    await this.checkLogin(id);

    const user = await this.db!.find(`${this.TYPE.toUpperCase()}_LOGIN:${id}`);
    if (user!.disabled) {
      // 永久封禁
      if (user!.duration === -1) {
        throw new NotLoginException(
          'The user is permanently disabled',
          AUTH_CODE.BANNED,
        );
      }

      // 封禁时间已过
      if (!(user!.duration > Date.now()) || user!.duration === 0) {
        // 解除封禁
        await this.enable(id);
        return;
      }

      // 封禁时间未过
      throw new NotLoginException(
        'The user is disabled now',
        AUTH_CODE.SHORT_BAN,
      );
    }
  }

  /**
   * 获取用户token
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  public async tokenValue(
    id: string | number | bigint,
  ): Promise<string | undefined | null> {
    return await this.db!.field(
      `${this.TYPE.toUpperCase()}_LOGIN:${id}`,
      'token',
    );
  }

  /**
   * 使用Token获取用户ID
   *
   * @param token 用户Token
   */
  public async loginID(token: string): Promise<string | null> {
    const key = await this.db!.key(token, this.TYPE);
    if (key === null) {
      return null;
    }

    return key.split(':').slice(2).join(':');
  }

  /**
   * 获取用户超时时间
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  public async timeout(id: string | number | bigint): Promise<number | null> {
    const value = await this.db!.field(
      `${this.TYPE.toUpperCase()}_LOGIN:${id}`,
      'expireTime',
    );
    if (isEmpty(value)) {
      return null;
    }

    return Number(value);
  }

  /**
   * 获取用户剩余时间(s)
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  public async remain(id: string | number | bigint): Promise<number | null> {
    const value = await this.timeout(id);
    if (!value) {
      return null;
    }

    return Math.floor((value - Date.now()) / 1000);
  }

  /**
   * 获取用户信息
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  public async info(id: string | number | bigint): Promise<UserDO | null> {
    return await this.db!.find(`${this.TYPE.toUpperCase()}_LOGIN:${id}`);
  }

  /**
   * 获取用户信息上下文
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  public async ctx<T = Record<string, string>>(
    id: string | number | bigint,
  ): Promise<T> {
    return (await this.db!.ctx(`${this.TYPE.toUpperCase()}_LOGIN:${id}`)) as T;
  }

  /**
   * 设置用户信息上下文
   *
   * @param id 用户唯一标识(string | number | bigint)
   * @param key 键
   * @param value 值
   */
  public async set(id: string | number | bigint, key: string, value: string) {
    await this.db!.set(`${this.TYPE.toUpperCase()}_LOGIN:${id}`, key, value);
  }

  /**
   * 清空用户信息上下文
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  public async clear(id: string | number | bigint) {
    await this.db!.clear(`${this.TYPE.toUpperCase()}_LOGIN:${id}`);
  }

  /**
   * 删除用户信息上下文中某值
   *
   * @param id 用户唯一标识(string | number | bigint)
   * @param key 键
   */
  public async del(id: string | number | bigint, key: string) {
    await this.db!.del(`${this.TYPE.toUpperCase()}_LOGIN:${id}`, key);
  }
}
