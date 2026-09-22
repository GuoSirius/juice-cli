import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { URL } from 'node:url';
import chalk from 'chalk';
import { buildConfig, resolveHomeConfig } from './index.js';
import { inlineLocalStylesheets } from './css-links.js';
import { renderTemplate } from './render.js';
import { applyUnoCss } from './unocss.js';
import { DEFAULT_CONFIG_NAMES } from './constants.js';

// preview 模式不内联、不压缩：仅把 UnoCSS 编译出的原子 CSS 注入一个 <style> 块，
// 浏览器原生支持，改完刷新即见样式 —— 免去完整 juice 邮件管线的编译等待。
const PREVIEW_SUFFIX = '-preview.html';

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

/**
 * 解析预览用的配置：优先 -c 指定；否则取输入文件同目录的 juice.yaml/juice.yml；
 * 再叠加用户主目录配置与内置默认值（与正常模式一致的三层合并）。
 */
function resolvePreviewConfig(inputFile, configPath) {
  let highPriorityPath;
  if (configPath) {
    const resolved = path.resolve(configPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`指定的配置文件不存在：${resolved}`);
    }
    highPriorityPath = resolved;
  } else {
    const dir = path.dirname(path.resolve(inputFile));
    highPriorityPath =
      DEFAULT_CONFIG_NAMES.map((n) => path.join(dir, n)).find((p) => fs.existsSync(p)) || null;
  }
  const homePath = resolveHomeConfig();
  const { config } = buildConfig(highPriorityPath, homePath);
  return config;
}

/**
 * 生成预览 HTML：解析本地 <link> + 模板变量替换 + 注入 UnoCSS <style>（不内联）。
 * @param {string} inputFile 绝对路径
 * @param {object} config
 * @returns {Promise<string>}
 */
export async function buildPreviewHtml(inputFile, config) {
  const dir = path.dirname(path.resolve(inputFile));
  const htmlRaw0 = fs.readFileSync(inputFile, 'utf8');
  // 解析本地 <link rel=stylesheet>（远程链接保留），让预览与最终产物一致
  const htmlRaw = inlineLocalStylesheets(htmlRaw0, dir);
  const htmlWithVars = renderTemplate(htmlRaw, config.variables || {}, {
    rawHtml: !!config.rawHtml,
  });
  // 预览恒启用 UnoCSS 编译；注入 <style> 块而非内联，浏览器即时可见
  return applyUnoCss(htmlWithVars, true);
}

async function writePreviewFile(inputFile, config, outPath) {
  const html = await buildPreviewHtml(inputFile, config);
  fs.writeFileSync(outPath, html, 'utf8');
  return outPath;
}

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
    let tries = 0;
    const tryListen = (p) => {
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE' && tries < 10) {
          tries++;
          tryListen(p + 1);
        } else {
          reject(err);
        }
      });
      server.listen(p, () => resolve(p));
    };
    tryListen(port);
  });
}

async function startServer({ inputFile, config, dir, base, port, open }) {
  const http = await import('node:http');

  const getTargetHtml = async () => {
    const html = await buildPreviewHtml(inputFile, config);
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
        const mtime = fs.existsSync(inputFile) ? fs.statSync(inputFile).mtimeMs : 0;
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(String(mtime));
        return;
      }

      const isTarget =
        pathname === '/' || pathname === `/${base}.html` || pathname === `/${base}`;
      if (isTarget) {
        const html = await getTargetHtml();
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      // 其余按静态文件服务（图片等相对资源可正常加载），并限制在本目录内
      const rel = pathname.replace(/^\/+/, '');
      const filePath = path.join(dir, rel);
      if (
        filePath.startsWith(dir) &&
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
  const url = `http://localhost:${actualPort}/${base}.html`;
  console.log(chalk.green('✔ 预览服务已启动：') + chalk.cyan(url));
  console.log(chalk.gray('  保存模板后浏览器自动刷新（Ctrl+C 退出）。'));
  if (open) openBrowser(url);
}

/**
 * preview 子命令入口。
 *   juice preview t.html                一次性生成 t-preview.html（注入 <style>，不内联）
 *   juice preview t.html -w             生成并监听改动自动重生成
 *   juice preview t.html -s             启动本地服务，保存即自动刷新（不落盘）
 *   juice preview t.html -s -o          同上并自动打开浏览器
 * @param {{file:string, config?:string|null, watch?:boolean, serve?:boolean, port?:number, open?:boolean}} opts
 */
export async function runPreviewMode({ file, config = null, watch = false, serve = false, port = 3000, open = false }) {
  const inputFile = path.resolve(file);
  if (!fs.existsSync(inputFile)) {
    throw new Error(`输入文件不存在：${inputFile}`);
  }

  const cfg = resolvePreviewConfig(inputFile, config);
  const dir = path.dirname(inputFile);
  const base = path.parse(inputFile).name;
  const previewFile = path.join(dir, base + PREVIEW_SUFFIX);

  if (serve) {
    await startServer({ inputFile, config: cfg, dir, base, port, open });
    return;
  }

  // 文件模式：写出 -preview.html（默认即生成一次）
  const out = await writePreviewFile(inputFile, cfg, previewFile);
  console.log(chalk.green('✔ 预览文件已生成：') + chalk.cyan(out));
  console.log(
    chalk.gray('  浏览器打开该文件，改完模板后刷新即可看到样式（加 -w 可自动重生成）。'),
  );

  if (watch) {
    console.log(chalk.cyan('👀 监听改动中（Ctrl+C 退出）...'));
    fs.watch(inputFile, async () => {
      try {
        await writePreviewFile(inputFile, cfg, previewFile);
        console.log(
          chalk.gray(`  ↻ ${new Date().toLocaleTimeString()} 已重生成 ${path.basename(previewFile)}`),
        );
      } catch (e) {
        console.error(chalk.red(`  ✘ 重生成失败：${e.message}`));
      }
    });
    // 监听器保持事件循环常驻，进程随 Ctrl+C 退出
  }
}
