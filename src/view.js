import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import {
  resolveEdmDir, loadMeta, findBrands, findTemplateVersions,
  findSeriesDirs, findSnippetVariants, findConfigs,
} from './snippet.js';

function fmtBytes(b) {
  return b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`;
}

/**
 * Copy src to dest, auto-versioning (-v1, -v2, ...) if dest exists.
 * Returns the actual destination path used.
 */
function copyFileSafe(srcPath, destPath) {
  if (!fs.existsSync(destPath)) {
    fs.copyFileSync(srcPath, destPath);
    return destPath;
  }
  const parsed = path.parse(destPath);
  let v = 1;
  while (true) {
    const alt = path.join(parsed.dir, parsed.name + '-v' + v + parsed.ext);
    if (!fs.existsSync(alt)) {
      fs.copyFileSync(srcPath, alt);
      return alt;
    }
    v++;
  }
}

// ─── Path Parser ──────────────────────────────────────────────────────────────

/**
 * Parse a view path like "elabscience/literature/default" or
 * "elabscience/templates/standard" into structured parts.
 */
function parseViewPath(rawPath, edmDir) {
  const segments = rawPath.replace(/\\/g, '/').split('/').filter(Boolean);
  if (segments.length === 0) {
    throw new Error('路径不能为空。');
  }

  const brandName = segments[0];
  const brandDir = path.join(edmDir, brandName);
  if (!fs.existsSync(brandDir) || !fs.statSync(brandDir).isDirectory()) {
    const brands = fs.readdirSync(edmDir, { withFileTypes: true })
      .filter(e => e.isDirectory()).map(e => e.name);
    throw new Error(
      `品牌「${brandName}」不存在。可用品牌：${brands.join(', ') || '(无)'}`
    );
  }

  if (segments.length === 1) {
    return { type: 'brand', brand: brandName };
  }

  if (segments[1] === 'templates') {
    if (segments.length < 3) {
      const versions = findTemplateVersions(brandDir);
      throw new Error(
        `请指定模板版本。可用：${versions.map(v => v.name).join(', ')}`
      );
    }
    const versionDir = path.join(brandDir, 'templates', segments[2]);
    if (!fs.existsSync(versionDir)) {
      const versions = findTemplateVersions(brandDir);
      throw new Error(
        `模板版本「${segments[2]}」不存在。可用：${versions.map(v => v.name).join(', ')}`
      );
    }
    const versions = findTemplateVersions(brandDir);
    const version = versions.find(v => v.name === segments[2]);
    if (!version) throw new Error(`模板版本「${segments[2]}」下无模板文件。`);
    return { type: 'template', brand: brandName, version: segments[2], versionData: version };
  }

  // series path: brand/series[/variant]
  const seriesName = segments[1];
  const allSeries = findSeriesDirs(brandDir);
  const series = allSeries.find(s => s.name === seriesName);
  if (!series) {
    throw new Error(
      `系列「${seriesName}」不存在。可用：${allSeries.map(s => s.name).join(', ') || '(无)'}`
    );
  }

  if (segments.length === 2) {
    return { type: 'series', brand: brandName, series: seriesName, seriesData: series };
  }

  // variant
  const variants = findSnippetVariants(series.path);
  const variant = variants.find(v => v.name === segments[2]);
  if (!variant) {
    throw new Error(
      `变体「${segments[2]}」不存在。可用：${variants.map(v => v.name).join(', ') || '(无)'}`
    );
  }
  return {
    type: 'variant',
    brand: brandName,
    series: seriesName,
    variant: segments[2],
    seriesData: series,
    variantData: variant,
  };
}

// ─── Non-Interactive Tree Display ─────────────────────────────────────────────

function ind(n) { return '  '.repeat(n); }

function formatName(meta, dirName) {
  const display = meta.name || dirName;
  return display !== dirName
    ? chalk.bold.cyan(display) + ' ' + chalk.gray(`(${dirName})`)
    : chalk.bold.cyan(dirName);
}

function formatDesc(meta) {
  return meta.description ? ' ' + chalk.dim('— ' + meta.description) : '';
}

function printBrandTree(edmDir, brand, depth) {
  const d = depth || 0;
  const meta = brand.meta;
  const line = ind(d) + '📦 ' + formatName(meta, brand.name) + formatDesc(meta);
  console.log(line);

  // Templates
  let versions;
  try {
    versions = findTemplateVersions(brand.path);
  } catch (_) { versions = []; }
  if (versions.length > 0) {
    console.log(ind(d + 1) + '📋 模板');
    for (const v of versions) {
      console.log(ind(d + 2) + '└─ ' + formatName(v.meta, v.name) + formatDesc(v.meta));
    }
  }

  // Series
  const allSeries = findSeriesDirs(brand.path);
  if (allSeries.length > 0) {
    console.log(ind(d + 1) + '📑 系列');
    for (const s of allSeries) {
      const variants = findSnippetVariants(s.path);
      console.log(ind(d + 2) + '└─ ' + formatName(s.meta, s.name) + formatDesc(s.meta));
      for (const v of variants) {
        const files = [];
        if (fs.existsSync(path.join(v.path, 'snippet.html'))) {
          const stat = fs.statSync(path.join(v.path, 'snippet.html'));
          files.push('📄 snippet.html (' + fmtBytes(stat.size) + ')');
        }
        const configs = findConfigs(v.path);
        if (configs.length > 0) {
          const optimal = configs.find(c => c.isOptimal) || configs[0];
          files.push('⚙️ ' + optimal.name + (optimal.isOptimal ? ' (最优配对)' : ''));
        }
        console.log(ind(d + 3) + '└─ ' + formatName(v.meta, v.name) + formatDesc(v.meta));
        for (const f of files) {
          console.log(ind(d + 4) + '├─ ' + f);
        }
      }
    }
  } else {
    console.log(ind(d + 1) + chalk.gray('📑 系列 (无)'));
  }
}

function printFullTree(edmDir) {
  const brands = findBrands(edmDir);
  console.log(chalk.bold('\n📧 EDM 资源总览\n'));
  for (const b of brands) {
    printBrandTree(edmDir, b, 0);
    console.log();
  }
}

function printSubTree(edmDir, parsed) {
  const brandDir = path.join(edmDir, parsed.brand);
  const brandMeta = loadMeta(brandDir);

  switch (parsed.type) {
    case 'brand': {
      console.log(chalk.bold(`\n📧 ${brandMeta.name || parsed.brand}${formatDesc(brandMeta)}\n`));
      const brand = { name: parsed.brand, path: brandDir, meta: brandMeta };
      printBrandTree(edmDir, brand, 0);
      break;
    }
    case 'series': {
      console.log(chalk.bold(`\n📧 ${brandMeta.name || parsed.brand} / ${parsed.seriesData.meta.name || parsed.series}\n`));
      const variants = findSnippetVariants(parsed.seriesData.path);
      console.log(ind(0) + '📑 ' + formatName(parsed.seriesData.meta, parsed.series) + formatDesc(parsed.seriesData.meta));
      for (const v of variants) {
        const files = [];
        if (fs.existsSync(path.join(v.path, 'snippet.html'))) {
          const stat = fs.statSync(path.join(v.path, 'snippet.html'));
          files.push('📄 snippet.html (' + fmtBytes(stat.size) + ')');
        }
        const configs = findConfigs(v.path);
        if (configs.length > 0) {
          const optimal = configs.find(c => c.isOptimal) || configs[0];
          files.push('⚙️ ' + optimal.name + (optimal.isOptimal ? ' (最优配对)' : ''));
        }
        console.log(ind(1) + '└─ ' + formatName(v.meta, v.name) + formatDesc(v.meta));
        for (const f of files) {
          console.log(ind(2) + '├─ ' + f);
        }
      }
      break;
    }
    case 'variant': {
      console.log(chalk.bold(`\n📧 ${brandMeta.name || parsed.brand} / ${parsed.seriesData.meta.name || parsed.series} / ${parsed.variantData.meta.name || parsed.variant}\n`));
      const v = parsed.variantData;
      console.log(ind(0) + '📌 ' + formatName(v.meta, parsed.variant) + formatDesc(v.meta));
      if (fs.existsSync(path.join(v.path, 'snippet.html'))) {
        const stat = fs.statSync(path.join(v.path, 'snippet.html'));
        console.log(ind(1) + '├─ 📄 snippet.html (' + fmtBytes(stat.size) + ')');
      }
      const configs = findConfigs(v.path);
      for (const c of configs) {
        const marker = c.isOptimal ? chalk.green(' (最优配对)') : '';
        console.log(ind(1) + '├─ ⚙️ ' + c.name + marker);
      }
      break;
    }
    case 'template': {
      console.log(chalk.bold(`\n📧 ${brandMeta.name || parsed.brand} / 模板\n`));
      const v = parsed.versionData;
      console.log(ind(0) + '📋 ' + formatName(v.meta, parsed.version) + formatDesc(v.meta));
      const stat = fs.statSync(v.templatePath);
      console.log(ind(1) + '└─ 📄 ' + path.basename(v.templatePath) + ' (' + fmtBytes(stat.size) + ')');
      break;
    }
  }
  console.log();
}

function printFlatTemplates(edmDir) {
  console.log(chalk.bold('\n📧 所有模板\n'));
  const brands = findBrands(edmDir);
  for (const b of brands) {
    console.log('📦 ' + formatName(b.meta, b.name));
    let versions;
    try {
      versions = findTemplateVersions(b.path);
    } catch (_) { versions = []; }
    if (versions.length === 0) {
      console.log(ind(1) + chalk.gray('(无)'));
    }
    for (const v of versions) {
      const stat = fs.statSync(v.templatePath);
      console.log(ind(1) + '└─ 📋 ' + formatName(v.meta, v.name) + formatDesc(v.meta));
      console.log(ind(2) + chalk.gray(path.basename(v.templatePath) + ' (' + fmtBytes(stat.size) + ')'));
    }
  }
  console.log();
}

function printFlatSeries(edmDir) {
  console.log(chalk.bold('\n📧 所有系列\n'));
  const brands = findBrands(edmDir);
  for (const b of brands) {
    console.log('📦 ' + formatName(b.meta, b.name));
    const allSeries = findSeriesDirs(b.path);
    if (allSeries.length === 0) {
      console.log(ind(1) + chalk.gray('(无)'));
    }
    for (const s of allSeries) {
      console.log(ind(1) + '└─ 📑 ' + formatName(s.meta, s.name) + formatDesc(s.meta));
    }
  }
  console.log();
}

function printFlatSnippets(edmDir) {
  console.log(chalk.bold('\n📧 所有片段\n'));
  const brands = findBrands(edmDir);
  for (const b of brands) {
    console.log('📦 ' + formatName(b.meta, b.name));
    const allSeries = findSeriesDirs(b.path);
    let count = 0;
    for (const s of allSeries) {
      const variants = findSnippetVariants(s.path);
      for (const v of variants) {
        count++;
        const relPath = b.name + '/' + s.name + '/' + v.name;
        const filePath = path.join(v.path, 'snippet.html');
        let size = '';
        if (fs.existsSync(filePath)) {
          size = ' ' + chalk.gray('(' + fmtBytes(fs.statSync(filePath).size) + ')');
        }
        console.log(ind(1) + '└─ 🧩 ' + formatName(v.meta, v.name) + (' ' + chalk.dim('(' + relPath + ')') + size + formatDesc(v.meta)));
      }
    }
    if (count === 0) {
      console.log(ind(1) + chalk.gray('(无)'));
    }
  }
  console.log();
}

// ─── Interactive Browser ─────────────────────────────────────────────────────

/**
 * Build initial state from a parsed path for interactive browsing.
 */
function parsedToStartNode(edmDir, parsed) {
  const brandDir = path.join(edmDir, parsed.brand);
  const brandMeta = loadMeta(brandDir);

  switch (parsed.type) {
    case 'brand':
      return { level: 'brand', brand: parsed.brand, brandMeta };
    case 'template':
      return { level: 'template-detail', brand: parsed.brand, brandMeta, version: parsed.version, versionData: parsed.versionData };
    case 'series':
      return { level: 'series', brand: parsed.brand, brandMeta, series: parsed.series, seriesData: parsed.seriesData };
    case 'variant':
      return { level: 'variant', brand: parsed.brand, brandMeta, series: parsed.series, seriesData: parsed.seriesData, variant: parsed.variant, variantData: parsed.variantData };
  }
}

async function showMenu(title, choices) {
  const { select } = await import('@inquirer/prompts');
  return select({
    message: title,
    choices,
    loop: false,
  });
}

async function showCheckbox(title, choices) {
  const { checkbox } = await import('@inquirer/prompts');
  return checkbox({
    message: title,
    choices,
  });
}

/**
 * Trigger copy via the init module.
 */
async function copyResource(type, resourcePath, cwd) {
  try {
    const { runInitMode } = await import('./init.js');
    if (type === 'template') {
      await runInitMode({ template: resourcePath });
    } else if (type === 'snippet') {
      await runInitMode({ snippet: resourcePath });
    } else if (type === 'config') {
      await runInitMode({ config: resourcePath });
    }
  } catch (err) {
    console.error(chalk.red(`  ✘ 拷贝失败：${err.message}`));
  }
}

function brandToChoice(b) {
  return {
    name: formatName(b.meta, b.name) + formatDesc(b.meta),
    value: { action: 'navigate', node: { level: 'brand', brand: b.name, brandMeta: b.meta } },
    description: b.meta.description || undefined,
  };
}

async function interactiveBrowse(edmDir, startParsed) {
  let stack = [];
  let current;

  if (startParsed) {
    // Build stack to the starting node
    if (startParsed.type === 'brand') {
      current = parsedToStartNode(edmDir, startParsed);
    } else if (startParsed.type === 'template') {
      // Stack: brand → template-detail
      const brandNode = { level: 'brand', brand: startParsed.brand, brandMeta: loadMeta(path.join(edmDir, startParsed.brand)) };
      stack = [brandNode];
      current = parsedToStartNode(edmDir, startParsed);
    } else if (startParsed.type === 'series') {
      const brandNode = { level: 'brand', brand: startParsed.brand, brandMeta: loadMeta(path.join(edmDir, startParsed.brand)) };
      stack = [brandNode];
      current = parsedToStartNode(edmDir, startParsed);
    } else if (startParsed.type === 'variant') {
      const brandNode = { level: 'brand', brand: startParsed.brand, brandMeta: loadMeta(path.join(edmDir, startParsed.brand)) };
      const seriesNode = { level: 'series', brand: startParsed.brand, brandMeta: brandNode.brandMeta, series: startParsed.series, seriesData: startParsed.seriesData };
      stack = [brandNode, seriesNode];
      current = parsedToStartNode(edmDir, startParsed);
    }
  } else {
    current = { level: 'brands' };
  }

  while (true) {
    // Build choices for current level
    let choices = [];
    let title = '';

    const hasParent = stack.length > 0;
    const navChoices = [];
    if (hasParent) {
      navChoices.push({ name: '.. 返回上级', value: 'back' });
    }
    navChoices.push({ name: '✕ 退出', value: 'exit' });

    switch (current.level) {
      case 'brands': {
        title = '选择品牌';
        const brands = findBrands(edmDir);
        for (const b of brands) {
          choices.push(brandToChoice(b));
        }
        break;
      }

      case 'brand': {
        const brandDir = path.join(edmDir, current.brand);
        title = current.brandMeta.name
          ? `${current.brandMeta.name} (${current.brand})`
          : current.brand;

        // Templates
        let versions;
        try { versions = findTemplateVersions(brandDir); } catch (_) { versions = []; }
        if (versions.length > 0) {
          choices.push({
            name: '📋 查看模板',
            value: { action: 'navigate', node: { level: 'templates', brand: current.brand, brandMeta: current.brandMeta } },
            description: versions.length + ' 个版本',
          });
        }

        // Series
        const allSeries = findSeriesDirs(brandDir);
        if (allSeries.length > 0) {
          choices.push({
            name: '📑 查看系列',
            value: { action: 'navigate', node: { level: 'series-list', brand: current.brand, brandMeta: current.brandMeta } },
            description: allSeries.length + ' 个系列',
          });
        }
        break;
      }

      case 'templates': {
        const brandDir = path.join(edmDir, current.brand);
        title = `${current.brandMeta.name || current.brand} / 模板`;
        const versions = findTemplateVersions(brandDir);
        for (const v of versions) {
          choices.push({
            name: formatName(v.meta, v.name) + formatDesc(v.meta),
            value: { action: 'navigate', node: { level: 'template-detail', brand: current.brand, brandMeta: current.brandMeta, version: v.name, versionData: v } },
            description: v.meta.description || undefined,
          });
        }
        break;
      }

      case 'template-detail': {
        const v = current.versionData;
        title = `${v.meta.name || current.version} 模板`;
        const stat = fs.statSync(v.templatePath);
        // Show info as description, not in choices
        console.log(chalk.dim(`\n  ${path.basename(v.templatePath)} (${fmtBytes(stat.size)})\n`));
        choices.push({
          name: '📥 拷贝模板到当前目录',
          value: { action: 'copy-template' },
        });
        break;
      }

      case 'series-list': {
        const brandDir = path.join(edmDir, current.brand);
        title = `${current.brandMeta.name || current.brand} / 系列`;
        const allSeries = findSeriesDirs(brandDir);
        for (const s of allSeries) {
          const variants = findSnippetVariants(s.path);
          choices.push({
            name: formatName(s.meta, s.name) + formatDesc(s.meta),
            value: { action: 'navigate', node: { level: 'series', brand: current.brand, brandMeta: current.brandMeta, series: s.name, seriesData: s } },
            description: (s.meta.description || '') + ` — ${variants.length} 个变体`,
          });
        }
        break;
      }

      case 'series': {
        const s = current.seriesData;
        title = `${current.brandMeta.name || current.brand} / ${s.meta.name || current.series}`;
        const variants = findSnippetVariants(s.path);
        for (const v of variants) {
          choices.push({
            name: formatName(v.meta, v.name) + formatDesc(v.meta),
            value: { action: 'navigate', node: { level: 'variant', brand: current.brand, brandMeta: current.brandMeta, series: current.series, seriesData: s, variant: v.name, variantData: v } },
            description: v.meta.description || undefined,
          });
        }
        break;
      }

      case 'variant': {
        const v = current.variantData;
        title = `${v.meta.name || current.variant} 变体`;
        // Show file info via console.log before the prompt
        const snipPath = path.join(v.path, 'snippet.html');
        let infoLines = [];
        if (fs.existsSync(snipPath)) {
          const stat = fs.statSync(snipPath);
          infoLines.push('📄 snippet.html (' + fmtBytes(stat.size) + ')');
        }
        const configs = findConfigs(v.path);
        for (const c of configs) {
          const marker = c.isOptimal ? ' (最优配对)' : '';
          infoLines.push('⚙️ ' + c.name + marker);
        }
        if (infoLines.length > 0) {
          console.log(chalk.dim('\n  ' + infoLines.join('\n  ') + '\n'));
        }
        // Multi-select copy
        const hasResources = fs.existsSync(snipPath) || configs.length > 0;
        let versions;
        const brandDir = path.join(edmDir, current.brand);
        try { versions = findTemplateVersions(brandDir); } catch (_) { versions = []; }
        if (hasResources || versions.length > 0) {
          choices.push({
            name: '📥 拷贝到当前目录',
            value: { action: 'copy-multi' },
          });
        }
        break;
      }
    }

    if (choices.length === 0) {
      console.log(chalk.yellow('  该层级无可用内容。'));
    }

    const allChoices = [...choices, ...(navChoices.length > 0 ? [new (await import('@inquirer/prompts')).Separator()] : []), ...navChoices];
    const result = await showMenu(title, allChoices);

    if (result === 'exit' || !result) break;
    if (result === 'back') {
      current = stack.pop();
      continue;
    }
    if (result.action === 'navigate') {
      stack.push(current);
      current = result.node;
      continue;
    }

    // Copy actions
    if (result.action === 'copy-template') {
      const v = current.versionData;
      if (v && v.templatePath) {
        console.log();
        await copyResource('template', v.templatePath, process.cwd());
        console.log();
      }
      continue;
    }

    if (result.action === 'copy-multi') {
      const brandDir = path.join(edmDir, current.brand);
      const copyItems = [];

      // Template
      let versions;
      try { versions = findTemplateVersions(brandDir); } catch (_) { versions = []; }
      if (versions.length > 0) {
        const tplPath = versions[0].templatePath;
        copyItems.push({
          name: `📋 模板 HTML（${versions[0].meta.name || versions[0].name}）`,
          value: 'template',
          description: path.basename(tplPath),
          checked: true,
        });
      }

      // Snippet
      const snipPath = path.join(current.variantData.path, 'snippet.html');
      if (fs.existsSync(snipPath)) {
        copyItems.push({
          name: '🧩 片段 HTML',
          value: 'snippet',
          description: path.basename(snipPath),
          checked: true,
        });
      }

      // Config
      const configs = findConfigs(current.variantData.path);
      if (configs.length > 0) {
        copyItems.push({
          name: '⚙️ 配置文件',
          value: 'config',
          description: configs.map(c => c.name).join(', '),
          checked: true,
        });
      }

      if (copyItems.length > 0) {
        const { checkbox } = await import('@inquirer/prompts');
        const selected = await checkbox({
          message: '选择要拷贝的内容：',
          choices: copyItems,
        });

        if (selected.length > 0) {
          // Include template version in default name for clarity
          const versionName = versions.length > 0 ? versions[0].name : 'template';
          const defaultBaseName = `${current.brand}-${versionName}-${current.series}-${current.variant}`;
          const { promptOutputName: pn } = await import('./snippet.js');
          const outputBaseName = await pn(defaultBaseName, process.cwd());
          const cwd = process.cwd();
          const cwdRel = (p) => './' + path.relative(cwd, p);

          console.log(chalk.green('\n✔ 已拷贝：'));
          if (selected.includes('template') && versions.length > 0) {
            const src = versions[0].templatePath;
            const dest = path.join(cwd, outputBaseName + path.extname(src));
            const actual = copyFileSafe(src, dest);
            console.log(`   ${chalk.cyan('·')} ${cwdRel(actual)}  ${chalk.gray('(模板, ' + fmtBytes(fs.statSync(actual).size) + ')')}`);
            // Auto-copy icon: variant dir → template version dir → first version in brand
            const iconSrcs = [
              path.join(current.variantData.path, 'favicon.ico'),
              path.join(versions[0].path, 'favicon.ico'),
            ];
            for (const isrc of iconSrcs) {
              if (fs.existsSync(isrc)) {
                const idest = path.join(cwd, 'favicon.ico');
                fs.copyFileSync(isrc, idest);
                console.log(`   ${chalk.cyan('·')} ${cwdRel(idest)}  ${chalk.gray('(图标, ' + fmtBytes(fs.statSync(idest).size) + ')')}`);
                break;
              }
            }
          }
          if (selected.includes('snippet') && fs.existsSync(snipPath)) {
            const dest = path.join(cwd, outputBaseName + '-snippet' + path.extname(snipPath));
            const actual = copyFileSafe(snipPath, dest);
            console.log(`   ${chalk.cyan('·')} ${cwdRel(actual)}  ${chalk.gray('(片段, ' + fmtBytes(fs.statSync(actual).size) + ')')}`);
          }
          if (selected.includes('config') && configs.length > 0) {
            const optimal = configs.find(c => c.isOptimal);
            const cfgPath = optimal ? optimal.path : configs[0].path;
            const dest = path.join(cwd, 'juice.yaml');
            const actual = copyFileSafe(cfgPath, dest);
            console.log(`   ${chalk.cyan('·')} ${cwdRel(actual)}  ${chalk.gray('(配置, ' + fmtBytes(fs.statSync(actual).size) + ')')}`);
          }
          console.log();
        }
      }
      continue;
    }
  }
}

// ─── Internal helpers that init.js needs ──────────────────────────────────────
// parseViewPath is used by init.js to resolve <brand>/templates/<version> etc.

// ─── Main Entry ──────────────────────────────────────────────────────────────

async function runViewMode({ viewPath, interactive, scope }) {
  let edmDir;
  try {
    edmDir = resolveEdmDir();
  } catch (err) {
    console.error(chalk.red(`\n  ✘ ${err.message}\n`));
    process.exit(1);
  }

  if (interactive) {
    let startParsed = null;
    if (scope === 'templates') {
      // Start from a flat list: let user pick any template across all brands
      const brands = findBrands(edmDir);
      const allTemplates = [];
      for (const b of brands) {
        let versions;
        try { versions = findTemplateVersions(b.path); } catch (_) { versions = []; }
        for (const v of versions) {
          allTemplates.push({ brand: b, version: v });
        }
      }
      if (allTemplates.length === 0) {
        console.log(chalk.yellow('没有可用的模板。\n'));
        return;
      }
      const tplChoices = allTemplates.map(t => ({
        name: t.brand.meta.name
          ? `${chalk.bold.cyan(t.brand.meta.name)} ${chalk.gray('(' + t.brand.name + ')')} / ${formatName(t.version.meta, t.version.name)}`
          : formatName(t.brand.meta, t.brand.name) + ' / ' + formatName(t.version.meta, t.version.name),
        value: t,
        description: (t.version.meta.description || t.brand.meta.description || undefined),
      }));
      const picked = await showMenu('选择模板', tplChoices);
      if (!picked) return;
      // Show detail and allow copy
      const stat = fs.statSync(picked.version.templatePath);
      console.log(chalk.dim(`\n  ${path.basename(picked.version.templatePath)} (${fmtBytes(stat.size)})\n`));
      const { select } = await import('@inquirer/prompts');
      const action = await select({
        message: `${picked.version.meta.name || picked.version.name} 模板`,
        choices: [
          { name: '📥 拷贝模板到当前目录', value: 'copy' },
          { name: '✕ 退出', value: 'exit' },
        ],
      });
      if (action === 'copy') {
        console.log();
        const { runInitMode } = await import('./init.js');
        await runInitMode({ template: picked.version.templatePath });
        console.log();
      }
      return;
    }

    if (scope === 'series') {
      const brands = findBrands(edmDir);
      const allSeries = [];
      for (const b of brands) {
        const sList = findSeriesDirs(b.path);
        for (const s of sList) {
          allSeries.push({ brand: b, series: s });
        }
      }
      if (allSeries.length === 0) {
        console.log(chalk.yellow('没有可用的系列。\n'));
        return;
      }
      const sChoices = allSeries.map(item => ({
        name: item.brand.meta.name
          ? `${chalk.bold.cyan(item.brand.meta.name)} ${chalk.gray('(' + item.brand.name + ')')} / ${formatName(item.series.meta, item.series.name)}`
          : formatName(item.brand.meta, item.brand.name) + ' / ' + formatName(item.series.meta, item.series.name),
        value: item,
        description: item.series.meta.description || undefined,
      }));
      const picked = await showMenu('选择系列', sChoices);
      if (!picked) return;
      // Show variants and copy actions inline
      const variants = findSnippetVariants(picked.series.path);
      if (variants.length === 0) {
        console.log(chalk.yellow('  该系列下无变体。\n'));
        return;
      }
      let variant;
      if (variants.length === 1) {
        variant = variants[0];
      } else {
        const vChoices = variants.map(v => ({
          name: formatName(v.meta, v.name) + formatDesc(v.meta),
          value: v,
          description: v.meta.description || undefined,
        }));
        variant = await showMenu(
          `${picked.series.meta.name || picked.series.name} / 选择变体`,
          vChoices
        );
      }
      if (!variant) return;

      // Show variant detail
      const snipPath = path.join(variant.path, 'snippet.html');
      if (fs.existsSync(snipPath)) {
        const stat = fs.statSync(snipPath);
        console.log(chalk.dim(`\n  📄 snippet.html (${fmtBytes(stat.size)})`));
      }
      const configs = findConfigs(variant.path);
      for (const c of configs) {
        console.log(chalk.dim(`  ⚙️ ${c.name}${c.isOptimal ? ' (最优配对)' : ''}`));
      }
      console.log();

      // Offer copy actions
      const actions = [];
      if (fs.existsSync(snipPath)) {
        actions.push({ name: '📥 拷贝片段到当前目录', value: 'snippet' });
      }
      if (configs.length > 0) {
        actions.push({ name: '📥 拷贝配置到当前目录', value: 'config' });
      }
      actions.push({ name: '✕ 退出', value: 'exit' });

      const action = await showMenu(
        `${variant.meta.name || variant.name} 变体`,
        actions
      );
      if (action === 'exit') return;
      const { runInitMode } = await import('./init.js');
      console.log();
      if (action === 'snippet') {
        await runInitMode({ snippet: snipPath });
      } else if (action === 'config') {
        let cfgPath;
        if (configs.length === 1) {
          cfgPath = configs[0].path;
        } else {
          const cfgChoices = configs.map(c => ({
            name: c.isOptimal ? c.name + chalk.green(' (最优配对)') : c.name,
            value: c.path,
          }));
          cfgPath = await showMenu('选择配置文件', cfgChoices);
        }
        if (cfgPath) await runInitMode({ config: cfgPath });
      }
      console.log();
      return;
    }

    if (scope === 'snippets') {
      const brands = findBrands(edmDir);
      const allSnippets = [];
      for (const b of brands) {
        const sList = findSeriesDirs(b.path);
        for (const s of sList) {
          const variants = findSnippetVariants(s.path);
          for (const v of variants) {
            const snipPath = path.join(v.path, 'snippet.html');
            if (fs.existsSync(snipPath)) {
              allSnippets.push({ brand: b, series: s, variant: v, snippetPath: snipPath });
            }
          }
        }
      }
      if (allSnippets.length === 0) {
        console.log(chalk.yellow('没有可用的片段。\n'));
        return;
      }
      const snipChoices = allSnippets.map(item => {
        const relPath = `${item.brand.name}/${item.series.name}/${item.variant.name}`;
        return {
          name: item.brand.meta.name
            ? `${chalk.bold.cyan(item.brand.meta.name)} / ${formatName(item.variant.meta, item.variant.name)}`
            : formatName(item.brand.meta, item.brand.name) + ' / ' + formatName(item.variant.meta, item.variant.name),
          value: item,
          description: chalk.dim(relPath) + (item.variant.meta.description ? ' — ' + item.variant.meta.description : ''),
        };
      });
      const picked = await showMenu('选择片段', snipChoices);
      if (!picked) return;
      // Offer copy and browse actions
      const snipActions = [
        { name: '📥 拷贝片段到当前目录', value: 'copy-snippet' },
      ];
      const configs = findConfigs(picked.variant.path);
      if (configs.length > 0) {
        snipActions.push({ name: '📥 拷贝配置到当前目录', value: 'copy-config' });
      }
      snipActions.push({ name: '📋 查看所属系列', value: 'browse' });
      snipActions.push({ name: '✕ 退出', value: 'exit' });

      const action = await showMenu(
        `${picked.variant.meta.name || picked.variant.name} 片段`,
        snipActions
      );
      if (action === 'exit' || !action) return;

      if (action === 'browse') {
        // Enter interactive browse from this variant
        startParsed = {
          type: 'variant',
          brand: picked.brand.name,
          series: picked.series.name,
          variant: picked.variant.name,
          seriesData: picked.series,
          variantData: picked.variant,
        };
      } else {
        const { runInitMode } = await import('./init.js');
        console.log();
        if (action === 'copy-snippet') {
          await runInitMode({ snippet: picked.snippetPath });
        } else if (action === 'copy-config') {
          let cfgPath;
          if (configs.length === 1) {
            cfgPath = configs[0].path;
          } else {
            const cfgChoices = configs.map(c => ({
              name: c.isOptimal ? c.name + chalk.green(' (最优配对)') : c.name,
              value: c.path,
            }));
            cfgPath = await showMenu('选择配置文件', cfgChoices);
          }
          if (cfgPath) await runInitMode({ config: cfgPath });
        }
        console.log();
        return;
      }
    }

    if (viewPath) {
      try {
        startParsed = parseViewPath(viewPath, edmDir);
      } catch (err) {
        console.error(chalk.red(`\n  ✘ ${err.message}\n`));
        process.exit(1);
      }
    }

    await interactiveBrowse(edmDir, startParsed || null);
    return;
  }

  // ── Non-interactive mode ────────────────────────────────────────────────────

  if (scope === 'templates') {
    printFlatTemplates(edmDir);
    return;
  }
  if (scope === 'series') {
    printFlatSeries(edmDir);
    return;
  }
  if (scope === 'snippets') {
    printFlatSnippets(edmDir);
    return;
  }

  if (viewPath) {
    let parsed;
    try {
      parsed = parseViewPath(viewPath, edmDir);
    } catch (err) {
      console.error(chalk.red(`\n  ✘ ${err.message}\n`));
      process.exit(1);
    }
    printSubTree(edmDir, parsed);
    return;
  }

  // No args: full tree
  printFullTree(edmDir);
}

export { runViewMode, parseViewPath };
