# 发布功能实现计划

## 项目概述

当前项目是一个 Node.js CLI 工具（juice-email-cli），版本 1.3.0。需要添加完整的发布功能。

## 需求分析

1. **Changelog 增量记录**：所有提交记录到 CHANGELOG.md，增量添加，不覆盖
2. **提交信息格式校验**：提交时必须符合规范（如 Angular 提交规范）
3. **一键发布脚本**：
   - 检测未 add/commit 的文件
   - 自动 add 和提交（用户输入提交信息）
   - 选择版本更新类型（major/minor/patch）
   - 实时展示当前版本和目标版本
   - 更新版本、更新 changelog、打 tag
   - 推送至 origin 和 github
4. **多平台发布**：GitHub 发布 + npm 发布

## 技术方案

### 依赖安装

需要安装以下 npm 包：
- `commitlint` + `@commitlint/cli` + `@commitlint/config-conventional` - 提交信息校验
- `husky` - Git hooks 管理
- `standard-version` - 版本管理和 changelog 生成
- `inquirer` - 交互式命令行交互

### 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `package.json` | 修改 | 添加依赖、scripts 和 commitlint 配置 |
| `CHANGELOG.md` | 新建 | 变更日志文件 |
| `.husky/commit-msg` | 新建 | 提交信息校验钩子 |
| `scripts/release.js` | 新建 | 一键发布脚本 |

## 实现步骤

### 步骤 1：安装依赖

```bash
npm install --save-dev husky @commitlint/cli @commitlint/config-conventional standard-version inquirer
```

### 步骤 2：配置 package.json

- 添加 `scripts`：`prepare`（初始化 husky）、`release`（发布脚本）
- 添加 `commitlint` 配置
- 添加 `standard-version` 配置

### 步骤 3：初始化 husky

```bash
npx husky install
npx husky add .husky/commit-msg 'npx --no-install commitlint --edit "$1"'
```

### 步骤 4：创建 CHANGELOG.md

初始化 changelog 文件，包含当前版本信息

### 步骤 5：创建发布脚本

实现完整的发布流程：
1. 检测未跟踪文件
2. 交互式提交未提交文件
3. 选择版本更新类型
4. 更新版本和 changelog
5. 打 tag
6. 推送到远程仓库
7. GitHub Release 和 npm 发布

## 安全考虑

- 脚本执行前进行确认，防止误操作
- 推送前检查远程仓库连接状态
- 敏感操作需要用户确认

## 测试方案

1. 测试提交信息校验（不符合规范的提交应被拒绝）
2. 测试发布脚本的各个流程
3. 验证 changelog 增量更新