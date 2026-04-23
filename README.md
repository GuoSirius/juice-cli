# juice-email-cli

> 一个用于生成符合各大邮件平台标准的 HTML 邮件命令行工具，基于 [juice](https://github.com/Automattic/juice) 实现 CSS 内联，支持 Mustache 模板变量替换，同时输出标准版与压缩版两份文件。

---

## 功能特性

- ✅ **CSS 内联** —— 将 `<style>` 中的样式全部内联为 `style=""` 属性，兼容 Gmail / Outlook / Apple Mail 等
- ✅ **Mustache 模板变量** —— 支持 `{{变量名}}` 语法，通过配置文件批量替换
- ✅ **三层配置合并** —— CLI 内置默认 < 用户主目录配置 < 高优先级配置，三者层层合并
- ✅ **双文件输出** —— 同时生成标准版 `.output.html` 和压缩版 `.minified.html`
- ✅ **响应式保留** —— `@media`、`@font-face`、`@keyframes` 均不丢失
- ✅ **Windows 右键菜单（PowerShell 7 风格）** —— 子菜单层级，一键注册

---

## 安装

```bash
# 全局安装（npm 包名：juice-email-cli）
npm install -g juice-email-cli

# 安装时会自动注册 Windows 右键菜单（无管理员权限时静默跳过，可稍后手动注册）
```

> **提示**：安装时如未注册右键菜单（无管理员权限），安装完成后以**管理员身份**运行以下命令即可：
> ```bash
> juice --register
> ```

```bash
# 克隆本地安装
git clone https://github.com/siriussupreme/juice-email-cli.git
cd juice-email-cli
npm install       # 自动注册右键菜单（无管理员权限时跳过）
npm link          # 将 bin/juice.js 链接到全局
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
| `--config <path>` | `-c` | 配置文件路径，不指定时自动按优先级查找 |
| `--register` | | 注册 Windows 右键菜单（需管理员权限） |
| `--unregister` | | 取消 Windows 右键菜单注册 |
| `--version` | `-v` | 查看版本号 |
| `--help` | `-h` | 查看帮助 |

---

## 配置文件优先级

```
优先级 低 ──────────────────────────────────────────────── 高

  CLI 内置默认值  <  用户主目录 ~/juice.yaml  <  高优先级配置（互斥）
```

**高优先级配置（三者互斥，只生效一个）：**

| 优先级 | 来源 | 说明 |
|--------|------|------|
| 最高 | `-c <path>` | 命令行指定，指定即生效 |
| 其次 | 输入文件同目录 `juice.yaml` | 随模板文件走，适合项目级配置 |
| 最后 | 用户主目录 `~/juice.yaml` | 当以上两者都不存在时生效 |

**合并规则：**
- 用户主目录配置（如果存在）**始终参与合并**
- 高优先级配置覆盖用户主目录配置中的同名字段
- CLI 内置默认值兜底所有未配置字段

**示例：**

```bash
# 仅使用 -c 配置（与用户主目录合并）
juice -c project.yaml -f email.html

# 仅使用输入文件目录配置（与用户主目录合并）
# → email.html 同目录下有 juice.yaml
juice -f email.html

# 仅使用用户主目录配置（无高优先级配置时）
# → 用户主目录 ~/juice.yaml 生效
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

# juice 选项（全部可选，均有内置默认值）
# juice:
#   removeStyleTags: true
#   preserveMediaQueries: true
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

---

## Windows 右键菜单（PowerShell 7 风格）

注册后，在 `.html` / `.htm` 文件上右键可看到级联子菜单：

```
📧 用 juice 生成邮件 HTML
  ├── ⚡ 生成邮件 HTML（标准 + 压缩）
  └── 📂 在此目录打开 PowerShell 7   ← 仅在系统已安装 pwsh 时出现
```

```bash
# 以管理员身份运行 PowerShell，然后：
juice --register

# 取消注册：
juice --unregister
```

> **注意**：注册/取消注册需要 **管理员权限**，请右键"以管理员身份运行"命令行。
> 注册成功后如菜单未立即出现，重启文件资源管理器（`explorer.exe`）即可。

---

## 发布 npm 包

```bash
# 登录（启用 2FA 后需使用 npm token）
npm login

# 发布（发布前确认包名：juice-email-cli）
npm publish --access public

# 发布 beta 版
npm publish --tag beta
```

---

## 目录结构

```
juice-email-cli/
├── bin/
│   └── juice.js               # CLI 入口（#!/usr/bin/env node）
├── src/
│   ├── index.js               # 核心逻辑（配置合并、模板处理、双输出）
│   └── context-menu.js        # Windows 右键菜单注册（PS7 风格）
├── defaults/
│   └── juice.yaml             # CLI 内置默认配置（最低优先级基准）
├── examples/
│   ├── juice.yaml             # 用户配置示例
│   └── template.html          # HTML 邮件模板示例
├── .npmignore                 # 发布时排除的文件
├── LICENSE                    # MIT
├── package.json
└── README.md
```

---

## License

MIT
