/**
 * 持久化存储异常
 *
 * @author JanYork
 * @email <747945307@qq.com>
 * @date 2024/11/25 17:19
 */
export class DbStorageException extends Error {
  constructor(err: Error | string) {
    super(err instanceof Error ? err.message : err);
  }
}
