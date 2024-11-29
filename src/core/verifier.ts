import { VerifierLogic } from './verifier-logic';

/**
 * 权限校验器
 *
 * @author JanYork
 * @email <747945307@qq.com>
 * @date 2024/11/25 14:12
 */
export class Verifier {
  /**
   * 认证类型，允许子类覆盖
   */
  static readonly TYPE: string = 'user';

  /**
   * 核心逻辑处理器
   */
  static _logic: VerifierLogic;

  /**
   * 获取核心逻辑处理器
   */
  static get logic() {
    if (!Verifier._logic) {
      Verifier.init();
    }
    return Verifier._logic;
  }

  /**
   * 设置核心逻辑处理器
   *
   * @param logic 核心逻辑处理器
   */
  static set logic(logic: VerifierLogic) {
    Verifier._logic = logic;
  }

  /**
   * 获取事件主题
   */
  static get subject() {
    return this.logic.subject;
  }

  /**
   * 初始化逻辑核心
   */
  static init() {
    this.logic = new VerifierLogic(this.TYPE);
  }

  /**
   * 登录
   *
   * @param id 用户唯一标识(string | number | bigint)
   * @return Token
   * @exception {DbStorageException} 删除数据时异常(网络失败)
   */
  static async login(id: string | number | bigint): Promise<string> {
    return this.logic.login(id);
  }

  /**
   * 注销
   *
   * @param id 用户唯一标识(string | number | bigint)
   * @exception {DbStorageException} 删除数据时异常(网络失败/数据不存在等)
   */
  static async logout(id: string | number | bigint) {
    await this.logic.logout(id);
  }

  /**
   * 踢出
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  static async kickout(id: string | number | bigint) {
    await this.logic.kickout(id);
  }

  /**
   * 封禁
   *
   * @param id 用户唯一标识(string | number | bigint)
   * @param duration 封禁时长(s)，-1永久封禁，如果DB适配器无法支持永久封禁(完全持久化)，那么该字段对永久封禁无效。
   */
  static async disable(id: string | number | bigint, duration?: number) {
    await this.logic.disable(id, duration);
  }

  /**
   * 解封
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  static async enable(id: string | number | bigint) {
    await this.logic.enable(id);
  }

  /**
   * 设置长期有效
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  static async setLongTermValid(id: string | number | bigint) {
    await this.logic.permanent(id);
  }

  /**
   * 移除长期有效
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  static async removeLongTermValid(id: string | number | bigint) {
    await this.logic.nonPermanent(id);
  }

  /**
   * 下线所有用户
   */
  static async offlineFull() {
    await this.logic.offlineFull();
  }

  /**
   * 是否登录，不校验封禁
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  static async isLogin(id: string | number | bigint): Promise<boolean> {
    return this.logic.isLogin(id);
  }

  /**
   * 检查登录，不校验封禁
   *
   * @param id 用户唯一标识(string | number | bigint)
   * @throws {NotLoginException} 未能通过登录认证校验
   */
  static async checkLogin(id: string | number | bigint) {
    return this.logic.checkLogin(id);
  }

  /**
   * 检查封禁
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  static async checkDisable(id: string | number | bigint) {
    return this.logic.checkDisable(id);
  }

  /**
   * 获取用户Token
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  static async tokenValue(
    id: string | number | bigint
  ): Promise<string | undefined | null> {
    return this.logic.tokenValue(id);
  }

  /**
   * 获取登录ID
   *
   * @param token 用户Token
   */
  static async loginID(token: string): Promise<string | null> {
    return this.logic.loginID(token);
  }

  /**
   * 获取约定的超时时间(ms timestamp)
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  static async timeout(id: string | number | bigint): Promise<number | null> {
    return this.logic.timeout(id);
  }

  /**
   * 获取剩余有效时间(s)
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  static async remainingExpirationTime(
    id: string | number | bigint
  ): Promise<number | null> {
    return this.logic.remain(id);
  }

  /**
   * 获取用户信息
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  static async info<T>(id: string | number | bigint): Promise<T | null> {
    return (await this.logic.info(id)) as T;
  }

  /**
   * 去除Token前缀
   *
   * @param token Token
   */
  static tokenNoPrefix(token: string): string | null {
    return this.logic.tokenNoPrefix(token);
  }

  /**
   * 获取上下文
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  static async ctx(id: string | number | bigint) {
    return this.logic.ctx(id);
  }

  /**
   * 设置上下文
   *
   * @param id 用户唯一标识(string | number | bigint)
   * @param key Key
   * @param value Value
   */
  static async set(id: string | number | bigint, key: string, value: string) {
    await this.logic.set(id, key, value);
  }

  /**
   * 清空上下文
   *
   * @param id 用户唯一标识(string | number | bigint)
   */
  static async clear(id: string | number | bigint) {
    await this.logic.clear(id);
  }

  /**
   * 删除上下文中某值
   *
   * @param id 用户唯一标识(string | number | bigint)
   * @param key Key
   */
  static async del(id: string | number | bigint, key: string) {
    await this.logic.del(id, key);
  }
}
