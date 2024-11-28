/**
 * 鉴权框架配置
 *
 * @author JanYork
 * @email <747945307@qq.com>
 * @date 2024/11/25 15:43
 */
export class NauthConfiguration {
  constructor(config?: Partial<NauthConfiguration>) {
    if (config) {
      Object.assign(this, config);
    }
  }

  /**
   * Token 名称
   */
  public readonly tokenName: string = 'token';

  /**
   * Token 有效时长 (单位s)
   */
  public readonly tokenTimeout = 3 * 24 * 60 * 60;

  /**
   * Token 样式 (UUID | SIMPLE_UUID | NANO_ID | RANDOM_STR)
   */
  public readonly tokenStyle:
    | 'UUID'
    | 'SIMPLE_UUID'
    | 'NANO_ID'
    | 'RANDOM_STR' = 'UUID';

  /**
   * Token 前缀
   */
  public readonly tokenPrefix: string = 'Bearer ';

  /**
   * Token 续签时长 (单位s)，在过期时间内续签
   */
  public readonly tokenRenew = 24 * 60 * 60;

  /**
   * Token 续签条件 (单位s)，在距离过期时间小于该值时触发续签
   */
  public readonly tokenRenewCondition = 12 * 60 * 60;
}
