import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { findConfigs, resolveTemplateIcon } from '../../src/snippet.js';
import { parseViewPath } from '../../src/view.js';

let tmpDir;
let edmDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'juice-edm-'));
  edmDir = path.resolve('edm');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('findConfigs (变体目录)', () => {
  let variantDir;

  beforeEach(() => {
    variantDir = path.join(tmpDir, 'variant');
    fs.mkdirSync(variantDir, { recursive: true });
    fs.writeFileSync(path.join(variantDir, '_meta.yaml'), 'name: v\n');
    fs.writeFileSync(path.join(variantDir, 'juice.yaml'), 'a: 1\n');
    fs.writeFileSync(path.join(variantDir, 'custom.yaml'), 'b: 2\n');
  });

  it('列出 yaml 配置并排除 _meta，标记 juice.yaml 为最优配对', () => {
    const cfgs = findConfigs(variantDir, 'variant');
    const names = cfgs.map((c) => c.name);
    expect(names).toContain('juice.yaml');
    expect(names).toContain('custom.yaml');
    expect(names).not.toContain('_meta.yaml');
    expect(cfgs.find((c) => c.name === 'juice.yaml').isOptimal).toBe(true);
    expect(cfgs.find((c) => c.name === 'custom.yaml').isOptimal).toBe(false);
  });
});

describe('resolveTemplateIcon', () => {
  let brandDir;

  beforeEach(() => {
    brandDir = path.join(tmpDir, 'brand');
    fs.mkdirSync(path.join(brandDir, 'templates', 'v1'), { recursive: true });
    fs.mkdirSync(path.join(brandDir, 'templates', 'v2'), { recursive: true });
    // findTemplateVersions 仅收录含 .html 的版本目录，故需放占位 html
    fs.writeFileSync(path.join(brandDir, 'templates', 'v1', 't.html'), '');
    fs.writeFileSync(path.join(brandDir, 'templates', 'v2', 't.html'), '');
    fs.writeFileSync(path.join(brandDir, 'templates', 'v1', 'favicon.ico'), 'v1');
    fs.writeFileSync(path.join(brandDir, 'templates', 'v2', 'favicon.ico'), 'v2');
  });

  it('优先返回指定版本目录的 ico', () => {
    const got = resolveTemplateIcon(brandDir, path.join(brandDir, 'templates', 'v2'));
    expect(got).toBe(path.join(brandDir, 'templates', 'v2', 'favicon.ico'));
  });

  it('未指定版本时回退到品牌首个模板版本 ico', () => {
    const got = resolveTemplateIcon(brandDir);
    expect(got).toBe(path.join(brandDir, 'templates', 'v1', 'favicon.ico'));
  });

  it('品牌下无模板版本时返回 null', () => {
    const emptyBrand = path.join(tmpDir, 'empty');
    fs.mkdirSync(emptyBrand, { recursive: true });
    expect(resolveTemplateIcon(emptyBrand)).toBeNull();
  });
});

describe('parseViewPath', () => {
  it('解析品牌路径', () => {
    const parsed = parseViewPath('elabscience', edmDir);
    expect(parsed.type).toBe('brand');
    expect(parsed.brand).toBe('elabscience');
  });

  it('不存在的品牌抛错', () => {
    expect(() => parseViewPath('no-such-brand', edmDir)).toThrow();
  });

  it('解析模板版本路径', () => {
    const parsed = parseViewPath('elabscience/templates/standard', edmDir);
    expect(parsed.type).toBe('template');
    expect(parsed.version).toBe('standard');
  });

  it('解析系列/变体路径', () => {
    const parsed = parseViewPath('elabscience/literature/default', edmDir);
    expect(parsed.type).toBe('variant');
    expect(parsed.series).toBe('literature');
    expect(parsed.variant).toBe('default');
  });
});
