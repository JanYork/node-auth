import {
  MakeTkUUID,
  MakeTkSimpleUUID,
  MakeTkNanoID,
  MakeTkRandomStr,
  tokenMake,
} from './token-make.util';
import { nanoid } from 'nanoid';
import { v4 as uuid } from 'uuid';

jest.mock('uuid');
jest.mock('nanoid');

// 生成Token测试
describe('Token Generators', () => {
  // 生成UUID
  describe('MakeTkUUID', () => {
    it('should generate a valid UUID', () => {
      (uuid as jest.Mock).mockReturnValue(
        'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      );
      const result = MakeTkUUID();
      expect(result).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
    });
  });

  // 生成简单UUID
  describe('MakeTkSimpleUUID', () => {
    it('should generate a valid simple UUID without dashes', () => {
      (uuid as jest.Mock).mockReturnValue(
        'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      );
      const result = MakeTkSimpleUUID();
      expect(result).toBe('f47ac10b58cc4372a5670e02b2c3d479');
    });
  });

  // 生成NanoID
  describe('MakeTkNanoID', () => {
    it('should generate a valid NanoID', () => {
      (nanoid as jest.Mock).mockReturnValue('V1StGXR8_Z5jdHi6B-myT');
      const result = MakeTkNanoID();
      expect(result).toBe('V1StGXR8_Z5jdHi6B-myT');
    });
  });

  // 生成随机字符串
  describe('MakeTkRandomStr', () => {
    // 默认长度32位
    it('should generate a random string with default length of 32', () => {
      const result = MakeTkRandomStr();
      expect(result).toHaveLength(32);
      expect(/^[0-9a-zA-Z]+$/.test(result)).toBe(true); // 检查是否只包含字典字符
    });

    // 指定长度64位
    it('should generate a random string with specified length of 64', () => {
      const result = MakeTkRandomStr(64);
      expect(result).toHaveLength(64);
      expect(/^[0-9a-zA-Z]+$/.test(result)).toBe(true); // 检查是否只包含字典字符
    });

    // 指定长度128位
    it('should generate a random string with specified length of 128', () => {
      const result = MakeTkRandomStr(128);
      expect(result).toHaveLength(128);
      expect(/^[0-9a-zA-Z]+$/.test(result)).toBe(true); // 检查是否只包含字典字符
    });
  });

  // 生成Token
  describe('tokenMake', () => {
    // 默认策略(UUID)
    it('should generate a token using the default strategy (UUID)', () => {
      (uuid as jest.Mock).mockReturnValue(
        'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      );
      const result = tokenMake();
      expect(result).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
    });

    // UUID策略
    it('should generate a token using the SIMPLE_UUID strategy', () => {
      (uuid as jest.Mock).mockReturnValue(
        'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      );
      const result = tokenMake('SIMPLE_UUID');
      expect(result).toBe('f47ac10b58cc4372a5670e02b2c3d479');
    });

    // NanoID策略
    it('should generate a token using the NANO_ID strategy', () => {
      (nanoid as jest.Mock).mockReturnValue('V1StGXR8_Z5jdHi6B-myT');
      const result = tokenMake('NANO_ID');
      expect(result).toBe('V1StGXR8_Z5jdHi6B-myT');
    });

    // 随机字符串策略
    it('should generate a token using the RANDOM_STR strategy with default length', () => {
      const result = tokenMake('RANDOM_STR');
      expect(result).toHaveLength(32);
      expect(/^[0-9a-zA-Z]+$/.test(result)).toBe(true); // 检查是否只包含字典字符
    });
  });
});
