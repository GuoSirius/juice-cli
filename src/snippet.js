import fs from 'fs';
import path from 'path';
import os from 'os';
import juice from 'juice';
import Mustache from 'mustache';
import chalk from 'chalk';
import {
  loadYaml,
  deepMerge,
  collectExtraCss,
  minifyHtml,
  fmtSize,
  savings,
  DEFAULT_CONFIG_PATH,
} from './index.js';

// ─── EDM 目录解析 ──────────────────────────────────────────────────────────────

function resolveEdmDir() {
  // 优先：当前工作目录下的 edm/（用户自己的 EDM 资源）
  const cwdEdm = path.join(process.cwd(), 'edm');
  if (fs.existsSync(cwdEdm)) return cwdEdm;

  // 回退：npm 全局安装时，包内置的 edm/
  const pkgEdm = path.resolve(__dirname, '..', 'edm');
  if (fs.existsSync(pkgEdm)) return pkgEdm;

  throw new Error(
    `EDM 目录不存在。\n` +
    `  已检查：${cwdEdm}\n` +
    `  已检查：${pkgEdm}\n` +
    `  请在项目根目录创建 edm/ 目录结构，或重新安装 juice-email-cli。`
  );
}

// ─── 元数据读取 ─────────────────────────────────────────────────────────────────

/**
 * 读取目录下的 _meta.yaml，返回 { name, description, series }。
 * 文件不存在时回退为 { name: 目录名, description: "" }。
 */
function loadMeta(dir) {
  const metaPath = path.join(dir, '_meta.yaml');
  if (fs.existsSync(metaPath)) {
    try {
      const raw = loadYaml(metaPath);
      return {
        name: raw.name || path.basename(dir),
        description: raw.description || "",
        series: raw.series || null,
      };
    } catch (_) {
      // 解析失败时回退
    }
  }
  return { name: path.basename(dir), description: "", series: null };
}

/**
 * 根据版本 _meta.yaml 中的 series.allow / series.block 过滤系列列表。
 * allow 和 block 互斥，同时存在时 allow 优先。
 * 均不配置时返回全部系列。
 */
function filterSeries(allSeries, versionMeta) {
  if (!versionMeta || !versionMeta.series) return allSeries;

  const { allow, block } = versionMeta.series;

  if (allow && Array.isArray(allow)) {
    return allSeries.filter((s) => allow.includes(s.name));
  }

  if (block && Array.isArray(block)) {
    return allSeries.filter((s) => !block.includes(s.name));
  }

  return allSeries;
}

// ─── EDM 目录扫描 ───────────────────────────────────────────────────────────────

function findBrands(edmDir) {
  const entries = fs.readdirSync(edmDir, { withFileTypes: true });
  const brands = entries
    .filter((e) => e.isDirectory())
    .map((e) => {
      const dir = path.join(edmDir, e.name);
      const meta = loadMeta(dir);
      return { name: e.name, path: dir, meta };
    });
  if (brands.length === 0) {
    throw new Error(`EDM 目录下未找到任何品牌子目录：${edmDir}`);
  }
  return brands;
}

/**
 * 扫描品牌下的模板版本：templates/<version>/
 * 每个版本返回 { name, path, meta, templatePath }。
 */
function findTemplateVersions(brandDir) {
  const templatesDir = path.join(brandDir, 'templates');
  if (!fs.existsSync(templatesDir)) {
    throw new Error(`品牌目录下未找到 templates/：${brandDir}`);
  }

  const entries = fs.readdirSync(templatesDir, { withFileTypes: true });
  const versions = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dir = path.join(templatesDir, e.name);
    const meta = loadMeta(dir);
    const htmlFiles = findFiles(dir, /\.html?$/i);
    if (htmlFiles.length === 0) continue;
    versions.push({
      name: e.name,
      path: dir,
      meta,
      templatePath: htmlFiles[0].path,
    });
  }
  if (versions.length === 0) {
    throw new Error(`templates/ 下未找到任何含 .html 模板的版本子目录：${templatesDir}`);
  }
  return versions;
}

/**
 * 扫描品牌下的片段系列：series/<series>/
 * 每个系列返回 { name, path, meta }。
 */
function findSeriesDirs(brandDir) {
  const seriesDir = path.join(brandDir, 'series');
  if (!fs.existsSync(seriesDir)) return [];

  const entries = fs.readdirSync(seriesDir, { withFileTypes: true });
  const list = entries
    .filter((e) => e.isDirectory())
    .map((e) => {
      const dir = path.join(seriesDir, e.name);
      const meta = loadMeta(dir);
      return { name: e.name, path: dir, meta };
    });

  if (list.length === 0) {
    console.log(chalk.yellow(`  ⚠  series/ 下暂无片段系列。`));
  }
  return list;
}

/**
 * 检测系列目录下的片段变体：
 *   - 有子目录且含 snippet.html → 多变体模式，返回变体列表
 *   - 无子目录、自身有 snippet.html → 单变体模式，自身作为唯一变体
 * 每个变体返回 { name, path, meta, hasSnippet }。
 */
function findSnippetVariants(seriesDir) {
  const entries = fs.readdirSync(seriesDir, { withFileTypes: true });
  const subDirs = entries.filter((e) => e.isDirectory());

  if (subDirs.length > 0) {
    // 潜在的多变体模式：检查是否有子目录包含 snippet.html
    const variants = [];
    for (const d of subDirs) {
      const dir = path.join(seriesDir, d.name);
      const snipPath = path.join(dir, 'snippet.html');
      if (fs.existsSync(snipPath)) {
        const meta = loadMeta(dir);
        variants.push({ name: d.name, path: dir, meta, hasSnippet: true });
      }
    }
    if (variants.length > 0) return variants;
  }

  // 单变体模式：系列目录自身就是变体
  const snipPath = path.join(seriesDir, 'snippet.html');
  if (fs.existsSync(snipPath)) {
    const meta = loadMeta(seriesDir);
    return [{ name: 'default', path: seriesDir, meta, hasSnippet: true }];
  }

  return [];
}

/**
 * 列出变体目录下所有 YAML 配置，标记 juice.yaml 为最优配对。
 * 返回 { name, path, isOptimal, source }。
 */
function findConfigs(variantDir, sourceLabel) {
  const yamlFiles = findYamlFiles(variantDir);
  return yamlFiles
    .filter((f) => f.name !== '_meta.yaml' && f.name !== '_meta.yml')
    .map((f) => ({
      name: f.name,
      path: f.path,
      isOptimal: f.name === 'juice.yaml',
      source: sourceLabel || path.basename(path.dirname(f.path)),
    }));
}

/**
 * Collect configs from multiple directories, deduplicating by path.
 * Returns { name, path, isOptimal, source }[].
 */
function findFiles(dir, regex) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && regex.test(e.name))
    .map((e) => ({ name: e.name, path: path.join(dir, e.name) }));
}

function findHtmlFiles(dir) {
  return findFiles(dir, /\.html?$/i);
}

function findYamlFiles(dir) {
  return findFiles(dir, /\.ya?ml$/i);
}

/**
 * 在指定目录下查找本地配置文件
 * 优先 juice.yaml，其次 juice.yml，都不存在返回 null
 */
function findLocalConfig(dir) {
  const candidates = [
    path.join(dir, 'juice.yaml'),
    path.join(dir, 'juice.yml'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

/**
 * 从 edm 子路径中提取品牌名
 * 例如：edm/elabscience/literature/snippet.html → elabscience
 * 如果文件不在 edmDir 下，返回 null
 */
function getBrand(filePath, edmDir) {
  const rel = path.relative(edmDir, filePath);
  if (rel.startsWith('..')) return null;
  const parts = rel.split(path.sep);
  return parts[0] || null;
}

// ─── 配置合并 ─────────────────────────────────────────────────────────────────

/**
 * 片段模式配置合并
 *
 * 优先级（低 → 高）：
 *   1. CLI 内置默认值（defaults/juice.yaml）
 *   2. 用户主目录 ~/juice.yaml（如果存在）
 *   3. 项目配置（片段目录 / 当前目录 / 手动输入 —— 由调用方传入）
 *   4. -c 命令行指定（最高优先级）
 */
function buildSnippetConfig({ priorityConfigPath, cliConfigPath }) {
  const layers = [];

  // 1. CLI 内置默认（最低优先级）
  const defaults = loadYaml(DEFAULT_CONFIG_PATH);
  layers.push({ label: 'CLI 内置默认值', data: defaults });

  // 2. 用户主目录
  const homeCandidates = [
    path.join(os.homedir(), 'juice.yaml'),
    path.join(os.homedir(), 'juice.yml'),
  ];
  const homePath = homeCandidates.find((c) => fs.existsSync(c));
  if (homePath) {
    layers.push({ label: `用户目录配置 (${homePath})`, data: loadYaml(homePath) });
  }

  // 3. 项目配置（片段目录 / 当前目录 / 手动输入 —— 三选一）
  if (priorityConfigPath && fs.existsSync(priorityConfigPath)) {
    layers.push({ label: `项目配置 (${priorityConfigPath})`, data: loadYaml(priorityConfigPath) });
  }

  // 4. -c 指定（最高优先级）
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
 * 使用深度计数算法处理嵌套 <tbody>，并自动调整片段缩进以匹配模板。
 */
function insertIntoContent(templateHtml, snippetHtml) {
  const openRe = /<tbody[\s>][^>]*\bid\s*=\s*["']content["'][^>]*>/i;
  const match = openRe.exec(templateHtml);
  if (!match) {
    throw new Error('模板中未找到 <tbody id="content"> 元素。模板必须包含一个带 id="content" 的 <tbody> 用于插入片段内容。');
  }

  // 检测模板中 <tbody id="content"> 的缩进层级
  const lineStart = templateHtml.lastIndexOf('\n', match.index) + 1;
  const tagIndent = match.index - lineStart;

  // 找到插入点后第一个非空行，确定子元素缩进
  const afterOpen = templateHtml.substring(match.index + match[0].length);
  const nextLineMatch = afterOpen.match(/\n(\s*)\S/);
  const childIndent = nextLineMatch ? nextLineMatch[1].length : tagIndent + 2;

  // 调整片段缩进以匹配模板
  const reindentedSnippet = reindentHtml(snippetHtml, childIndent);

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
        const indent = '\n' + ' '.repeat(tagIndent);
        return templateHtml.substring(0, openTagEnd) + '\n' + reindentedSnippet + indent + templateHtml.substring(nextClose.index);
      }
      searchPos = nextClose.index + 1;
    }
  }

  throw new Error('无法找到 id="content" 对应的闭合 </tbody> 标签，模板 HTML 可能存在标签不匹配问题。');
}

/**
 * 重新调整 HTML 片段的缩进，使其最外层元素对齐到目标缩进层级
 */
function reindentHtml(html, targetIndent) {
  const lines = html.split('\n');

  // 找到片段中非空行的最小缩进
  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim().length > 0) {
      const indent = line.length - line.trimStart().length;
      if (indent < minIndent) minIndent = indent;
    }
  }
  if (minIndent === Infinity) minIndent = 0;

  const delta = targetIndent - minIndent;
  if (delta === 0) return html;

  const prefix = ' '.repeat(Math.max(0, delta));

  return lines.map((line) => {
    if (line.trim().length === 0) return '';
    if (delta > 0) {
      return prefix + line;
    } else {
      return line.substring(Math.min(-delta, line.length - line.trimStart().length));
    }
  }).join('\n');
}

// ─── 输出路径 ─────────────────────────────────────────────────────────────────

function resolveSnippetOutputPaths(outputBaseName, cwd) {
  const name = outputBaseName;
  return {
    raw: path.join(cwd, name + '.raw.html'),
    normal: path.join(cwd, name + '.html'),
    output: path.join(cwd, name + '.output.html'),
    minified: path.join(cwd, name + '.minified.html'),
  };
}

// ─── 组装流水线 ───────────────────────────────────────────────────────────────

/**
 * 片段组装流水线：
 *   1. 未渲染的片段 + 模板 → .raw.html（Mustache 标签保留，无 juice 内联）
 *   2. Mustache 渲染合并 HTML → .html（已渲染，无 juice 内联）
 *   3. Juice CSS 内联 → .output.html
 *   4. 压缩 → .minified.html
 */
async function assembleSnippet({ snippetPath, templatePath, config, cwd, outputBaseName }) {
  const templateHtml = fs.readFileSync(templatePath, 'utf8');
  const snippetRaw = fs.readFileSync(snippetPath, 'utf8');
  const outPaths = resolveSnippetOutputPaths(outputBaseName, cwd);
  const variables = Object.assign({}, config.variables || {});

  // 1. 未渲染的片段插入模板 → .raw.html
  const rawMarkup = insertIntoContent(templateHtml, snippetRaw);
  fs.writeFileSync(outPaths.raw, rawMarkup, 'utf8');

  // 2. Mustache 渲染 → .html
  const originalEscape = Mustache.escape;
  let renderedHtml;
  try {
    if (config.rawHtml) {
      Mustache.escape = (text) => text;
    }
    renderedHtml = Mustache.render(rawMarkup, variables);
  } finally {
    Mustache.escape = originalEscape;
  }
  fs.writeFileSync(outPaths.normal, renderedHtml, 'utf8');

  // 3. Juice CSS 内联 → .output.html
  const templateDir = path.dirname(templatePath);
  const extraCss = collectExtraCss(templateDir, config);
  const juiceOpts = Object.assign({}, config.juice || {});
  delete juiceOpts.extraCssFiles;
  let processed;
  try {
    processed = juice(renderedHtml, { ...juiceOpts, extraCss });
  } catch (err) {
    throw new Error(`CSS 内联失败：${err.message}`);
  }
  fs.writeFileSync(outPaths.output, processed, 'utf8');

  // 4. 压缩 → .minified.html
  let minified;
  try {
    minified = await minifyHtml(processed, config.minify);
  } catch (err) {
    throw new Error(`压缩失败：${err.message}`);
  }
  fs.writeFileSync(outPaths.minified, minified, 'utf8');

  // 5. 报告
  const rel = (p) => './' + path.relative(cwd, p);
  const layers = config._layers || [];
  const layerLines = layers.length > 0
    ? layers.map((l) => `    ${chalk.gray('·')} ${l.label}`).join('\n') + '\n'
    : '';

  console.log(
    chalk.green('\n✔ 片段组装完成') + '\n' +
    `  ${chalk.bold('片段：')}  ${chalk.cyan(snippetPath)}\n` +
    `  ${chalk.bold('模板：')}  ${chalk.cyan(templatePath)}\n` +
    `  ${chalk.bold('配置层（低→高）：')}\n${layerLines}` +
    `  ${chalk.bold('输出：')}\n` +
    `    ${chalk.green('·')} 原始组装  ${chalk.cyan(rel(outPaths.raw))}      ${chalk.gray(fmtSize(rawMarkup))}\n` +
    `    ${chalk.green('·')} 已渲染    ${chalk.cyan(rel(outPaths.normal))}  ${chalk.gray(fmtSize(renderedHtml))}\n` +
    `    ${chalk.green('·')} 内联后    ${chalk.cyan(rel(outPaths.output))}  ${chalk.gray(fmtSize(processed))}\n` +
    `    ${chalk.green('·')} 压缩版    ${chalk.cyan(rel(outPaths.minified))}  ${chalk.gray(fmtSize(minified) + '，节省 ' + savings(processed, minified))}`
  );

  return outPaths;
}

// ─── 交互式提示 ───────────────────────────────────────────────────────────────

function fmtChoice(meta, dirName) {
  const display = meta.name || dirName;
  const suffix = meta.name ? ` ${chalk.gray(`(${dirName})`)}` : "";
  return { display: display + suffix, description: meta.description || "" };
}

async function promptBrand(brands) {
  const { select } = await import('@inquirer/prompts');
  const choices = brands.map((b) => ({
    name: fmtChoice(b.meta, b.name).display,
    value: b,
    description: b.meta.description || undefined,
  }));
  return select({
    message: '请选择品牌：',
    choices,
  });
}

async function promptTemplateVersion(versions) {
  const { select } = await import('@inquirer/prompts');
  const choices = versions.map((v) => ({
    name: fmtChoice(v.meta, v.name).display,
    value: v,
    description: v.meta.description || undefined,
  }));
  return select({
    message: '请选择模板版本：',
    choices,
  });
}

async function promptSeries(seriesList) {
  const { select } = await import('@inquirer/prompts');
  if (seriesList.length === 0) return null;

  const choices = seriesList.map((s) => {
    const variants = findSnippetVariants(s.path);
    const extra = variants.length > 0 ? ` — 含 ${variants.length} 个片段变体` : "";
    return {
      name: fmtChoice(s.meta, s.name).display,
      value: s,
      description: (s.meta.description || "") + chalk.dim(extra),
    };
  });

  return select({
    message: '请选择片段系列：',
    choices,
  });
}

async function promptSnippetVariant(variants) {
  const { select } = await import('@inquirer/prompts');
  if (variants.length === 0) return null;

  const choices = variants.map((v) => ({
    name: fmtChoice(v.meta, v.name).display,
    value: v,
    description: v.meta.description || undefined,
  }));

  const defaultIdx = variants.findIndex((v) => v.name === 'default');

  return select({
    message: '请选择片段变体：',
    choices,
    default: defaultIdx >= 0 ? defaultIdx : 0,
  });
}

async function promptConfig(configs, preferredPath) {
  const { select, input } = await import('@inquirer/prompts');

  // Check if any names collide — if so, show source in the label
  const nameCounts = {};
  for (const c of configs) {
    nameCounts[c.name] = (nameCounts[c.name] || 0) + 1;
  }
  const hasCollisions = Object.values(nameCounts).some(n => n > 1);

  const choices = [];
  let defaultIdx = 0;
  let preferredIdx = -1;

  for (const c of configs) {
    let label = c.name;
    if (hasCollisions && c.source) {
      label += ` ${chalk.dim('(' + c.source + ')')}`;
    }
    const isPreferred = preferredPath && c.path === preferredPath;
    if (isPreferred) preferredIdx = choices.length;
    if (isPreferred || c.isOptimal) {
      const tag = isPreferred ? '指定' : '最优配对';
      choices.push({
        name: `${chalk.green('●')} ${label} ${chalk.green('(' + tag + ')')}`,
        value: { type: 'file', path: c.path, name: c.name },
      });
    } else {
      choices.push({
        name: `  ${label}`,
        value: { type: 'file', path: c.path, name: c.name },
      });
    }
    if (!isPreferred && c.isOptimal) defaultIdx = choices.length - 1;
  }
  if (preferredIdx >= 0) defaultIdx = preferredIdx;

  choices.push(
    { name: '  [自定义] 输入其他路径...', value: { type: 'custom' } },
    { name: '  [跳过] 不使用项目配置', value: { type: 'skip' } },
  );

  const result = await select({
    message: '请选择配置文件：',
    choices,
    default: defaultIdx,
  });

  if (result.type === 'custom') {
    const customPath = await input({ message: '请输入配置文件路径：' });
    return { type: 'file', path: path.resolve(customPath), name: path.basename(customPath) };
  }

  return result;
}

// ─── 输出文件名处理 ───────────────────────────────────────────────────────────

/**
 * 检查指定 baseName 在 cwd 下是否已有输出文件冲突
 * 返回冲突的文件路径列表
 */
function checkOutputConflicts(baseName, cwd) {
  const suffixes = ['.raw.html', '.html', '.output.html', '.minified.html'];
  return suffixes
    .map((s) => path.join(cwd, baseName + s))
    .filter((p) => fs.existsSync(p));
}

/**
 * 查找下一个可用版本号（baseName-v1, baseName-v2, ...）
 */
function findNextVersion(baseName, cwd) {
  let v = 1;
  while (true) {
    const candidate = baseName + '-v' + v;
    if (checkOutputConflicts(candidate, cwd).length === 0) {
      return candidate;
    }
    v++;
  }
}

/**
 * 交互式输出文件名提示
 * 返回最终确定的 baseName
 */
async function promptOutputName(defaultBaseName, cwd) {
  const { input, select } = await import('@inquirer/prompts');

  let baseName = await input({
    message: '请输入输出文件名：',
    default: defaultBaseName,
  });

  // 冲突检测循环
  while (true) {
    const conflicts = checkOutputConflicts(baseName, cwd);
    if (conflicts.length === 0) break;

    console.log(chalk.yellow(`\n  ⚠  以下文件已存在：`));
    conflicts.forEach((f) => console.log(chalk.gray(`      ${path.basename(f)}`)));

    const action = await select({
      message: '文件已存在，请选择处理方式：',
      choices: [
        { name: '覆盖现有文件', value: 'overwrite' },
        { name: `自动版本号（${findNextVersion(baseName, cwd)}）`, value: 'version' },
        { name: '重新输入文件名', value: 'rename' },
      ],
    });

    if (action === 'overwrite') {
      break;
    } else if (action === 'version') {
      baseName = findNextVersion(baseName, cwd);
      console.log(chalk.green(`  ✔ 已自动生成版本号：${baseName}`));
      break;
    } else {
      baseName = await input({
        message: '请重新输入输出文件名：',
        default: baseName,
      });
    }
  }

  return baseName;
}

/**
 * 无片段可用时，将模板拷贝到当前目录作为快捷副本
 */
async function copyTemplateToCwd(templatePath) {
  const { confirm } = await import('@inquirer/prompts');

  const templateName = path.parse(templatePath).name;
  console.log(chalk.cyan(`\n  可将模板「${path.basename(templatePath)}」拷贝到当前目录作为快捷副本。`));

  const proceed = await confirm({
    message: '是否拷贝模板到当前目录？',
    default: true,
  });

  if (!proceed) {
    console.log(chalk.gray('已取消。'));
    return;
  }

  const baseName = await promptOutputName(templateName, process.cwd());
  const destPath = path.join(process.cwd(), baseName + '.html');

  fs.copyFileSync(templatePath, destPath);
  console.log(chalk.green(`\n✔ 模板已拷贝到：${destPath}`));
}

async function promptConfirm(summary) {
  const { confirm } = await import('@inquirer/prompts');
  const outPaths = resolveSnippetOutputPaths(summary.outputBaseName, summary.outputDir);
  console.log('\n' + chalk.cyan('═══════════════════════════════════════════'));
  console.log(chalk.bold('  片段组装汇总'));
  console.log(chalk.cyan('═══════════════════════════════════════════'));
  console.log(`  品牌：          ${chalk.green(summary.brandName)} ${chalk.gray(`(${summary.brand})`)}`);
  console.log(`  模板版本：      ${chalk.green(summary.versionName)} ${chalk.gray(`(${summary.version})`)}`);
  console.log(`  片段系列：      ${chalk.green(summary.seriesName)} ${chalk.gray(`(${summary.series})`)}`);
  console.log(`  片段变体：      ${chalk.green(summary.variantName)} ${chalk.gray(`(${summary.variant})`)}`);
  console.log(`  配置 YAML：     ${chalk.green(summary.configFile)}`);
  console.log(chalk.gray('───────────────────────────────────────────'));
  console.log(`  输出目录：      ${chalk.cyan('./')}`);
  console.log(`  输出文件名：    ${chalk.green(summary.outputBaseName)}`);
  console.log(`  输出文件：`);
  console.log(`    ${chalk.green('·')} ${path.basename(outPaths.raw)}  ${chalk.gray('(未渲染，无 CSS 内联)')}`);
  console.log(`    ${chalk.green('·')} ${path.basename(outPaths.normal)}  ${chalk.gray('(已渲染，无 CSS 内联)')}`);
  console.log(`    ${chalk.green('·')} ${path.basename(outPaths.output)}  ${chalk.gray('(Juice CSS 内联)')}`);
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
 *   - 如果同时指定了 -f（模板），直接使用
 *   - 如果未指定 -f，交互式选择：品牌 → 模板版本
 *   - 配置文件：自动检测片段目录下的 juice.yaml / juice.yml，-c 可覆盖
 *   - 合并顺序：项目默认 → 用户目录 → 片段目录配置 → CLI -c
 */
async function runSnippetMode({ snippet, template, config: cliConfigPath, outputName }) {
  const snippetPath = path.resolve(snippet);
  if (!fs.existsSync(snippetPath)) {
    console.error(chalk.red(`片段文件不存在：${snippetPath}`));
    process.exit(1);
  }

  let templatePath;

  if (template) {
    templatePath = path.resolve(template);
    if (!fs.existsSync(templatePath)) {
      console.error(chalk.red(`模板文件不存在：${templatePath}`));
      process.exit(1);
    }
  } else {
    // 交互式选择：品牌 → 模板版本
    const edmDir = resolveEdmDir();
    const brands = findBrands(edmDir);
    const brand = await promptBrand(brands);
    const versions = findTemplateVersions(brand.path);
    const version = await promptTemplateVersion(versions);
    templatePath = version.templatePath;
  }

  // 配置文件：收集当前目录和片段目录的配置，片段目录优先
  const snippetDir = path.dirname(snippetPath);
  let priorityConfigPath;

  if (template) {
    // 命令行完整指定（-s + -f），自动检测
    priorityConfigPath = findLocalConfig(snippetDir) || findLocalConfig(process.cwd());
  } else {
    // 交互模式（只有 -s），列出片段目录下的全部配置
    let configs = findConfigs(snippetDir, path.basename(snippetDir));
    // If -c also specified, collect from its directory too
    let preferredPath = null;
    if (cliConfigPath) {
      preferredPath = path.resolve(cliConfigPath);
      if (fs.existsSync(preferredPath)) {
        const cfgDir = path.dirname(preferredPath);
        if (path.resolve(cfgDir) !== path.resolve(snippetDir)) {
          configs = [
            ...findConfigs(cfgDir, path.basename(cfgDir)),
            ...configs,
          ];
        }
      }
    }
    const configChoice = await promptConfig(configs, preferredPath);
    priorityConfigPath = (configChoice.type === 'file') ? configChoice.path : null;
  }

  // 跨品牌检查：片段和模板品牌不一致时给出警告
  try {
    const edmDir = resolveEdmDir();
    const snippetBrand = getBrand(snippetPath, edmDir);
    const templateBrand = getBrand(templatePath, edmDir);
    if (snippetBrand && templateBrand && snippetBrand !== templateBrand) {
      console.warn(chalk.yellow(
        `\n⚠  片段品牌「${snippetBrand}」与模板品牌「${templateBrand}」不一致，可能导致样式错乱。`
      ));
    }
  } catch (_) {
    // edm/ 不存在时跳过品牌检查（用户可能使用自定义路径）
  }

  const { config, layers } = buildSnippetConfig({ priorityConfigPath, cliConfigPath });
  config._layers = layers;

  // 确定输出文件名
  const defaultBaseName = outputName || path.parse(templatePath).name;
  let outputBaseName;

  if (outputName) {
    const conflicts = checkOutputConflicts(defaultBaseName, process.cwd());
    if (conflicts.length > 0) {
      outputBaseName = findNextVersion(defaultBaseName, process.cwd());
      console.warn(chalk.yellow(
        `\n⚠  文件冲突，自动使用版本号：${outputBaseName}`
      ));
    } else {
      outputBaseName = defaultBaseName;
    }
  } else if (template) {
    const conflicts = checkOutputConflicts(defaultBaseName, process.cwd());
    if (conflicts.length > 0) {
      outputBaseName = findNextVersion(defaultBaseName, process.cwd());
      console.warn(chalk.yellow(
        `\n⚠  文件冲突，自动使用版本号：${outputBaseName}`
      ));
    } else {
      outputBaseName = defaultBaseName;
    }
  } else {
    outputBaseName = await promptOutputName(defaultBaseName, process.cwd());
  }

  await assembleSnippet({
    snippetPath,
    templatePath,
    config,
    cwd: process.cwd(),
    outputBaseName,
  });
}

/**
 * 交互模式（无 --snippet，无 -f）— 方案 B 新结构
 *   流程：品牌 → 模板版本 → 片段系列 → 片段变体 → 配置文件 → 输出名 → 确认 → 执行
 */
async function runInteractiveMode({ config: cliConfigPath }) {
  const edmDir = resolveEdmDir();

  // 1. 选择品牌
  const brands = findBrands(edmDir);
  const brand = await promptBrand(brands);

  // 2. 选择模板版本
  const versions = findTemplateVersions(brand.path);
  const version = await promptTemplateVersion(versions);

  // 3. 选择片段系列（按版本 series.allow/block 过滤）
  const allSeries = findSeriesDirs(brand.path);
  if (allSeries.length === 0) {
    console.log(chalk.yellow(`\n  ⚠  品牌「${brand.meta.name || brand.name}」下暂无片段系列。`));
    await copyTemplateToCwd(version.templatePath);
    return;
  }
  const filteredSeries = filterSeries(allSeries, version.meta);
  if (filteredSeries.length === 0) {
    console.log(chalk.yellow(`\n  ⚠  版本「${version.meta.name || version.name}」配置的系列过滤后无可用系列。`));
    return;
  }
  const series = await promptSeries(filteredSeries);
  if (!series) return;

  // 4. 选择片段变体
  const variants = findSnippetVariants(series.path);
  if (variants.length === 0) {
    console.log(chalk.yellow(`\n  ⚠  系列「${series.meta.name || series.name}」下暂无 snippet.html。`));
    return;
  }
  const variant = await promptSnippetVariant(variants);
  if (!variant) return;

  const snippetPath = path.join(variant.path, 'snippet.html');
  if (!fs.existsSync(snippetPath)) {
    console.log(chalk.red(`\n  ✘ 片段文件不存在：${snippetPath}`));
    return;
  }

  // 5. 选择配置文件 — 收集：变体目录 + 指定配置的目录
  let configs = findConfigs(variant.path, path.basename(variant.path));

  let preferredPath = null;
  if (cliConfigPath) {
    preferredPath = path.resolve(cliConfigPath);
    if (fs.existsSync(preferredPath)) {
      const cfgDir = path.dirname(preferredPath);
      // Collect from specified config's directory if different from variant dir
      if (path.resolve(cfgDir) !== path.resolve(variant.path)) {
        configs = [
          ...findConfigs(cfgDir, path.basename(cfgDir)),
          ...configs,
        ];
      }
    }
  }

  const configChoice = await promptConfig(configs, preferredPath);

  let priorityConfigPath = null;
  let configFileName = '(跳过)';
  if (configChoice.type === 'file') {
    priorityConfigPath = configChoice.path;
    configFileName = configChoice.name;
  }

  // 6. 确定输出文件名
  const defaultBaseName = `${brand.name}-${version.name}-${series.name}-${variant.name}-template`;
  const outputBaseName = await promptOutputName(defaultBaseName, process.cwd());

  // 7. 汇总确认
  const confirmed = await promptConfirm({
    brandName: brand.meta.name || brand.name,
    brand: brand.name,
    versionName: version.meta.name || version.name,
    version: version.name,
    seriesName: series.meta.name || series.name,
    series: series.name,
    variantName: variant.meta.name || variant.name,
    variant: variant.name,
    configFile: configFileName,
    outputDir: process.cwd(),
    outputBaseName,
  });

  if (!confirmed) {
    console.log(chalk.gray('已取消。'));
    return;
  }

  // 8. 构建配置并执行
  const { config, layers } = buildSnippetConfig({ priorityConfigPath, cliConfigPath });
  config._layers = layers;

  await assembleSnippet({
    snippetPath: snippetPath,
    templatePath: version.templatePath,
    config,
    cwd: process.cwd(),
    outputBaseName,
  });
}

export {
  runSnippetMode,
  runInteractiveMode,
  // EDM resolution & scanning
  resolveEdmDir,
  loadMeta,
  findBrands,
  findTemplateVersions,
  findSeriesDirs,
  findSnippetVariants,
  findConfigs,
  findHtmlFiles,
  findYamlFiles,
  findLocalConfig,
  getBrand,
  filterSeries,
  // config
  buildSnippetConfig,
  // content
  insertIntoContent,
  reindentHtml,
  resolveSnippetOutputPaths,
  assembleSnippet,
  // prompts
  promptBrand,
  promptTemplateVersion,
  promptSeries,
  promptSnippetVariant,
  promptConfig,
  promptConfirm,
  promptOutputName,
  // output helpers
  checkOutputConflicts,
  findNextVersion,
  copyTemplateToCwd,
};
