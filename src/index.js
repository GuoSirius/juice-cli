import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import juice from 'juice';
import Mustache from 'mustache';
import chalk from 'chalk';
import ora from 'ora';
import { minify as htmlMinify } from 'html-minifier-terser';
import { fmtBytes } from './format.js';
import {
  DEFAULT_CONFIG_NAMES,
  META_FILE,
  META_FILE_ALT,
  DEFAULT_NORMAL_SUFFIX,
  DEFAULT_MINIFIED_SUFFIX,
} from './constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── 从 defaults/juice.yaml 加载默认配置 ─────────────────────────────────────

export const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '..', 'defaults', 'juice.yaml');

function loadDefaultConfig() {
  try {
    const content = fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf8');
    return yaml.load(content) || {};
  } catch (e) {
    console.warn(chalk.yellow(`  ⚠  无法加载默认配置 ${DEFAULT_CONFIG_PATH}，使用内置默认值\n`));
    return {};
  }
}

const CODE_DEFAULTS = loadDefaultConfig();

const HOME_CANDIDATES = DEFAULT_CONFIG_NAMES.map((n) => path.join(os.homedir(), n));

export function resolveHomeConfig() {
  return HOME_CANDIDATES.find((c) => fs.existsSync(c)) || null;
}

// ─── 列出目录下所有配置文件 ─────────────────────────────────────────────────────

function findYamlConfigFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter(e => e.isFile() && /\.ya?ml$/i.test(e.name) && e.name !== META_FILE && e.name !== META_FILE_ALT)
    .map(e => ({ name: e.name, path: path.join(dir, e.name) }));
}

async function resolveProjectConfig(inputFile) {
  const inputDir = path.dirname(path.resolve(inputFile));
  const yamlFiles = findYamlConfigFiles(inputDir);

  if (yamlFiles.length === 0) return null;

  if (yamlFiles.length === 1) {
    const name = yamlFiles[0].name;
    if (DEFAULT_CONFIG_NAMES.includes(name)) {
      return yamlFiles[0].path;
    }
  }

  // 非交互环境：自动选最优配置，避免 select 在无 TTY 时崩溃
  if (!process.stdin.isTTY) {
    const optimal = yamlFiles.find((f) => DEFAULT_CONFIG_NAMES.includes(f.name));
    const chosen = optimal || yamlFiles[0];
    console.warn(chalk.yellow(`  ⚠  检测到多个配置文件，非交互环境自动选用：${chalk.cyan(chosen.name)}`));
    return chosen.path;
  }

  const { select, input } = await import('@inquirer/prompts');

  const choices = yamlFiles.map(f => {
    const isOptimal = f.name === 'juice.yaml';
    if (isOptimal) {
      return {
        name: `${chalk.green('●')} ${f.name} ${chalk.green('(最优配对)')}`,
        value: { type: 'file', path: f.path },
      };
    }
    return {
      name: `  ${f.name}`,
      value: { type: 'file', path: f.path },
    };
  });

  const defaultIdx = yamlFiles.findIndex(f => f.name === DEFAULT_CONFIG_NAMES[0]);

  choices.push(
    { name: '  [自定义] 输入其他路径...', value: { type: 'custom' } },
    { name: '  [跳过] 不使用项目配置', value: { type: 'skip' } },
  );

  const result = await select({
    message: '请选择配置文件：',
    choices,
    default: defaultIdx >= 0 ? defaultIdx : 0,
  });

  if (result.type === 'custom') {
    const customPath = await input({ message: '请输入配置文件路径：' });
    const resolved = path.resolve(customPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`指定的配置文件不存在：${resolved}`);
    }
    return resolved;
  }

  if (result.type === 'skip') return null;
  return result.path;
}

// ─── 配置文件加载 ─────────────────────────────────────────────────────────────

export function loadYaml(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  try {
    return yaml.load(fs.readFileSync(filePath, 'utf8')) || {};
  } catch (e) {
    throw new Error(`配置文件解析失败（${filePath}）：${e.message}`, { cause: e });
  }
}

// ─── 深度合并 ─────────────────────────────────────────────────────────────────

export function deepMerge(base, ...overrides) {
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

// ─── 配置合并 ─────────────────────────────────────────────────────────────────

/**
 * 将一组配置层（低优先级 → 高优先级）深度合并为最终配置。
 * 普通模式与片段模式共用此函数，避免两套合并逻辑随迭代漂移。
 * @param {{label:string, data:object}[]} layers
 * @returns {{config:object, layers:object[]}}
 */
export function mergeConfigLayers(layers) {
  const config = deepMerge(...layers.map((l) => l.data));
  return { config, layers };
}

export function buildConfig(highPriorityPath, homePath) {
  const layers = [];

  layers.push({ label: 'CLI 内置默认值', data: CODE_DEFAULTS });

  if (homePath) {
    layers.push({ label: `用户目录配置 (${homePath})`, data: loadYaml(homePath) });
  }

  if (highPriorityPath) {
    layers.push({ label: `优先配置 (${highPriorityPath})`, data: loadYaml(highPriorityPath) });
  }

  return mergeConfigLayers(layers);
}

// ─── HTML 模板处理 ────────────────────────────────────────────────────────────

export function processTemplate(inputFile, config) {
  const htmlRaw = fs.readFileSync(inputFile, 'utf8');

  const originalEscape = Mustache.escape;
  let htmlWithVars;
  try {
    if (config.rawHtml) {
      Mustache.escape = (text) => text;
    }
    htmlWithVars = Mustache.render(htmlRaw, config.variables || {});
  } finally {
    Mustache.escape = originalEscape;
  }

  const basePath = path.dirname(path.resolve(inputFile));
  const extraCss = collectExtraCss(basePath, config);

  const juiceOpts = Object.assign({}, config.juice || {});
  delete juiceOpts.extraCssFiles;

  return juice(htmlWithVars, { ...juiceOpts, extraCss });
}

export function collectExtraCss(basePath, config) {
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

export async function minifyHtml(html, minifyConfig) {
  return htmlMinify(html, {
    removeConditionalComments: false,
    ...(minifyConfig || {}),
  });
}

// ─── 输出路径 ─────────────────────────────────────────────────────────────────

function resolveOutputPaths(inputFile, config, base) {
  const parsed = path.parse(path.resolve(inputFile));
  const ns = (config.output && config.output.normalSuffix) || DEFAULT_NORMAL_SUFFIX;
  const ms = (config.output && config.output.minifiedSuffix) || DEFAULT_MINIFIED_SUFFIX;
  const dir = parsed.dir;
  const actualBase = base || parsed.name;
  return {
    base: actualBase,
    normal: path.join(dir, actualBase + ns),
    minified: path.join(dir, actualBase + ms),
    normalSuffix: ns,
    minifiedSuffix: ms,
    dir,
  };
}

// 输出文件是否已存在（dir 下任一 suffix 命中即冲突）
function outputConflicts(dir, base, suffixes) {
  return suffixes.some((s) => fs.existsSync(path.join(dir, base + s)));
}

// 查找下一个可用版本号（base-v1, base-v2, ...）
function findNextVersion(base, dir, suffixes) {
  let v = 1;
  while (outputConflicts(dir, base + '-v' + v, suffixes)) v++;
  return base + '-v' + v;
}

/**
 * 统一的输出冲突处理（模板模式与片段模式共用，保证行为一致）。
 *
 * 行为：
 *  - 无冲突：直接返回 { base, action: 'none' }。
 *  - 非 TTY（CI/管道）：按 defaultAction 处理（默认 'overwrite'，可选 'version'），
 *    输出黄色警告，绝不卡死。
 *  - TTY：提示 [覆盖(默认) / 版本 / 重命名(可选)]；
 *    · overwrite → 返回 base
 *    · version  → 返回 findNextVersion(base)
 *    · rename   → 进入输入循环直到无冲突（仅 allowRename 时可选）
 *
 * @param {string} defaultBase 默认输出 base（不含后缀）
 * @param {string} dir          输出目录
 * @param {string[]} suffixes   参与冲突判定的后缀列表
 * @param {{allowRename?:boolean, defaultAction?:'overwrite'|'version', message?:string, inputMessage?:string}} [opts]
 * @returns {Promise<{base:string, action:'none'|'overwrite'|'version'|'rename'}>}
 */
async function promptOutputConflict(defaultBase, dir, suffixes, opts = {}) {
  const { allowRename = false, defaultAction = 'overwrite', message, inputMessage = '请重新输入输出文件名：' } = opts;
  const first = suffixes[0];

  if (!outputConflicts(dir, defaultBase, suffixes)) {
    return { base: defaultBase, action: 'none' };
  }

  // 非交互环境：按既定默认动作处理，避免 select 在无 TTY 时崩溃
  if (!process.stdin.isTTY) {
    if (defaultAction === 'version') {
      const v = findNextVersion(defaultBase, dir, suffixes);
      console.warn(chalk.yellow(`  ⚠  输出文件已存在，非交互环境自动版本号：${chalk.cyan(v + first)}`));
      return { base: v, action: 'version' };
    }
    console.warn(chalk.yellow(`  ⚠  输出文件已存在，非交互环境默认覆盖：${chalk.cyan(defaultBase + first)}`));
    return { base: defaultBase, action: 'overwrite' };
  }

  const { select, input } = await import('@inquirer/prompts');
  const versionedBase = findNextVersion(defaultBase, dir, suffixes);
  const choices = [
    { name: `${chalk.green('●')} 覆盖现有文件（默认）`, value: 'overwrite' },
    { name: `自动版本号（${chalk.cyan(versionedBase + first)}）`, value: 'version' },
  ];
  if (allowRename) {
    choices.push({ name: '重新输入文件名', value: 'rename' });
  }

  const action = await select({
    message: message || `输出文件已存在：${chalk.cyan(defaultBase + first)}，请选择处理方式：`,
    default: 'overwrite',
    choices,
  });

  if (action === 'overwrite') return { base: defaultBase, action };
  if (action === 'version') return { base: versionedBase, action };

  // 重命名：输入循环直到无冲突
  let base = defaultBase;
  while (true) {
    base = await input({ message: inputMessage, default: base });
    if (!outputConflicts(dir, base, suffixes)) break;
    console.log(chalk.yellow(`  ⚠  ${chalk.cyan(base + first)} 仍已存在，请换一个名字。`));
  }
  return { base, action: 'rename' };
}

// 列出 dir 下已存在的冲突文件（供调用方展示冲突清单）
function checkOutputConflicts(baseName, dir, suffixes) {
  return suffixes
    .map((s) => path.join(dir, baseName + s))
    .filter((p) => fs.existsSync(p));
}

// ─── 格式化 ───────────────────────────────────────────────────────────────────

export function fmtSize(str) {
  return fmtBytes(Buffer.byteLength(str, 'utf8'));
}

export function savings(original, minified) {
  const orig = Buffer.byteLength(original, 'utf8');
  if (orig === 0) return '0%';
  const mini = Buffer.byteLength(minified, 'utf8');
  return (((orig - mini) / orig) * 100).toFixed(1) + '%';
}

// ─── 主入口 ───────────────────────────────────────────────────────────────────

export async function run({ file, config: configPath }) {
  const spinner = ora({ text: '正在处理...', color: 'cyan' }).start();

  try {
    const inputFile = path.resolve(file);
    if (!fs.existsSync(inputFile)) {
      throw new Error(`输入文件不存在：${inputFile}`);
    }

    let highPriorityPath = null;

    if (configPath) {
      const resolved = path.resolve(configPath);
      if (!fs.existsSync(resolved)) {
        throw new Error(`指定的配置文件不存在：${resolved}`);
      }
      highPriorityPath = resolved;
    } else {
      spinner.stop();
      highPriorityPath = await resolveProjectConfig(inputFile);
      spinner.start();
    }

    const homePath = resolveHomeConfig();
    const { config, layers } = buildConfig(highPriorityPath, homePath);
    const encoding = (config.output && config.output.encoding) || 'utf8';

    spinner.text = `CSS 内联处理：${path.basename(inputFile)}`;
    const resultHtml = processTemplate(inputFile, config);

    let outBase = path.parse(path.resolve(inputFile)).name;
    const probe = resolveOutputPaths(inputFile, config, outBase);
    const suffixes = [probe.normalSuffix, probe.minifiedSuffix];
    if (outputConflicts(probe.dir, outBase, suffixes)) {
      const isTty = process.stdin.isTTY;
      if (isTty) spinner.stop();
      const res = await promptOutputConflict(outBase, probe.dir, suffixes, { allowRename: true });
      if (isTty) spinner.start();
      outBase = res.base;
    }
    const outPaths = resolveOutputPaths(inputFile, config, outBase);

    spinner.text = '写出 .output.html ...';
    fs.writeFileSync(outPaths.normal, resultHtml, encoding);

    spinner.text = '写出 .minified.html ...';
    const minified = await minifyHtml(resultHtml, config.minify);
    fs.writeFileSync(outPaths.minified, minified, encoding);

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

// ─── 输出冲突处理（模板/片段模式共用，供 snippet.js 复用） ─────────────────
export { outputConflicts, findNextVersion, checkOutputConflicts, promptOutputConflict };
