import { UserDO } from './user.do';

describe('UserDO', () => {
  // 测试 checkNewUser 方法
  describe('checkNewUser', () => {
    // 测试 user 为 null 或 undefined 时是否抛出异常
    it('should throw an error if user is null or undefined (never)', () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      expect(() => UserDO.checkNewUser(null)).toThrow('The user is not exist');
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      expect(() => UserDO.checkNewUser(undefined)).toThrow(
        'The user is not exist'
      );
    });

    // 测试 expireTime 小于当前时间时是否抛出异常
    it('should throw an error if expireTime is less than now', () => {
      const expiredUser = new UserDO('1', 'type1', 'token', Date.now() - 1000);
      expect(() => UserDO.checkNewUser(expiredUser)).toThrow(
        'The expire time does not less than now'
      );
    });

    // 测试 expireTime 小于当前时间 30 分钟时是否抛出异常
    it('should throw an error if expireTime is less than 30 minutes from now', () => {
      const nearExpiredUser = new UserDO(
        '1',
        'type1',
        'token',
        Date.now() + 1000 * 60 * 20
      ); // 20 mins from now
      expect(() => UserDO.checkNewUser(nearExpiredUser)).toThrow(
        'The expire time does not less than 30 minutes'
      );
    });

    // 测试 user 有效且 expireTime 大于 30 分钟时是否通过
    it('should pass if user is valid and expireTime is more than 30 minutes', () => {
      const validUser = new UserDO(
        '1',
        'type1',
        'token',
        Date.now() + 1000 * 60 * 60
      ); // 1 hour from now
      expect(() => UserDO.checkNewUser(validUser)).not.toThrow();
    });
  });

  // 测试 convert 方法
  describe('convert', () => {
    // 测试 userRecord 转换为 UserDO 实例是否正确
    it('should correctly convert a record to a UserDO instance', () => {
      const userRecord = {
        id: '1',
        type: 'type1',
        token: 'token',
        expireTime: (Date.now() + 1000 * 60 * 60).toString(),
        createTime: Date.now().toString(),
        updateTime: Date.now().toString(),
        renewCount: '0',
        duration: '0',
        kicked: 'false',
        disabled: 'false',
        permanent: 'false',
      };

      const user = UserDO.convert(userRecord);

      expect(user.id).toBe(userRecord.id);
      expect(user.type).toBe(userRecord.type);
      expect(user.token).toBe(userRecord.token);
      expect(user.expireTime).toBe(Number(userRecord.expireTime));
      expect(user.createTime).toBe(Number(userRecord.createTime));
      expect(user.updateTime).toBe(Number(userRecord.updateTime));
      expect(user.renewCount).toBe(0);
      expect(user.duration).toBe(0);
      expect(user.kicked).toBe(false);
      expect(user.disabled).toBe(false);
      expect(user.permanent).toBe(false);
    });

    // 测试 string 类型的 boolean 值是否正确处理
    it('should handle string boolean values correctly', () => {
      const userRecord = {
        id: '1',
        type: 'type1',
        token: 'token',
        expireTime: (Date.now() + 1000 * 60 * 60).toString(),
        createTime: Date.now().toString(),
        updateTime: Date.now().toString(),
        renewCount: '1',
        duration: '3600',
        kicked: 'true',
        disabled: 'true',
        permanent: 'true',
      };

      const user = UserDO.convert(userRecord);

      expect(user.kicked).toBe(true);
      expect(user.disabled).toBe(true);
      expect(user.permanent).toBe(true);
    });
  });
});
