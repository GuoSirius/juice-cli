# 页面装配示例（juice build -p）

示例覆盖三项新能力：**页面装配**、**本地 `<link>` 样式内联**、**Handlebars 新语法**（`each/@index`、`if/eq`、partial）。

## 文件结构

| 文件 | 作用 |
|---|---|
| `page.yaml` | 装配描述：模板 + 全局变量 + 3 个板块（含独立 vars）+ partial |
| `template.html` | 页面骨架，`<tbody id="content">` 处插入板块；`<link>` 引入本地 CSS |
| `style.css` | 被 `<link>` 引入，构建期合并为 `<style>` 再由 juice 内联 |
| `sections/*/snippet.html` | 板块片段（header 用 partial + 变量；products 用 `each/@index/eq`） |
| `partials/note.html` | 被 `{{> note}}` 复用的局部片段 |

## 运行（必须先进入本目录，产物输出在当前目录）

```bash
cd examples/page-assembly
node ../../bin/juice.js build -p page.yaml
```

## 产物（4 个，均在运行目录）

| 产物 | 内容 |
|---|---|
| `demo-page.raw.html` | 板块已插入、变量未渲染（调试） |
| `demo-page.html` | 变量已渲染、CSS 未内联 |
| `demo-page.output.html` | juice 内联后（邮件可发版） |
| `demo-page.minified.html` | 压缩版 |

## 验证点

- `demo-page.output.html` 中：头部为蓝底白字、产品行 3 条（0/1/2 编号）、P1 带 🔥 HOT（`eq` 命中）、样式已内联到元素 style 属性、无残留 `<link>` 与 `{{...}}`。
