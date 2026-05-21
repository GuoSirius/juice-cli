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
  .option('-c, --config <path>', '配置文件路径（不指定时自动查找输入文件同级目录）')
  .option('--snippet <path>', '片段 HTML 文件路径：将片段内容插入模板 <tbody id="content"> 中，生成 3 个文件')
  .option('--install',   '注册 Windows 右键菜单（需管理员权限）')
  .option('--uninstall', '取消 Windows 右键菜单注册（需管理员权限）')
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
  3. 优先配置（-c 指定 或 输入文件同级目录，二者互斥）

普通模式（直接处理单个 HTML）：
  juice -f my-email.html
  juice -c project.yaml -f emails/welcome.html

片段组装模式（片段 + 模板拼接）：
  juice --snippet edm/elabscience/literature/snippet.html -f edm/elabscience/elabscience-template.html
  juice --snippet edm/elabscience/literature/snippet.html          （交互式选择模板）

交互模式（全交互选择）：
  juice                                                            （逐步选择品牌、片段、配置、模板）

右键菜单管理：
  juice --install          （管理员权限，注册右键菜单）
  juice --uninstall         （管理员权限，卸载右键菜单）

普通模式输出文件（与输入文件同目录）：
  <name>.output.html     CSS 内联 + 变量替换后的标准版
  <name>.minified.html   在标准版基础上压缩的精简版

片段模式输出文件（当前工作目录）：
  <name>.raw.html         原始组装（未处理）
  <name>.html             处理后（Mustache + Juice）
  <name>.minified.html    压缩版

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

    // --snippet 模式：片段组装
    if (options.snippet) {
      const { runSnippetMode } = require('../src/snippet');
      await runSnippetMode({
        snippet: options.snippet,
        template: options.file,
        config: options.config,
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
    await runInteractiveMode({ file: options.file, config: options.config });
  });

program.allowUnknownOption(false);
program.parse(process.argv);
