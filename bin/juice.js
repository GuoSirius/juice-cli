#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import chalk from 'chalk';
import { run } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'));

let ExitPromptError;
try {
  ({ ExitPromptError } = await import('@inquirer/core'));
} catch (_) {}

function safeAction(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (err) {
      if (ExitPromptError && err instanceof ExitPromptError) {
        process.exit(0);
      }
      console.error('\n' + chalk.red(`  ✘ ${err.message}`));
      if (process.env.DEBUG) console.error(err);
      process.exit(1);
    }
  };
}

const program = new Command();

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
  资源浏览
════════════════════════════════════════════════════════════════

  查看资源树：
    juice view                      查看所有品牌、模板、系列、片段
    juice view elabscience          查看指定品牌的模板和系列
    juice view --templates          列出所有模板
    juice view --series             列出所有系列
    juice view --snippets           列出所有片段

  拷贝到当前目录：
    juice init                      交互式选择并拷贝模板/片段/配置
    juice init --template <file>    仅拷贝指定模板 HTML
    juice init --snippet <file>     仅拷贝指定片段 HTML
    juice init --config <file>      仅拷贝指定配置 YAML
    juice init --all [target]       拷贝整个 EDM 资源库

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

  注册后，在 .html / .htm / .yaml / .yml 文件上右键即可看到：
    juice --install          （当前用户，无需管理员）
    juice --uninstall         （卸载右键菜单）

  菜单结构：
    用 juice 生成邮件 HTML
      +-- 作为模板，生成邮件 HTML  ->  juice -f
      +-- 作为片段，拼接邮件 HTML  ->  juice -s
      +-- 查看可用资源              ->  juice view
      +-- 拷贝全部资源              ->  juice init --all
      +-- 选择资源拷贝              ->  juice init
      +-- 打开 PowerShell          （仅已安装 pwsh 时出现）

更多信息：https://gitee.com/siriussupreme/juice-cli
`);

// ─── Subcommand: juice view ─────────────────────────────────────────────
program
  .command('view [path]')
  .description('查看 EDM 资源：品牌、模板、系列、片段变体')
  .option('-i, --interactive', '交互式浏览，可上下翻层级')
  .option('--templates', '列出所有模板')
  .option('--series', '列出所有系列')
  .option('--snippets', '列出所有片段')
  .action(safeAction(async (viewPath, options) => {
    const { runViewMode } = await import('../src/view.js');
    await runViewMode({
      viewPath: viewPath || null,
      interactive: !!options.interactive,
      scope: options.templates ? 'templates'
        : (options.series ? 'series'
        : (options.snippets ? 'snippets' : null)),
    });
  }));

// ─── Subcommand: juice init ─────────────────────────────────────────────
program
  .command('init [path]')
  .description('从 EDM 资源拷贝模板/片段/配置到当前目录')
  .option('-t, --template <file-path>', '仅拷贝模板 HTML 文件')
  .option('--all [target]', '拷贝整个 EDM 资源目录到当前或指定目录')
  .action(safeAction(async (initPath, options) => {
    // -s/--snippet 与 -c/--config 与根命令同名，作为全局选项解析，
    // 故从此处的 program.opts() 读取（见下方根命令定义）。
    const globalOpts = program.opts();
    const { runInitMode } = await import('../src/init.js');
    await runInitMode({
      initPath: initPath || null,
      template: options.template || null,
      snippet: globalOpts.snippet || null,
      config: globalOpts.config || null,
      all: options.all !== undefined ? (options.all || true) : null,
    });
  }));

// ─── Default action (backward compatible) ───────────────────────────────
program
  .action(safeAction(async (options) => {
    if (options.install) {
      const { registerContextMenu } = await import('../src/context-menu.js');
      await registerContextMenu();
      return;
    }
    if (options.uninstall) {
      const { unregisterContextMenu } = await import('../src/context-menu.js');
      await unregisterContextMenu();
      return;
    }

    if (options.snippet) {
      const { runSnippetMode } = await import('../src/snippet.js');
      await runSnippetMode({
        snippet: options.snippet,
        template: options.file,
        config: options.config,
        outputName: options.name,
      });
      return;
    }

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

    const { runInteractiveMode } = await import('../src/snippet.js');
    await runInteractiveMode({ config: options.config });
  }));

program.parse(process.argv);
