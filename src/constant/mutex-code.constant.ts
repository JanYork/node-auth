/**
 * 系统互斥错误码
 *
 * @author JanYork
 * @email <747945307@qq.com>
 * @date 2024/11/28 19:43
 */
export enum MUTEX_CODE {
  /**
   * 系统互斥
   */
  SYSTEM_MUTEX = '2001',
  /**
   * 获取锁超时
   */
  LOCK_TIMEOUT = '2002',
  /**
   * 释放锁失败
   */
  UNLOCK_FAILED = '2003',
}
