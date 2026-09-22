import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { inlineLocalStylesheets } from '../../src/css-links.js';

describe('inlineLocalStylesheets（本地 <link> 样式表内联）', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'juice-links-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const write = (name, content) => {
    const p = path.join(tmpDir, name);
    fs.writeFileSync(p, content);
    return p;
  };

  it('本地相对路径 <link> 被替换为 <style>', () => {
    write('a.css', '.x{color:red}');
    const html = `<html><head><link rel="stylesheet" href="./a.css"></head></html>`;
    const out = inlineLocalStylesheets(html, tmpDir);
    expect(out).toContain('<style>');
    expect(out).toContain('.x{color:red}');
    expect(out).not.toContain('<link');
  });

  it('属性顺序颠倒（href 在 rel 前）同样处理', () => {
    write('a.css', '.x{color:red}');
    const html = `<link href="a.css" rel="stylesheet">`;
    expect(inlineLocalStylesheets(html, tmpDir)).toContain('.x{color:red}');
  });

  it('远程 http(s) 链接保留原样', () => {
    const html = `<link rel="stylesheet" href="https://cdn.example.com/bootstrap.css">`;
    expect(inlineLocalStylesheets(html, tmpDir)).toBe(html);
  });

  it('协议相对链接保留原样', () => {
    const html = `<link rel="stylesheet" href="//cdn.example.com/x.css">`;
    expect(inlineLocalStylesheets(html, tmpDir)).toBe(html);
  });

  it('本地文件不存在时移除该标签', () => {
    const html = `<link rel="stylesheet" href="./missing.css">`;
    expect(inlineLocalStylesheets(html, tmpDir)).toBe('');
  });

  it('非 stylesheet 的 link（favicon）不处理', () => {
    const html = `<link rel="shortcut icon" href="favicon.ico">`;
    expect(inlineLocalStylesheets(html, tmpDir)).toBe(html);
  });

  it('多个 link 按序处理，混合场景', () => {
    write('a.css', '.a{}');
    const html = [
      '<link rel="stylesheet" href="./a.css">',
      '<link rel="stylesheet" href="https://cdn.example.com/b.css">',
      '<link rel="shortcut icon" href="favicon.ico">',
    ].join('\n');
    const out = inlineLocalStylesheets(html, tmpDir);
    expect(out).toContain('.a{}');
    expect(out).toContain('https://cdn.example.com/b.css');
    expect(out).toContain('favicon.ico');
    expect(out.match(/<style>/g)).toHaveLength(1);
  });

  it('href 带查询串/锚点时仍能解析', () => {
    write('a.css', '.a{}');
    const html = `<link rel="stylesheet" href="./a.css?v=1#t">`;
    expect(inlineLocalStylesheets(html, tmpDir)).toContain('.a{}');
  });
});
