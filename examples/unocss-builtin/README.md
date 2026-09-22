# 内建 UnoCSS 编译 · 完整示例

一个**自包含、可直接运行**的邮件示例：直接用 UnoCSS 工具类写 HTML，无需任何预编译步骤，由 juice-cli 在构建期扫描 class → 生成原子 CSS → 注入 `<head>` → 由 juice 内联进每个元素的 `style`（邮件客户端兼容）。

## 目录内容

| 文件 | 说明 |
|------|------|
| `template.html` | 完整邮件模板（产品周报），全部用 UnoCSS 静态工具类编写 |
| `juice.yaml` | 含 `unocss: true`，让 normal 模式自动启用内建编译（也可改加 `--unocss` 旗标） |
| `template.output.html` / `template.minified.html` | 运行产物（已 gitignore，运行命令后自动生成） |

## 运行

```bash
cd examples/unocss-builtin
node ../../bin/juice.js -f template.html
# 无需 --unocss：同目录 juice.yaml 的 unocss:true 会自动启用
# 也可显式：node ../../bin/juice.js -f template.html --unocss
```

产物写入模板同目录：`template.output.html`（标准版）、`template.minified.html`（压缩版）。

## 开发期快速预览（免完整编译）

上面是**最终邮件产物**的生成方式（juice 内联 + 压缩）。写模板、调样式的迭代阶段用 `preview` 子命令 —— 只把原子 CSS 注入 `<style>` 块（不内联、不压缩），浏览器直开刷新即见，**每次改动无需重跑完整管线**：

```bash
juice preview template.html          # 生成 template-preview.html，浏览器打开、刷新即见
juice preview template.html -w       # 监听改动，自动重生成预览文件
juice preview template.html -s -o    # 起本地服务，保存后浏览器自动刷新（不落盘、不动源码）
```

- `preview` 产物是**浏览器预览用**；真正发邮件仍用 `juice -f template.html` 生成内联版。
- `-preview.html` 已被 gitignore，不会误提交。

## 真实效果（取自 template.output.html）

输入（节选）：

```html
<td class="bg-blue-600 px-6 py-5">
  <div class="flex items-center gap-3">
    <div class="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold text-lg">P</div>
    <span class="text-white text-xl font-bold">产品周报</span>
  </div>
</td>
```

输出（节选，工具类已内联为元素 style，颜色归一为 `rgba()`，无任何 `var()` 与 `.flex` 选择器）：

```html
<td class="bg-blue-600 px-6 py-5"
    style="background-color: rgba(37,99,235,1); padding-left: 1.5rem; padding-right: 1.5rem; padding-top: 1.25rem; padding-bottom: 1.25rem;"
    bgcolor="rgba(37,99,235,1)">
  <div class="flex items-center gap-3" style="display: flex; align-items: center; gap: 0.75rem;">
    <div class="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold text-lg"
         style="height: 2.5rem; width: 2.5rem; display: flex; align-items: center; justify-content: center; border-radius: 9999px; background-color: rgba(255,255,255,1); font-size: 1.125rem; line-height: 1.75rem; color: rgba(37,99,235,1); font-weight: 700;">P</div>
    <span class="text-white text-xl font-bold" style="font-size: 1.25rem; line-height: 1.75rem; color: rgba(255,255,255,1); font-weight: 700;">产品周报</span>
  </div>
</td>
```

> 邮件里不会出现外链 `<link>`，也不会残留 `.flex` 这类 class 选择器（`<style>` 被 juice 内联后移除）。

## 启用方式（opt-in，任一为真即生效）

| 方式 | 写法 |
|------|------|
| CLI 旗标 | `juice -f t.html --unocss` |
| 项目配置 | 模板同目录 `juice.yaml` 写 `unocss: true` |
| 页面装配 | `page.yaml` 写 `unocss: true`，或 `juice build -p page.yaml --unocss` |

## 已知限制

- **仅扫描静态 class**：无法解析 Handlebars 动态拼接的 class（如 `class="{{cls}}"`）—— 构建期无法确定取值。
- **flex/grid 在邮件客户端支持有限**：示例内用 flex 做小图标/徽章对齐，主流客户端（Gmail/Outlook）对 flex 支持不一致。正式邮件布局仍建议用 `<table>` 做骨架，把工具类用于间距、颜色、圆角、字号等安全属性。
- 依赖 `@unocss/core` + `@unocss/preset-wind3`（已写入 `optionalDependencies`）；未安装却启用会提示先安装。
