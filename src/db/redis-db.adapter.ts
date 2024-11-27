import { IDBAdapter } from '.';
import Redis from 'ioredis';
import { UserDO, IUser } from '../core';
import { isEmpty } from 'radash';
import { DbStorageException } from '../exception';
import { isRmultiHasErr } from '../util';

/**
 * Redis 持久化适配器
 *
 * @author JanYork
 * @email <747945307@qq.com>
 * @date 2024/11/25 17:12
 */
export class RedisDBAdapter implements IDBAdapter {
  /**
   * Redis 客户端
   * @private
   */
  readonly #_redis: Redis;

  /**
   * Redis key 前缀
   */
  public readonly _prefix = 'NAUTH';

  /**
   * 构造函数
   * @param redis Redis 客户端
   */
  constructor(redis: Redis) {
    this.#_redis = redis;
  }

  /**
   * 缓存认证用户信息
   *
   * @param user 用户信息
   */
  async save(user: UserDO): Promise<void> {
    UserDO.checkNewUser(user);

    const id = user.id;
    const ctx = user.ctx ? Object.entries(user.ctx) : [];
    const values = Object.entries(user).filter(([key]) => key !== 'ctx');
    const keyExpire = user.permanent
      ? null
      : user.expireTime + 24 * 60 * 60 * 1000 - Date.now();

    const multi = this.#_redis.multi();

    for (const [key, value] of values) {
      multi.hset(`${this._prefix}:${id}`, key, value);
    }
    if (keyExpire !== null) {
      multi.pexpire(`${this._prefix}:${id}`, keyExpire);
    }

    if (!isEmpty(ctx)) {
      for (const [key, value] of ctx) {
        multi.hset(`${this._prefix}:${id}:CTX`, key, value);
      }
      if (keyExpire !== null) {
        multi.pexpire(`${this._prefix}:${id}:CTX`, keyExpire);
      }
    }

    // 建立双向索引链，token -> user_id, user_id -> token
    multi.set(`${this._prefix}:LOGIN:${user.token}`, id);
    if (keyExpire !== null) {
      multi.pexpire(`${this._prefix}:LOGIN:${user.token}`, keyExpire);
    }

    const result = await multi.exec();
    if (result === null) {
      throw new DbStorageException('The redis transaction was aborted');
    }

    const err = isRmultiHasErr(result);
    if (err !== null) {
      throw new DbStorageException(err);
    }
  }

  /**
   * 查找用户信息
   *
   * @param id 用户唯一标识
   */
  async find(id: string): Promise<UserDO | null> {
    const result = await this.#_redis.hgetall(`${this._prefix}:${id}`);
    if (isEmpty(result)) {
      return null;
    }

    return UserDO.convert(result);
  }

  /**
   * 更新用户信息
   *
   * @param user 用户信息
   */
  async update(user: Partial<IUser> & Pick<IUser, 'id'>): Promise<void> {
    const id = user.id;
    user.updateTime = Date.now();
    const values = Object.entries(user).filter(
      ([key]) => key !== 'id' && key !== 'ctx'
    );
    const dbUser = await this.find(id);
    if (isEmpty(dbUser)) {
      throw new DbStorageException('The user does not exist');
    }

    const multi = this.#_redis.multi();

    // 是否转变为长期有效/取消长期有效
    if (values.some(([key]) => key === 'permanent')) {
      // 转变
      if (user.permanent === true) {
        multi.persist(`${this._prefix}:${id}`);
        // token key
        const tkKey = `${this._prefix}:LOGIN:${dbUser!.token}`;
        multi.persist(tkKey);

        // ctx key
        const ctxKey = `${this._prefix}:${id}:CTX`;
        const hasCtx = await this.#_redis.exists(ctxKey);
        if (hasCtx) {
          multi.persist(ctxKey);
        }
      }

      // 取消
      if (user.permanent === false) {
        const keyExpire =
          dbUser!.expireTime! + 24 * 60 * 60 * 1000 - Date.now();
        multi.pexpire(`${this._prefix}:${id}`, keyExpire);

        // token key
        const tkKey = `${this._prefix}:LOGIN:${dbUser!.token}`;
        multi.pexpire(tkKey, keyExpire);

        // ctx key
        const ctxKey = `${this._prefix}:${id}:CTX`;
        const hasCtx = await this.#_redis.exists(ctxKey);
        if (hasCtx) {
          multi.pexpire(ctxKey, keyExpire);
        }
      }
    }

    // 是否改变过期时间
    if (values.some(([key]) => key === 'expireTime')) {
      const keyExpire = user.expireTime! + 24 * 60 * 60 * 1000 - Date.now();
      multi.pexpire(`${this._prefix}:${id}`, keyExpire);

      // token key
      const tkKey = `${this._prefix}:LOGIN:${dbUser!.token}`;
      multi.pexpire(tkKey, keyExpire);

      // ctx key
      const ctxKey = `${this._prefix}:${id}:CTX`;
      const hasCtx = await this.#_redis.exists(ctxKey);
      if (hasCtx) {
        multi.pexpire(ctxKey, keyExpire);
      }
    }

    for (const [key, value] of values) {
      multi.hset(`${this._prefix}:${id}`, key, value as never);
    }

    const result = await multi.exec();
    if (result === null) {
      throw new DbStorageException('The redis transaction was aborted');
    }

    const err = isRmultiHasErr(result);
    if (err !== null) {
      throw new DbStorageException(err);
    }
  }

  /**
   * 删除用户信息
   *
   * @param id 用户唯一标识
   */
  async delete(id: string): Promise<void> {
    const result = await this.#_redis.del(`${this._prefix}:${id}`);
    if (result === null || result === 0) {
      throw new DbStorageException(
        'The redis delete operation failed, the user does not exist or network error'
      );
    }
  }

  /**
   * 是否存在用户信息
   *
   * @param id 用户唯一标识
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.#_redis.exists(`${this._prefix}:${id}`);
    return result === 1;
  }

  /**
   * 获取用户信息的单个属性值
   *
   * @param id 用户唯一标识
   * @param field 字段名称
   */
  async field<T extends Exclude<keyof UserDO, 'ctx'>>(
    id: string,
    field: T
  ): Promise<UserDO[T] | null> {
    const result = await this.#_redis.hget(`${this._prefix}:${id}`, field);
    return result as UserDO[T] | null;
  }

  // ---------------------------------------------------------------------

  /**
   * 获取用户信息上下文
   *
   * @param id 用户唯一标识
   */
  async ctx(id: string): Promise<Record<string, string>> {
    return this.#_redis.hgetall(`${this._prefix}:${id}:CTX`);
  }

  /**
   * 设置用户信息上下文
   *
   * @param id 用户唯一标识
   * @param key 键
   * @param value 值
   */
  async set(id: string, key: string, value: string): Promise<void> {
    await this.#_redis.hset(`${this._prefix}:${id}:CTX`, key, value);
  }

  /**
   * 清空用户信息上下文
   *
   * @param id 用户唯一标识
   */
  async clear(id: string): Promise<void> {
    await this.#_redis.del(`${this._prefix}:${id}:CTX`);
  }

  /**
   * 删除用户信息上下文中某值
   *
   * @param id 用户唯一标识
   * @param key 键
   */
  async del(id: string, key: string): Promise<void> {
    await this.#_redis.hdel(`${this._prefix}:${id}:CTX`, key);
  }

  /**
   * 获取用户信息上下文中某值
   *
   * @param id 用户唯一标识
   * @param key 键
   */
  async get(id: string, key: string): Promise<UserDO | null> {
    const result = await this.#_redis.hget(`${this._prefix}:${id}:CTX`, key);
    return result as UserDO | null;
  }

  /**
   * 通过Token获取用户Key
   *
   * @param token
   */
  async key(token: string): Promise<string | null> {
    const key = `${this._prefix}:LOGIN:${token}`;
    const result = await this.#_redis.get(key);
    return result ? `${this._prefix}:${result}` : null;
  }
}
