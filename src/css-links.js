import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const LINK_TAG_RE = /<link\b[^>]*>/gi;

/** 从标签文本中提取属性值（兼容单/双引号与无引号写法） */
function getAttr(tag, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = re.exec(tag);
  return m ? (m[2] ?? m[3] ?? m[4] ?? null) : null;
}

/**
 * 将模板中的本地 <link rel="stylesheet" href="..."> 解析为 <style> 块（构建期内联）。
 *
 * 行为：
 *   - 本地相对/绝对路径 → 读取文件内容，替换为 <style>（随后由 juice 统一内联）
 *   - 远程 http(s) 链接   → 保留原样 + 黄色警告（邮件客户端会剥离外链样式）
 *   - 本地文件不存在     → 移除该标签 + 警告（保证输出自包含）
 *   - 非 stylesheet 的 link（如 favicon）→ 不处理
 *
 * 在 Mustache/Handlebars 渲染之前调用，因此 CSS 文件中也可使用模板变量。
 *
 * @param {string} html    模板 HTML
 * @param {string} baseDir 解析相对路径的基准目录（模板所在目录）
 * @returns {string} 处理后的 HTML
 */
export function inlineLocalStylesheets(html, baseDir) {
  const warn = (msg) => process.stderr.write(chalk.yellow(`  ⚠  ${msg}\n`));
  return html.replace(LINK_TAG_RE, (tag) => {
    const rel = (getAttr(tag, 'rel') || '').toLowerCase();
    if (!rel.split(/\s+/).includes('stylesheet')) return tag;

    const href = getAttr(tag, 'href');
    if (!href) return tag;

    // 远程链接：保留 + 警告
    if (/^(?:https?:)?\/\//i.test(href)) {
      warn(`外部样式表不会被邮件客户端加载：<link href="${href}">，建议下载到本地后引入。已保留原样。`);
      return tag;
    }

    // 本地路径：解析查询串/锚点后读取
    const cleanHref = decodeURIComponent(href.split('?')[0].split('#')[0]);
    const full = path.isAbsolute(cleanHref) ? cleanHref : path.join(baseDir, cleanHref);
    if (!fs.existsSync(full)) {
      warn(`link 引用的本地样式文件不存在，已移除该标签：${full}`);
      return '';
    }
    const css = fs.readFileSync(full, 'utf8');
    return `<style>\n${css}\n</style>`;
  });
}
