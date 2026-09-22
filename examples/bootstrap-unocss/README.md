# 引入与使用 Bootstrap + UnoCSS

juice-cli 本身**不运行** Bootstrap / UnoCSS，它只提供 `<link rel="stylesheet" href="./x.css">` 构建期内联能力：把本地 CSS 文件读进来、再交给 juice 把规则内联到元素 `style` 属性（邮件客户端兼容）。

## 关键点

| 框架 | 是否需预构建 | 引入方式 |
|------|------------|---------|
| **Bootstrap** | 否（静态文件） | 把官方 `bootstrap.min.css` 放模板同目录，`<link>` 引入 |
| **UnoCSS** | **是**（构建期生成） | 先用 `unocss` CLI 把 HTML 里的工具类编译成 `uno.css`，再 `<link>` 引入 |

> 两者最终都被 juice 内联 —— 邮件里不会出现外链 `<link>`，也不会残留 `.flex` 这类 class（规则已写进 `style="display:flex"`）。

## 运行

**方式 A：普通模式（最简单）**

```bash
cd examples/bootstrap-unocss
node ../../bin/juice.js -f template.html
# 产物：template.output.html（.output.html / .minified.html 已 gitignore）
```

**方式 B：页面装配模式**

```bash
cd examples/bootstrap-unocss
node ../../bin/juice.js build -p page.yaml
```

## Bootstrap：拿到真实 CSS

```bash
# 下载官方 bootstrap.min.css 覆盖本目录的占位文件即可
curl -L https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css -o bootstrap.min.css
```

## UnoCSS：预编译（本示例 uno.css 为等价静态占位，无需装包即可跑通）

真实项目里用 UnoCSS 生成 `uno.css`：

```bash
npm i -D unocss
npx unocss "src/**/*.html" -o uno.css        # 扫描 HTML 工具类 → 生成 CSS
# 或带配置文件：npx unocss -c unocss.config.ts -o uno.css
```

配置示例 `unocss.config.ts`：

```ts
import { defineConfig, presetUno } from 'unocss'
export default defineConfig({ presets: [presetUno()] })
```

## 验证点

打开 `*.output.html`，确认：
- 无残留 `<link rel="stylesheet">`；
- `<a class="btn btn-primary">` 拿到 `style="...background:#0d6efd;color:#fff..."`（Bootstrap 规则内联）；
- `<div class="flex items-center p-4">` 拿到 `style="display:flex;align-items:center;padding:1rem"`（UnoCSS 工具类内联）。
