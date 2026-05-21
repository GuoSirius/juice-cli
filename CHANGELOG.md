# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.1.10](https://github.com/GuoSirius/juice-cli/compare/v2.1.9...v2.1.10) (2026-05-21)


### Bug Fixes

* code review improvements — config dedup, test suite, menu naming, and bug fixes ([cd7285a](https://github.com/GuoSirius/juice-cli/commit/cd7285a1b3457fe6157701910e5285b3413d9c04))
* rename config menu to 作为配置，拼接邮件 HTML ([ef6c89e](https://github.com/GuoSirius/juice-cli/commit/ef6c89e895edcdee55bc5b22777410117c5a6b2e))
* right-click terminal auto-close on success, show re-run command on failure ([9448d0a](https://github.com/GuoSirius/juice-cli/commit/9448d0aebc64d2a637a87219466006bbc8467312))
* wrap interactive right-click commands in terminal, unify sub-commands for all file types ([fa05f16](https://github.com/GuoSirius/juice-cli/commit/fa05f16e1abbc31c0319609b68254d5b005ae421))

### [2.1.9](https://github.com/GuoSirius/juice-cli/compare/v2.1.8...v2.1.9) (2026-05-21)


### Features

* add right-click menu for .yaml/.yml config files (juice -c interactive mode) ([9f1bc5c](https://github.com/GuoSirius/juice-cli/commit/9f1bc5c4dc1238a47252c998fcf17b29cc5320e3))
* copy template to CWD when brand has no snippet folders in interactive mode ([d29bb95](https://github.com/GuoSirius/juice-cli/commit/d29bb9597797eca2b546643263a1011ac3a65315))


### Bug Fixes

* use conditional padding class in literature snippet instead of hardcoded style ([b58dbf6](https://github.com/GuoSirius/juice-cli/commit/b58dbf6234dcab28d5f913eaf7c5fdccf89b9b30))


### Refactoring

* improve context menu — HKCU (no admin), fix %1 quoting, shared constants, legacy cleanup ([9f839b6](https://github.com/GuoSirius/juice-cli/commit/9f839b6aef8c042a2de17c340b26e401a086cf7b))


### Documentation

* add project memory files for cross-machine continuity ([cb19f14](https://github.com/GuoSirius/juice-cli/commit/cb19f14fa5904e3dad35ceff5f59d120a0dbacdf))
* update help and README — context menu no longer requires admin (HKCU) ([d2c2ce5](https://github.com/GuoSirius/juice-cli/commit/d2c2ce5f1dbf9b5464b642be2a1015ee4f56e28c))

### [2.1.8](https://github.com/GuoSirius/juice-cli/compare/v2.1.7...v2.1.8) (2026-05-21)


### Documentation

* backfill missing commits in CHANGELOG for v1.3.0 and v2.1.0 ([df27712](https://github.com/GuoSirius/juice-cli/commit/df27712110c0fafb8e47f1e9074a9e4472284469))
* update README with snippet mode, -s shorthand, rawHtml, and usage examples ([c02ec16](https://github.com/GuoSirius/juice-cli/commit/c02ec1669b425ee3099c20b38239c8e27f7c7a6b))


### Chores

* update local settings permissions for git log and node commands ([8ef28ee](https://github.com/GuoSirius/juice-cli/commit/8ef28eef74e253486a27c60def6e1b6d0f54029c))

### [2.1.7](https://github.com/GuoSirius/juice-cli/compare/v2.1.6...v2.1.7) (2026-05-21)


### Features

* add rawHtml config, -s shorthand, custom output name, and indent fix ([de14926](https://github.com/GuoSirius/juice-cli/commit/de14926e6e64eafc651dd1415505ed52eae430c6))


### Documentation

* update ([d91e409](https://github.com/GuoSirius/juice-cli/commit/d91e4098e9994f484020e653f76dc718689462a8))

### [2.1.6](https://github.com/GuoSirius/juice-cli/compare/v2.1.5...v2.1.6) (2026-05-21)


### Bug Fixes

* replace emoji with ASCII labels in interactive prompts for Windows compat ([29ba2ce](https://github.com/GuoSirius/juice-cli/commit/29ba2ce9ba035362f62cce8db3be84c474a01075))

### [2.1.5](https://github.com/GuoSirius/juice-cli/compare/v2.1.4...v2.1.5) (2026-05-21)

### [2.1.4](https://github.com/GuoSirius/juice-cli/compare/v2.1.3...v2.1.4) (2026-05-21)


### Chores

* remove --access public from npm publish, update local settings ([5f9dd42](https://github.com/GuoSirius/juice-cli/commit/5f9dd42c843c66861f4e6ba2746ecc08709ecf17))

### [2.1.3](https://github.com/GuoSirius/juice-cli/compare/v2.1.2...v2.1.3) (2026-05-21)


### Bug Fixes

* add icons/ to npm publish files for context menu icon ([ed59264](https://github.com/GuoSirius/juice-cli/commit/ed5926452cfabfc49f739d22b83ea1785587b669))


### Documentation

* update ([d64e933](https://github.com/GuoSirius/juice-cli/commit/d64e9336f5ac3db3145d7a39784076d05ae4745f))

### [2.1.2](https://github.com/GuoSirius/juice-cli/compare/v2.1.1...v2.1.2) (2026-05-21)


### Bug Fixes

* remove deprecated husky v8 shim lines from commit-msg hook ([b250d31](https://github.com/GuoSirius/juice-cli/commit/b250d311877bd2981f1f216164d951784e7772c5))

### [2.1.1](https://github.com/GuoSirius/juice-cli/compare/v2.1.0...v2.1.1) (2026-05-21)

## [2.1.0](https://github.com/GuoSirius/juice-cli/compare/v2.0.6...v2.1.0) (2026-05-21)


### Features

* add cross-brand warning, npm global install support, and auto menu registration ([3b7bf29](https://github.com/GuoSirius/juice-cli/commit/3b7bf29445855209ef8dd5f2706568e731b10849))
* add snippet mode for fragment + template email assembly ([3d2dc5f](https://github.com/GuoSirius/juice-cli/commit/3d2dc5f551c223f4f440993ef36c44db4c5e94da))


### Bug Fixes

* correct snippet mode to 4-file pipeline with proper handling ([1be068f](https://github.com/GuoSirius/juice-cli/commit/1be068f94083c09465b4b991b5f8f8a4a5067815))


### Chores

* update EDM templates and config ([70a175d](https://github.com/GuoSirius/juice-cli/commit/70a175d60c8c5c64817ec39480b2c2bf497d48fd))
* add edm template library and sample templates ([a91e6e3](https://github.com/GuoSirius/juice-cli/commit/a91e6e3741744b89a6911fe15d7e5e4a01a0e64c), [4e9ed05](https://github.com/GuoSirius/juice-cli/commit/4e9ed051aebeb4a285058d517dae765c86d932ae), [917cae0](https://github.com/GuoSirius/juice-cli/commit/917cae0137f1e414647b05831ec1fefac79dd360))
* update and optimize EDM templates ([95bceca](https://github.com/GuoSirius/juice-cli/commit/95bcecaaced93dfe10a96d11a87f5d1343bce12b), [bdbb9e6](https://github.com/GuoSirius/juice-cli/commit/bdbb9e6b4c7d41c9291d3d43b401f1d6ab521bee), [cccec7f](https://github.com/GuoSirius/juice-cli/commit/cccec7fdc2b5df95006f5792ae22a560aa9e8443), [b8162b6](https://github.com/GuoSirius/juice-cli/commit/b8162b6edfb7b0bd62381908b4a07688d55067d5), [ff1852b](https://github.com/GuoSirius/juice-cli/commit/ff1852b36b81007aae20282419333d22ee35fe1c), [8a457ce](https://github.com/GuoSirius/juice-cli/commit/8a457cee03fc7fd06fadc91505b4fba408ae820a))
* add favicon.ico ([5a54b5a](https://github.com/GuoSirius/juice-cli/commit/5a54b5aedcc8dcf0dccf0425aa6c6b742e3315))
* remove unused files ([e132ef0](https://github.com/GuoSirius/juice-cli/commit/e132ef0a7e652fa27f1a757c0ed8f3b11e78e8b2))
* add ignore files ([b6cefff](https://github.com/GuoSirius/juice-cli/commit/b6cefff72e2375d3f7a1c843f4a5b138599d2ade))


### Documentation

* update ([eda95f7](https://github.com/GuoSirius/juice-cli/commit/eda95f77052846471d87bebfdc0759ca7160eb9c))

### [2.0.6](https://github.com/GuoSirius/juice-cli/compare/v2.0.5...v2.0.6) (2026-05-19)


### Chores

* update README and clean up dead code in release script ([fa9b2a0](https://github.com/GuoSirius/juice-cli/commit/fa9b2a0dce8179d6c5195d86bac650bf09a8d27b))

### [2.0.5](https://github.com/GuoSirius/juice-cli/compare/v2.0.4...v2.0.5) (2026-05-19)


### Bug Fixes

* use npm install instead of npm ci in workflow ([37521f4](https://github.com/GuoSirius/juice-cli/commit/37521f47369891d322cf6fd6164d2f978ea87fb8))

### [2.0.4](https://github.com/GuoSirius/juice-cli/compare/v2.0.3...v2.0.4) (2026-05-19)


### Bug Fixes

* awk pattern to match any # level in changelog parsing ([8ec2914](https://github.com/GuoSirius/juice-cli/commit/8ec29145f7177da9eacd5ce589849cf1679b8bcd))
* precise changelog extraction by comparing heading level (# count) ([25a054d](https://github.com/GuoSirius/juice-cli/commit/25a054d8a934b4a889ed26281e09dae2d5dad8e8))

### [2.0.3](https://github.com/GuoSirius/juice-cli/compare/v2.0.2...v2.0.3) (2026-05-19)


### Bug Fixes

* correct github username (GuoSirius) in package.json and README ([e677b05](https://github.com/GuoSirius/juice-cli/commit/e677b057700227d9774c0152171617b05ef44f89))


### Chores

* remove npm publish from release script, use github workflow instead ([e3e2e54](https://github.com/GuoSirius/juice-cli/commit/e3e2e543ed6e96919f0bdde38d39744f946083ab))
* use github as primary repo, push to both origin and github ([ed329a4](https://github.com/GuoSirius/juice-cli/commit/ed329a41ec5d6227f09c59515f56e06e2d0188f6))

### [2.0.2](https://gitee.com/siriussupreme/juice-cli/compare/v2.0.1...v2.0.2) (2026-05-19)


### Chores

* minimize .npmignore, files field now controls published content ([8d0ba35](https://gitee.com/siriussupreme/juice-cli/commit/8d0ba359f2de7445a4b53e4f76fed8393a3ad248))
* simplify .npmignore for cleaner package ([ef38fd8](https://gitee.com/siriussupreme/juice-cli/commit/ef38fd8faf9cba451bd1c38675581292be7d9da4))
* update gitignore for CHANGELOG and add package-lock ([202d13d](https://gitee.com/siriussupreme/juice-cli/commit/202d13d72f28125f359fd84c66f4d9b173f64b0a))

### [2.0.1](https://gitee.com/siriussupreme/juice-cli/compare/v1.3.0...v2.0.1) (2026-05-19)


### Features

* 合并示例模板，添加 Mustache 列表循环和嵌套循环示例；添加自定义图标 ([6453bf3](https://gitee.com/siriussupreme/juice-cli/commit/6453bf396a14613bb7b39fc9238e6f0d0bc6e473))
* 添加 GitHub Actions 自动发布工作流 ([6f8d199](https://gitee.com/siriussupreme/juice-cli/commit/6f8d199a4261842eaf83c93a6ea5676e8ac45e1c))
* 添加发布功能和配置管理 ([35b0d0e](https://gitee.com/siriussupreme/juice-cli/commit/35b0d0e624d6449fd2eb6f4d602864d76a47433d))
* 完善 npm 发布配置和 GitHub Release 自动生成变更记录 ([544a2ed](https://gitee.com/siriussupreme/juice-cli/commit/544a2edbd0b59126796189728c359fd3559e9575))


### Bug Fixes

* 修复 release 脚本的 chalk 和 inquirer 兼容性问题 ([5895b82](https://gitee.com/siriussupreme/juice-cli/commit/5895b82cfca0ab94c83b6b3d21908264b4bd6299))
* 修复 release 脚本的 chalk 和 inquirer 兼容性问题 ([0825876](https://gitee.com/siriussupreme/juice-cli/commit/0825876eddbd7b8fb4571c21be67ddfbdd1ec798))
* 修复 release 脚本使用 ES module 格式兼容 chalk v5 ([0f88f9c](https://gitee.com/siriussupreme/juice-cli/commit/0f88f9c023b671fc8145c830f6a9010c7e18f6b8))
* set patch as default release type and unignore CHANGELOG.md ([227bc69](https://gitee.com/siriussupreme/juice-cli/commit/227bc69faee6bddc930f0940792beb8c31f71010))
* update release script with version preview ([0f95901](https://gitee.com/siriussupreme/juice-cli/commit/0f95901f0cd54c00de5a1feab1a9a1aa8d1f9f57))


### Documentation

* 更新 README，添加 Mustache 列表循环说明和自定义图标说明 ([ca3dd0e](https://gitee.com/siriussupreme/juice-cli/commit/ca3dd0ee5dd2dd6e3d1678f492d45d5292c4b00c))


### Chores

* 更新 GitHub Actions Node 版本到 24 ([ca69705](https://gitee.com/siriussupreme/juice-cli/commit/ca697056e61afdf443b28ecd59c2482cf57528d7))
* 更新自定义图标，优化信封+闪电设计 ([cc1f175](https://gitee.com/siriussupreme/juice-cli/commit/cc1f175510f420ef3de849f83e159a89452b5c8b))
* add changelog ([23f9cb1](https://gitee.com/siriussupreme/juice-cli/commit/23f9cb1a0aebd42185460c28e21de861a4994792))

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

## [1.3.0](https://github.com/GuoSirius/juice-cli/compare/v1.2.0...v1.3.0) (2026-04-23)


### Features

* 重构配置加载逻辑，添加 install/uninstall 命令 ([7fc5d71](https://github.com/GuoSirius/juice-cli/commit/7fc5d713f8f30cac50e4bc53bf0835fac74fb351))
* 添加 juice 高级配置选项 ([a97ea32](https://github.com/GuoSirius/juice-cli/commit/a97ea320d89cb0f3049f53d2904d6ff2dcb58f5e))
* 启用 inlinePseudoElements，添加 preservedSelectors 示例 ([9cac2f3](https://github.com/GuoSirius/juice-cli/commit/9cac2f3b5b61bfa70b3ff114710565814c2ad569))
* 添加 Mustache 列表循环示例，支持嵌套循环语法 ([02960e4](https://github.com/GuoSirius/juice-cli/commit/02960e4cce7fb3a73bcb57251708839437b54b86))


### Documentation

* 更新 README.md 和 package.json ([4658109](https://github.com/GuoSirius/juice-cli/commit/465810945220ccc17006aa98d0eed69111bb04b0))


### Chores

* 优化邮件 HTML 兼容性配置 ([10b2c3e](https://github.com/GuoSirius/juice-cli/commit/10b2c3e94b94d1ff9bce296afcf8820a904d4334))
* 更新版本号至 v1.1.0，优化帮助信息 ([75c7b16](https://github.com/GuoSirius/juice-cli/commit/75c7b16075143345482dcec31652ca0329ac6ef9))
* remove .workbuddy from git tracking ([c7a6ed2](https://github.com/GuoSirius/juice-cli/commit/c7a6ed2e26171ca0c560bfbdb50f626126fc5a9d))
* initial project setup ([26ec410](https://github.com/GuoSirius/juice-cli/commit/26ec41011f33e36e0732aced0bb91748b7d9ed77), [6ac96f4](https://github.com/GuoSirius/juice-cli/commit/6ac96f48cf3f37d23c885c3db90ee9f7c31eeeed))