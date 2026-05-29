# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.4.9](https://github.com/GuoSirius/juice-cli/compare/v2.4.8...v2.4.9) (2026-05-29)


### Chores

* optimize style ([556ee5e](https://github.com/GuoSirius/juice-cli/commit/556ee5e87bcf8b67f7b3c712d572dffea609c437))

### [2.4.8](https://github.com/GuoSirius/juice-cli/compare/v2.4.7...v2.4.8) (2026-05-29)


### Features

* add activity snippet ([53e881c](https://github.com/GuoSirius/juice-cli/commit/53e881ca20a8ac8652b6974811fbc5dc94c9fc0c))

### [2.4.7](https://github.com/GuoSirius/juice-cli/compare/v2.4.6...v2.4.7) (2026-05-28)


### Features

* interactive config selection in template mode when multiple/non-default configs exist ([8fb990c](https://github.com/GuoSirius/juice-cli/commit/8fb990c5a95e4c3a4186a729f57a10a8a4b21302))


### Documentation

* delete docs ([0590da8](https://github.com/GuoSirius/juice-cli/commit/0590da8a583cc73779f7a5872fee835f4580c4c8))

### [2.4.6](https://github.com/GuoSirius/juice-cli/compare/v2.4.5...v2.4.6) (2026-05-25)


### Bug Fixes

* context menu commands run silently without visible feedback ([e47c6c0](https://github.com/GuoSirius/juice-cli/commit/e47c6c0c594ef81e22f7bd4ac27e7c6ec6f92fbf))

### [2.4.5](https://github.com/GuoSirius/juice-cli/compare/v2.4.4...v2.4.5) (2026-05-25)


### Chores

* delete test file ([b1f5220](https://github.com/GuoSirius/juice-cli/commit/b1f522051cb07734ecbe49667a6dc7a6e9f05d2f))

### [2.4.4](https://github.com/GuoSirius/juice-cli/compare/v2.4.3...v2.4.4) (2026-05-25)


### Chores

* add snippet and optiomize template ([a6bb9f3](https://github.com/GuoSirius/juice-cli/commit/a6bb9f3186ab03b7aeab8bc9fd9dc6a023007d4d))

### [2.4.3](https://github.com/GuoSirius/juice-cli/compare/v2.4.2...v2.4.3) (2026-05-25)


### Chores

* add snippet ([9ad5215](https://github.com/GuoSirius/juice-cli/commit/9ad52155de59cd201dd4d7eefdef19757719d597))

### [2.4.2](https://github.com/GuoSirius/juice-cli/compare/v2.4.1...v2.4.2) (2026-05-23)

### [2.4.1](https://github.com/GuoSirius/juice-cli/compare/v2.4.0...v2.4.1) (2026-05-23)


### Bug Fixes

* add missing __dirname ESM definitions, convert generate-icon.js ([fe878bd](https://github.com/GuoSirius/juice-cli/commit/fe878bda0d0d86e4dcde774132c7c2f26285208d))

## [2.4.0](https://github.com/GuoSirius/juice-cli/compare/v2.3.15...v2.4.0) (2026-05-23)


### Features

* convert project to ESM and upgrade chalk/ora/commander to latest ([8aa2411](https://github.com/GuoSirius/juice-cli/commit/8aa24116f63ae3d21490ff19b19a6e0d7d2f8daf))


### Chores

* update local permissions ([f7855df](https://github.com/GuoSirius/juice-cli/commit/f7855df7ce1375ab4f92db8491584a5966992b71))
* upgrade dependencies and bump minimum Node.js to v24 ([518ec31](https://github.com/GuoSirius/juice-cli/commit/518ec31265631cba812b2dc8f2f55b893baf4bb9))

### [2.3.15](https://github.com/GuoSirius/juice-cli/compare/v2.3.14...v2.3.15) (2026-05-23)


### Bug Fixes

* filterSeries in init, variant back-loop, remove dead collectConfigs ([2ee4912](https://github.com/GuoSirius/juice-cli/commit/2ee4912dc2c42916351d9b46043c1fcd89c7581b))
* relative paths in snippet output, error handling for juice/minify ([63499f2](https://github.com/GuoSirius/juice-cli/commit/63499f23365bdd458a9e28b415362db1cb54b118))

### [2.3.14](https://github.com/GuoSirius/juice-cli/compare/v2.3.13...v2.3.14) (2026-05-23)


### Bug Fixes

* include all configs from -c specified directory in config prompt ([faab9c2](https://github.com/GuoSirius/juice-cli/commit/faab9c283768e3a998395ba70512de190429b565))

### [2.3.13](https://github.com/GuoSirius/juice-cli/compare/v2.3.12...v2.3.13) (2026-05-23)


### Bug Fixes

* -s mode only shows snippet directory configs, not CWD ([316210c](https://github.com/GuoSirius/juice-cli/commit/316210c6d5c09d44036dbc730cee1dc7a13e2741))
* include -c specified config in interactive config prompt ([7f673fb](https://github.com/GuoSirius/juice-cli/commit/7f673fb75dd4619f69cac6ae1ab81327e54da08b))

### [2.3.12](https://github.com/GuoSirius/juice-cli/compare/v2.3.11...v2.3.12) (2026-05-23)


### Features

* multi-source config collection with source display in snippet mode ([fb71edc](https://github.com/GuoSirius/juice-cli/commit/fb71edc97a6e1d734d07b977421bc39db21f1252))


### Bug Fixes

* snippet+config shortcut loops instead of proceeding ([e751aaf](https://github.com/GuoSirius/juice-cli/commit/e751aaf185fc3bcd77f963258b724007f5791ccf))

### [2.3.11](https://github.com/GuoSirius/juice-cli/compare/v2.3.10...v2.3.11) (2026-05-23)


### Bug Fixes

* prioritize snippet+config shortcut before confirm in copy menu ([3f5f436](https://github.com/GuoSirius/juice-cli/commit/3f5f43615ac383c0d3cd95eb67e21dba6cbc4895))


### Documentation

* update init flow docs with shortcuts, ICO, and back/exit navigation ([57063d7](https://github.com/GuoSirius/juice-cli/commit/57063d744a0a716ab933cdf5a1aaa6752b53bd7b))

### [2.3.10](https://github.com/GuoSirius/juice-cli/compare/v2.3.9...v2.3.10) (2026-05-23)


### Bug Fixes

* icon overwrite instead of versioning, add snippet+config shortcut ([d35db8d](https://github.com/GuoSirius/juice-cli/commit/d35db8d6e07cb0368f186e4e7c10c8071b08c4f7))

### [2.3.9](https://github.com/GuoSirius/juice-cli/compare/v2.3.8...v2.3.9) (2026-05-23)


### Bug Fixes

* loop-based copy step - allow return/modify at any point ([c784abf](https://github.com/GuoSirius/juice-cli/commit/c784abf457c51482385b1315e0579c27cf34534b))
* separate resource checkbox from back/exit navigation in init ([7e9d0a1](https://github.com/GuoSirius/juice-cli/commit/7e9d0a1735642c4aa657ecd4f07edf20d91afe8b))
* simplify init UX - back-before-checkbox, shorter --all messages ([cf069fe](https://github.com/GuoSirius/juice-cli/commit/cf069fe2ed6b789f8891fdc14f8dc23254eb0db7))

### [2.3.8](https://github.com/GuoSirius/juice-cli/compare/v2.3.7...v2.3.8) (2026-05-23)


### Bug Fixes

* blank messages in selectWithNav and --all source==dest false positive ([1f44da7](https://github.com/GuoSirius/juice-cli/commit/1f44da74d5f8200d7d6a36e7374bce6ede224ea0))

### [2.3.7](https://github.com/GuoSirius/juice-cli/compare/v2.3.6...v2.3.7) (2026-05-23)


### Bug Fixes

* catch Ctrl+C gracefully in all interactive commands ([ad2a5ac](https://github.com/GuoSirius/juice-cli/commit/ad2a5acd81d76ec050dc517c87e8873b6404c187))

### [2.3.6](https://github.com/GuoSirius/juice-cli/compare/v2.3.5...v2.3.6) (2026-05-23)


### Features

* auto-copy favicon.ico when copying template ([0302bdf](https://github.com/GuoSirius/juice-cli/commit/0302bdf60cee61ec1587cd9237b19ce7a4edc3f9))


### Bug Fixes

* add back/exit navigation to juice init, simplify --all conflict ([78aa19f](https://github.com/GuoSirius/juice-cli/commit/78aa19f5f5ef8b6b5489505d585254afe8a38ae8))

### [2.3.5](https://github.com/GuoSirius/juice-cli/compare/v2.3.4...v2.3.5) (2026-05-23)


### Bug Fixes

* rewrite context menu registration for ExtendedSubCommandsKey on all contexts ([40d6f08](https://github.com/GuoSirius/juice-cli/commit/40d6f088e71a3cca4c8270f816df889e9c3cb67a))


### Documentation

* sync context menu structure and features in CLAUDE.md and README.md ([3be11ab](https://github.com/GuoSirius/juice-cli/commit/3be11ab148054902936a417ea0e8513924fc5f22))

### [2.3.4](https://github.com/GuoSirius/juice-cli/compare/v2.3.3...v2.3.4) (2026-05-23)


### Features

* juice init --all and Directory/Background submenu ([43075f6](https://github.com/GuoSirius/juice-cli/commit/43075f6decf10563b0f6a64a54718af2d4a8ac61))


### Bug Fixes

* code review findings - copy-multi overwrite, process.exit, init pause ([8b53317](https://github.com/GuoSirius/juice-cli/commit/8b53317a426accf638444c523da87e180d72f5b8))
* init --all conflict offers overwrite/version/cancel instead of yes/no ([6c7f768](https://github.com/GuoSirius/juice-cli/commit/6c7f768eeb0c9038c72b1f263e252946815149b6))
* unify Directory/Background parent menu name with file type menus ([d764d93](https://github.com/GuoSirius/juice-cli/commit/d764d93d35a1cf6f57496f42382af12b73431868))


### Chores

* update local permissions ([db50f79](https://github.com/GuoSirius/juice-cli/commit/db50f7994c1727a9805fef820e8898dc1cfc8d18))

### [2.3.3](https://github.com/GuoSirius/juice-cli/compare/v2.3.2...v2.3.3) (2026-05-22)


### Bug Fixes

* context menu visibility, view pause, and browse UX improvements ([b37f20a](https://github.com/GuoSirius/juice-cli/commit/b37f20ae51920a9bb98bf07b28ff482704b553e9))
* ensure complete registry cleanup across install/update/uninstall ([1c33db6](https://github.com/GuoSirius/juice-cli/commit/1c33db61013bc1bbb6a9efe468d79168914a6249))

### [2.3.2](https://github.com/GuoSirius/juice-cli/compare/v2.3.1...v2.3.2) (2026-05-22)


### Documentation

* update CLAUDE.md and README.md for juice view and juice init ([814dcaa](https://github.com/GuoSirius/juice-cli/commit/814dcaa00f72b483983459f0118972429ef44b0e))

### [2.3.1](https://github.com/GuoSirius/juice-cli/compare/v2.3.0...v2.3.1) (2026-05-22)


### Bug Fixes

* add spawnSync timeout and progress logging to prevent install hangs ([d9a487c](https://github.com/GuoSirius/juice-cli/commit/d9a487cf64262bc76bd8501de78bf84ca7b833ed))

## [2.3.0](https://github.com/GuoSirius/juice-cli/compare/v2.2.2...v2.3.0) (2026-05-22)


### Features

* add juice view and juice init commands with enhanced context menus ([3fc761e](https://github.com/GuoSirius/juice-cli/commit/3fc761e65d21b49a6a3eb23d2448d7388317b956))


### Bug Fixes

* safe strict-mode ReferenceErrors and stack underflow in view/init ([72d12ab](https://github.com/GuoSirius/juice-cli/commit/72d12abb860c84acad804f2dc797939e50b24ed0))
* update smoke test template paths to match current EDM structure ([db8742d](https://github.com/GuoSirius/juice-cli/commit/db8742d9b7387f025891aca4e42d8706df6ac9e8))

### [2.2.2](https://github.com/GuoSirius/juice-cli/compare/v2.2.1...v2.2.2) (2026-05-22)


### Bug Fixes

* use random delimiter in GITHUB_OUTPUT to prevent content collision ([b92e9bf](https://github.com/GuoSirius/juice-cli/commit/b92e9bfed003be38ac642388a5a12d6c53ebd23c))

### [2.2.1](https://github.com/GuoSirius/juice-cli/compare/v2.2.0...v2.2.1) (2026-05-22)


### Bug Fixes

* release notes extraction incorrectly crosses version boundaries ([a72cfc7](https://github.com/GuoSirius/juice-cli/commit/a72cfc740cd3f70c27d452ae822adf8c2d3a42ca))


### Chores

* update ([fcc837b](https://github.com/GuoSirius/juice-cli/commit/fcc837ba7f77842330e0d1b2d2cb62c43ba8b6d4))

## [2.2.0](https://github.com/GuoSirius/juice-cli/compare/v2.1.18...v2.2.0) (2026-05-22)


### Features

* 重构 EDM 目录结构为方案B，支持元数据驱动的交互式选择 ([32de4a6](https://github.com/GuoSirius/juice-cli/commit/32de4a6422f7e462fb019e402244b4b25be6460f))

### [2.1.18](https://github.com/GuoSirius/juice-cli/compare/v2.1.17...v2.1.18) (2026-05-21)


### Bug Fixes

* prompt for config when using -s interactively from right-click menu ([c77c94e](https://github.com/GuoSirius/juice-cli/commit/c77c94e00ca9a5f22acf3c2c772cc4a306a399ae))

### [2.1.17](https://github.com/GuoSirius/juice-cli/compare/v2.1.16...v2.1.17) (2026-05-21)


### Chores

* 优化样式 ([e7c7148](https://github.com/GuoSirius/juice-cli/commit/e7c71486a0534954d2bc8cb014184064fbf7ac21))

### [2.1.16](https://github.com/GuoSirius/juice-cli/compare/v2.1.15...v2.1.16) (2026-05-21)


### Bug Fixes

* ：stdio: 'ignore' 会关闭 stdin，导致 input: message 无法传入。 ([b23bfa9](https://github.com/GuoSirius/juice-cli/commit/b23bfa947cb48fb08330d299f220eb699dc08e8d))

### [2.1.15](https://github.com/GuoSirius/juice-cli/compare/v2.1.14...v2.1.15) (2026-05-21)


### Features

* show different sub-menus based on file extension ([8916a88](https://github.com/GuoSirius/juice-cli/commit/8916a88b0a6e4bc90e76be762fab515e65654f53))


### Bug Fixes

* delete old containers before re-registering to avoid stale sub-commands ([b92e60f](https://github.com/GuoSirius/juice-cli/commit/b92e60f1bbcb57449bdbebf30a9eba0313d3f8f2))
* remove config option from HTML context menu, keep only on YAML ([fb936e2](https://github.com/GuoSirius/juice-cli/commit/fb936e24c0981ebef38e45b93e0e0a26e8b95cad))

### [2.1.14](https://github.com/GuoSirius/juice-cli/compare/v2.1.13...v2.1.14) (2026-05-21)


### Bug Fixes

* switch to ExtendedSubCommandsKey for reliable cascading context menu ([9999029](https://github.com/GuoSirius/juice-cli/commit/9999029e56a8c82bfba905d5b451541be0117e51))


### Chores

* add WebSearch, WebFetch, and reg query permissions ([c1a16e1](https://github.com/GuoSirius/juice-cli/commit/c1a16e16fcddac3bacad3cdefc5fb80bde849428))

### [2.1.13](https://github.com/GuoSirius/juice-cli/compare/v2.1.12...v2.1.13) (2026-05-21)


### Bug Fixes

* clean legacy HKLM registry entries to prevent old menu names from persisting ([dd147f8](https://github.com/GuoSirius/juice-cli/commit/dd147f84040aefa26d191fa86c020ee4945bdf0f))


### Chores

* update local permissions for additional Bash commands ([e33e099](https://github.com/GuoSirius/juice-cli/commit/e33e0999a8dbd1bb10c55edc3eeb024573de892f))

### [2.1.12](https://github.com/GuoSirius/juice-cli/compare/v2.1.11...v2.1.12) (2026-05-21)


### Bug Fixes

* skip context menu registration on non-Windows platforms ([388b3b8](https://github.com/GuoSirius/juice-cli/commit/388b3b8ea648eef262f322ebc0c6eb53cf0c4b53))

### [2.1.11](https://github.com/GuoSirius/juice-cli/compare/v2.1.10...v2.1.11) (2026-05-21)


### Bug Fixes

* use spawnSync for reg.exe to avoid cmd.exe & character parsing ([7c4c41b](https://github.com/GuoSirius/juice-cli/commit/7c4c41baf085fcf069b3b676aad0e2782456822a))

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