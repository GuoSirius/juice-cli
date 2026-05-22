'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const {
  resolveEdmDir, loadMeta, findBrands, findTemplateVersions,
  findSeriesDirs, findSnippetVariants, findConfigs,
  promptBrand, promptTemplateVersion, promptSeries, promptSnippetVariant,
  promptOutputName, checkOutputConflicts, findNextVersion,
} = require('./snippet');

function fmtBytes(b) {
  return b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatName(meta, dirName) {
  const display = meta.name || dirName;
  return display !== dirName
    ? chalk.bold.cyan(display) + ' ' + chalk.gray(`(${dirName})`)
    : chalk.bold.cyan(dirName);
}

/**
 * Copy a single file to CWD with an optional custom name.
 * Returns the destination path.
 */
function copyFileToCwd(srcPath, cwd, destName) {
  const dest = path.join(cwd, destName || path.basename(srcPath));
  if (fs.existsSync(dest)) {
    // Find a non-conflicting name
    const parsed = path.parse(dest);
    const base = path.join(parsed.dir, parsed.name);
    const ext = parsed.ext;
    let alt = findNextVersion(parsed.name, cwd);
    // findNextVersion works with base names, not full paths
    // Reimplement inline
    let v = 1;
    while (true) {
      const candidate = path.join(cwd, parsed.name + '-v' + v + ext);
      if (!fs.existsSync(candidate)) {
        const altName = parsed.name + '-v' + v + ext;
        const altPath = path.join(cwd, altName);
        console.log(chalk.yellow(`  ⚠  ${destName || path.basename(srcPath)} 已存在，使用：${altName}`));
        fs.copyFileSync(srcPath, altPath);
        return altPath;
      }
      v++;
    }
  }
  fs.copyFileSync(srcPath, dest);
  return dest;
}

// ─── Direct Copy (--template / --snippet / --config) ─────────────────────────

/**
 * Derive a human-friendly default name from an EDM file path.
 * e.g. edm/elabscience/templates/standard/template.html → elabscience-standard
 *      edm/elabscience/series/literature/default/snippet.html → elabscience-literature-default-snippet
 */
function deriveDefaultName(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  // Try to match edm/<brand>/templates/<version>/...
  const tplMatch = normalized.match(/edm\/([^/]+)\/templates\/([^/]+)/);
  if (tplMatch) return `${tplMatch[1]}-${tplMatch[2]}`;
  // Try to match edm/<brand>/series/<series>/<variant>/...
  const snipMatch = normalized.match(/edm\/([^/]+)\/series\/([^/]+)\/([^/]+)/);
  if (snipMatch) return `${snipMatch[1]}-${snipMatch[2]}-${snipMatch[3]}`;
  // Fallback: source file basename
  return path.parse(filePath).name;
}

async function directCopy(srcPath, cwd) {
  const resolved = path.resolve(srcPath);
  if (!fs.existsSync(resolved)) {
    console.error(chalk.red(`\n  ✘ 文件不存在：${resolved}\n`));
    process.exit(1);
  }

  const destName = await promptOutputName(
    deriveDefaultName(resolved),
    cwd
  );

  const dest = path.join(cwd, destName + path.extname(resolved));
  fs.copyFileSync(resolved, dest);
  const stat = fs.statSync(dest);

  console.log(chalk.green('\n✔ 已拷贝：'));
  console.log(`   ${chalk.cyan('·')} ./${path.relative(cwd, dest)}  ${chalk.gray('(' + fmtBytes(stat.size) + ')')}`);
  console.log();
}

// ─── Interactive Init ────────────────────────────────────────────────────────

async function interactiveInit(edmDir, cwd) {
  const brands = findBrands(edmDir);
  const brand = await promptBrand(brands);
  const versions = findTemplateVersions(brand.path);
  const version = await promptTemplateVersion(versions);

  // Series selection
  const allSeries = findSeriesDirs(brand.path);
  let series = null;
  let variant = null;

  if (allSeries.length > 0) {
    const { select } = await import('@inquirer/prompts');
    const seriesChoices = [
      { name: '[跳过] 仅使用模板', value: null },
      ...allSeries.map(s => {
        const meta = s.meta;
        const display = meta.name
          ? formatName(meta, s.name)
          : chalk.bold.cyan(s.name);
        return {
          name: display,
          value: s,
          description: meta.description || undefined,
        };
      }),
    ];
    series = await select({
      message: '选择片段系列（可选）：',
      choices: seriesChoices,
    });

    if (series) {
      const variants = findSnippetVariants(series.path);
      if (variants.length > 0) {
        variant = await promptSnippetVariant(variants);
      }
    }
  }

  // Multi-select what to copy
  const copyItems = [];
  copyItems.push({
    name: '📋 模板 HTML',
    value: 'template',
    description: path.basename(version.templatePath),
    checked: true,
  });

  if (variant) {
    const snipPath = path.join(variant.path, 'snippet.html');
    if (fs.existsSync(snipPath)) {
      copyItems.push({
        name: '🧩 片段 HTML',
        value: 'snippet',
        description: path.basename(snipPath),
        checked: true,
      });
    }

    const configs = findConfigs(variant.path);
    if (configs.length > 0) {
      copyItems.push({
        name: '⚙️ 配置文件',
        value: 'config',
        description: configs.map(c => c.name).join(', '),
        checked: true,
      });
    }
  }

  const { checkbox } = await import('@inquirer/prompts');
  const selected = await checkbox({
    message: '选择要拷贝的内容：',
    choices: copyItems,
  });

  if (selected.length === 0) {
    console.log(chalk.gray('未选择任何内容，已取消。\n'));
    return;
  }

  // Output name
  const defaultBaseName = variant
    ? `${brand.name}-${version.name}-${series.name}-${variant.name}`
    : `${brand.name}-${version.name}`;
  const outputBaseName = await promptOutputName(defaultBaseName, cwd);

  // Copy files
  console.log(chalk.green('\n✔ 已拷贝：'));
  const cwdRel = (p) => './' + path.relative(cwd, p);

  if (selected.includes('template')) {
    const destName = outputBaseName + path.extname(version.templatePath);
    const dest = copyFileToCwd(version.templatePath, cwd, destName);
    console.log(`   ${chalk.cyan('·')} ${cwdRel(dest)}  ${chalk.gray('(模板, ' + fmtBytes(fs.statSync(dest).size) + ')')}`);
  }

  if (selected.includes('snippet') && variant) {
    const snipPath = path.join(variant.path, 'snippet.html');
    const destName = outputBaseName + '-snippet' + path.extname(snipPath);
    const dest = copyFileToCwd(snipPath, cwd, destName);
    console.log(`   ${chalk.cyan('·')} ${cwdRel(dest)}  ${chalk.gray('(片段, ' + fmtBytes(fs.statSync(dest).size) + ')')}`);
  }

  if (selected.includes('config') && variant) {
    const configs = findConfigs(variant.path);
    let cfgPath;
    if (configs.length === 1) {
      cfgPath = configs[0].path;
    } else {
      // Use optimal config
      const optimal = configs.find(c => c.isOptimal);
      cfgPath = optimal ? optimal.path : configs[0].path;
    }
    const dest = copyFileToCwd(cfgPath, cwd, 'juice.yaml');
    console.log(`   ${chalk.cyan('·')} ${cwdRel(dest)}  ${chalk.gray('(配置, ' + fmtBytes(fs.statSync(dest).size) + ')')}`);
  }

  // Summary
  console.log();
  if (selected.includes('snippet') && selected.includes('template')) {
    const snipFile = outputBaseName + '-snippet' + path.extname(path.join(variant.path, 'snippet.html'));
    const tplFile = outputBaseName + path.extname(version.templatePath);
    console.log(
      '  ' + chalk.dim('💡 下一步：') + '\n' +
      '     ' + chalk.cyan(`juice -s ${snipFile} -f ${tplFile}`) +
      (selected.includes('config') ? chalk.cyan(' -c juice.yaml') : '') + '\n'
    );
  } else if (selected.includes('template')) {
    const tplFile = outputBaseName + path.extname(version.templatePath);
    console.log(
      '  ' + chalk.dim('💡 下一步：') + '\n' +
      '     ' + chalk.cyan(`juice -f ${tplFile}`) + '\n'
    );
  }
}

// ─── Main Entry ──────────────────────────────────────────────────────────────

async function runInitMode({ initPath, template, snippet, config }) {
  const cwd = process.cwd();

  // Direct copy modes
  if (template) {
    await directCopy(template, cwd);
    return;
  }
  if (snippet) {
    await directCopy(snippet, cwd);
    return;
  }
  if (config) {
    await directCopy(config, cwd);
    return;
  }

  // Path-based from EDM
  if (initPath) {
    const { parseViewPath } = require('./view');
    let edmDir;
    try {
      edmDir = resolveEdmDir();
    } catch (err) {
      console.error(chalk.red(`\n  ✘ ${err.message}\n`));
      process.exit(1);
    }

    let parsed;
    try {
      parsed = parseViewPath(initPath, edmDir);
    } catch (err) {
      console.error(chalk.red(`\n  ✘ ${err.message}\n`));
      process.exit(1);
    }

    if (parsed.type === 'template') {
      await directCopy(parsed.versionData.templatePath, cwd);
    } else if (parsed.type === 'variant') {
      // Multi-select copy
      const snipPath = path.join(parsed.variantData.path, 'snippet.html');
      const configs = findConfigs(parsed.variantData.path);
      const brandDir = path.join(edmDir, parsed.brand);
      const versions = findTemplateVersions(brandDir);
      const version = versions[0]; // default to first version
      const tplPath = version.templatePath;

      const copyItems = [
        { name: '📋 模板 HTML', value: 'template', description: path.basename(tplPath), checked: true },
      ];
      if (fs.existsSync(snipPath)) {
        copyItems.push({ name: '🧩 片段 HTML', value: 'snippet', description: path.basename(snipPath), checked: true });
      }
      if (configs.length > 0) {
        copyItems.push({ name: '⚙️ 配置文件', value: 'config', description: configs.map(c => c.name).join(', '), checked: true });
      }

      const { checkbox } = await (async () => {
        const mod = await import('@inquirer/prompts');
        return mod;
      })();
      const selected = await checkbox({
        message: '选择要拷贝的内容：',
        choices: copyItems,
      });

      if (selected.length === 0) {
        console.log(chalk.gray('未选择任何内容，已取消。\n'));
        return;
      }

      const defaultBaseName = `${parsed.brand}-${parsed.seriesData ? parsed.series : 'series'}-${parsed.variant}`;
      const outputBaseName = await promptOutputName(defaultBaseName, cwd);

      console.log(chalk.green('\n✔ 已拷贝：'));
      const cwdRel = (p) => './' + path.relative(cwd, p);

      if (selected.includes('template')) {
        const destName = outputBaseName + path.extname(tplPath);
        const dest = copyFileToCwd(tplPath, cwd, destName);
        console.log(`   ${chalk.cyan('·')} ${cwdRel(dest)}  ${chalk.gray('(模板, ' + fmtBytes(fs.statSync(dest).size) + ')')}`);
      }
      if (selected.includes('snippet') && fs.existsSync(snipPath)) {
        const destName = outputBaseName + '-snippet' + path.extname(snipPath);
        const dest = copyFileToCwd(snipPath, cwd, destName);
        console.log(`   ${chalk.cyan('·')} ${cwdRel(dest)}  ${chalk.gray('(片段, ' + fmtBytes(fs.statSync(dest).size) + ')')}`);
      }
      if (selected.includes('config') && configs.length > 0) {
        const optimal = configs.find(c => c.isOptimal);
        const cfgPath = optimal ? optimal.path : configs[0].path;
        const dest = copyFileToCwd(cfgPath, cwd, 'juice.yaml');
        console.log(`   ${chalk.cyan('·')} ${cwdRel(dest)}  ${chalk.gray('(配置, ' + fmtBytes(fs.statSync(dest).size) + ')')}`);
      }
      console.log();
    } else {
      console.error(chalk.red(
        `\n  ✘ 无法从「${initPath}」初始化。\n` +
        `  请指定：<brand>/templates/<version> 或 <brand>/<series>/<variant>\n`
      ));
      process.exit(1);
    }
    return;
  }

  // No arguments: interactive mode
  let edmDir;
  try {
    edmDir = resolveEdmDir();
  } catch (err) {
    console.error(chalk.red(`\n  ✘ ${err.message}\n`));
    process.exit(1);
  }
  await interactiveInit(edmDir, cwd);
}

module.exports = { runInitMode };
