#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const path = require('path');
const pkg = require('../package.json');
const { run } = require('../src/index');

program
  .name('juice')
  .description('生成符合各大邮件平台的内联 CSS HTML 邮件（同时输出标准版 + 压缩版）')
  .version(pkg.version, '-v, --version')
  .option('-f, --file <path>', '输入 HTML 模板文件路径')
  .option('-s, --snippet <path>', '片段 HTML 文件路径：将片段内容插入模板 <tbody id="content"> 中')
  .option('-c, --config <path>', '配置文件路径')
  .option('-n, --name <name>', '片段模式输出文件名（不含扩展名）')
  .option('--install',   '注册 Windows 右键菜单（当前用户，无需管理员）')
  .option('--uninstall', '取消 Windows 右键菜单注册')
  .addHelpText('before', `
╔════════════════════════════════════════════════════════════════╗
║  juice-email-cli v${pkg.version}                                     ║
║  HTML 邮件生成工具 - CSS 内联 + 模板变量 + 压缩                  ║
╚════════════════════════════════════════════════════════════════╝
`)
  .addHelpText('after', `
配置加载顺序（优先级从低到高）：
  1. CLI 内置默认值（defaults/juice.yaml）
  2. 用户主目录 ~/juice.yaml（如果存在）
  3. 优先配置（-c 指定 或 输入文件同级目录）

════════════════════════════════════════════════════════════════
  使用示例
════════════════════════════════════════════════════════════════

  普通模式（CSS 内联 + 压缩，输出 2 个文件）：
    juice -f my-email.html
    juice -f my-email.html -c project.yaml
    juice -f edm/elabscience/elabscience-template.html

  片段模式（片段 + 模板拼接，输出 4 个文件）：
    juice -s edm/elabscience/literature/snippet.html -f edm/elabscience/elabscience-template.html
    juice -s edm/elabscience/literature/snippet.html                     （交互选择模板）
    juice -s snippet.html -f template.html -n my-output                  （自定义输出名）

  交互模式（逐步选择品牌、模板、片段、配置）：
    juice

════════════════════════════════════════════════════════════════
  输出文件说明
════════════════════════════════════════════════════════════════

  普通模式（与输入文件同目录）：
    <name>.output.html     CSS 内联 + 变量替换后的标准版
    <name>.minified.html   压缩版

  片段模式（当前工作目录）：
    <name>.raw.html         原始组装（Mustache 未渲染，无 CSS 内联）
    <name>.html             已渲染（Mustache 变量已替换，无 CSS 内联）
    <name>.output.html      Juice CSS 内联后
    <name>.minified.html    压缩版

════════════════════════════════════════════════════════════════
  右键菜单
════════════════════════════════════════════════════════════════

  在 .html/.htm 文件上右键即可使用：
    juice --install          （当前用户，注册右键菜单）
    juice --uninstall         （卸载右键菜单）

更多信息：https://gitee.com/siriussupreme/juice-cli
`)
  .action(async (options) => {
    // 注册/卸载右键菜单
    if (options.install) {
      const { registerContextMenu } = require('../src/context-menu');
      await registerContextMenu();
      return;
    }
    if (options.uninstall) {
      const { unregisterContextMenu } = require('../src/context-menu');
      await unregisterContextMenu();
      return;
    }

    // --snippet / -s 模式：片段组装
    if (options.snippet) {
      const { runSnippetMode } = require('../src/snippet');
      await runSnippetMode({
        snippet: options.snippet,
        template: options.file,
        config: options.config,
        outputName: options.name,
      });
      return;
    }

    // 普通模式：-f 指定文件
    let inputFile = options.file;
    if (!inputFile && program.args.length > 0) {
      inputFile = program.args[0];
    }

    if (inputFile) {
      await run({
        file: inputFile,
        config: options.config,
      });
      return;
    }

    // 全交互模式：无 --snippet，无 -f
    const { runInteractiveMode } = require('../src/snippet');
    await runInteractiveMode({ config: options.config });
  });

program.allowUnknownOption(false);
program.parse(process.argv);
