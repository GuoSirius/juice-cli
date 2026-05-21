'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const juice = require('juice');
const Mustache = require('mustache');
const chalk = require('chalk');
const ora = require('ora');
const {
  loadYaml,
  deepMerge,
  collectExtraCss,
  minifyHtml,
  fmtSize,
  savings,
} = require('./index');

// ─── EDM 目录解析 ──────────────────────────────────────────────────────────────

function resolveEdmDir() {
  const edmDir = path.join(process.cwd(), 'edm');
  if (!fs.existsSync(edmDir)) {
    throw new Error(`EDM 目录不存在：${edmDir}\n请在项目根目录（含 edm/ 目录）下执行，或先创建 edm/ 目录结构。`);
  }
  return edmDir;
}

function findBrands(edmDir) {
  const entries = fs.readdirSync(edmDir, { withFileTypes: true });
  const brands = entries
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, path: path.join(edmDir, e.name) }));
  if (brands.length === 0) {
    throw new Error(`EDM 目录下未找到任何品牌子目录：${edmDir}`);
  }
  return brands;
}

function findSnippetFolders(brandDir) {
  const entries = fs.readdirSync(brandDir, { withFileTypes: true });
  const folders = entries
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, path: path.join(brandDir, e.name) }));
  return folders;
}

function findHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && /\.html?$/i.test(e.name))
    .map((e) => ({ name: e.name, path: path.join(dir, e.name) }));
}

function findYamlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && /\.ya?ml$/i.test(e.name))
    .map((e) => ({ name: e.name, path: path.join(dir, e.name) }));
}

// ─── 配置合并（5 层） ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '..', 'defaults', 'juice.yaml');

function buildSnippetConfig({ snippetConfigPath, cliConfigPath }) {
  const layers = [];

  // 1. CLI 内置默认
  const defaults = loadYaml(DEFAULT_CONFIG_PATH);
  layers.push({ label: 'CLI 内置默认值', data: defaults });

  // 2. 用户主目录
  const homePath = path.join(os.homedir(), 'juice.yaml');
  if (fs.existsSync(homePath)) {
    layers.push({ label: `用户目录配置 (${homePath})`, data: loadYaml(homePath) });
  }

  // 3. 片段目录配置
  if (snippetConfigPath && fs.existsSync(snippetConfigPath)) {
    layers.push({ label: `片段配置 (${snippetConfigPath})`, data: loadYaml(snippetConfigPath) });
  }

  // 4. 当前工作目录配置
  const cwdCandidates = [
    path.join(process.cwd(), 'juice.yaml'),
    path.join(process.cwd(), 'juice.yml'),
  ];
  for (const c of cwdCandidates) {
    if (fs.existsSync(c)) {
      layers.push({ label: `当前目录配置 (${c})`, data: loadYaml(c) });
      break;
    }
  }

  // 5. -c 指定（最高优先级）
  if (cliConfigPath) {
    const resolved = path.resolve(cliConfigPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`指定的配置文件不存在：${resolved}`);
    }
    layers.push({ label: `CLI 指定配置 (${resolved})`, data: loadYaml(resolved) });
  }

  const config = deepMerge(...layers.map((l) => l.data));
  return { config, layers };
}

// ─── 内容插入 ─────────────────────────────────────────────────────────────────

/**
 * 将 snippet HTML 插入到模板的 <tbody id="content"> 中。
 * 使用深度计数算法处理嵌套 <tbody>。
 */
function insertIntoContent(templateHtml, snippetHtml) {
  const openRe = /<tbody[\s>][^>]*\bid\s*=\s*["']content["'][^>]*>/i;
  const match = openRe.exec(templateHtml);
  if (!match) {
    throw new Error('模板中未找到 <tbody id="content"> 元素。模板必须包含一个带 id="content" 的 <tbody> 用于插入片段内容。');
  }

  const openTagEnd = match.index + match[0].length;
  let depth = 1;
  let searchPos = openTagEnd;

  const tbodyOpenRe = /<tbody[\s>]/gi;
  const tbodyCloseRe = /<\/tbody>/gi;

  while (depth > 0 && searchPos < templateHtml.length) {
    tbodyOpenRe.lastIndex = searchPos;
    tbodyCloseRe.lastIndex = searchPos;

    const nextOpen = tbodyOpenRe.exec(templateHtml);
    const nextClose = tbodyCloseRe.exec(templateHtml);

    if (!nextClose) break;

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++;
      searchPos = nextOpen.index + 1;
    } else {
      depth--;
      if (depth === 0) {
        return templateHtml.substring(0, openTagEnd) + '\n' + snippetHtml + '\n' + templateHtml.substring(nextClose.index);
      }
      searchPos = nextClose.index + 1;
    }
  }

  throw new Error('无法找到 id="content" 对应的闭合 </tbody> 标签，模板 HTML 可能存在标签不匹配问题。');
}

// ─── 输出路径 ─────────────────────────────────────────────────────────────────

function resolveSnippetOutputPaths(snippetPath, cwd) {
  const name = path.parse(snippetPath).name;
  return {
    raw: path.join(cwd, name + '.raw.html'),
    normal: path.join(cwd, name + '.html'),
    minified: path.join(cwd, name + '.minified.html'),
  };
}

// ─── 组装流水线 ───────────────────────────────────────────────────────────────

async function assembleSnippet({ snippetPath, templatePath, config, layers, cwd }) {
  const templateHtml = fs.readFileSync(templatePath, 'utf8');
  const snippetRaw = fs.readFileSync(snippetPath, 'utf8');
  const outPaths = resolveSnippetOutputPaths(snippetPath, cwd);

  // 1. 原始输出：未渲染片段 + 模板
  const rawHtml = insertIntoContent(templateHtml, snippetRaw);
  fs.writeFileSync(outPaths.raw, rawHtml, 'utf8');

  // 2. Mustache 渲染片段
  const variables = config.variables || {};
  const snippetRendered = Mustache.render(snippetRaw, variables);

  // 3. 插入渲染后的片段
  const combinedHtml = insertIntoContent(templateHtml, snippetRendered);

  // 4. Mustache 渲染合并 HTML（处理模板级别变量）
  const combinedRendered = Mustache.render(combinedHtml, variables);

  // 5. 收集模板目录的额外 CSS
  const templateDir = path.dirname(templatePath);
  const extraCss = collectExtraCss(templateDir, config);

  // 6. Juice CSS 内联
  const juiceOpts = Object.assign({}, config.juice || {});
  delete juiceOpts.extraCssFiles;
  const processed = juice(combinedRendered, { ...juiceOpts, extraCss });
  fs.writeFileSync(outPaths.normal, processed, 'utf8');

  // 7. 压缩
  const minified = await minifyHtml(processed, config.minify);
  fs.writeFileSync(outPaths.minified, minified, 'utf8');

  // 8. 报告
  const layerLines = layers
    .map((l) => `    ${chalk.gray('·')} ${l.label}`)
    .join('\n');

  console.log(
    chalk.green('\n✔ 片段组装完成') + '\n' +
    `  ${chalk.bold('片段：')}  ${chalk.cyan(snippetPath)}\n` +
    `  ${chalk.bold('模板：')}  ${chalk.cyan(templatePath)}\n` +
    `  ${chalk.bold('配置层（低→高）：')}\n${layerLines}\n` +
    `  ${chalk.bold('输出：')}\n` +
    `    ${chalk.green('·')} 原始组装  ${chalk.cyan(outPaths.raw)}  ${chalk.gray('(' + fmtSize(rawHtml) + ')')}\n` +
    `    ${chalk.green('·')} 处理后    ${chalk.cyan(outPaths.normal)}  ${chalk.gray('(' + fmtSize(processed) + ')')}\n` +
    `    ${chalk.green('·')} 压缩版    ${chalk.cyan(outPaths.minified)}  ${chalk.gray('(' + fmtSize(minified) + '，节省 ' + savings(processed, minified) + ')')}`
  );

  return outPaths;
}

// ─── 交互式提示 ───────────────────────────────────────────────────────────────

async function promptBrand(brands) {
  const { select } = await import('@inquirer/prompts');
  return select({
    message: '请选择品牌/系列：',
    choices: brands.map((b) => ({ name: b.name, value: b })),
  });
}

async function promptSnippetFolder(folders) {
  const { select } = await import('@inquirer/prompts');
  if (folders.length === 0) {
    throw new Error('该品牌目录下未找到任何片段文件夹。请在品牌目录下创建片段文件夹（含 HTML 和 YAML 文件）。');
  }
  return select({
    message: '请选择片段文件夹：',
    choices: folders.map((f) => ({ name: f.name, value: f })),
  });
}

async function promptSnippetFile(htmlFiles) {
  const { select } = await import('@inquirer/prompts');
  if (htmlFiles.length === 0) {
    throw new Error('片段文件夹中未找到 HTML 文件。');
  }
  const defaultName = 'snippet.html';
  const defaultIdx = htmlFiles.findIndex((f) => f.name === defaultName);
  const choices = htmlFiles.map((f, i) => ({
    name: f.name + (i === defaultIdx ? ' (默认)' : ''),
    value: f,
  }));
  return select({
    message: '请选择片段 HTML 文件：',
    choices,
    default: defaultIdx >= 0 ? defaultIdx : 0,
  });
}

async function promptConfigFile(yamlFiles) {
  const { select, input } = await import('@inquirer/prompts');
  const defaultName = 'juice.yaml';
  const defaultIdx = yamlFiles.findIndex((f) => f.name === defaultName);

  const choices = yamlFiles.map((f, i) => ({
    name: f.name + (i === defaultIdx ? ' (默认)' : ''),
    value: { type: 'file', path: f.path, name: f.name },
  }));
  choices.push({ name: '📁 输入自定义路径...', value: { type: 'custom' } });
  choices.push({ name: '⊘ 跳过（不使用片段配置）', value: { type: 'skip' } });

  const result = await select({
    message: '请选择配置文件：',
    choices,
    default: defaultIdx >= 0 ? defaultIdx : choices.length - 2,
  });

  if (result.type === 'custom') {
    const customPath = await input({
      message: '请输入配置文件路径：',
    });
    return { type: 'file', path: path.resolve(customPath), name: path.basename(customPath) };
  }

  return result;
}

async function promptTemplate(templateFiles) {
  const { select } = await import('@inquirer/prompts');
  if (templateFiles.length === 0) {
    throw new Error('品牌目录下未找到模板 HTML 文件。');
  }
  const templateRe = /-template\.html?$/i;
  const defaultIdx = templateFiles.findIndex((f) => templateRe.test(f.name));

  return select({
    message: '请选择模板 HTML 文件：',
    choices: templateFiles.map((f, i) => ({
      name: f.name + (i === defaultIdx ? ' (默认)' : ''),
      value: f,
    })),
    default: defaultIdx >= 0 ? defaultIdx : 0,
  });
}

async function promptConfirm(summary) {
  const { confirm } = await import('@inquirer/prompts');
  console.log('\n' + chalk.cyan('═══════════════════════════════════════════'));
  console.log(chalk.bold('  片段组装汇总'));
  console.log(chalk.cyan('═══════════════════════════════════════════'));
  console.log(`  品牌：          ${chalk.green(summary.brand)}`);
  console.log(`  片段文件夹：    ${chalk.green(summary.snippetFolder)}`);
  console.log(`  片段 HTML：     ${chalk.green(summary.snippetFile)}`);
  console.log(`  配置 YAML：     ${chalk.green(summary.configFile)}`);
  console.log(`  模板 HTML：     ${chalk.green(summary.templateFile)}`);
  console.log(chalk.gray('───────────────────────────────────────────'));
  console.log(`  输出目录：      ${chalk.cyan(summary.outputDir)}`);
  console.log(`  输出文件：`);
  const outPaths = resolveSnippetOutputPaths(summary.snippetPath, summary.outputDir);
  console.log(`    ${chalk.green('·')} ${path.basename(outPaths.raw)}  ${chalk.gray('(原始组装)')}`);
  console.log(`    ${chalk.green('·')} ${path.basename(outPaths.normal)}  ${chalk.gray('(处理后)')}`);
  console.log(`    ${chalk.green('·')} ${path.basename(outPaths.minified)}  ${chalk.gray('(压缩版)')}`);
  console.log(chalk.cyan('═══════════════════════════════════════════\n'));

  return confirm({
    message: '确认执行片段组装？',
    default: true,
  });
}

// ─── 模式入口 ─────────────────────────────────────────────────────────────────

/**
 * --snippet 模式：指定了片段 HTML
 * - 如果也指定了 -f（模板），直接执行
 * - 如果未指定 -f，交互式选择模板
 */
async function runSnippetMode({ snippet, template, config: cliConfigPath }) {
  const snippetPath = path.resolve(snippet);
  if (!fs.existsSync(snippetPath)) {
    console.error(chalk.red(`片段文件不存在：${snippetPath}`));
    process.exit(1);
  }

  let templatePath;
  let brandName = '';
  let snippetFolderName = '';

  if (template) {
    templatePath = path.resolve(template);
    if (!fs.existsSync(templatePath)) {
      console.error(chalk.red(`模板文件不存在：${templatePath}`));
      process.exit(1);
    }
  } else {
    // 交互式选择模板
    const edmDir = resolveEdmDir();
    const brands = findBrands(edmDir);
    const brand = await promptBrand(brands);
    brandName = brand.name;
    const templateFiles = findHtmlFiles(brand.path);
    const chosen = await promptTemplate(templateFiles);
    templatePath = chosen.path;
  }

  // 确定片段配置路径
  const snippetDir = path.dirname(snippetPath);
  const yamlFiles = findYamlFiles(snippetDir);
  const defaultYaml = yamlFiles.find((f) => f.name === 'juice.yaml');
  const snippetConfigPath = defaultYaml ? defaultYaml.path : (yamlFiles[0] ? yamlFiles[0].path : null);

  const { config, layers } = buildSnippetConfig({ snippetConfigPath, cliConfigPath });

  await assembleSnippet({
    snippetPath,
    templatePath,
    config,
    layers,
    cwd: process.cwd(),
  });
}

/**
 * 全交互模式：未指定 --snippet，也未指定 -f
 */
async function runInteractiveMode({ file: _file, config: cliConfigPath }) {
  const edmDir = resolveEdmDir();

  // 1. 选择品牌
  const brands = findBrands(edmDir);
  const brand = await promptBrand(brands);

  // 2. 选择片段文件夹
  const snippetFolders = findSnippetFolders(brand.path);
  const folder = await promptSnippetFolder(snippetFolders);

  // 3. 选择片段 HTML
  const htmlFiles = findHtmlFiles(folder.path);
  const snippetFile = await promptSnippetFile(htmlFiles);

  // 4. 选择配置 YAML
  const yamlFiles = findYamlFiles(folder.path);
  const configChoice = await promptConfigFile(yamlFiles);

  let snippetConfigPath = null;
  let configFileName = '(无)';
  if (configChoice.type === 'file') {
    snippetConfigPath = configChoice.path;
    configFileName = configChoice.name;
  } else if (configChoice.type === 'skip') {
    configFileName = '(跳过)';
  }

  // 5. 选择模板
  const templateFiles = findHtmlFiles(brand.path);
  const templateChoice = await promptTemplate(templateFiles);

  // 6. 汇总确认
  const confirmed = await promptConfirm({
    brand: brand.name,
    snippetFolder: folder.name,
    snippetFile: snippetFile.name,
    configFile: configFileName,
    templateFile: templateChoice.name,
    snippetPath: snippetFile.path,
    outputDir: process.cwd(),
  });

  if (!confirmed) {
    console.log(chalk.gray('已取消。'));
    return;
  }

  // 7. 构建配置并执行
  const { config, layers } = buildSnippetConfig({ snippetConfigPath, cliConfigPath });

  await assembleSnippet({
    snippetPath: snippetFile.path,
    templatePath: templateChoice.path,
    config,
    layers,
    cwd: process.cwd(),
  });
}

module.exports = { runSnippetMode, runInteractiveMode };
