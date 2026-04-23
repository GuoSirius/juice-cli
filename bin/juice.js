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
  .option('-c, --config <path>', '配置文件路径（不指定时自动按优先级查找）')
  .option('--register',   '注册 Windows 右键菜单（需管理员权限）')
  .option('--unregister', '取消 Windows 右键菜单注册（需管理员权限）')
  .addHelpText('after', `
配置文件合并顺序（优先级低→高）：
  1. CLI 内置默认值          （始终生效）
  2. 用户主目录 juice.yaml  （如果存在，始终参与合并）
  3. 高优先级配置            （以下三者互斥，只生效一个）
      · -c 指定的配置文件  （最高）
      · 输入文件同目录 juice.yaml / juice.yml
      · 用户主目录 juice.yaml / juice.yml  （上面已包含）

输出文件（与输入文件同目录）：
  <name>.output.html     CSS 内联 + 变量替换后的标准版
  <name>.minified.html   在标准版基础上压缩的精简版

示例：
  juice -f my-email.html
  juice -c project.yaml -f emails/welcome.html
  juice --register        （管理员权限，注册右键菜单）
`)
  .action(async (options) => {
    if (options.register) {
      const { registerContextMenu } = require('../src/context-menu');
      await registerContextMenu();
      return;
    }
    if (options.unregister) {
      const { unregisterContextMenu } = require('../src/context-menu');
      await unregisterContextMenu();
      return;
    }

    // 支持右键菜单直接传文件路径（位置参数）
    let inputFile = options.file;
    if (!inputFile && program.args.length > 0) {
      inputFile = program.args[0];
    }

    if (!inputFile) {
      program.help();
      process.exit(1);
    }

    await run({
      file: inputFile,
      config: options.config,
    });
  });

program.allowUnknownOption(false);
program.parse(process.argv);
