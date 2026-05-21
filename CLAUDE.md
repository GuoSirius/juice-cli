# juice-cli 项目文档与开发计划

## 项目概述

CLI 工具，生成标准、兼容各大邮件发送平台的 HTML 邮件（CSS 内联 + Mustache 模板变量 + 压缩）。

## 当前功能

- `juice -c config.yaml -f template.html` — 对 HTML 做 Mustache 变量替换 → juice CSS 内联 → 输出 `.output.html` + `.minified.html`
- `juice --install` / `juice --uninstall` — Windows 右键菜单注册/卸载
- 右键菜单：在 `.html`/`.htm` 文件上右键 → "📧 用 juice 生成邮件 HTML" → 生成

## 项目结构

```
bin/juice.js              # CLI 入口（Commander.js, CJS）
src/index.js              # 核心逻辑：配置加载、模板处理、输出
src/context-menu.js       # Windows 右键菜单注册
defaults/juice.yaml       # CLI 内置默认配置
edm/                      # EDM 模板库
  <brand>/                #   品牌目录（如 elabscience, procell）
    <brand>-template.html #     品牌模板（完整 HTML，含 <tbody id="content">）
    <series>/             #     系列/片段目录
      snippet.html        #       片段 HTML（Mustache 模板片段）
      juice.yaml          #       片段配置（variables）
scripts/release.mjs       # 发布脚本（ESM，使用 @inquirer/prompts）
```

## 配置优先级（当前）

低 → 高：`defaults/juice.yaml` → `~/juice.yaml` → `-c` 指定或输入文件同级 `juice.yaml`

---

## 开发计划：Snippet Mode（片段组装模式）

### 需求摘要

1. 新增 `--snippet` 选项，指定片段 HTML，结合 `-f` 指定模板 HTML（含 `id="content"`），拼接生成邮件
2. 在当前目录输出 **3 个文件**：原始未处理、处理后、压缩后
3. 未指定片段时，交互式选择：品牌 → 片段目录 → HTML 文件 → YAML 配置 → 模板 → 确认执行
4. 指定片段但未指定模板时，交互式选择模板 → 确认执行
5. 配置优先级：当前目录 > 片段目录，支持 `-c` 覆盖和手动输入路径
6. 右键菜单新增二级选项

### 新增文件

#### `src/snippet.js`

核心模块，包含所有片段组装逻辑和交互式提示。

**导出函数：**
- `async runSnippetMode({ snippet, template, config })` — `--snippet` 模式入口
- `async runInteractiveMode({ file, config })` — 全交互模式入口（无 `--snippet`，无 `-f`）

**内部函数：**

| 函数 | 用途 |
|---|---|
| `resolveEdmDir()` | 返回 `path.join(process.cwd(), 'edm')`，校验存在 |
| `findBrands(edmDir)` | 列出 edm/ 下的品牌子目录 |
| `findSnippetFolders(brandDir)` | 列出品牌目录下的片段子目录 |
| `findHtmlFiles(dir)` | 列出目录下 `.html`/`.htm` 文件 |
| `findYamlFiles(dir)` | 列出目录下 `.yaml`/`.yml` 文件 |
| `buildSnippetConfig(...)` | 5 层配置合并（见下文） |
| `insertIntoContent(templateHtml, snippetHtml)` | 将片段插入模板的 `<tbody id="content">` 中（深度计数算法） |
| `resolveSnippetOutputPaths(snippetPath, cwd)` | 生成 3 个输出路径 |
| `assembleSnippet(...)` | 核心流水线：原始 → 处理后 → 压缩 |
| `prompt*()` | 各交互步骤的 inquirer 封装 |
| `promptConfirm(summary)` | 汇总确认 |

**5 层配置合并（`buildSnippetConfig`）：**

| 优先级 | 层 | 来源 |
|---|---|---|
| 1 (低) | CLI 内置默认 | `defaults/juice.yaml` |
| 2 | 用户主目录 | `~/juice.yaml` |
| 3 | 片段目录 | 片段文件夹中选定的 YAML |
| 4 | 当前工作目录 | `./juice.yaml`（如存在） |
| 5 (高) | CLI `-c` | 用户指定路径 |

**组装流水线（`assembleSnippet`）：**

1. 读取片段 HTML + 模板 HTML
2. **原始输出**：将未渲染的片段插入模板 `id="content"` → 写入 `<name>.raw.html`
3. **Mustache 渲染片段**：`Mustache.render(snippetHtml, config.variables)`
4. 将渲染后的片段插入模板 `id="content"` → 得到合并 HTML
5. **Mustache 渲染合并 HTML**：处理模板级别变量（如 `{{brandName}}`）
6. 从模板目录收集额外 CSS（`collectExtraCss`）
7. **Juice CSS 内联** → 写入 `<name>.html`
8. **压缩** → 写入 `<name>.minified.html`
9. 输出报告（文件大小、压缩率、配置层信息）

**`insertIntoContent` 算法：** 用正则匹配含 `id="content"` 的 `<tbody`，然后深度计数 `<tbody>` / `</tbody>` 找到匹配闭合标签。无需引入 cheerio 等额外依赖。

**输出文件命名**（基于片段文件名 stem）：
- `<cwd>/<name>.raw.html` — 原始组装（Mustache 标签未替换）
- `<cwd>/<name>.html` — 处理后（Mustache + Juice）
- `<cwd>/<name>.minified.html` — 压缩版

**交互流程（`runInteractiveMode`）：**

```
1. 扫描 edm/ → 选择品牌
2. 扫描品牌目录 → 选择片段文件夹
3. 扫描片段文件夹 → 选择 HTML 文件（默认：第一个 .html）
4. 扫描片段文件夹 → 选择 YAML 文件（默认：juice.yaml），可选"跳过"或"输入自定义路径"
5. 若未指定 -f：扫描品牌目录 → 选择模板 HTML
6. 显示汇总 → 确认 → 执行
```

**当指定了 `--snippet` 但未指定 `-f`：** 跳到模板选择步骤，然后确认并执行。

每个交互步骤通过动态 `import('@inquirer/prompts')` 实现（ESM 包在 CJS 环境中的用法，与 `scripts/release.mjs` 一致）。

### 修改文件

#### `bin/juice.js`

1. 新增 `--snippet <path>` 选项
2. 调整 action 路由逻辑：

```
options.snippet  → runSnippetMode(...)
options.file     → run(...)          // 向后兼容
否则             → runInteractiveMode(...)
```

3. 更新帮助文本，添加片段模式使用示例

#### `src/index.js`

新增导出，供 `src/snippet.js` 复用：

```js
module.exports = { run, findConfigs, buildConfig, processTemplate, minifyHtml, deepMerge, collectExtraCss, loadYaml, fmtSize, savings };
```

仅新增导出，不修改任何现有逻辑。

#### `src/context-menu.js`

新增第三个子命令 `JuiceEmail.Snippet`：
- 标签：`🧩 邮件片段组装（交互选择模板）`
- 命令：`"<node>" "<juice.js>" --snippet "%1"`
- 菜单位置：Generate 和 OpenPwsh 之间

`unregisterContextMenu()` 同步清理新 key。

#### `package.json`

将 `@inquirer/prompts` 和 `chalk` 从 `devDependencies` 移至 `dependencies`：
- `@inquirer/prompts` — 交互模式运行时依赖
- `chalk` — `src/index.js` 和 `src/context-menu.js` 已在运行时使用（既有问题修正）

### 验证清单

- [ ] `juice -f examples/template.html` — 普通模式不变
- [ ] `juice --snippet edm/elabscience/literature/template.html -f edm/elabscience/elabscience-template.html` — 命令行片段模式，输出 3 文件
- [ ] `juice --snippet edm/elabscience/literature/template.html` — 片段 + 交互选模板
- [ ] `juice`（项目根目录）— 全交互模式，走完所有提示
- [ ] `juice --install` / `juice --uninstall` — 右键菜单含新增选项
- [ ] `juice -c custom.yaml --snippet ...` — 配置文件覆盖生效
- [ ] `edm/procell/` 品牌（暂无片段文件夹）— 优雅报错
