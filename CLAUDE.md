# juice-cli 项目文档

## 项目概述

CLI 工具，生成标准、兼容各大邮件发送平台的 HTML 邮件（CSS 内联 + Mustache 模板变量 + 压缩）。

## 当前功能

- `juice -f template.html` — 对 HTML 做 Mustache 变量替换 → juice CSS 内联 → 输出 `.output.html` + `.minified.html`
- `juice -c config.yaml -f template.html` — 同上，指定配置文件
- `juice --snippet snippet.html -f template.html` — 片段组装模式：片段 + 模板拼接，输出 4 个文件。跨品牌时给出警告但仍可执行
- `juice --snippet snippet.html` — 片段模式，交互式选择品牌和模板，跨品牌时给出警告
- `juice` — 全交互模式：逐步选择品牌、模板、片段系列、片段 HTML、配置（同品牌内组合，不会跨品牌）
- `juice --install` / `juice --uninstall` — Windows 右键菜单注册/卸载（npm install 时自动执行 postinstall）
- 右键菜单：
  - `.html`/`.htm` → "📧 用 juice 生成邮件 HTML" → 子菜单（作为模板生成 / 作为片段拼接 / 作为配置拼接 / 打开 PowerShell）
  - `.yaml`/`.yml` → "📧 用 juice 生成邮件 HTML" → 子菜单（作为配置拼接 / 打开 PowerShell）

## npm 生命周期（自动菜单注册）

- `postinstall` → 自动运行 `juice --install`，注册右键菜单。无管理员权限时静默跳过（reg add 失败不阻塞安装）
- `preuninstall` → 自动运行 `juice --uninstall`，移除右键菜单
- 非 Windows 系统 → `reg` 命令不存在，catch 后静默跳过
- 包更新时 → postinstall 重新执行，`/f` 覆盖旧的注册表键，确保路径指向最新版本

## 项目结构

```
bin/juice.js              # CLI 入口（Commander.js, CJS）
src/index.js              # 核心逻辑：配置加载、模板处理、输出
src/snippet.js            # 片段组装模式逻辑 + 交互式提示
src/context-menu.js       # Windows 右键菜单注册
defaults/juice.yaml       # CLI 内置默认配置
edm/                      # EDM 模板库（npm 发布时包含，全局安装后可用）
  <brand>/                #   品牌目录（如 elabscience, procell）
    <brand>-template.html #     品牌模板（完整 HTML，含 <tbody id="content">）
    <series>/             #     系列/片段目录
      snippet.html        #       片段 HTML（Mustache 模板片段）
      juice.yaml          #       片段配置（variables）
scripts/release.mjs       # 发布脚本（ESM，使用 @inquirer/prompts）
```

## npm 全局安装行为

`resolveEdmDir()` 查找优先级：

1. **当前工作目录 `edm/`** — 用户自己项目的 EDM 资源（优先）
2. **包内置 `edm/`** — npm 全局安装后包目录下的 EDM 资源（回退）
3. 都不存在则抛出错误

这意味着：
- 开发时在项目根目录运行 → 使用项目 `edm/`
- npm 全局安装后在其他目录运行 → 使用包内置 `edm/`
- 用户在自己的项目中创建了 `edm/` → 优先使用用户自己的 EDM 资源

`package.json` 的 `files` 数组已包含 `edm/`，确保 `npm publish` 时打包 EDM 资源。

## 配置优先级

### 普通模式（-f）

低 → 高：`defaults/juice.yaml` → `~/juice.yaml` → `-c` 指定 或 输入文件同级 `juice.yaml`（二者互斥，只生效一个）

### 片段模式（--snippet）

低 → 高：`defaults/juice.yaml` → `~/juice.yaml` → 片段目录下的 `juice.yaml`（自动检测）→ `-c` 指定

### 交互模式（无参数）

低 → 高：`defaults/juice.yaml` → `~/juice.yaml` → 项目配置（CWD 优先 → 片段目录回退 → 手动输入，三选一）→ `-c` 指定

---

## 片段组装模式（Snippet Mode）

### 输出文件（4 个）

| 文件 | 说明 |
|---|---|
| `<name>.raw.html` | 原始组装：未渲染的片段 + 模板（Mustache 标签保留，无 CSS 内联） |
| `<name>.html` | 已渲染：Mustache 变量已替换，无 CSS 内联 |
| `<name>.output.html` | Juice CSS 内联后 |
| `<name>.minified.html` | 压缩版 |

### `src/snippet.js` 内部函数

| 函数 | 用途 |
|---|---|
| `resolveEdmDir()` | 查找 edm/ 目录：CWD 优先 → 包内置回退，都不存在则报错 |
| `findBrands(edmDir)` | 列出 edm/ 下的品牌子目录 |
| `findSnippetFolders(brandDir)` | 列出品牌目录下的片段子目录 |
| `findHtmlFiles(dir)` | 列出目录下 `.html`/`.htm` 文件 |
| `findYamlFiles(dir)` | 列出目录下 `.yaml`/`.yml` 文件 |
| `findLocalConfig(dir)` | 在目录下查找 `juice.yaml`（优先）或 `juice.yml`，不存在返回 null |
| `getBrand(filePath, edmDir)` | 从文件路径提取品牌名（edm 下第一级子目录名） |
| `buildSnippetConfig({ priorityConfigPath, cliConfigPath })` | 4 层配置合并 |
| `insertIntoContent(templateHtml, snippetHtml)` | 将片段插入模板的 `<tbody id="content">` 中（深度计数算法） |
| `resolveSnippetOutputPaths(snippetPath, cwd)` | 生成 4 个输出路径 |
| `assembleSnippet(...)` | 核心流水线：raw → .html → .output.html → .minified.html |
| `prompt*()` | 各交互步骤的 @inquirer/prompts 封装 |
| `promptConfirm(summary)` | 汇总确认 |

### 跨品牌检查（`getBrand` + `runSnippetMode`）

在 `--snippet` 模式下，片段和模板解析完成后，会提取各自的品牌名并比较。如果品牌不一致（如 elabscience 片段 + procell 模板），输出警告但继续执行：

```
⚠  片段品牌「elabscience」与模板品牌「procell」不一致，可能导致样式错乱。
```

交互模式（`runInteractiveMode`）从同一品牌下选择模板和片段，不会触发跨品牌警告。

### 配置合并（`buildSnippetConfig`）

| 优先级 | 层 | 来源 |
|---|---|---|
| 1 (低) | CLI 内置默认 | `defaults/juice.yaml` |
| 2 | 用户主目录 | `~/juice.yaml`（如存在） |
| 3 | 项目配置 | 片段目录 / CWD / 手动输入（三选一，由调用方传入） |
| 4 (高) | CLI `-c` | 用户指定路径 |

### 组装流水线（`assembleSnippet`）

1. 读取片段 HTML + 模板 HTML
2. 未渲染的片段插入模板 `id="content"` → `.raw.html`（Mustache 标签保留，无 juice）
3. Mustache 渲染合并 HTML → `.html`（变量已替换，无 juice）
4. 收集模板目录额外 CSS + Juice CSS 内联 → `.output.html`
5. 压缩 → `.minified.html`
6. 输出报告

### 交互流程

**`runInteractiveMode`（无 --snippet，无 -f）：**

```
1. 扫描 edm/ → 选择品牌
2. 扫描品牌目录 → 选择模板 HTML
3. 扫描品牌目录 → 选择片段系列（为空时优雅提示并退出）
4. 扫描片段系列 → 选择 HTML 文件（为空时优雅提示并退出，默认：snippet.html）
5. 选择配置文件：CWD 优先 → 片段目录配置 → 手动输入 → 跳过
6. 显示汇总 → 确认 → 执行
```

**`runSnippetMode`（--snippet 但无 -f）：**

```
1. 使用指定的片段 HTML
2. 交互式选择：品牌 → 模板 HTML
3. 跨品牌检查（片段品牌 vs 所选品牌），不一致则警告
4. 配置自动检测（片段目录下的 juice.yaml / juice.yml），-c 可覆盖
5. 执行
```

**`runSnippetMode`（--snippet + -f）：**

```
1. 直接使用指定的片段 + 模板
2. 跨品牌检查，不一致则警告
3. 配置自动检测（片段目录下的 juice.yaml / juice.yml），-c 可覆盖
4. 执行（无交互提示，品牌检查除外）
```

### 验证清单

- [x] `juice -f edm/procell/procell-template.html` — 普通模式正常
- [x] `juice --snippet edm/elabscience/literature/snippet.html -f edm/procell/procell-template.html` — 命令行片段模式，跨品牌警告 + 输出 4 文件
- [x] `juice --snippet edm/elabscience/literature/snippet.html -f edm/elabscience/elabscience-template.html` — 同品牌无警告
- [ ] `juice --snippet edm/elabscience/literature/snippet.html` — 片段 + 交互选模板（需 TTY）
- [ ] `juice`（项目根目录）— 全交互模式（需 TTY）
- [ ] `juice`（npm 全局安装后，任意目录）— 全交互模式使用包内置 edm/（需 TTY）
- [ ] `juice --install` / `juice --uninstall` — 右键菜单含新增选项（需管理员权限）
- [x] `juice -c defaults/juice.yaml --snippet ...` — 配置文件覆盖生效
- [x] `edm/procell/` 品牌（暂无片段文件夹）— 交互模式优雅提示
