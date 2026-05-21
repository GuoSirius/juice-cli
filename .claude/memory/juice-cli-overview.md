---
name: juice-cli-overview
description: juice-cli 项目概述：HTML 邮件生成 CLI 工具，CSS 内联 + Mustache 模板 + 压缩
metadata: 
  node_type: memory
  type: project
  originSessionId: ed9b8d1e-69ad-4572-b62b-cbd4e24bbef5
---

# juice-cli 项目

## 核心功能
CLI 工具 `juice`，生成符合各大邮件平台的 HTML 邮件（CSS 内联 + Mustache 模板变量 + 压缩）。

## 三种运行模式
1. **普通模式** (`juice -f template.html`) — Mustache 替换 → juice CSS 内联 → 输出 `.output.html` + `.minified.html`
2. **片段模式** (`juice --snippet snippet.html [-f template.html]`) — 片段插入模板 `<tbody id="content">`，输出 4 个文件
3. **交互模式** (`juice` 无参数) — 逐步选择品牌/模板/片段/配置

## 项目结构
- `bin/juice.js` — CLI 入口（Commander.js）
- `src/index.js` — 核心逻辑：配置加载、模板处理、juice 内联、压缩输出
- `src/snippet.js` — 片段组装模式 + 交互式提示（@inquirer/prompts）
- `src/context-menu.js` — Windows 右键菜单注册
- `defaults/juice.yaml` — 内置默认配置
- `edm/` — EDM 模板库（品牌目录 → 模板 HTML + 片段系列子目录）

## 配置优先级
低→高：`defaults/juice.yaml` → `~/juice.yaml` → 项目配置（片段目录/CWD） → `-c` 指定

## 技术栈
- juice (CSS 内联)
- Mustache (模板变量)
- html-minifier-terser (压缩)
- js-yaml (配置解析)
- commander (CLI 框架)
- @inquirer/prompts (交互式提示)
- chalk, ora (终端 UI)
