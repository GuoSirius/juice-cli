import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { runPreviewMode } from '../../src/preview.js';

describe('preview 模式（UnoCSS <style> 注入，不内联不压缩）', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'juice-preview-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('生成 -preview.html：含 UnoCSS <style> 块，无 var(--un，不做 juice 内联', async () => {
    const tpl = path.join(tmpDir, 't.html');
    fs.writeFileSync(
      tpl,
      '<html><head></head><body><div class="p-4 bg-blue-500">hi</div></body></html>',
    );

    await runPreviewMode({ file: tpl });

    const out = fs.readFileSync(path.join(tmpDir, 't-preview.html'), 'utf8');
    // 原子 CSS 以 <style> 块注入（浏览器直开可见），颜色已 email-safe 归一
    expect(out).toContain('data-unocss="atomic"');
    expect(out).toContain('.p-4');
    expect(out).toContain('rgba(59,130,246,1)');
    expect(out).not.toContain('var(--un');
    // 不内联：源码 class 保留，div 上没有 juice 写入的 style 属性
    expect(out).toContain('class="p-4 bg-blue-500"');
    expect(out).not.toMatch(/<div[^>]*style=/);
  });

  it('输入文件不存在时报错', async () => {
    const missing = path.join(tmpDir, 'nope.html');
    await expect(runPreviewMode({ file: missing })).rejects.toThrow('输入文件不存在');
  });
});
