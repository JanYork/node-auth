import { IDBAdapter } from '.';
import Redis from 'ioredis';
import { IUser, UserDO } from '../core';
import { isEmpty } from 'radash';
import { DbStorageException } from '../exception';
import { isRmultiHasErr } from '../util';
import { v4 as uuid } from 'uuid';
import { MutexException } from '../exception/mutex.exception';
import { MUTEX_CODE } from '../constant';

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
   * 删除全局锁
   * @private
   */
  readonly #_fullLock = 'NAUTH:FULL:LOCK';

  /**
   * 构造函数
   * @param redis Redis 客户端
   */
  constructor(redis: Redis) {
    this.#_redis = redis;
  }

  /**
   * 公平锁策略
   *
   * @param id 用户唯一标识
   * @param lockTimeout 锁的超时时间（毫秒）
   * @param acquireTimeout 获取锁的超时时间（毫秒）
   * @return 释放锁的函数
   */
  public async acquireLock(
    id: string,
    lockTimeout: number = 5000,
    acquireTimeout: number = 1500
  ) {
    // 用户的等待队列
    const queueKey = `${this._prefix}:${id}:fair`;
    // 锁的键
    const lockKey = `${this._prefix}:${id}:lock`;

    const lockValue = uuid();

    const timeout = Date.now() + acquireTimeout;

    // 将当前请求加入到队列
    await this.#_redis.lpush(queueKey, lockValue);

    // 阻塞式等待直到这个请求排到队列前面
    while (true) {
      // 获取队列第一个的锁值
      const frontLockValue = await this.#_redis.lindex(queueKey, 0);

      if (frontLockValue === lockValue) {
        // 这个请求排在队列前面，尝试获取锁
        const result = await this.#_redis.set(
          lockKey,
          lockValue,
          'PX',
          lockTimeout,
          'NX'
        );

        if (result === 'OK') {
          // 获取锁成功，返回释放锁的函数
          return async () => {
            await this.releaseLock(id);
          };
        }
      }

      // 检查超时，如果已经超过最大等待时间，则返回失败
      if (Date.now() > timeout) {
        throw new MutexException(
          'Failed to acquire lock within the timeout period',
          MUTEX_CODE.LOCK_TIMEOUT
        );
      }

      // 等待一段时间，防止频繁轮询，减轻资源消耗
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * 释放公平锁
   *
   * @param id 用户唯一标识
   */
  public async releaseLock(id: string): Promise<void> {
    const lockKey = `${this._prefix}:${id}:lock`;
    const queueKey = `${this._prefix}:${id}:fair`;

    const multi = this.#_redis.multi();
    // 删除锁
    multi.del(lockKey);
    // 锁释放后，移除队列中的前一个元素
    multi.lpop(queueKey);

    const result = await multi.exec();
    if (result === null) {
      throw new MutexException(
        'The redis transaction was aborted',
        MUTEX_CODE.UNLOCK_FAILED
      );
    }

    const err = isRmultiHasErr(result);
    if (err !== null) {
      throw new MutexException(err, MUTEX_CODE.UNLOCK_FAILED);
    }
  }

  /**
   * 检查全局锁
   */
  public async checkFullLock() {
    return (await this.#_redis.exists(this.#_fullLock)) === 1;
  }

  /**
   * 全局锁锁定
   */
  public async acquireFullLock(
    lockTimeout: number = 5000,
    acquireTimeout: number = 1500
  ) {
    const lockValue = uuid();
    const timeout = Date.now() + acquireTimeout;

    while (true) {
      const result = await this.#_redis.set(
        this.#_fullLock,
        lockValue,
        'PX',
        lockTimeout,
        'NX'
      );

      if (result === 'OK') {
        return async () => {
          await this.releaseFullLock();
        };
      }

      if (Date.now() > timeout) {
        throw new MutexException(
          'Failed to acquire full lock within the timeout period',
          MUTEX_CODE.LOCK_TIMEOUT
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * 释放全局锁
   */
  public async releaseFullLock() {
    await this.#_redis.del(this.#_fullLock).catch(() => {
      throw new MutexException(
        'Failed to release full lock',
        MUTEX_CODE.UNLOCK_FAILED
      );
    });
  }

  /**
   * 自动加锁
   *
   * @param id 用户唯一标识
   * @param callback 回调函数
   * @param lockTimeout 锁的超时时间（毫秒）
   * @param acquireTimeout 获取锁的超时时间（毫秒）
   */
  public async autoLock<T>(
    id: string | string[],
    callback: () => Promise<T>,
    lockTimeout: number = 5000,
    acquireTimeout: number = 1500
  ) {
    if (await this.checkFullLock()) {
      throw new MutexException(
        'The full lock is already locked',
        MUTEX_CODE.SYSTEM_MUTEX
      );
    }

    // 如果是数组，就需要按照顺序依次获取锁
    if (Array.isArray(id)) {
      const releases: Array<() => Promise<void>> = [];

      // 依次获取锁
      for (const i of id) {
        const release = await this.acquireLock(i, lockTimeout, acquireTimeout);
        releases.push(release);
      }

      try {
        return await callback();
      } finally {
        await Promise.all(releases.map((r) => r()));
      }
    } else {
      // 否则直接获取锁
      const release = await this.acquireLock(id, lockTimeout, acquireTimeout);
      try {
        return await callback();
      } finally {
        await release();
      }
    }
  }

  /**
   * 缓存认证用户信息
   *
   * @param user 用户信息
   */
  async save(user: UserDO): Promise<void> {
    await this.autoLock(user.id, async () => {
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
      multi.set(
        `${this._prefix}:${user.type.toUpperCase()}_LOGIN:LOGIN:${user.token}`,
        id
      );
      if (keyExpire !== null) {
        multi.pexpire(
          `${this._prefix}:${user.type.toUpperCase()}_LOGIN:LOGIN:${user.token}`,
          keyExpire
        );
      }

      const result = await multi.exec();
      if (result === null) {
        throw new DbStorageException('The redis transaction was aborted');
      }

      const err = isRmultiHasErr(result);
      if (err !== null) {
        throw new DbStorageException(err);
      }
    });
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
    await this.autoLock(user.id, async () => {
      const id = user.id;
      user.updateTime = Date.now();
      const values = Object.entries(user).filter(
        ([key]) => key !== 'id' && key !== 'ctx'
      );
      const dbUser = await this.find(id);
      if (!dbUser) {
        throw new DbStorageException('The user does not exist');
      }

      const multi = this.#_redis.multi();

      // 是否转变为长期有效/取消长期有效
      if (values.some(([key]) => key === 'permanent')) {
        // 转变
        if (user.permanent === true) {
          multi.persist(`${this._prefix}:${id}`);
          // token key
          const tkKey = `${this._prefix}:${dbUser.type.toUpperCase()}_LOGIN:LOGIN:${dbUser!.token}`;
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
          const tkKey = `${this._prefix}:${dbUser.type.toUpperCase()}_LOGIN:LOGIN:${dbUser!.token}`;
          multi.pexpire(tkKey, keyExpire);

          // ctx key
          const ctxKey = `${this._prefix}:${id}:CTX`;
          const hasCtx = await this.#_redis.exists(ctxKey);
          if (hasCtx) {
            multi.pexpire(ctxKey, keyExpire);
          }
        }
      }

      // 是否改变过期时间并且不是长期有效
      if (
        values.some(([key]) => key === 'expireTime') &&
        (!dbUser.permanent || user.permanent === false)
      ) {
        const keyExpire = user.expireTime! + 24 * 60 * 60 * 1000 - Date.now();
        multi.pexpire(`${this._prefix}:${id}`, keyExpire);

        // token key
        const tkKey = `${this._prefix}:${dbUser.type.toUpperCase()}_LOGIN:LOGIN:${dbUser!.token}`;
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
    });
  }

  /**
   * 删除用户信息
   *
   * @param id 用户唯一标识
   */
  async delete(id: string): Promise<void> {
    await this.autoLock(id, async () => {
      if (!(await this.exists(id))) {
        throw new DbStorageException(
          'The redis delete operation failed, the user does not exist or network error'
        );
      }
      const token = await this.field(id, 'token');
      const type = await this.field(id, 'type');

      if (!token || !type) {
        throw new DbStorageException(
          'The redis delete operation failed due to missing token or type'
        );
      }

      const multi = this.#_redis.multi();
      multi.del(`${this._prefix}:${id}`);
      // 删除双向索引链
      multi.del(`${this._prefix}:${type.toUpperCase()}_LOGIN:LOGIN:${token}`);
      // 如果有上下文，删除上下文，否则不删除
      multi.del(`${this._prefix}:${id}:CTX`);

      const result = await multi.exec();

      if (result === null) {
        throw new DbStorageException('The redis transaction was aborted');
      }

      const err = isRmultiHasErr(result);
      if (err !== null) {
        throw new DbStorageException(err);
      }
    });
  }

  /**
   * 删除所有用户信息
   */
  async deleteFull(key: string): Promise<void> {
    const lock = await this.acquireFullLock();
    try {
      const keys = await this.#_redis.keys(`${this._prefix}:${key}*`);
      if (keys.length) {
        await this.#_redis.del(...keys);
      }
    } finally {
      await lock();
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
    await this.autoLock(id, async () => {
      // 如果用户不存在，抛出异常
      if (!(await this.exists(id))) {
        throw new DbStorageException('The user does not exist');
      }
      const user = await this.find(id);

      // 如果是长期有效，不设置过期时间
      const keyExpire = user!.permanent
        ? null
        : user!.expireTime! + 24 * 60 * 60 * 1000 - Date.now();

      // 是否已经有上下文
      const hasCtx = await this.#_redis.exists(`${this._prefix}:${id}:CTX`);

      const multi = this.#_redis.multi();
      multi.hset(`${this._prefix}:${id}:CTX`, key, value);

      // 如果是第一次设置上下文，并且不是长期有效，设置过期时间
      if (keyExpire !== null && !hasCtx) {
        multi.pexpire(`${this._prefix}:${id}:CTX`, keyExpire);
      }

      const result = await multi.exec();
      if (result === null) {
        throw new DbStorageException('The redis transaction was aborted');
      }

      const err = isRmultiHasErr(result);
      if (err !== null) {
        throw new DbStorageException(err);
      }
    });
  }

  /**
   * 清空用户信息上下文
   *
   * @param id 用户唯一标识
   */
  async clear(id: string): Promise<void> {
    await this.autoLock(id, async () => {
      await this.#_redis.del(`${this._prefix}:${id}:CTX`);
    });
  }

  /**
   * 删除用户信息上下文中某值
   *
   * @param id 用户唯一标识
   * @param key 键
   */
  async del(id: string, key: string): Promise<void> {
    await this.autoLock(id, async () => {
      await this.#_redis.hdel(`${this._prefix}:${id}:CTX`, key);
    });
  }

  /**
   * 获取用户信息上下文中某值
   *
   * @param id 用户唯一标识
   * @param key 键
   */
  async get(id: string, key: string): Promise<string | null> {
    return this.#_redis.hget(`${this._prefix}:${id}:CTX`, key);
  }

  /**
   * 通过Token获取用户Key
   *
   * @param token 用户Token
   * @param type 用户类型
   */
  async key(token: string, type: string): Promise<string | null> {
    const key = `${this._prefix}:${type.toUpperCase()}_LOGIN:LOGIN:${token}`;
    const result = await this.#_redis.get(key);
    return result ? `${this._prefix}:${result}` : null;
  }
}
