import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser, // 浏览器环境变量
        ...globals.node, // Node.js 环境变量
      },
      sourceType: 'module', // 支持 ESM 模块
    },
  },

  // 使用 JavaScript 推荐规则
  pluginJs.configs.recommended,

  // 使用 TypeScript 推荐规则
  ...tseslint.configs.recommended,

  {
    rules: {
      'func-name-matching': [
        'error',
        'always',
        {
          includeCommonJSModuleExports: true, // 支持 CommonJS 的 module.exports 检查
        },
      ],
    },
  },
];
