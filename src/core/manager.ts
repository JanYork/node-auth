import { NauthConfiguration } from './configuration';
import { IDBAdapter } from '../db';
import { VerifierLogic } from './verifier-logic';

/**
 * 鉴权框架管理器
 *
 * @author JanYork
 * @email <747945307@qq.com>
 * @date 2024/11/25 22:13
 */
export class NauthManager {
  /**
   * 配置
   */
  public static configuration: NauthConfiguration;

  /**
   * 设置配置
   *
   * @param config 配置
   */
  public static setConfiguration(config: NauthConfiguration) {
    this.configuration = config;
  }

  /**
   * 获取配置
   *
   * @return {NauthConfiguration}
   */
  public static getConfiguration(): NauthConfiguration {
    return this.configuration;
  }

  /**
   * 数据库适配器
   */
  public static dbAdapter: IDBAdapter;

  /**
   * 设置数据库适配器
   *
   * @param db 数据库适配器
   */
  public static setDB(db: IDBAdapter) {
    this.dbAdapter = db;
  }

  /**
   * 获取数据库适配器
   *
   * @return {IDBAdapter}
   */
  public static getDB(): IDBAdapter {
    return this.dbAdapter;
  }

  /**
   * 逻辑处理器映射
   */
  public static readonly logicMap = new Map<string, VerifierLogic>();

  /**
   * 设置逻辑处理器映射
   *
   * @param type 认证类型
   * @param logic 认证逻辑处理器
   */
  public static setLogic(type: string, logic: VerifierLogic) {
    this.logicMap.set(type, logic);
  }

  /**
   * 获取逻辑处理器
   *
   * @param type 认证类型
   */
  public static getLogic(type: string): VerifierLogic | undefined {
    return this.logicMap.get(type);
  }

  /**
   * 检查配置
   */
  static check() {
    if (!this.configuration) {
      throw new Error('The configuration is not set');
    }

    if (!this.dbAdapter) {
      throw new Error('The database adapter is not set');
    }
  }
}
