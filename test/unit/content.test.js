import { describe, it, expect } from 'vitest';
import { insertIntoContent, reindentHtml } from '../../src/snippet.js';

describe('insertIntoContent', () => {
  it('将片段插入 <tbody id="content"> 内', () => {
    const tpl = '<table>\n  <tbody id="content">\n  </tbody>\n</table>';
    const snip = '<tr><td>hi</td></tr>';
    const out = insertIntoContent(tpl, snip);
    expect(out).toContain('<tr><td>hi</td></tr>');
    expect(out.indexOf('<tr>')).toBeGreaterThan(out.indexOf('<tbody id="content">'));
    expect(out.indexOf('<tr>')).toBeLessThan(out.indexOf('</tbody>'));
  });

  it('正确处理嵌套 <tbody>（片段替换 content 内部内容）', () => {
    const tpl = '<div><tbody id="content"><tbody class="inner"></tbody></tbody></div>';
    const out = insertIntoContent(tpl, '<p>x</p>');
    // 片段替换 content tbody 内部（含其中的嵌套 tbody，故 inner 不再存在）
    expect(out).toContain('<tbody id="content">');
    expect(out).toContain('<p>x</p>');
    expect(out).toContain('</tbody></div>');
    expect(out).not.toContain('class="inner"');
    expect(out.indexOf('<p>x</p>')).toBeLessThan(out.lastIndexOf('</tbody>'));
  });

  it('缺少 <tbody id="content"> 时抛错', () => {
    expect(() => insertIntoContent('<div></div>', '<p>x</p>')).toThrow();
  });
});

describe('reindentHtml', () => {
  it('按目标缩进整体平移', () => {
    const html = '  <div>\n    <p>x</p>\n  </div>';
    expect(reindentHtml(html, 0)).toBe('<div>\n  <p>x</p>\n</div>');
  });

  it('向右增加缩进', () => {
    const html = '<p>x</p>';
    expect(reindentHtml(html, 4)).toBe('    <p>x</p>');
  });

  it('空片段返回空字符串', () => {
    expect(reindentHtml('', 0)).toBe('');
  });
});
