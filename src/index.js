'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const juice = require('juice');
const Mustache = require('mustache');
const chalk = require('chalk');
const ora = require('ora');
const { minify: htmlMinify } = require('html-minifier-terser');

// ─── 从 defaults/juice.yaml 加载默认配置 ─────────────────────────────────────

const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '..', 'defaults', 'juice.yaml');

function loadDefaultConfig() {
  try {
    const content = fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf8');
    return yaml.load(content) || {};
  } catch (e) {
    // 如果 defaults/juice.yaml 不存在，使用内置最小配置
    console.warn(chalk.yellow(`  ⚠  无法加载默认配置 ${DEFAULT_CONFIG_PATH}，使用内置默认值\n`));
    return {};
  }
}

const CODE_DEFAULTS = loadDefaultConfig();

// 用户主目录候选（支持 yaml/yml）
const HOME_CANDIDATES = [
  path.join(os.homedir(), 'juice.yaml'),
  path.join(os.homedir(), 'juice.yml'),
];

// ─── 配置文件查找 ─────────────────────────────────────────────────────────────

/**
 * 查找用户配置文件
 *
 * 配置加载顺序（优先级从低到高）：
 *   1. CLI 内置默认值（defaults/juice.yaml）
 *   2. 用户主目录 ~/juice.yaml（如果存在）
 *   3. 优先配置文件（-c 指定 或 输入文件同级目录，二者互斥）
 *
 * 返回：
 *   - highPriorityPath: 高优先级配置路径（-c 指定 或 输入文件同级目录，二者互斥）
 *   - homePath: 用户主目录配置路径（可能不存在）
 */
function findConfigs(configPath, inputFile) {
  let highPriorityPath = null;

  // 1. 优先使用 -c 指定的配置文件
  if (configPath) {
    const resolved = path.resolve(configPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`指定的配置文件不存在：${resolved}`);
    }
    highPriorityPath = resolved;
  }
  // 2. 否则使用输入文件同级目录下的配置（互斥）
  else if (inputFile) {
    const inputDir = path.dirname(path.resolve(inputFile));
    const fileCandidates = [
      path.join(inputDir, 'juice.yaml'),
      path.join(inputDir, 'juice.yml'),
    ];
    for (const c of fileCandidates) {
      if (fs.existsSync(c)) {
        highPriorityPath = c;
        break;
      }
    }
  }

  return { highPriorityPath, homePath: HOME_CANDIDATES[0] };
}

// ─── 配置文件加载 ─────────────────────────────────────────────────────────────

function loadYaml(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  try {
    return yaml.load(fs.readFileSync(filePath, 'utf8')) || {};
  } catch (e) {
    throw new Error(`配置文件解析失败（${filePath}）：${e.message}`);
  }
}

/**
 * 深度合并（后面的覆盖前面的），仅对普通对象递归，数组/基本类型直接覆盖
 */
function deepMerge(base, ...overrides) {
  let result = Object.assign({}, base);
  for (const src of overrides) {
    if (!src || typeof src !== 'object' || Array.isArray(src)) continue;
    for (const key of Object.keys(src)) {
      const sv = src[key];
      const rv = result[key];
      if (
        sv !== null &&
        typeof sv === 'object' &&
        !Array.isArray(sv) &&
        rv !== null &&
        typeof rv === 'object' &&
        !Array.isArray(rv)
      ) {
        result[key] = deepMerge(rv, sv);
      } else {
        result[key] = sv;
      }
    }
  }
  return result;
}

/**
 * 配置合并，返回最终生效配置
 *
 * 合并顺序（优先级从低到高）：
 *   CLI 内置默认值  <  用户目录 ~/juice.yaml  <  优先配置（-c/输入目录）
 */
function buildConfig(highPriorityPath, homePath) {
  const homeExists = fs.existsSync(homePath);
  const layers = [];

  // 1. CLI 内置默认值（最低优先级）
  layers.push({ label: 'CLI 内置默认值', data: CODE_DEFAULTS });

  // 2. 用户目录配置（如果有）
  if (homeExists) {
    layers.push({ label: `用户目录配置 (${homePath})`, data: loadYaml(homePath) });
  }

  // 3. 优先配置（最高优先级，-c 指定 或 输入文件同级目录，互斥）
  if (highPriorityPath) {
    layers.push({ label: `优先配置 (${highPriorityPath})`, data: loadYaml(highPriorityPath) });
  }

  const config = deepMerge(...layers.map((l) => l.data));
  return { config, layers };
}

// ─── HTML 模板处理 ────────────────────────────────────────────────────────────

function processTemplate(inputFile, config) {
  const htmlRaw = fs.readFileSync(inputFile, 'utf8');

  // 1. Mustache 变量替换（根据 rawHtml 配置决定是否转义 HTML）
  const originalEscape = Mustache.escape;
  if (config.rawHtml) {
    Mustache.escape = (text) => text;
  }
  const htmlWithVars = Mustache.render(htmlRaw, config.variables || {});
  Mustache.escape = originalEscape;

  // 2. 收集 extraCssFiles
  const basePath = path.dirname(path.resolve(inputFile));
  const extraCss = collectExtraCss(basePath, config);

  // 3. juice CSS 内联
  const juiceOpts = Object.assign({}, config.juice || {});
  delete juiceOpts.extraCssFiles;

  return juice(htmlWithVars, { ...juiceOpts, extraCss });
}

function collectExtraCss(basePath, config) {
  const extraFiles = (config.juice && config.juice.extraCssFiles) || [];
  if (!extraFiles.length) return '';
  return extraFiles
    .map((f) => {
      const full = path.isAbsolute(f) ? f : path.join(basePath, f);
      if (!fs.existsSync(full)) {
        process.stderr.write(chalk.yellow(`  ⚠  extraCssFiles 文件不存在，已跳过：${full}\n`));
        return '';
      }
      return fs.readFileSync(full, 'utf8');
    })
    .join('\n');
}

// ─── 压缩 ─────────────────────────────────────────────────────────────────────

async function minifyHtml(html, minifyConfig) {
  return htmlMinify(html, {
    removeConditionalComments: false,
    ...(minifyConfig || {}),
  });
}

// ─── 输出路径 ─────────────────────────────────────────────────────────────────

function resolveOutputPaths(inputFile, config) {
  const parsed = path.parse(path.resolve(inputFile));
  const ns = (config.output && config.output.normalSuffix) || '.output.html';
  const ms = (config.output && config.output.minifiedSuffix) || '.minified.html';
  return {
    normal: path.join(parsed.dir, parsed.name + ns),
    minified: path.join(parsed.dir, parsed.name + ms),
  };
}

// ─── 主入口 ───────────────────────────────────────────────────────────────────

async function run({ file, config: configPath }) {
  const spinner = ora({ text: '正在处理...', color: 'cyan' }).start();

  try {
    // 1. 输入文件
    const inputFile = path.resolve(file);
    if (!fs.existsSync(inputFile)) {
      spinner.fail(chalk.red(`输入文件不存在：${inputFile}`));
      process.exit(1);
    }

    // 2. 查找配置（-c 和输入文件同级目录互斥）+ 合并
    const { highPriorityPath, homePath } = findConfigs(configPath, inputFile);
    const { config, layers } = buildConfig(highPriorityPath, homePath);
    const encoding = (config.output && config.output.encoding) || 'utf8';

    // 3. CSS 内联
    spinner.text = `CSS 内联处理：${path.basename(inputFile)}`;
    const resultHtml = processTemplate(inputFile, config);

    // 4. 输出路径
    const outPaths = resolveOutputPaths(inputFile, config);

    // 5. 写出标准版
    spinner.text = '写出 .output.html ...';
    fs.writeFileSync(outPaths.normal, resultHtml, encoding);

    // 6. 压缩并写出
    spinner.text = '写出 .minified.html ...';
    const minified = await minifyHtml(resultHtml, config.minify);
    fs.writeFileSync(outPaths.minified, minified, encoding);

    // 7. 汇报
    const layerLines = layers
      .map((l) => `    ${chalk.gray('·')} ${l.label}`)
      .join('\n');

    spinner.succeed(
      chalk.green('✔ 处理完成') + '\n' +
      `  ${chalk.bold('输入：')}  ${chalk.cyan(inputFile)}\n` +
      `  ${chalk.bold('配置层（低→高）：')}\n${layerLines}\n` +
      `  ${chalk.bold('输出：')}\n` +
      `    ${chalk.green('·')} 标准版  ${chalk.cyan(outPaths.normal)}  ${chalk.gray('(' + fmtSize(resultHtml) + ')')}\n` +
      `    ${chalk.green('·')} 压缩版  ${chalk.cyan(outPaths.minified)}  ${chalk.gray('(' + fmtSize(minified) + '，节省 ' + savings(resultHtml, minified) + ')')}`
    );
  } catch (err) {
    spinner.fail(chalk.red(`处理失败：${err.message}`));
    if (process.env.DEBUG) console.error(err);
    process.exit(1);
  }
}

function fmtSize(str) {
  const b = Buffer.byteLength(str, 'utf8');
  return b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`;
}

function savings(original, minified) {
  const orig = Buffer.byteLength(original, 'utf8');
  const mini = Buffer.byteLength(minified, 'utf8');
  return (((orig - mini) / orig) * 100).toFixed(1) + '%';
}

module.exports = { run, findConfigs, buildConfig, processTemplate, minifyHtml, deepMerge, collectExtraCss, loadYaml, fmtSize, savings };
