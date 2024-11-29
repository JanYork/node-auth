import { UserDO } from '../core';
import { IUser } from '../core';

/**
 * 认证信息持久化适配器接口
 *
 * @author JanYork
 * @email <747945307@qq.com>
 * @date 2024/11/25 15:09
 */
export interface IDBAdapter {
  /**
   * 存储认证信息
   *
   * @param user 用户数据对象
   */
  save(user: UserDO): Promise<void>;

  /**
   * 查找认证信息
   *
   * @param id 用户唯一标识
   */
  find(id: string): Promise<UserDO | null>;

  /**
   * 更新认证信息
   *
   * @param user 用户数据对象
   */
  update(user: Partial<IUser> & Pick<IUser, 'id'>): Promise<void>;

  /**
   * 删除认证信息
   *
   * @param id 用户唯一标识
   */
  delete(id: string): Promise<void>;

  /**
   * 删除所有认证信息
   */
  deleteFull(key: string): Promise<void>;

  /**
   * 是否存在用户的认证信息
   *
   * @param id 用户唯一标识
   */
  exists(id: string): Promise<boolean>;

  /**
   * 反向索引，使用Token获取用户信息Key
   *
   * @param token 用户Token
   */
  key(token: string): Promise<string | null>;

  /**
   * 获取认证信息的单个属性值
   *
   * @param id 用户唯一标识
   * @param field 字段名称
   * @example
   * getField(1, 'username') => 'JanYork'
   * getField(1, 'email') => 'jan.york@example.com'
   */
  field<T extends Exclude<keyof UserDO, 'ctx'>>(
    id: string,
    field: T
  ): Promise<UserDO[T] | null>;

  /**
   * 获取认证信息上下文
   *
   * @param id 用户唯一标识
   */
  ctx(id: string): Promise<Record<string, string>>;

  /**
   * 设置认证信息上下文
   *
   * @param id 用户唯一标识
   * @param key 键
   * @param value 值
   */
  set(id: string, key: string, value: string): Promise<void>;

  /**
   * 清空认证信息上下文
   *
   * @param id 用户唯一标识
   */
  clear(id: string): Promise<void>;

  /**
   * 删除认证信息上下文中某值
   *
   * @param id 用户唯一标识
   * @param key 键
   */
  del(id: string, key: string): Promise<void>;

  /**
   * 获取认证信息上下文中某值
   *
   * @param id 用户唯一标识
   * @param key 键
   */
  get(id: string, key: string): Promise<string | null>;
}
