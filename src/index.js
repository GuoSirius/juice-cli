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

function resolveOutputPaths(inputFile, config) {
  const parsed = path.parse(path.resolve(inputFile));
  const ns = (config.output && config.output.normalSuffix) || DEFAULT_NORMAL_SUFFIX;
  const ms = (config.output && config.output.minifiedSuffix) || DEFAULT_MINIFIED_SUFFIX;
  const dir = parsed.dir;
  const conflicts = (base) =>
    fs.existsSync(path.join(dir, base + ns)) || fs.existsSync(path.join(dir, base + ms));

  // 输出冲突时自动版本号（与片段模式 findNextVersion 的 -vN 约定一致，P3-6）
  let base = parsed.name;
  if (conflicts(base)) {
    let v = 1;
    do {
      v++;
      base = `${parsed.name}-v${v}`;
    } while (conflicts(base));
  }
  return {
    base,
    versioned: base !== parsed.name,
    normal: path.join(dir, base + ns),
    minified: path.join(dir, base + ms),
  };
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

    const outPaths = resolveOutputPaths(inputFile, config);
    if (outPaths.versioned) {
      spinner.warn(chalk.yellow(`输出文件已存在，自动重命名为：${path.basename(outPaths.normal)}`));
    }

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
