import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findVersionForSeries, findTemplateVersions } from '../../src/snippet.js';
import { mergeConfigLayers } from '../../src/index.js';
import { savings } from '../../src/index.js';
import { fmtBytes, formatName } from '../../src/format.js';
import * as C from '../../src/constants.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('findVersionForSeries (L: 按系列匹配模板版本)', () => {
  const versions = [
    { name: 'v1', path: '/b/templates/v1', meta: {} },
    { name: 'v2', path: '/b/templates/v2', meta: { series: { allow: ['newsletter'] } } },
    { name: 'v3', path: '/b/templates/v3', meta: { series: { block: ['promo'] } } },
  ];

  it('无系列名时回退到第一个版本', () => {
    expect(findVersionForSeries(versions, null)).toBe(versions[0]);
    expect(findVersionForSeries(versions, undefined)).toBe(versions[0]);
  });

  it('空列表返回 null', () => {
    expect(findVersionForSeries([], 'x')).toBeNull();
  });

  it('series.allow 命中则返回对应版本', () => {
    expect(findVersionForSeries(versions, 'newsletter')).toBe(versions[1]);
  });

  it('series.block 未包含时返回对应版本', () => {
    expect(findVersionForSeries(versions, 'literature')).toBe(versions[2]);
  });

  it('series.block 命中时跳过该版本，回退第一个', () => {
    expect(findVersionForSeries(versions, 'promo')).toBe(versions[0]);
  });

  it('未命中任何 allow、且不被 block 阻止时，命中该 block 版本', () => {
    // v0 无 series 元数据（不参与命中），v1 allow 不含 newsletter-other，
    // v2 block:['promo'] 不阻止 newsletter-other → 命中 v2。
    expect(findVersionForSeries(versions, 'newsletter-other')).toBe(versions[2]);
  });
});

describe('mergeConfigLayers (F: 收敛合并逻辑)', () => {
  it('多层合并低→高优先级', () => {
    const r = mergeConfigLayers([
      { label: 'a', data: { x: 1, y: { z: 1 } } },
      { label: 'b', data: { x: 2, y: { w: 3 } } },
    ]);
    expect(r.config).toEqual({ x: 2, y: { z: 1, w: 3 } });
    expect(r.layers).toHaveLength(2);
  });
});

describe('savings (N: 除零保护)', () => {
  it('原内容为空时返回 0% 而非 NaN%', () => {
    expect(savings('', '')).toBe('0%');
  });

  it('正常情况返回百分比', () => {
    const r = savings('a'.repeat(100), 'a'.repeat(50));
    expect(r).toMatch(/^\d+\.\d+%$/);
  });
});

describe('format.js (M: 统一格式化)', () => {
  it('fmtBytes 按阈值格式化', () => {
    expect(fmtBytes(500)).toBe('500 B');
    expect(fmtBytes(2048)).toBe('2.0 KB');
  });

  it('formatName 含 _meta.name 时显示「名称 (目录名)」', () => {
    const s = formatName({ name: '显示名' }, 'dirname');
    expect(s).toContain('显示名');
    expect(s).toContain('dirname');
  });

  it('formatName 无 _meta.name 时仅显示目录名', () => {
    const s = formatName({ name: '' }, 'dirname');
    expect(s).toContain('dirname');
  });
});

describe('constants.js (J: 集中魔法字符串)', () => {
  it('关键常量值正确', () => {
    expect(C.ICON_FILE).toBe('favicon.ico');
    expect(C.SNIPPET_FILE).toBe('snippet.html');
    expect(C.META_FILE).toBe('_meta.yaml');
    expect(C.META_FILE_ALT).toBe('_meta.yml');
    expect(C.DEFAULT_CONFIG_NAMES).toEqual(['juice.yaml', 'juice.yml']);
    expect(C.SNIPPET_OUTPUT_SUFFIXES).toEqual(['.raw.html', '.html', '.output.html', '.minified.html']);
    expect(C.DEFAULT_NORMAL_SUFFIX).toBe('.output.html');
    expect(C.DEFAULT_MINIFIED_SUFFIX).toBe('.minified.html');
  });
});

describe('findTemplateVersions (P3-3: 多 html 取 template.html)', () => {
  let tmp;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'juice-ver-'));
    const v = path.join(tmp, 'templates', 'v1');
    fs.mkdirSync(v, { recursive: true });
    fs.writeFileSync(path.join(v, 'a.html'), '<html></html>');
    fs.writeFileSync(path.join(v, 'template.html'), '<html>tmpl</html>');
    fs.writeFileSync(path.join(v, '_meta.yaml'), 'name: v1\n');
  });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('含多个 .html 时优先选用 template.html', () => {
    const versions = findTemplateVersions(tmp);
    expect(versions).toHaveLength(1);
    expect(path.basename(versions[0].templatePath)).toBe('template.html');
  });

  it('仅一个 .html 时正常返回该文件', () => {
    const v2 = path.join(tmp, 'templates', 'v2');
    fs.mkdirSync(v2, { recursive: true });
    fs.writeFileSync(path.join(v2, 'only.html'), '<html></html>');
    fs.writeFileSync(path.join(v2, '_meta.yaml'), 'name: v2\n');
    const versions = findTemplateVersions(tmp);
    expect(versions).toHaveLength(2);
    const v2ver = versions.find((x) => x.name === 'v2');
    expect(path.basename(v2ver.templatePath)).toBe('only.html');
  });
});
