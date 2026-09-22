import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { URL } from 'node:url';
import chalk from 'chalk';
import { buildConfig, resolveHomeConfig, loadYaml } from './index.js';
import { inlineLocalStylesheets } from './css-links.js';
import { renderTemplate } from './render.js';
import { applyUnoCss } from './unocss.js';
import { buildSnippetConfig, findLocalConfig, buildSnippetHtml } from './snippet.js';
import { parsePageSpec, buildPageHtml } from './page.js';
import { DEFAULT_CONFIG_NAMES } from './constants.js';

// preview 模式不内联、不压缩：仅把 UnoCSS 编译出的原子 CSS 注入一个 <style> 块，
// 浏览器原生支持，改完刷新即见样式 —— 免去完整 juice 邮件管线的编译等待。
// 三种模式均支持：模板（<file>）、片段（-s + -f）、页面装配（-p page.yaml）。
const PREVIEW_SUFFIX = '-preview.html';
const POLL_INTERVAL = 400;

const LIVE_RELOAD_SCRIPT = `<script>
(function(){
  var KEY='__juice_preview_mtime';
  function check(){
    var x=new XMLHttpRequest();
    x.open('GET','/__reload?t='+Date.now(),true);
    x.onreadystatechange=function(){
      if(x.readyState===4&&x.status===200){
        if(window[KEY]&&window[KEY]!==x.responseText){location.reload();}
        window[KEY]=x.responseText;
      }
    };
    x.send();
  }
  check();
  setInterval(check,400);
})();
</script>`;

const STATIC_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ─── 目标解析 ──────────────────────────────────────────────────────────────────

/**
 * 解析预览目标（三种模式，页面 > 片段 > 模板）。
 */
function resolveTargets({ file, snippet, template, page }) {
  if (page) {
    const pagePath = path.resolve(page);
    if (!fs.existsSync(pagePath)) throw new Error(`页面装配文件不存在：${pagePath}`);
    return { mode: 'page', pagePath };
  }
  if (snippet) {
    if (!template) {
      throw new Error('片段预览需要同时指定模板：juice preview -s snippet.html -f template.html');
    }
    const snippetPath = path.resolve(snippet);
    const templatePath = path.resolve(template);
    if (!fs.existsSync(snippetPath)) throw new Error(`片段文件不存在：${snippetPath}`);
    if (!fs.existsSync(templatePath)) throw new Error(`模板文件不存在：${templatePath}`);
    return { mode: 'snippet', snippetPath, templatePath };
  }
  if (file) {
    const inputPath = path.resolve(file);
    if (!fs.existsSync(inputPath)) throw new Error(`输入文件不存在：${inputPath}`);
    return { mode: 'template', inputPath };
  }
  throw new Error(
    '请指定预览对象：juice preview <template.html>，或 -s <snippet.html> -f <template.html>，或 -p <page.yaml>',
  );
}

// ─── 配置解析（与各模式生产链路一致的三层合并） ────────────────────────────────

function resolvePreviewConfig(targets, cliConfigPath) {
  if (targets.mode === 'page') {
    // page.yaml 自身作为配置层参与合并（与 runPageMode 一致）
    return buildSnippetConfig({ priorityConfigPath: targets.pagePath, cliConfigPath }).config;
  }
  if (targets.mode === 'snippet') {
    // 片段目录配置优先，其次当前目录（与 runSnippetMode 的 -s + -f 分支一致）
    const priority =
      findLocalConfig(path.dirname(targets.snippetPath)) || findLocalConfig(process.cwd());
    return buildSnippetConfig({ priorityConfigPath: priority, cliConfigPath }).config;
  }
  // 模板模式：-c 指定 > 模板同目录 juice.yaml/juice.yml
  let highPriorityPath;
  if (cliConfigPath) {
    const resolved = path.resolve(cliConfigPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`指定的配置文件不存在：${resolved}`);
    }
    highPriorityPath = resolved;
  } else {
    const dir = path.dirname(targets.inputPath);
    highPriorityPath =
      DEFAULT_CONFIG_NAMES.map((n) => path.join(dir, n)).find((p) => fs.existsSync(p)) || null;
  }
  const homePath = resolveHomeConfig();
  return buildConfig(highPriorityPath, homePath).config;
}

// ─── 预览 HTML 构建（装配 + 渲染 + UnoCSS <style> 注入，不内联） ───────────────

async function buildPreviewHtml(targets, config) {
  if (targets.mode === 'template') {
    const dir = path.dirname(targets.inputPath);
    const htmlRaw = inlineLocalStylesheets(fs.readFileSync(targets.inputPath, 'utf8'), dir);
    const rendered = renderTemplate(htmlRaw, config.variables || {}, {
      rawHtml: !!config.rawHtml,
    });
    return applyUnoCss(rendered, true);
  }
  if (targets.mode === 'snippet') {
    const { renderedHtml } = buildSnippetHtml({
      snippetPath: targets.snippetPath,
      templatePath: targets.templatePath,
      config,
    });
    return applyUnoCss(renderedHtml, true);
  }
  // page：page.yaml 每次重新解析，改 yaml / 新增板块文件都能被拾取
  const raw = loadYaml(targets.pagePath);
  const spec = parsePageSpec(raw, path.dirname(targets.pagePath));
  const { renderedHtml } = buildPageHtml({ spec, config });
  return applyUnoCss(renderedHtml, true);
}

// ─── 输入文件集与变更签名（改模板/片段/yaml/新增板块 → 签名变化 → 重建） ────────

function collectInputPaths(targets, cliConfigPath) {
  const paths = [];
  if (targets.mode === 'template') {
    paths.push(targets.inputPath);
    if (cliConfigPath) {
      paths.push(path.resolve(cliConfigPath));
    } else {
      const dir = path.dirname(targets.inputPath);
      for (const n of DEFAULT_CONFIG_NAMES) paths.push(path.join(dir, n));
    }
  } else if (targets.mode === 'snippet') {
    paths.push(targets.snippetPath, targets.templatePath);
    const priority =
      findLocalConfig(path.dirname(targets.snippetPath)) || findLocalConfig(process.cwd());
    if (priority) paths.push(priority);
    if (cliConfigPath) paths.push(path.resolve(cliConfigPath));
  } else {
    paths.push(targets.pagePath);
    try {
      const raw = loadYaml(targets.pagePath);
      const baseDir = path.dirname(targets.pagePath);
      const r = (p) => (path.isAbsolute(p) ? p : path.resolve(baseDir, p));
      if (raw.template) paths.push(r(raw.template));
      for (const s of raw.sections || []) {
        if (s && s.snippet) paths.push(r(s.snippet));
      }
      for (const p of Object.values(raw.partials || {})) paths.push(r(p));
    } catch (_) {
      // yaml 暂时解析失败（编辑中）：签名仅含 pagePath，修复后自然重建
    }
    if (cliConfigPath) paths.push(path.resolve(cliConfigPath));
  }
  return paths;
}

function computeSignature(paths) {
  return paths
    .map((p) => {
      try {
        return `${p}:${fs.statSync(p).mtimeMs}`;
      } catch (_) {
        return `${p}:missing`;
      }
    })
    .join('|');
}

// ─── 输出路径与静态服务根目录 ──────────────────────────────────────────────────

function resolvePreviewOutput(targets) {
  if (targets.mode === 'template') {
    return path.join(path.dirname(targets.inputPath), path.parse(targets.inputPath).name + PREVIEW_SUFFIX);
  }
  if (targets.mode === 'snippet') {
    // 与片段模式生产输出一致：写入当前工作目录
    return path.join(process.cwd(), path.parse(targets.snippetPath).name + PREVIEW_SUFFIX);
  }
  return path.join(process.cwd(), path.parse(targets.pagePath).name + PREVIEW_SUFFIX);
}

function resolveServeRoot(targets) {
  if (targets.mode === 'template') return path.dirname(targets.inputPath);
  if (targets.mode === 'snippet') return path.dirname(targets.templatePath);
  try {
    const raw = loadYaml(targets.pagePath);
    const r = (p) => (path.isAbsolute(p) ? p : path.resolve(path.dirname(targets.pagePath), p));
    return path.dirname(r(raw.template));
  } catch (_) {
    return path.dirname(targets.pagePath);
  }
}

// ─── 服务模式 ──────────────────────────────────────────────────────────────────

function openBrowser(url) {
  const cmd =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.warn(chalk.yellow('  ⚠ 无法自动打开浏览器，请手动访问上面的地址。'));
  });
}

function listenOnAvailablePort(server, port) {
  return new Promise((resolve, reject) => {
    const tryListen = (p) => {
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          tryListen(p + 1); // 冲突自动 +1，直至找到可用端口
        } else {
          reject(err);
        }
      });
      server.listen(p, () => resolve(p));
    };
    tryListen(port);
  });
}

async function startServer({ targets, cliConfigPath, serveRoot, targetName, port, open }) {
  const http = await import('node:http');

  const getTargetHtml = async () => {
    const config = resolvePreviewConfig(targets, cliConfigPath);
    const html = await buildPreviewHtml(targets, config);
    // 注入轻量轮询式 live-reload（零依赖），保存模板后浏览器自动刷新
    return /<\/body>/i.test(html)
      ? html.replace(/<\/body>/i, `${LIVE_RELOAD_SCRIPT}\n</body>`)
      : html + LIVE_RELOAD_SCRIPT;
  };

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);

      if (pathname === '/__reload') {
        // 输入文件集动态解析：改 yaml / 新增片段文件都会反映在签名里
        const sig = computeSignature(collectInputPaths(targets, cliConfigPath));
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(sig);
        return;
      }

      const isTarget = pathname === '/' || pathname === `/${targetName}`;
      if (isTarget) {
        const html = await getTargetHtml();
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      // 其余按静态文件服务（图片等相对资源可正常加载），并限制在本目录内
      const rel = pathname.replace(/^\/+/, '');
      const filePath = path.join(serveRoot, rel);
      if (
        filePath.startsWith(serveRoot) &&
        fs.existsSync(filePath) &&
        fs.statSync(filePath).isFile()
      ) {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': STATIC_MIME[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    } catch (e) {
      res.writeHead(500);
      res.end('Error: ' + e.message);
    }
  });

  const actualPort = await listenOnAvailablePort(server, port);
  const url = `http://localhost:${actualPort}/${targetName}`;
  console.log(chalk.green('✔ 预览服务已启动：') + chalk.cyan(url));
  console.log(chalk.gray('  保存模板/片段/yaml 后浏览器自动刷新（Ctrl+C 退出）。'));
  if (open) openBrowser(url);
}

// ─── 主入口 ────────────────────────────────────────────────────────────────────

/**
 * preview 子命令入口（免完整编译的本地预览，UnoCSS <style> 注入，不内联不压缩）。
 *   juice preview t.html                          模板模式
 *   juice preview -s snippet.html -f t.html       片段模式
 *   juice preview -p page.yaml                    页面装配模式
 *   加 -w 监听改动自动重生成；加 --serve 起本地服务（保存自动刷新），-o 自动开浏览器。
 * @param {{file?:string|null, snippet?:string|null, template?:string|null, page?:string|null,
 *          config?:string|null, watch?:boolean, serve?:boolean, port?:number, open?:boolean}} opts
 */
export async function runPreviewMode({
  file = null,
  snippet = null,
  template = null,
  page = null,
  config = null,
  watch = false,
  serve = false,
  port = 5000,
  open = false,
}) {
  const targets = resolveTargets({ file, snippet, template, page });
  const previewFile = resolvePreviewOutput(targets);
  const targetName = path.basename(previewFile);

  if (serve) {
    await startServer({
      targets,
      cliConfigPath: config,
      serveRoot: resolveServeRoot(targets),
      targetName,
      port,
      open,
    });
    return;
  }

  // 文件模式：写出 -preview.html（默认即生成一次）
  const cfg = resolvePreviewConfig(targets, config);
  const html = await buildPreviewHtml(targets, cfg);
  fs.writeFileSync(previewFile, html, 'utf8');
  console.log(chalk.green('✔ 预览文件已生成：') + chalk.cyan(previewFile));
  console.log(
    chalk.gray('  浏览器打开该文件，改完刷新即可看到样式（加 -w 可自动重生成）。'),
  );

  if (watch) {
    console.log(chalk.cyan('👀 监听改动中（模板/片段/yaml 均生效，Ctrl+C 退出）...'));
    let lastSig = computeSignature(collectInputPaths(targets, config));
    const timer = setInterval(async () => {
      const sig = computeSignature(collectInputPaths(targets, config));
      if (sig === lastSig) return;
      lastSig = sig;
      try {
        // 配置（含变量）也重新解析，改 yaml 立即生效
        const freshCfg = resolvePreviewConfig(targets, config);
        const freshHtml = await buildPreviewHtml(targets, freshCfg);
        fs.writeFileSync(previewFile, freshHtml, 'utf8');
        console.log(
          chalk.gray(`  ↻ ${new Date().toLocaleTimeString()} 已重生成 ${path.basename(previewFile)}`),
        );
      } catch (e) {
        console.error(chalk.red(`  ✘ 重生成失败：${e.message}`));
      }
    }, POLL_INTERVAL);
    // 定时器保持事件循环常驻，进程随 Ctrl+C 退出
    timer.unref?.();
  }
}
