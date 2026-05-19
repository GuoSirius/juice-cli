# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.0.0](https://gitee.com/siriussupreme/juice-cli/compare/v1.3.0...v2.0.0) (2026-05-19)


### Features

* 合并示例模板，添加 Mustache 列表循环和嵌套循环示例；添加自定义图标 ([6453bf3](https://gitee.com/siriussupreme/juice-cli/commit/6453bf396a14613bb7b39fc9238e6f0d0bc6e473))
* 添加 GitHub Actions 自动发布工作流 ([6f8d199](https://gitee.com/siriussupreme/juice-cli/commit/6f8d199a4261842eaf83c93a6ea5676e8ac45e1c))
* 添加发布功能和配置管理 ([35b0d0e](https://gitee.com/siriussupreme/juice-cli/commit/35b0d0e624d6449fd2eb6f4d602864d76a47433d))
* 完善 npm 发布配置和 GitHub Release 自动生成变更记录 ([544a2ed](https://gitee.com/siriussupreme/juice-cli/commit/544a2edbd0b59126796189728c359fd3559e9575))


### Bug Fixes

* 修复 release 脚本的 chalk 和 inquirer 兼容性问题 ([5895b82](https://gitee.com/siriussupreme/juice-cli/commit/5895b82cfca0ab94c83b6b3d21908264b4bd6299))
* 修复 release 脚本的 chalk 和 inquirer 兼容性问题 ([0825876](https://gitee.com/siriussupreme/juice-cli/commit/0825876eddbd7b8fb4571c21be67ddfbdd1ec798))
* 修复 release 脚本使用 ES module 格式兼容 chalk v5 ([0f88f9c](https://gitee.com/siriussupreme/juice-cli/commit/0f88f9c023b671fc8145c830f6a9010c7e18f6b8))
* update release script with version preview ([0f95901](https://gitee.com/siriussupreme/juice-cli/commit/0f95901f0cd54c00de5a1feab1a9a1aa8d1f9f57))


### Documentation

* 更新 README，添加 Mustache 列表循环说明和自定义图标说明 ([ca3dd0e](https://gitee.com/siriussupreme/juice-cli/commit/ca3dd0ee5dd2dd6e3d1678f492d45d5292c4b00c))


### Chores

* 更新 GitHub Actions Node 版本到 24 ([ca69705](https://gitee.com/siriussupreme/juice-cli/commit/ca697056e61afdf443b28ecd59c2482cf57528d7))
* 更新自定义图标，优化信封+闪电设计 ([cc1f175](https://gitee.com/siriussupreme/juice-cli/commit/cc1f175510f420ef3de849f83e159a89452b5c8b))

## [1.3.0](https://github.com/siriussupreme/juice-cli/compare/v1.2.0...v1.3.0) (2024-01-01)

### Features

- Initial release of juice-email-cli
- CSS inlining with juice
- Mustache templating support
- HTML minification
- CLI interface for email template generation