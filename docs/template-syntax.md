# 模板语法参考（Handlebars 引擎 · Mustache 兼容语义）

> 一句话：**现有 Mustache 模板不改一个字即可用**；在此之上额外提供循环索引、逻辑 helper、partial、本地样式表内联等增强能力。
>
> 引擎为 Handlebars（隔离实例），已覆写 section 语义与 Mustache 完全对齐（空串/0/undefined 为假值、字符串 section 保持父级上下文、对象 section 压栈上下文、数组 section 迭代）。

---

## 1. 变量插值

| 语法 | 说明 | 示例 → 输出 |
|------|------|------------|
| `{{var}}` | 插值，默认 HTML 转义 | `{{title}}` → `CD38&lt;sup&gt;`（含标签时转义） |
| `{{a.b.c}}` | 点路径嵌套取值 | `{{overview.title}}` |
| `{{{var}}}` | 插值，**恒不转义**（不受 rawHtml 影响） | `{{{html}}}` → 原样输出标签 |
| `{{var}}` + `rawHtml: true` | 变量值中 HTML 直接渲染 | `<sup>+</sup>` → `<sup>+</sup>` |
| 未定义变量 | 渲染为空（不报错） | `[{{nope}}]` → `[]` |

> `rawHtml` 默认 `true`（yaml 配置项）。`rawHtml: false` 时 `{{var}}` 转义、`{{{var}}}` 仍不转义。

---

## 2. 条件渲染（section 语义 · Mustache 对齐）

### 2.1 值类型 → 行为对照

| 变量值类型 | `{{#var}}正块{{/var}}` | `{{^var}}反块{{/var}}` | 块内上下文 |
|-----------|----------------------|----------------------|-----------|
| `''` / `0` / `false` / `null` / `undefined` | 不渲染 | ✅ 渲染 | — |
| 非空字符串 / 非零数字 / `true` | ✅ 渲染一次 | 不渲染 | **父级上下文不变**（可引用 `{{var}}` 本身及兄弟路径） |
| 对象 | ✅ 渲染一次 | 不渲染 | **压栈为该对象**（块内直接写子字段） |
| 非空数组 | 每项渲染一次 | 不渲染 | 每项（见 2.2） |
| 空数组 | 不渲染 | ✅ 渲染 | — |

### 2.2 现有模板常用写法（全部兼容）

```html
<!-- 字符串条件 + 块内父级引用（webinar/literature 大量在用） -->
{{#speaker.email}}<a href="mailto:{{speaker.email}}">{{speaker.email}}</a>{{/speaker.email}}
{{#gift}}<p class="gift">{{gift}}</p>{{/gift}}

<!-- 属性存在性切换 -->
{{#banner.link}}<a href="{{banner.link}}">…</a>{{/banner.link}}
{{^banner.link}}<img src="{{banner.image}}" />{{/banner.link}}

<!-- 对象 section：块内直接用子字段 -->
{{#person}}<p>{{name}}（{{age}}）</p>{{/person}}
```

---

## 3. 数组迭代

| 语法 | 说明 | 示例 |
|------|------|------|
| `{{#list}}…{{/list}}` | 循环遍历，块内上下文为当前项 | `{{#products}}{{name}}{{/products}}` |
| `{{.}}` | 当前项（仅数组迭代内使用） | `{{#items}}<p>{{.}}</p>{{/items}}` |
| `{{^list}}…{{/list}}` | 空数组/未定义时渲染 | `{{^products}}暂无{{/products}}` |
| `{{#list}}A{{else}}B{{/list}}` | 空列表走 `{{else}}` | |

```html
{{#productLists}}
<tr>
  <td><a href="{{link}}">{{name}}</a></td>
  <td>{{catNo}}</td>
</tr>
{{/productLists}}
```

### 3.1 增强迭代 `{{#each}}`（新增能力）

```html
{{#each items}}
  <p>{{@index}}. {{name}}</p>   <!-- 0. P1 -->
{{/each}}
```

| 变量 | 含义 |
|------|------|
| `@index` | 从 0 开始的索引 |
| `@first` / `@last` | 是否首项/末项（布尔） |

---

## 4. 逻辑 helper（新增能力）

在 `{{#if …}}` / `{{#unless …}}` 中配合子表达式使用：

| helper | 等价 | 示例 |
|--------|------|------|
| `(eq a b)` / `(ne a b)` | `===` / `!==` | `{{#if (eq tag "hot")}}🔥{{/if}}` |
| `(gt a b)` / `(gte a b)` / `(lt a b)` / `(lte a b)` | 数值比较 | `{{#if (gt count 3)}}…{{/if}}` |
| `(and a b …)` / `(or a b …)` | 任意参数个数 | `{{#if (and a b)}}…{{/if}}` |
| `(not a)` | 取反 | `{{#if (not archived)}}…{{/if}}` |

`{{#if}}` / `{{#unless}}` 支持 `{{else}}`：

```html
{{#if (eq status "active")}}
  <span>启用中</span>
{{else}}
  <span>已停用</span>
{{/if}}
```

> 注意：`{{#if}}` 是 Handlebars 内置 helper，**假值判定为 Handlebars 规则**（`false`/`undefined`/`null`/`''`/`0`/空数组 为假，与 Mustache 基本一致）。

---

## 5. Partial 局部片段（新增能力）

片段模式在片段目录 `juice.yaml`、页面模式在 `page.yaml` 中注册：

```yaml
partials:
  note: partials/note.html
```

```html
{{> note}}   <!-- 内注册的片段内容，同样支持变量渲染 -->
```

---

## 6. 本地样式表内联（新增能力）

模板（或页面骨架）中直接写 `<link>`，构建期读取本地 CSS 合并为 `<style>`，再由 juice 内联到元素：

```html
<link rel="stylesheet" href="./email.css">
```

| 情况 | 行为 |
|------|------|
| 本地相对/绝对路径（相对**模板所在目录**） | 读取并替换为 `<style>`（支持模板变量） |
| `http(s)://` 外链 | 保留原样 + 黄色警告（邮件客户端会剥离外链样式） |
| 文件不存在 | 移除该标签 + 警告（保证输出自包含） |
| 非 stylesheet 的 link（favicon 等） | 不处理 |

---

### 6.1 内建 UnoCSS 编译（opt-in · 新增能力）

不想预编译 `uno.css`？开启后 juice-cli 直接扫描 HTML 里的工具类、构建期生成原子 CSS 并内联，**页面上直接写 class 即可**。

**开启方式（任一即可）：**

- CLI 旗标：`juice -f t.html --unocss`
- 配置文件：`unocss: true`（项目 `juice.yaml` 或页面模式 `page.yaml`）

**email-safe 处理**：关闭 preflights（不注入全局 reset）、关闭 `@layer`，并把 `@unocss/preset-wind3` 生成的 `var(--un-*-opacity)` 与 `rgb(R G B / A)` 归一为 `rgba(R,G,B,A)`——邮件客户端不支持 CSS 变量，否则背景色/文字色会整体失效。

**示例（最小片段）：**

```html
<div class="flex items-center p-6 bg-blue-500 text-white rounded-lg">卡片</div>
```

```bash
juice -f t.html --unocss
# 产物 div 已拿到 style="display:flex;...;background-color:rgba(59,130,246,1);..."
```

**完整可运行示例**：见 [`examples/unocss-builtin/`](../examples/unocss-builtin/)（整封产品周报邮件，含 `juice.yaml(unocss:true)` 与真实产物前后对比）。

**开发期免编译预览**：改一点就要跑完整邮件管线太重？用 `preview` 子命令 —— 仅把原子 CSS 注入 `<style>` 块（**不内联、不压缩**），浏览器直开刷新即见样式，迭代时无需走 juice。三种装配模式均支持：

```bash
juice preview t.html                        # 模板模式：生成 t-preview.html，浏览器打开、刷新即见
juice preview -s snippet.html -f t.html     # 片段模式：预览片段拼进模板的效果
juice preview -p page.yaml                  # 页面装配模式：改 yaml / 新增板块均自动生效
juice preview t.html -w                     # 加 -w：监听改动（模板/片段/yaml）自动重生成
juice preview t.html --serve -o             # 加 --serve：起本地服务（默认 5000，冲突自动 +1），保存后浏览器自动刷新
```

> 依赖为 `optionalDependencies`：`@unocss/core` + `@unocss/preset-wind3`。未安装却启用会提示先安装；核心邮件链路不硬依赖。
> UnoCSS 只扫描**静态** `class` 属性，无法解析 Handlebars 动态 class（如 `class="{{cls}}"`）。

---

## 7. 不支持的写法（从 Mustache 迁移注意）

| 语法 | 支持情况 | 替代方案 |
|------|---------|---------|
| `{{& var}}` | ❌ 不支持 | 用 `{{{var}}}` |
| 自定义分隔符 `{{=<< >>=}}` | ❌ 不支持 | 统一用 `{{ }}` |
| `{{% …}}` 指令 | ❌ 不支持 | — |

其余 Mustache 语法（含 `{{.}}`、点路径、反向块、注释 `{{! }}` / `{{!-- --}}`）全部兼容。

---

## 8. 完整可运行示例

- 内建 UnoCSS 编译（整封邮件，含真实产物对比）：[`examples/unocss-builtin/`](../examples/unocss-builtin/)
  ```bash
  cd examples/unocss-builtin
  node ../../bin/juice.js -f template.html   # juice.yaml 已含 unocss:true，免旗标
  ```
- 页面装配 + `<link>` 内联 + Handlebars 语法全覆盖：[`examples/page-assembly/`](../examples/page-assembly/)
  ```bash
  cd examples/page-assembly
  node ../../bin/juice.js build -p page.yaml
  ```
