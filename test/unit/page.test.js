import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { parsePageSpec } from '../../src/page.js';
import { insertIntoContent } from '../../src/snippet.js';
import { renderTemplate } from '../../src/render.js';

describe('parsePageSpec（page.yaml 解析）', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'juice-page-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const write = (name, content) => {
    const p = path.join(tmpDir, name);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
    return p;
  };

  it('解析 template/sections 并将相对路径解析为绝对路径', () => {
    write('tpl.html', '<tbody id="content"></tbody>');
    write('sec/snippet.html', '<tr><td>{{a}}</td></tr>');
    const spec = parsePageSpec({
      template: 'tpl.html',
      sections: [{ snippet: 'sec/snippet.html' }],
    }, tmpDir);
    expect(spec.template).toBe(path.resolve(tmpDir, 'tpl.html'));
    expect(spec.sections[0].snippet).toBe(path.resolve(tmpDir, 'sec/snippet.html'));
    expect(spec.sections[0].vars).toBeNull();
    expect(spec.outputName).toBeNull();
  });

  it('命名板块注册为 partial（{{> name}} 可用）', () => {
    write('tpl.html', '');
    write('header.html', '<b>{{title}}</b>');
    const spec = parsePageSpec({
      template: 'tpl.html',
      sections: [{ snippet: 'header.html', name: 'header' }],
    }, tmpDir);
    expect(spec.partials.header).toBe('<b>{{title}}</b>');
  });

  it('partials 映射注册', () => {
    write('tpl.html', '');
    write('footer.html', '<i>end</i>');
    const spec = parsePageSpec({
      template: 'tpl.html',
      sections: [{ snippet: 'tpl.html' }],
      partials: { footer: 'footer.html' },
    }, tmpDir);
    expect(spec.partials.footer).toBe('<i>end</i>');
  });

  it('partial 名称重复时报错', () => {
    write('tpl.html', '');
    write('a.html', 'a');
    write('b.html', 'b');
    expect(() => parsePageSpec({
      template: 'tpl.html',
      sections: [{ snippet: 'a.html', name: 'x' }],
      partials: { x: 'b.html' },
    }, tmpDir)).toThrow(/partial 名称重复/);
  });

  it('缺少 template / sections / snippet 时报错', () => {
    expect(() => parsePageSpec({ sections: [{ snippet: 'x' }] }, tmpDir)).toThrow(/template/);
    expect(() => parsePageSpec({ template: 'x.html' }, tmpDir)).toThrow(/sections/);
    write('tpl.html', '');
    expect(() => parsePageSpec({ template: 'tpl.html', sections: [{}] }, tmpDir)).toThrow(/snippet/);
    expect(() => parsePageSpec({ template: 'tpl.html', sections: [{ snippet: 'x', vars: 'bad' }] }, tmpDir)).toThrow(/vars/);
  });
});

describe('assemblePage 流水线核心逻辑（insert + 渲染合并）', () => {
  const TPL = '<table><tbody id="content">\n  </tbody></table><p>{{brand}}</p>';

  it('多板块拼接后一次插入，按序且都在 content 内', () => {
    const joined = ['<tr><td>A</td></tr>', '<tr><td>B</td></tr>'].join('\n');
    const html = insertIntoContent(TPL, joined);
    expect(html).toContain('<td>A</td>');
    expect(html).toContain('<td>B</td>');
    expect(html.indexOf('A')).toBeLessThan(html.indexOf('B'));
    expect(html).toContain('<p>{{brand}}</p>');
  });

  it('板块独立渲染（全局 + 板块 vars 合并），互不污染', () => {
    const globalVars = { brand: 'ACME', price: '全局价' };
    const partials = { tag: '<span>{{label}}</span>' };
    const renderOpts = { rawHtml: true, partials };

    let rendered = renderTemplate(TPL, globalVars, renderOpts);
    const secVars = { ...globalVars, price: '板块价' };
    rendered = insertIntoContent(rendered, renderTemplate('<td>{{price}}{{> tag}}</td>', { ...secVars, label: '热销' }, renderOpts));

    expect(rendered).toContain('<p>ACME</p>');
    expect(rendered).toContain('<td>板块价<span>热销</span></td>');
  });

  it('partial 在板块内使用引用处上下文渲染', () => {
    const partials = { tag: '<b>{{label}}</b>' };
    const out = renderTemplate('{{#each items}}<li>{{> tag}}</li>{{/each}}', {
      items: [{ label: 'x' }, { label: 'y' }],
    }, { partials });
    expect(out).toContain('<li><b>x</b></li>');
    expect(out).toContain('<li><b>y</b></li>');
  });
});
