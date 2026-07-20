import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { deepMerge, buildConfig } from '../../src/index.js';
import { buildSnippetConfig } from '../../src/snippet.js';

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'juice-merge-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('deepMerge', () => {
  it('深度合并嵌套对象', () => {
    const base = { a: 1, nested: { x: 1, y: 2 } };
    const over = { nested: { y: 20, z: 30 } };
    expect(deepMerge(base, over)).toEqual({ a: 1, nested: { x: 1, y: 20, z: 30 } });
  });

  it('后层覆盖前层，且数组被替换而非合并', () => {
    const base = { list: [1, 2], a: 1 };
    const over = { list: [3], a: 2 };
    expect(deepMerge(base, over)).toEqual({ list: [3], a: 2 });
  });

  it('忽略 null / undefined / 非对象覆盖项', () => {
    expect(deepMerge({ a: 1 }, null, undefined, 5)).toEqual({ a: 1 });
  });

  it('多层级覆盖按从左到右优先级叠加', () => {
    expect(deepMerge({ k: 'a' }, { k: 'b' }, { k: 'c' })).toEqual({ k: 'c' });
  });
});

describe('buildConfig 合并优先级', () => {
  let homePath, prioPath;

  beforeEach(() => {
    homePath = path.join(tmpDir, 'home.yaml');
    prioPath = path.join(tmpDir, 'prio.yaml');
    fs.writeFileSync(homePath, 'testMarker: home\n');
    fs.writeFileSync(prioPath, 'testMarker: prio\n');
  });

  it('CLI 优先配置覆盖用户目录配置', () => {
    const { config } = buildConfig(prioPath, homePath);
    expect(config.testMarker).toBe('prio');
  });

  it('无 CLI 配置时用户目录配置生效', () => {
    const { config } = buildConfig(null, homePath);
    expect(config.testMarker).toBe('home');
  });

  it('两者皆无时回退到内置默认值', () => {
    const { config, layers } = buildConfig(null, null);
    expect(layers[0].label).toBe('CLI 内置默认值');
    expect(config).toBeTypeOf('object');
  });
});

describe('buildSnippetConfig 合并优先级', () => {
  let priorityPath, cliPath;

  beforeEach(() => {
    priorityPath = path.join(tmpDir, 'project.yaml');
    cliPath = path.join(tmpDir, 'cli.yaml');
    fs.writeFileSync(priorityPath, 'snippetMarker: project\n');
    fs.writeFileSync(cliPath, 'snippetMarker: cli\n');
  });

  it('-c 命令行配置优先级最高', () => {
    const { config } = buildSnippetConfig({ priorityConfigPath: priorityPath, cliConfigPath: cliPath });
    expect(config.snippetMarker).toBe('cli');
  });

  it('无 -c 时项目配置生效', () => {
    const { config } = buildSnippetConfig({ priorityConfigPath: priorityPath, cliConfigPath: null });
    expect(config.snippetMarker).toBe('project');
  });
});
