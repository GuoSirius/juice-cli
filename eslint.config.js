import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      // 允许有意的 `while (true)` 轮询/版本号查找循环
      'no-constant-condition': ['error', { checkLoops: false }],
      // 未使用变量仅告警；以下划线开头的参数/变量忽略；
      // 被捕获的错误变量（catch (_) {}）不检查（本项目统一用 _ 表示忽略）
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      // 允许 `catch (_) {}` 这类仅用于流程控制的空 catch
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**', 'edm/**', '**/*.d.ts'],
  },
];
