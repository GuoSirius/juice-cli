import { describe, it, expect } from 'vitest';
import { renderTemplate } from '../../src/render.js';

describe('renderTemplate（Handlebars 渲染）', () => {
  it('rawHtml: true 时变量中的 HTML 标签直接渲染（noEscape 映射）', () => {
    const out = renderTemplate('<p>{{val}}</p>', { val: '<sup>x</sup>' }, { rawHtml: true });
    expect(out).toContain('<p><sup>x</sup></p>');
    expect(out).not.toContain('&lt;sup&gt;');
  });

  it('rawHtml: false 时变量值被转义（与原 Mustache 默认行为一致）', () => {
    const out = renderTemplate('<p>{{val}}</p>', { val: '<sup>x</sup>' }, { rawHtml: false });
    expect(out).toContain('&lt;sup&gt;');
  });

  it('嵌套属性与属性内插值', () => {
    const out = renderTemplate('<a href="{{a.b}}">{{a.b}}</a>', { a: { b: 'u' } });
    expect(out).toBe('<a href="u">u</a>');
  });

  it('未定义变量渲染为空（Mustache 兼容）', () => {
    expect(renderTemplate('[{{nope}}]', {})).toBe('[]');
  });

  it('裸数组迭代 {{#list}}（Mustache 兼容）', () => {
    const out = renderTemplate('{{#items}}[{{name}}]{{/items}}', { items: [{ name: 'a' }, { name: 'b' }] });
    expect(out).toBe('[a][b]');
  });

  it('{{.}} 当前元素（Mustache 兼容，现有模板在用）', () => {
    expect(renderTemplate('{{#items}}{{.}};{{/items}}', { items: ['x', 'y'] })).toBe('x;y;');
    expect(renderTemplate('{{#banner.image}}<img src="{{.}}" />{{/banner.image}}', { banner: { image: 'a.png' } })).toContain('src="a.png"');
  });

  it('反向块 {{^var}}（Mustache 兼容）', () => {
    expect(renderTemplate('{{^missing}}none{{/missing}}', {})).toBe('none');
    expect(renderTemplate('{{^present}}none{{/present}}', { present: 1 })).toBe('');
  });

  it('条件字符串块 {{#var}}（现有模板在用）', () => {
    expect(renderTemplate('{{#link}}has{{/link}}{{^link}}no{{/link}}', { link: 'http://x' })).toBe('has');
    expect(renderTemplate('{{#link}}has{{/link}}{{^link}}no{{/link}}', { link: '' })).toBe('no');
  });

  it('{{#each}} 提供 @index/@first/@last（需求④：循环索引）', () => {
    const tpl = '{{#each items}}{{@index}}:{{#if @first}}F{{/if}}{{#if @last}}L{{/if}};{{/each}}';
    expect(renderTemplate(tpl, { items: ['a', 'b', 'c'] })).toBe('0:F;1:;2:L;');
  });

  it('内置逻辑 helper：eq/gt/and/or（需求④：必要逻辑判断）', () => {
    expect(renderTemplate('{{#if (eq s "active")}}Y{{else}}N{{/if}}', { s: 'active' })).toBe('Y');
    expect(renderTemplate('{{#if (gt count 3)}}Y{{else}}N{{/if}}', { count: 5 })).toBe('Y');
    expect(renderTemplate('{{#if (gt count 3)}}Y{{else}}N{{/if}}', { count: 2 })).toBe('N');
    expect(renderTemplate('{{#if (and a b)}}Y{{else}}N{{/if}}', { a: 1, b: 2 })).toBe('Y');
    expect(renderTemplate('{{#if (or a b)}}Y{{else}}N{{/if}}', { a: 0, b: 2 })).toBe('Y');
    expect(renderTemplate('{{#if (not a)}}Y{{else}}N{{/if}}', { a: 0 })).toBe('Y');
  });

  it('{{else}} 分支', () => {
    expect(renderTemplate('{{#if a}}Y{{else}}N{{/if}}', { a: 0 })).toBe('N');
  });

  it('运行时 partials：{{> name}} 引入（需求③基础设施）', () => {
    const out = renderTemplate('<div>{{> card}}</div>', {}, { partials: { card: '<b>hi</b>' } });
    expect(out).toBe('<div><b>hi</b></div>');
  });

  it('triple stash {{{var}}} 恒不转义', () => {
    const out = renderTemplate('{{{val}}}|{{val}}', { val: '<i>x</i>' });
    expect(out).toBe('<i>x</i>|&lt;i&gt;x&lt;/i&gt;');
  });
});
