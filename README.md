# juice-email-cli

> 一个用于生成符合各大邮件平台标准的 HTML 邮件命令行工具，基于 [juice](https://github.com/Automattic/juice) 实现 CSS 内联，支持 Mustache 模板变量替换，同时输出标准版与压缩版两份文件。

---

## 功能特性

- ✅ **CSS 内联** —— 将 `<style>` 中的样式全部内联为 `style=""` 属性，兼容 Gmail / Outlook / Apple Mail 等
- ✅ **Mustache 模板变量** —— 支持 `{{变量名}}` 语法，通过配置文件批量替换
- ✅ **Mustache 列表循环** —— 支持 `{{#items}}...{{/items}}` 遍历数组，支持嵌套循环
- ✅ **三层配置合并** —— CLI 默认 < 用户目录 < 优先配置，三者层层合并
- ✅ **双文件输出** —— 同时生成标准版 `.output.html` 和压缩版 `.minified.html`
- ✅ **响应式保留** —— `@media`、`@font-face`、`@keyframes` 均不丢失
- ✅ **Windows 右键菜单（自定义图标）** —— 子菜单层级，一键注册/卸载，支持自定义图标

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
git clone https://github.com/siriussupreme/juice-cli.git
cd juice-cli
npm install       # 自动注册右键菜单
npm link          # 链接到全局
```

---

## 使用方法

```bash
# 最简用法（自动查找配置文件）
juice -f my-email.html

# 指定配置文件
juice -c project.yaml -f my-email.html
```

生成两个文件（与输入文件同目录）：

| 文件 | 说明 |
|------|------|
| `my-email.output.html` | CSS 内联 + 变量替换标准版 |
| `my-email.minified.html` | 在标准版基础上压缩的精简版 |

### 参数说明

| 参数 | 简写 | 说明 |
|------|------|------|
| `--file <path>` | `-f` | 输入 HTML 模板文件路径（必填） |
| `--config <path>` | `-c` | 配置文件路径，不指定时自动查找输入文件同级目录 |
| `--install` | | 注册 Windows 右键菜单（需管理员权限） |
| `--uninstall` | | 取消 Windows 右键菜单注册（需管理员权限） |
| `--version` | `-v` | 查看版本号 |
| `--help` | `-h` | 查看帮助 |

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
# → email.html 同目录下有 juice.yaml
juice -f email.html

# 无优先配置时，仅使用用户目录配置
juice -f email.html
```

---

## 配置文件示例

用户配置文件（`~/juice.yaml` 或项目目录 `juice.yaml`）只需填写需要覆盖的字段，其余自动继承：

```yaml
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
    - name: "产品 C"
      price: "¥299.00"

  features:
    - title: "特性一"
      items:
        - "优势 A"
        - "优势 B"
    - title: "特性二"
      items:
        - "优势 C"
        - "优势 D"

# juice 选项（全部可选，均有内置默认值）
# juice:
#   removeStyleTags: true
#   preserveMediaQueries: true
#   preservePseudos: true           # 保留 hover 等伪类
#   preservedSelectors:             # 保留的选择器（不会被内联）
#     - "a:hover"
#   extraCssFiles:
#     - email-reset.css

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

### Mustache 列表循环

支持 `{{#items}}...{{/items}}` 语法遍历数组数据：

```yaml
# juice.yaml - 配置列表数据
variables:
  products:
    - name: "产品 A"
      price: "¥99.00"
      tag: "热销"
    - name: "产品 B"
      price: "¥199.00"
    - name: "产品 C"
      price: "¥299.00"
```

```html
<!-- HTML 模板 -->
{{#products}}
<div class="product-item">
  <h3>{{name}}</h3>
  <p class="price">{{price}}</p>
  {{#tag}}<span class="tag">{{tag}}</span>{{/tag}}
</div>
{{/products}}

<!-- 空列表备选内容 -->
{{^products}}
<p>暂无商品</p>
{{/products}}

<!-- 嵌套循环示例 -->
{{#features}}
<div class="feature-column">
  <h4>{{title}}</h4>
  <ul>
    {{#items}}
    <li>{{.}}</li>
    {{/items}}
  </ul>
</div>
{{/features}}
```

| 语法 | 说明 | 示例 |
|------|------|------|
| `{{#list}}{{/list}}` | 循环遍历 | `{{#products}}{{name}}{{/products}}` |
| `{{^list}}{{/list}}` | 反向（空列表时显示） | `{{^products}}暂无{{/products}}` |
| `{{.}}` | 当前元素 | `{{#.}}{{.}}{{/}}` |
| `{{#var}}{{/var}}` | 条件渲染（仅当有值时显示） | `{{#tag}}{{tag}}{{/tag}}` |

---

## Windows 右键菜单（自定义图标）

注册后，在 `.html` / `.htm` 文件上右键可看到级联子菜单（带自定义图标）：

```
📧 用 juice 生成邮件 HTML
  ├── ⚡ 生成邮件 HTML（标准 + 压缩）
  └── 📂 在此目录打开 PowerShell 7   ← 仅在系统已安装 pwsh 时出现
```

```bash
# 以管理员身份运行 PowerShell，然后：
juice --install

# 卸载：
juice --uninstall
```

> **注意**：注册/卸载需要 **管理员权限**，请右键"以管理员身份运行"命令行。
> 注册成功后如菜单未立即出现，重启文件资源管理器（`explorer.exe`）即可。

> **图标说明**：自定义图标位于 `icons/juice-icon.ico`，支持 16x16 到 256x256 多种尺寸。

---

## 目录结构

```
juice-cli/
├── bin/
│   └── juice.js               # CLI 入口
├── src/
│   ├── index.js               # 核心逻辑（配置合并、模板处理、双输出）
│   └── context-menu.js        # Windows 右键菜单注册（自定义图标）
├── defaults/
│   └── juice.yaml             # CLI 内置默认配置（最低优先级基准）
├── examples/
│   ├── juice.yaml             # 用户配置示例（含列表数据）
│   ├── template.html           # HTML 邮件模板示例（含列表循环）
│   └── *.css                   # 附加样式文件
├── icons/
│   └── juice-icon.ico          # 右键菜单自定义图标
├── scripts/
│   ├── generate-icon.js        # 图标生成脚本
│   └── release.js              # 发布脚本
├── .husky/
│   └── commit-msg              # Git hooks - 提交信息校验
├── .commitlintrc.json          # Commitlint 配置
├── .versionrc                  # Standard-version 配置
├── .npmrc                      # npm 发布配置
├── CHANGELOG.md                # 变更日志（自动生成）
├── LICENSE                     # MIT
├── README.md
└── package.json
```

---

## 发布说明

本项目使用自动化发布流程，包含以下功能：

### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 代码格式调整
refactor: 重构代码
perf: 性能优化
test: 添加测试
build: 构建系统变更
ci: CI/CD 配置变更
chore: 其他变更
revert: 回退提交
```

### 自动化发布

```bash
# 执行一键发布（自动引导整个流程）
npm run release

# 预览发布（不实际执行）
npm run release:dry
```

**发布流程：**
1. 检测未提交的文件，询问是否提交
2. 选择版本更新类型（Major / Minor / Patch）
3. 确认版本号
4. 自动更新版本号、生成 CHANGELOG、打 tag
5. 推送到远程仓库
6. 发布到 npm

### 配置文件

| 文件 | 说明 |
|------|------|
| `.commitlintrc.json` | 提交信息校验规则 |
| `.versionrc` | 版本更新和 CHANGELOG 生成规则 |
| `.npmrc` | npm 发布配置 |
| `.husky/commit-msg` | Git hooks 配置 |

---

## License

MIT
