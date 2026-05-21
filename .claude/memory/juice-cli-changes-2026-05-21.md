---
name: juice-cli-changes-2026-05-21
description: 2026-05-21 批量更新：rawHtml 配置、-s 简写、自定义输出名、缩进修复、右键菜单
metadata: 
  node_type: memory
  type: project
  originSessionId: ed9b8d1e-69ad-4572-b62b-cbd4e24bbef5
---

# 2026-05-21 更新记录

## 新增功能

### rawHtml 配置（顶级配置项）
- `defaults/juice.yaml` 新增 `rawHtml: true`（默认开启）
- 关闭时 Mustache 会 HTML 转义变量值（`<sup>` → `&lt;sup&gt;`）
- 开启时变量值中的 HTML 标签直接渲染
- `src/index.js:processTemplate()` 和 `src/snippet.js:assembleSnippet()` 中实现

### -s 简写（bin/juice.js）
- `-s` 等价于 `--snippet`，用法完全一致

### 自定义输出文件名（-n / 交互式）
- 新增 `-n, --name <name>` CLI 选项
- 片段模式输出文件名默认为模板文件名（而非之前的片段文件名）
- 交互模式下提示用户输入文件名
- 文件名冲突时提供三个选项：覆盖 / 自动版本号（-v1, -v2...）/ 重新输入
- `checkOutputConflicts()`、`findNextVersion()`、`promptOutputName()` 在 `src/snippet.js`

### 片段缩进修复（src/snippet.js:insertIntoContent）
- 新增 `reindentHtml()` 函数，自动检测模板中 `<tbody id="content">` 的子元素缩进
- 将片段 HTML 重新缩进以匹配模板格式

### 右键菜单更新（src/context-menu.js）
- 使用 `-s` 简写替代 `--snippet`

### 帮助文本更新（bin/juice.js）
- 添加使用示例（普通模式、片段模式、交互模式）
- 添加输出文件说明
- 添加右键菜单说明

## CLI 行为矩阵

| -s/--snippet | -f/--file | -c/--config | 执行模式 |
|---|---|---|---|
| + | * | * | 片段模式 |
| - | + | * | 普通模式（output + minified）|
| - | - | * | 交互式片段模式 |

## Why
用户需要更灵活的片段组装工作流，包括自定义输出文件名和 HTML 标签渲染支持。
