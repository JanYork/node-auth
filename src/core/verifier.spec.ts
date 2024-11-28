import { Verifier } from './verifier';
import { NauthManager } from './manager';
import { NauthConfiguration } from './configuration';
import { RedisDBAdapter } from '../db';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import RedisMock from 'ioredis-mock';

// 测试校验器（Mock）
describe('Verifier', () => {
  beforeEach(() => {
    NauthManager.setConfiguration(new NauthConfiguration());
    NauthManager.setDB(new RedisDBAdapter(new RedisMock()));
  });

  // 测试是否初始化成功
  it('should initialize logic instance when accessed', () => {
    expect(Verifier.logic).toBeInstanceOf(Object);
  });

  // 测试登录逻辑
  it('should call login method with correct id', async () => {
    const userId = '12345';
    jest.spyOn(Verifier.logic, 'login').mockResolvedValue('mockToken');

    const token = await Verifier.login(userId);

    expect(Verifier.logic.login).toHaveBeenCalledWith(userId);
    expect(token).toBe('mockToken');
  });

  // 测试注销逻辑
  it('should call logout method with correct id', async () => {
    const userId = '12345';
    jest.spyOn(Verifier.logic, 'logout').mockResolvedValue();

    await Verifier.logout(userId);

    expect(Verifier.logic.logout).toHaveBeenCalledWith(userId);
  });

  // 测试踢出逻辑
  it('should call kickout method with correct id', async () => {
    const userId = '12345';
    jest.spyOn(Verifier.logic, 'kickout').mockResolvedValue();

    await Verifier.kickout(userId);

    expect(Verifier.logic.kickout).toHaveBeenCalledWith(userId);
  });

  // 测试封禁逻辑
  it('should call disable method with correct id and duration', async () => {
    const userId = '12345';
    const duration = 3600;
    jest.spyOn(Verifier.logic, 'disable').mockResolvedValue();

    await Verifier.disable(userId, duration);

    expect(Verifier.logic.disable).toHaveBeenCalledWith(userId, duration);
  });

  // 测试解封逻辑
  it('should call enable method with correct id', async () => {
    const userId = '12345';
    jest.spyOn(Verifier.logic, 'enable').mockResolvedValue();

    await Verifier.enable(userId);

    expect(Verifier.logic.enable).toHaveBeenCalledWith(userId);
  });

  // 测试是否登录逻辑
  it('should call isLogin method with correct id', async () => {
    const userId = '12345';
    jest.spyOn(Verifier.logic, 'isLogin').mockResolvedValue(true);

    const result = await Verifier.isLogin(userId);

    expect(Verifier.logic.isLogin).toHaveBeenCalledWith(userId);
    expect(result).toBe(true);
  });

  // 测试校验登录逻辑
  it('should call checkLogin method with correct id', async () => {
    const userId = '12345';
    jest.spyOn(Verifier.logic, 'checkLogin').mockResolvedValue();

    await Verifier.checkLogin(userId);

    expect(Verifier.logic.checkLogin).toHaveBeenCalledWith(userId);
  });

  // 测试校验封禁逻辑
  it('should call checkDisable method with correct id', async () => {
    const userId = '12345';
    jest.spyOn(Verifier.logic, 'checkDisable').mockResolvedValue();

    await Verifier.checkDisable(userId);

    expect(Verifier.logic.checkDisable).toHaveBeenCalledWith(userId);
  });

  // 测试获取用户信息上下文逻辑
  it('should call tokenValue method with correct id', async () => {
    const userId = '12345';
    jest.spyOn(Verifier.logic, 'tokenValue').mockResolvedValue('mockToken');

    const token = await Verifier.tokenValue(userId);

    expect(Verifier.logic.tokenValue).toHaveBeenCalledWith(userId);
    expect(token).toBe('mockToken');
  });

  // 测试获取登录ID逻辑
  it('should call loginID method with correct token', async () => {
    const token = 'mockToken';
    jest.spyOn(Verifier.logic, 'loginID').mockResolvedValue('12345');

    const userId = await Verifier.loginID(token);

    expect(Verifier.logic.loginID).toHaveBeenCalledWith(token);
    expect(userId).toBe('12345');
  });

  // 测试获取超时时间逻辑
  it('should call timeout method with correct id', async () => {
    const userId = '12345';
    jest.spyOn(Verifier.logic, 'timeout').mockResolvedValue(1000);

    const timeout = await Verifier.timeout(userId);

    expect(Verifier.logic.timeout).toHaveBeenCalledWith(userId);
    expect(timeout).toBe(1000);
  });

  // 测试剩余过期时间逻辑
  it('should call remainingExpirationTime method with correct id', async () => {
    const userId = '12345';
    jest.spyOn(Verifier.logic, 'remain').mockResolvedValue(500);

    const remainingTime = await Verifier.remainingExpirationTime(userId);

    expect(Verifier.logic.remain).toHaveBeenCalledWith(userId);
    expect(remainingTime).toBe(500);
  });

  // 测试获取用户信息逻辑
  it('should call info method with correct id', async () => {
    const userId = '12345';
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    jest.spyOn(Verifier.logic, 'info').mockResolvedValue({ id: userId });

    const info = await Verifier.info(userId);

    expect(Verifier.logic.info).toHaveBeenCalledWith(userId);
    expect(info).toEqual({ id: userId });
  });
});
