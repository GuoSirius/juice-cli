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
  .option('--unocss', '启用内建 UnoCSS 编译：扫描 HTML 工具类 → 原子 CSS → 内联（opt-in，需先安装 @unocss/core @unocss/preset-wind3）')
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
    注：若输出文件已存在，会提示「覆盖（默认）/ 版本 / 重命名」；
        非交互环境（CI/管道）默认覆盖并给出警告。

  片段模式（片段 + 模板拼接，输出 4 个文件）：
    juice -s edm/elabscience/literature/snippet.html -f edm/elabscience/elabscience-template.html
    juice -s edm/elabscience/literature/snippet.html                     （交互选择模板）
    juice -s snippet.html -f template.html -n my-output                  （自定义输出名）

  交互模式（逐步选择品牌、模板、片段、配置）：
    juice

  本地预览（仅注入 UnoCSS <style>，不内联/不压缩，免完整编译）：
    juice preview t.html                  模板模式：生成 t-preview.html，浏览器打开刷新即见
    juice preview -s snippet.html -f t.html   片段模式：预览片段拼进模板的效果
    juice preview -p page.yaml            页面装配模式：改 yaml / 新增板块自动生效
    加 -w 监听改动自动重生成；加 --serve 起本地服务（保存自动刷新），-o 自动开浏览器

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
    <name>.raw.html         原始组装（模板未渲染，无 CSS 内联）
    <name>.html             已渲染（模板变量已替换，无 CSS 内联）
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

更多信息：https://github.com/GuoSirius/juice-cli
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

// ─── Subcommand: juice build ────────────────────────────────────────────
program
  .command('build')
  .description('页面装配：按 page.yaml 将多个片段（可带独立变量）按序组装进模板')
  .option('-p, --page <path>', '页面装配描述文件（YAML）')
  .option('-c, --config <path>', '配置文件路径（也可放在子命令之前）')
  .option('-n, --name <name>', '输出文件名（不含扩展名，也可放在子命令之前）')
  .option('--unocss', '启用内建 UnoCSS 编译：扫描 HTML 工具类 → 原子 CSS → 内联（opt-in，需先安装 @unocss/core @unocss/preset-wind3）')
  .action(safeAction(async (options) => {
    // 兼容「juice -c x build」全局写法：子命令未指定时回退到根命令解析结果
    const globalOpts = program.opts();
    const { runPageMode } = await import('../src/page.js');
    await runPageMode({
      page: options.page || null,
      config: options.config || globalOpts.config || null,
      outputName: options.name || globalOpts.name || null,
      unocss: options.unocss || globalOpts.unocss || null,
    });
  }));

// ─── Subcommand: juice preview ─────────────────────────────────────────
program
  .command('preview [file]')
  .description('本地预览：仅注入 UnoCSS 原子 CSS（<style> 块，不内联/不压缩），免完整编译即可在浏览器看样式；支持模板 / 片段 / 页面装配三种模式')
  .option('-s, --snippet <path>', '片段模式：预览片段拼进模板的效果（需与 -f 同用）')
  .option('-f, --file <path>', '模板 HTML 路径（片段模式配套模板；模板模式也可直接传位置参数）')
  .option('-p, --page <path>', '页面装配模式：预览 page.yaml 装配效果（改 yaml / 新增板块均自动生效）')
  .option('-c, --config <path>', '配置文件路径')
  .option('-w, --watch', '监听改动（模板/片段/yaml）自动重生成预览文件（文件模式）或自动刷新（服务模式）')
  .option('--serve', '启动本地预览服务，浏览器访问后保存即自动刷新（不落盘、不动源码）')
  .option('--port <n>', '服务模式端口（默认 5000，被占用自动 +1 直至可用）', (v) => parseInt(v, 10))
  .option('-o, --open', '服务模式启动时自动打开默认浏览器')
  .action(safeAction(async (fileArg, options) => {
    // -s/-f 与全局旗标同名，commander 会把值路由进 program.opts()，故两路兜底
    const globalOpts = program.opts();
    const file = fileArg || options.file || globalOpts.file || null;
    const { runPreviewMode } = await import('../src/preview.js');
    await runPreviewMode({
      file,
      snippet: options.snippet || globalOpts.snippet || null,
      template: file,
      page: options.page || globalOpts.page || null,
      config: options.config || globalOpts.config || null,
      watch: !!options.watch,
      serve: !!options.serve,
      port: options.port || 5000,
      open: !!options.open,
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
        unocss: options.unocss,
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
        unocss: options.unocss,
      });
      return;
    }

    const { runInteractiveMode } = await import('../src/snippet.js');
    await runInteractiveMode({ config: options.config, unocss: options.unocss });
  }));

program.parse(process.argv);
