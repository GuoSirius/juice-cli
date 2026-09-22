import fs from 'fs';
import path from 'path';
import juice from 'juice';
import chalk from 'chalk';
import {
  loadYaml,
  collectExtraCss,
  minifyHtml,
  fmtSize,
  savings,
  promptOutputConflict,
} from './index.js';
import { renderTemplate } from './render.js';
import { inlineLocalStylesheets } from './css-links.js';
import { applyUnoCss } from './unocss.js';
import { buildSnippetConfig, insertIntoContent, resolveSnippetOutputPaths } from './snippet.js';
import { SNIPPET_OUTPUT_SUFFIXES } from './constants.js';

// ─── 页面装配描述文件解析 ──────────────────────────────────────────────────────

/**
 * 解析 page.yaml。
 *
 * 结构（扁平写法）：
 *   template: <模板 HTML 路径，相对 page.yaml 所在目录>
 *   outputName: <可选，输出文件名（不含扩展名），默认 page.yaml 文件名>
 *   sections:                          # 必填，按序组装
 *     - snippet: <片段 HTML 路径>
 *       name: <可选，注册为 partial，其他板块/模板可用 {{> name}} 引入>
 *       vars: { ... }                  # 可选，该板块独立变量（合并于全局 variables 之上）
 *   partials:                          # 可选，name → 文件路径 的 partial 注册表
 *     footer: path/footer.html
 *   variables: { ... }                 # 可选，全局变量（page.yaml 本身也作为配置层参与合并）
 *
 * @param {object} raw     page.yaml 解析后的对象
 * @param {string} baseDir 解析相对路径的基准目录
 * @returns {{template:string, outputName:string|null, sections:Array, partials:Record<string,string>}}
 */
export function parsePageSpec(raw, baseDir) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('页面装配文件为空或格式不正确（应为 YAML 对象）');
  }
  if (!raw.template) {
    throw new Error('页面装配文件缺少 template 字段（模板 HTML 路径）');
  }
  if (!Array.isArray(raw.sections) || raw.sections.length === 0) {
    throw new Error('页面装配文件缺少 sections（至少一个板块）');
  }

  const resolve = (p) => (path.isAbsolute(p) ? p : path.resolve(baseDir, p));

  const sections = raw.sections.map((s, i) => {
    if (!s || !s.snippet) {
      throw new Error(`sections[${i}] 缺少 snippet 字段（片段 HTML 路径）`);
    }
    if (s.vars !== undefined && (typeof s.vars !== 'object' || s.vars === null || Array.isArray(s.vars))) {
      throw new Error(`sections[${i}].vars 应为对象`);
    }
    return {
      snippet: resolve(s.snippet),
      name: s.name || null,
      vars: s.vars || null,
    };
  });

  // partial 注册表：partials 映射 + 命名板块
  const partials = {};
  for (const [name, p] of Object.entries(raw.partials || {})) {
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('partials 的键必须是非空名称');
    }
    if (partials[name]) throw new Error(`partial 名称重复：${name}`);
    partials[name] = fs.readFileSync(resolve(p), 'utf8');
  }
  for (const s of sections) {
    if (s.name) {
      if (partials[s.name]) throw new Error(`partial 名称重复：${s.name}`);
      partials[s.name] = fs.readFileSync(s.snippet, 'utf8');
    }
  }

  return {
    template: resolve(raw.template),
    outputName: raw.outputName || null,
    sections,
    partials,
  };
}

// ─── 页面装配流水线 ────────────────────────────────────────────────────────────

/**
 * 页面装配流水线（与片段模式同为 4 文件输出）：
 *   1. 未渲染板块按序插入模板 → .raw.html
 *   2. 模板渲染全局变量 + 各板块独立渲染（全局 + 板块 vars）后插入 → .html
 *   3. Juice CSS 内联 → .output.html
 *   4. 压缩 → .minified.html
 */
async function assemblePage({ spec, config, cwd, outputBaseName, layers = [], unocss }) {
  const templateHtml = inlineLocalStylesheets(
    fs.readFileSync(spec.template, 'utf8'),
    path.dirname(spec.template),
  );

  const rawSectionHtmls = spec.sections.map((s) => {
    if (!fs.existsSync(s.snippet)) {
      throw new Error(`板块片段不存在：${s.snippet}`);
    }
    return fs.readFileSync(s.snippet, 'utf8');
  });

  const outPaths = resolveSnippetOutputPaths(outputBaseName, cwd);
  const globalVars = config.variables || {};
  const renderOpts = { rawHtml: !!config.rawHtml, partials: spec.partials };

  // 1. raw：未渲染板块按序拼接后一次插入
  //    （insertIntoContent 以「空 content」为前提，循环多次插入会丢弃先前内容）
  const rawMarkup = insertIntoContent(templateHtml, rawSectionHtmls.join('\n'));
  fs.writeFileSync(outPaths.raw, rawMarkup, 'utf8');

  // 2. 渲染：模板先渲染全局变量；各板块独立渲染（全局 + 板块 vars）后按序插入
  let renderedHtml = renderTemplate(templateHtml, globalVars, renderOpts);
  const renderedSections = spec.sections.map((s, i) => {
    const secVars = s.vars ? { ...globalVars, ...s.vars } : globalVars;
    return renderTemplate(rawSectionHtmls[i], secVars, renderOpts);
  });
  renderedHtml = insertIntoContent(renderedHtml, renderedSections.join('\n'));
  fs.writeFileSync(outPaths.normal, renderedHtml, 'utf8');

  // 3. Juice CSS 内联
  const templateDir = path.dirname(spec.template);
  const extraCss = collectExtraCss(templateDir, config);
  const juiceOpts = Object.assign({}, config.juice || {});
  delete juiceOpts.extraCssFiles;
  const unocssEnabled = !!unocss || !!config.unocss;
  let processed;
  try {
    const htmlForJuice = await applyUnoCss(renderedHtml, unocssEnabled);
    processed = juice(htmlForJuice, { ...juiceOpts, extraCss });
  } catch (err) {
    throw new Error(`CSS 内联失败：${err.message}`, { cause: err });
  }
  fs.writeFileSync(outPaths.output, processed, 'utf8');

  // 4. 压缩
  let minified;
  try {
    minified = await minifyHtml(processed, config.minify);
  } catch (err) {
    throw new Error(`压缩失败：${err.message}`, { cause: err });
  }
  fs.writeFileSync(outPaths.minified, minified, 'utf8');

  // 5. 报告
  const rel = (p) => './' + path.relative(cwd, p);
  const layerLines = (layers || []).length > 0
    ? layers.map((l) => `    ${chalk.gray('·')} ${l.label}`).join('\n') + '\n'
    : '';

  console.log(
    chalk.green('\n✔ 页面装配完成') + '\n' +
    `  ${chalk.bold('模板：')}  ${chalk.cyan(spec.template)}\n` +
    `  ${chalk.bold('板块：')}  ${spec.sections.map((s, i) => `#${i + 1} ${path.basename(path.dirname(s.snippet))}/${path.basename(s.snippet)}${s.vars ? chalk.gray(' (+vars)') : ''}`).join(chalk.gray(' → '))}\n` +
    `  ${chalk.bold('配置层（低→高）：')}\n${layerLines}` +
    `  ${chalk.bold('输出：')}\n` +
    `    ${chalk.green('·')} 原始组装  ${chalk.cyan(rel(outPaths.raw))}      ${chalk.gray(fmtSize(rawMarkup))}\n` +
    `    ${chalk.green('·')} 已渲染    ${chalk.cyan(rel(outPaths.normal))}  ${chalk.gray(fmtSize(renderedHtml))}\n` +
    `    ${chalk.green('·')} 内联后    ${chalk.cyan(rel(outPaths.output))}  ${chalk.gray(fmtSize(processed))}\n` +
    `    ${chalk.green('·')} 压缩版    ${chalk.cyan(rel(outPaths.minified))}  ${chalk.gray(fmtSize(minified) + '，节省 ' + savings(processed, minified))}`
  );

  return outPaths;
}

// ─── 模式入口 ─────────────────────────────────────────────────────────────────

/**
 * 页面装配模式：juice build -p page.yaml
 *
 * page.yaml 本身作为配置层参与合并（可携带 variables / juice / rawHtml 等），
 * 优先级与片段模式的「项目配置」一致：内置默认 < 用户目录 < page.yaml < -c 指定。
 */
export async function runPageMode({ page, config: cliConfigPath, outputName, unocss }) {
  if (!page) {
    // 交互式页面装配（选择品牌/模板/板块多选）
    try {
      const { runPageInteractive } = await import('./page-interactive.js');
      return runPageInteractive({ cliConfigPath, outputName });
    } catch (err) {
      if (err && err.code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error('交互式页面装配尚未启用，请使用 juice build -p <page.yaml>', { cause: err });
      }
      throw err;
    }
  }

  const pagePath = path.resolve(page);
  if (!fs.existsSync(pagePath)) {
    throw new Error(`页面装配文件不存在：${pagePath}`);
  }

  const raw = loadYaml(pagePath);
  const spec = parsePageSpec(raw, path.dirname(pagePath));

  const { config, layers } = buildSnippetConfig({
    priorityConfigPath: pagePath,
    cliConfigPath,
  });

  // 输出文件名：-n > page.yaml outputName > page.yaml 文件名
  const defaultBaseName = outputName || spec.outputName || path.parse(pagePath).name;
  const res = await promptOutputConflict(defaultBaseName, process.cwd(), SNIPPET_OUTPUT_SUFFIXES, {
    allowRename: true,
    defaultAction: 'overwrite',
  });

  return assemblePage({ spec, config, cwd: process.cwd(), outputBaseName: res.base, layers, unocss });
}

export { assemblePage };
