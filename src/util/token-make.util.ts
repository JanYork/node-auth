import { v4 as uuid } from 'uuid';
import { nanoid } from 'nanoid';

/**
 * 字典(0-9 & a-z & A-Z)
 */
const dictionary =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * 使用UUID创建Token
 *
 * @example
 * MakeTkUUID()
 * // => 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
 * @return string(UUID)
 */
export const MakeTkUUID = (): string => {
  return uuid();
};

/**
 * 使用UUID创建Token
 *
 * @example
 * MakeTkSimpleUUID()
 * // => 'f47ac10b58cc4372a5670e02b2c3d479'
 * @return string(UUID)
 */
export const MakeTkSimpleUUID = (): string => {
  return uuid().replace(/-/g, '');
};

/**
 * 使用NanoID创建Token
 *
 * @example
 * MakeTkNanoID()
 * // => 'V1StGXR8_Z5jdHi6B-myT'
 * @return string(NanoID)
 */
export const MakeTkNanoID = (): string => {
  return nanoid();
};

/**
 * 使用随机字符串创建Token
 *
 * @param num 32 | 64 | 128 位
 * @example
 * MakeTkRandomStr()
 * // => 'f47ac10b58cc4372a5670e02b2c3d479'
 * @return string(随机字符串)
 */
export const MakeTkRandomStr = (num: 32 | 64 | 128 = 32): string => {
  let result = '';
  for (let i = 0; i < num; i++) {
    result += dictionary[Math.floor(Math.random() * dictionary.length)];
  }
  return result;
};

/**
 * Token生成器策略映射
 */
export const MakeTkMapping: Record<string, () => string> = {
  UUID: MakeTkUUID,
  SIMPLE_UUID: MakeTkSimpleUUID,
  NANO_ID: MakeTkNanoID,
  RANDOM_STR: MakeTkRandomStr,
};

/**
 * 获取一个Token
 *
 * @param type UUID | SIMPLE_UUID | NANO_ID | RANDOM_STR 默认UUID
 * @example
 * token()
 * // => 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
 * @example
 * token('SIMPLE_UUID')
 * // => 'f47ac10b58cc4372a5670e02b2c3d479'
 * @example
 * token('NANO_ID')
 * // => 'V1StGXR8_Z5jdHi6B-myT'
 * @example
 * token('RANDOM_STR')
 * // => 'f47ac10b58cc4372a5670e02b2c3d479'
 * @return string(Token)
 */
export const tokenMake = (
  type: 'UUID' | 'SIMPLE_UUID' | 'NANO_ID' | 'RANDOM_STR' = 'UUID'
): string => {
  return MakeTkMapping[type]();
};
