import { MUTEX_CODE } from '../constant';

/**
 * 系统原子互斥异常
 *
 * @author JanYork
 * @email <747945307@qq.com>
 * @date 2024/11/28 19:39
 */
export class MutexException extends Error {
  /**
   * 状态码
   */
  public readonly code: MUTEX_CODE;

  constructor(err: Error | string, code: MUTEX_CODE = MUTEX_CODE.SYSTEM_MUTEX) {
    super(err instanceof Error ? err.message : err);
    this.code = code;
  }
}
