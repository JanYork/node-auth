import { RouterMatcher } from './matcher';

describe('RouterMatcher', () => {
  // 测试实例方法
  describe('Instance Methods', () => {
    // 测试添加路由并匹配(异步回调)方法
    it('should add a route and match correctly (async callback)', async () => {
      const matcher = new RouterMatcher();
      const mockFn = jest.fn(async () => {
        return Promise.resolve();
      });

      matcher.add('/user/:id', mockFn);
      await matcher.match('/user/123');

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    // 测试添加路由并匹配(同步回调)方法
    it('should add a route and match correctly (sync callback)', async () => {
      const matcher = new RouterMatcher();
      const mockFn = jest.fn(() => {});

      matcher.add('/user/:id', mockFn);
      await matcher.match('/user/123');

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    // 测试添加路由并匹配(不匹配)方法
    it('should not call callback when route does not match', async () => {
      const matcher = new RouterMatcher();
      const mockFn = jest.fn(() => {});

      matcher.add('/user/:id', mockFn);
      await matcher.match('/user/456/profile');

      expect(mockFn).not.toHaveBeenCalled();
    });

    // 测试添加多个路由并匹配(匹配正确的)方法
    it('should handle multiple routes and match the correct one', async () => {
      const matcher = new RouterMatcher();
      const mockFn1 = jest.fn(() => {});
      const mockFn2 = jest.fn(() => {});

      matcher.add('/user/:id', mockFn1);
      matcher.add('/user/:id/profile', mockFn2);

      await matcher.match('/user/123/profile');

      expect(mockFn1).not.toHaveBeenCalled();
      expect(mockFn2).toHaveBeenCalledTimes(1);
    });
  });

  // 测试路由验证
  describe('RouterMatcher - Route Validation', () => {
    it('should throw an error for invalid route rules', () => {
      const matcher = new RouterMatcher();
      expect(() => matcher.add('/user/:/edit', () => {})).toThrow(
        'Invalid route rule: /user/:/edit'
      );
      expect(() => matcher.add('/profile/:', () => {})).toThrow(
        'Invalid route rule: /profile/:'
      );
    });
  });

  // 测试静态方法
  describe('Static Methods', () => {
    // 测试静态匹配路由并调用异步回调
    it('should statically match route and call async callback', async () => {
      const mockFn = jest.fn(async () => {});

      await RouterMatcher.match('/user/123', '/user/:id', mockFn);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    // 测试静态匹配路由并调用同步回调
    it('should statically match route and call sync callback', async () => {
      const mockFn = jest.fn(() => {});

      await RouterMatcher.match('/user/123', '/user/:id', mockFn);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    // 测试静态匹配路由并不匹配
    it('should not call callback when static route does not match', async () => {
      const mockFn = jest.fn(() => {});

      await RouterMatcher.match('/user/123', '/user/:id/profile', mockFn);

      expect(mockFn).not.toHaveBeenCalled();
    });
  });

  // 测试私有方法
  describe('Private Methods', () => {
    // 测试是否匹配规则
    it('should correctly determine if a route matches a rule', () => {
      expect(RouterMatcher['isMatched']('/user/123', '/user/:id')).toBe(true);
      expect(RouterMatcher['isMatched']('/user/123', '/user/:id/profile')).toBe(
        false
      );
      expect(RouterMatcher['isMatched']('/user/123', '/user/123')).toBe(true);
      expect(RouterMatcher['isMatched']('/user/123', '/user/{*path}')).toBe(
        true
      );
      expect(RouterMatcher['isMatched']('/user/123', '/user')).toBe(false);
    });

    // 测试规则中的通配符
    it('should correctly handle wildcards in rules', () => {
      expect(RouterMatcher['isMatched']('/user/123', '/user/{*path}')).toBe(
        true
      );
      expect(
        RouterMatcher['isMatched']('/user/123/detail', '/user/{*path}')
      ).toBe(true);
      expect(
        RouterMatcher['isMatched']('/user/123', '/user/{*path}/detail')
      ).toBe(false);
      expect(
        RouterMatcher['isMatched']('/user/123/detail', '/user/{*path}/detail')
      ).toBe(true);
      expect(
        RouterMatcher['isMatched']('/user/123/detail', '/user/{*path}/:detail')
      ).toBe(true);
      expect(
        RouterMatcher['isMatched']('/admin/123/456', '/user/{*path}')
      ).toBe(false);
      expect(RouterMatcher['isMatched']('/user/123/456', '/user/{*path}')).toBe(
        true
      );
      expect(
        RouterMatcher['isMatched']('/user/123/456', '/user/{*path}/:id')
      ).toBe(true);
      expect(
        RouterMatcher['isMatched']('/user/123/456', '/user/{*path}/456')
      ).toBe(true);
    });

    // 测试规则中的参数
    it('should handle decoding in route matching', () => {
      expect(RouterMatcher['isMatched']('/user/%20space', '/user/:name')).toBe(
        true
      );
      expect(RouterMatcher['isMatched']('/user/%20space', '/user/:name')).toBe(
        true
      );
    });
  });
});
