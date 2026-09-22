# 引入与使用 Bootstrap + UnoCSS

juice-cli 提供两种 CSS 引入方式，最终都由 juice 内联进元素 `style`（邮件客户端兼容）：

| 方式 | 说明 | 适合场景 |
|------|------|---------|
| **A. `<link>` 引入本地 CSS**（Bootstrap 静态文件 / UnoCSS 预编译产物） | 把本地 `.css` 读入、交给 juice 内联 | Bootstrap、或已用 `unocss` CLI 预编译的 `uno.css` |
| **B. 内建 UnoCSS 编译（opt-in）** | 页面直接写工具类，`--unocss` 后由 juice-cli 扫描并内联，**无需预编译** | 想直接写 `class="flex p-4"` 的轻量场景 |

> 两者最终都内联 —— 邮件里不会出现外链 `<link>`，也不会残留 `.flex` 这类 class（规则已写进 `style="display:flex"`）。

## 方式 A：`<link>` 引入（本目录已有 `template.html`）

**普通模式**

```bash
cd examples/bootstrap-unocss
node ../../bin/juice.js -f template.html
# 产物：template.output.html（.output.html / .minified.html 已 gitignore）
```

**页面装配模式**

```bash
cd examples/bootstrap-unocss
node ../../bin/juice.js build -p page.yaml
```

### Bootstrap：拿到真实 CSS

```bash
# 下载官方 bootstrap.min.css 覆盖本目录的占位文件即可
curl -L https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css -o bootstrap.min.css
```

### UnoCSS（本目录 `uno.css` 为等价静态占位，无需装包即可跑通预编译产物引入）

真实项目里用 UnoCSS CLI 生成 `uno.css`：

```bash
npm i -D unocss
npx unocss "src/**/*.html" -o uno.css        # 扫描 HTML 工具类 → 生成 CSS
```

```ts
import { defineConfig, presetUno } from 'unocss'
export default defineConfig({ presets: [presetUno()] })
```

## 方式 B：内建 UnoCSS 编译（推荐 · 无需预编译）

页面直接写工具类，加 `--unocss` 即可，juice-cli 构建期扫描并内联：

```bash
cd examples/bootstrap-unocss
node ../../bin/juice.js -f template-unocss.html --unocss
```

- 开启方式（任一）：CLI 旗标 `--unocss`，或配置 `unocss: true`（项目 `juice.yaml` / 页面模式 `page.yaml`）。
- email-safe：关闭 preflights（不注入 reset）、关闭 `@layer`，并把 `var(--un-*-opacity)` 与 `rgb(R G B / A)` 归一为 `rgba(R,G,B,A)`（邮件客户端不支持 CSS 变量）。
- 依赖：`@unocss/core` + `@unocss/preset-wind3`（已写入 `optionalDependencies`）。未安装却启用会提示先安装。
- 局限：UnoCSS 只扫描**静态** `class`，无法解析 Handlebars 动态 class（如 `class="{{cls}}"`）。

## 验证点

打开 `*.output.html`，确认：
- 无残留 `<link rel="stylesheet">` 与 `.flex` 这类 class 选择器；
- `<a class="btn btn-primary">` 拿到 `style="...background:#0d6efd;color:#fff..."`（Bootstrap 规则内联）；
- `template-unocss.html` 的 `<div class="flex items-center p-6 bg-blue-500">` 拿到 `style="display:flex;...;background-color:rgba(59,130,246,1);..."`（内建 UnoCSS 内联，逗号语法无 `var()`）。
