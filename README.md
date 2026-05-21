# juice-email-cli

> 一个用于生成符合各大邮件平台标准的 HTML 邮件命令行工具，基于 [juice](https://github.com/Automattic/juice) 实现 CSS 内联，支持 Mustache 模板变量替换，同时输出标准版与压缩版。

---

## 功能特性

- **CSS 内联** —— 将 `<style>` 中的样式全部内联为 `style=""` 属性，兼容 Gmail / Outlook / Apple Mail 等
- **Mustache 模板变量** —— 支持 `{{变量名}}` 语法，通过配置文件批量替换
- **Mustache 列表循环** —— 支持 `{{#items}}...{{/items}}` 遍历数组，支持嵌套循环
- **片段组装** —— 将片段 HTML 插入模板的 `<tbody id="content">`，自动调整缩进，输出 4 个阶段文件
- **三层配置合并** —— CLI 默认 < 用户目录 < 优先配置，层层合并
- **HTML 标签渲染** —— 变量值中的 `<sup>`、`<sub>` 等 HTML 标签直接渲染（可通过 `rawHtml` 关闭）
- **双文件输出** —— 普通模式生成 `.output.html` + `.minified.html`
- **四文件输出** —— 片段模式生成 `.raw.html` + `.html` + `.output.html` + `.minified.html`
- **交互模式** —— 无参数运行，逐步选择品牌、模板、片段、配置
- **Windows 右键菜单** —— 子菜单层级，一键注册/卸载

---

## 安装

```bash
# 全局安装
npm install -g juice-email-cli

# 安装时自动注册 Windows 右键菜单（无管理员权限时静默跳过）
```

> **提示**：安装时如未注册右键菜单，安装完成后以**管理员身份**运行：
> ```bash
> juice --install
> ```

```bash
# 本地克隆安装
git clone https://github.com/GuoSirius/juice-cli.git
cd juice-cli
npm install       # 自动注册右键菜单
npm link          # 链接到全局
```

---

## 使用方法

### 普通模式（CSS 内联 + 压缩，输出 2 个文件）

```bash
# 最简用法
juice -f my-email.html

# 指定配置文件
juice -c project.yaml -f my-email.html

# 使用 EDM 模板库中的模板
juice -f edm/elabscience/elabscience-template.html
```

生成文件（与输入文件同目录）：

| 文件 | 说明 |
|------|------|
| `<name>.output.html` | CSS 内联 + 变量替换后的标准版 |
| `<name>.minified.html` | 压缩版 |

### 片段模式（片段 + 模板拼接，输出 4 个文件）

```bash
# 完整指定片段和模板
juice -s edm/elabscience/literature/snippet.html -f edm/elabscience/elabscience-template.html

# 只指定片段，交互式选择模板
juice -s edm/elabscience/literature/snippet.html

# 自定义输出文件名
juice -s snippet.html -f template.html -n my-output
```

生成文件（当前工作目录）：

| 文件 | 说明 |
|------|------|
| `<name>.raw.html` | 原始组装（Mustache 未渲染，无 CSS 内联） |
| `<name>.html` | 已渲染（Mustache 变量已替换，无 CSS 内联） |
| `<name>.output.html` | Juice CSS 内联后 |
| `<name>.minified.html` | 压缩版 |

输出文件名默认为模板文件名（不含扩展名）。如果文件冲突，交互模式下可选择覆盖、自动版本号（`-v1`、`-v2`...）或重新输入。

### 交互模式（逐步选择）

```bash
juice
```

流程：选择品牌 → 模板 → 片段文件夹 → 片段 HTML → 配置文件 → 输出文件名 → 确认执行。

### 参数说明

| 参数 | 简写 | 说明 |
|------|------|------|
| `--file <path>` | `-f` | 输入 HTML 模板文件路径 |
| `--snippet <path>` | `-s` | 片段 HTML 文件路径：插入到模板 `<tbody id="content">` |
| `--config <path>` | `-c` | 配置文件路径，不指定时自动查找 |
| `--name <name>` | `-n` | 片段模式输出文件名（不含扩展名） |
| `--install` | | 注册 Windows 右键菜单（当前用户，无需管理员） |
| `--uninstall` | | 取消 Windows 右键菜单注册 |
| `--version` | `-v` | 查看版本号 |
| `--help` | `-h` | 查看帮助 |

### CLI 执行模式

| `-s` | `-f` | `-c` | 执行模式 |
|------|------|------|----------|
| ✓ | * | * | 片段模式（-s 指定片段，-f 可选指定模板） |
| ✗ | ✓ | * | 普通模式（生成 .output.html + .minified.html） |
| ✗ | ✗ | * | 交互式片段模式（逐步选择） |

---

## 配置文件优先级

```
优先级 低 ──────────────────────────────────────────────── 高

  CLI 内置默认值  <  用户主目录 ~/juice.yaml  <  优先配置（互斥）
```

**优先配置（-c 和输入文件同级目录互斥，只生效一个）：**

| 来源 | 说明 |
|------|------|
| `-c <path>` | 命令行指定，最优先 |
| 输入文件同目录 `juice.yaml` | 随模板文件走，适合项目级配置 |

**合并规则：**
- 用户主目录配置（如果存在）**始终参与合并**
- 优先配置覆盖用户主目录配置中的同名字段
- CLI 内置默认值兜底所有未配置字段

**示例：**

```bash
# 指定配置文件（与用户目录合并）
juice -c project.yaml -f email.html

# 使用输入文件同级目录配置（与用户目录合并）
juice -f email.html
```

### 片段模式配置

片段模式下，会自动检测片段目录下的 `juice.yaml` / `juice.yml` 作为项目配置参与合并：

```
优先级 低 ──────────────────────────────────────────────────────── 高

  内置默认  <  ~/juice.yaml  <  片段目录 juice.yaml  <  -c 指定
```

---

## 配置文件示例

用户配置文件（`~/juice.yaml` 或项目目录 `juice.yaml`）只需填写需要覆盖的字段，其余自动继承：

```yaml
# 设为 false 时，变量值中的 HTML 标签会被转义
rawHtml: true

variables:
  brandName: "我的品牌"
  brandColor: "#ff6600"
  logoUrl: "https://cdn.example.com/logo.png"
  ctaText: "立即订购"
  ctaUrl: "https://example.com/buy"
  companyName: "My Company"
  currentYear: "2026"

  # 列表数据示例
  products:
    - name: "产品 A"
      price: "¥99.00"
      tag: "热销"
    - name: "产品 B"
      price: "¥199.00"

  # 变量值支持 HTML 标签（rawHtml: true 时）
  overview:
    title: "CD38-NAD<sup>+</sup> Axis Study"
    keywords: "Immune Thrombocytopenia, NMN, NAD<sup>+</sup>"

# juice 选项（全部可选，均有内置默认值）
# juice:
#   removeStyleTags: true
#   preserveMediaQueries: true
#   preservePseudos: true

# 输出后缀（可选）
# output:
#   normalSuffix: ".output.html"
#   minifiedSuffix: ".minified.html"
```

完整默认配置见 [`defaults/juice.yaml`](./defaults/juice.yaml)。

---

## 模板语法

使用 [Mustache](https://mustache.github.io/) 语法：

```html
<h1>你好，{{recipientName}}！</h1>
<a href="{{ctaUrl}}" style="background-color: {{brandColor}};">{{ctaText}}</a>
```

### HTML 标签在变量中

当 `rawHtml: true`（默认）时，变量值中的 HTML 标签直接渲染：

```yaml
variables:
  overview:
    keywords: "CD38-NAD<sup>+</sup> Axis, NO<sub>3</sub><sup>-</sup>"
```

```html
<p>{{overview.keywords}}</p>
<!-- 渲染为：CD38-NAD<sup>+</sup> Axis, NO<sub>3</sub><sup>-</sup> -->
```

### Mustache 列表循环

支持 `{{#items}}...{{/items}}` 语法遍历数组数据：

```yaml
variables:
  products:
    - name: "产品 A"
      price: "¥99.00"
      tag: "热销"
    - name: "产品 B"
      price: "¥199.00"
```

```html
{{#products}}
<div class="product-item">
  <h3>{{name}}</h3>
  <p class="price">{{price}}</p>
  {{#tag}}<span class="tag">{{tag}}</span>{{/tag}}
</div>
{{/products}}

{{^products}}
<p>暂无商品</p>
{{/products}}
```

| 语法 | 说明 | 示例 |
|------|------|------|
| `{{#list}}{{/list}}` | 循环遍历 | `{{#products}}{{name}}{{/products}}` |
| `{{^list}}{{/list}}` | 反向（空列表时显示） | `{{^products}}暂无{{/products}}` |
| `{{.}}` | 当前元素 | `{{#items}}{{.}}{{/items}}` |
| `{{#var}}{{/var}}` | 条件渲染（仅当有值时显示） | `{{#tag}}{{tag}}{{/tag}}` |

---

## 片段组装

### EDM 目录结构

```
edm/
├── <brand>/                       # 品牌目录
│   ├── <brand>-template.html      #   品牌模板（含 <tbody id="content">）
│   └── <series>/                  #   片段系列目录
│       ├── snippet.html           #     片段 HTML（Mustache 模板片段）
│       └── juice.yaml             #     片段配置（variables）
```

### 片段 HTML 格式

片段是模板中 `<tbody id="content">` 内的内容片段，会被自动插入并调整缩进：

```html
<!-- edm/elabscience/literature/snippet.html -->
<tr>
  <td></td>
  <td colspan="2">
    <table>
      <tbody>
        <tr>
          <td><img src="{{overview.image}}" /></td>
          <td><strong>{{overview.title}}</strong></td>
        </tr>
      </tbody>
    </table>
  </td>
  <td></td>
</tr>
```

### 跨品牌检查

片段和模板来自不同品牌时，会输出警告但仍继续执行，避免样式错乱。

---

## Windows 右键菜单

注册后，在 `.html` / `.htm` / `.yaml` / `.yml` 文件上右键可看到统一子菜单（所有文件类型共享）：

```
📧 用 juice 生成邮件 HTML
  ├── 📄 作为模板，生成邮件 HTML   → juice -f %1（后台执行）
  ├── 🧩 作为片段，拼接邮件 HTML   → juice -s %1（交互选择模板）
  ├── ⚙️ 作为配置，拼接邮件 HTML   → juice -c %1（交互选择品牌/模板/片段）
  └── 📂 打开 PowerShell           ← 仅已安装 pwsh 时出现
```

| 子命令 | 说明 |
|--------|------|
| 📄 作为模板，生成邮件 HTML | 将文件当模板处理，CSS 内联 + 变量替换 + 压缩 |
| 🧩 作为片段，拼接邮件 HTML | 将文件当片段，打开终端选择模板后拼接输出 |
| ⚙️ 作为配置，拼接邮件 HTML | 将文件当配置，打开终端选择品牌/模板/片段 |

```bash
juice --install    # 注册（当前用户，无需管理员）
juice --uninstall   # 卸载
```

> **注意**：注册到当前用户（HKCU），无需管理员权限。注册成功后如菜单未立即出现，重启文件资源管理器（`explorer.exe`）即可。

---

## 目录结构

```
juice-cli/
├── bin/
│   └── juice.js               # CLI 入口
├── src/
│   ├── index.js               # 核心逻辑（配置合并、模板处理、双输出）
│   ├── snippet.js             # 片段组装模式 + 交互式提示
│   └── context-menu.js        # Windows 右键菜单注册
├── defaults/
│   └── juice.yaml             # CLI 内置默认配置
├── edm/                       # EDM 模板库（npm 发布时包含）
│   ├── elabscience/
│   │   ├── elabscience-template.html
│   │   └── literature/
│   │       ├── snippet.html
│   │       └── juice.yaml
│   └── procell/
│       └── procell-template.html
├── icons/
│   └── juice-icon.ico          # 右键菜单图标
├── scripts/
│   └── release.mjs            # 发布脚本
├── CHANGELOG.md                # 变更日志（自动生成）
├── LICENSE                     # MIT
└── package.json
```

---

## 发布说明

### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
chore: 其他变更
```

### 自动化发布

```bash
npm run release        # 一键发布
npm run release:dry    # 预览
```

---

## License

MIT
