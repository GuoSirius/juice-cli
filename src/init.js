'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const {
  resolveEdmDir, loadMeta, findBrands, findTemplateVersions,
  findSeriesDirs, findSnippetVariants, findConfigs,
  promptOutputName,
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
    let v = 1;
    while (true) {
      const candidate = path.join(cwd, parsed.name + '-v' + v + parsed.ext);
      if (!fs.existsSync(candidate)) {
        const altName = parsed.name + '-v' + v + parsed.ext;
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
    throw new Error(`文件不存在：${resolved}`);
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

/**
 * Wrap @inquirer/prompts select with back/exit navigation.
 * Returns the chosen value, 'back', or 'exit'.
 */
async function selectWithNav(choices, showBack) {
  const { select } = await import('@inquirer/prompts');
  const all = [];
  if (showBack) all.push({ name: '.. 返回上级', value: 'back' });
  all.push(...choices);
  all.push({ name: '✕ 退出', value: 'exit' });
  return select({ message: choices[0] ? undefined : '', choices: all, loop: false });
}

async function interactiveInit(edmDir, cwd) {
  let step = 'brand';
  let brand = null, version = null, series = null, variant = null;

  while (true) {
    if (step === 'brand') {
      const brands = findBrands(edmDir);
      const choices = brands.map(b => ({
        name: formatName(b.meta, b.name) + (b.meta.description ? ' — ' + chalk.dim(b.meta.description) : ''),
        value: b,
      }));
      const result = await selectWithNav(choices, false);
      if (result === 'exit') { console.log(chalk.gray('已退出。\n')); return; }
      brand = result;
      step = 'version';
      continue;
    }

    if (step === 'version') {
      const versions = findTemplateVersions(brand.path);
      const choices = versions.map(v => ({
        name: formatName(v.meta, v.name) + (v.meta.description ? ' — ' + chalk.dim(v.meta.description) : ''),
        value: v,
      }));
      const result = await selectWithNav(choices, true);
      if (result === 'back') { step = 'brand'; continue; }
      if (result === 'exit') { console.log(chalk.gray('已退出。\n')); return; }
      version = result;
      step = 'series';
      continue;
    }

    if (step === 'series') {
      const allSeries = findSeriesDirs(brand.path);
      if (allSeries.length === 0) {
        series = null;
        step = 'copy';
        continue;
      }
      const choices = [
        { name: '[跳过] 仅使用模板', value: null },
        ...allSeries.map(s => ({
          name: formatName(s.meta, s.name) + (s.meta.description ? ' — ' + chalk.dim(s.meta.description) : ''),
          value: s,
        })),
      ];
      const result = await selectWithNav(choices, true);
      if (result === 'back') { step = 'version'; continue; }
      if (result === 'exit') { console.log(chalk.gray('已退出。\n')); return; }
      series = result;
      step = series ? 'variant' : 'copy';
      continue;
    }

    if (step === 'variant') {
      const variants = findSnippetVariants(series.path);
      if (variants.length === 0) {
        variant = null;
        step = 'copy';
        continue;
      }
      const choices = variants.map(v => ({
        name: formatName(v.meta, v.name) + (v.meta.description ? ' — ' + chalk.dim(v.meta.description) : ''),
        value: v,
      }));
      const result = await selectWithNav(choices, true);
      if (result === 'back') { step = 'series'; continue; }
      if (result === 'exit') { console.log(chalk.gray('已退出。\n')); return; }
      variant = result;
      step = 'copy';
      continue;
    }

    if (step === 'copy') {
      // Multi-select what to copy
      const copyItems = [];
      copyItems.push({
        name: `📋 模板 HTML（${version.meta.name || version.name}）`,
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

      // Show summary before multi-select
      console.log(chalk.dim(`\n  品牌：${brand.meta.name || brand.name}  →  模板：${version.meta.name || version.name}`));
      if (series) console.log(chalk.dim(`  系列：${series.meta.name || series.name}${variant ? '  →  变体：' + (variant.meta.name || variant.name) : ''}`));

      const { checkbox } = await import('@inquirer/prompts');
      const navCopyItems = [
        ...copyItems,
        { name: '.. 返回上级', value: 'back' },
        { name: '✕ 退出', value: 'exit' },
      ];
      const selected = await checkbox({
        message: '选择要拷贝的内容：',
        choices: navCopyItems,
      });

      // Filter out nav values
      if (selected.includes('exit')) { console.log(chalk.gray('已退出。\n')); return; }
      if (selected.includes('back')) {
        step = series ? 'variant' : 'series';
        continue;
      }

      const realSelected = selected.filter(s => s !== 'back' && s !== 'exit');
      if (realSelected.length === 0) {
        console.log(chalk.gray('未选择任何内容，已跳过。\n'));
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

      if (realSelected.includes('template')) {
        const destName = outputBaseName + path.extname(version.templatePath);
        const dest = copyFileToCwd(version.templatePath, cwd, destName);
        console.log(`   ${chalk.cyan('·')} ${cwdRel(dest)}  ${chalk.gray('(模板, ' + fmtBytes(fs.statSync(dest).size) + ')')}`);
      }

      if (realSelected.includes('snippet') && variant) {
        const snipPath = path.join(variant.path, 'snippet.html');
        const destName = outputBaseName + '-snippet' + path.extname(snipPath);
        const dest = copyFileToCwd(snipPath, cwd, destName);
        console.log(`   ${chalk.cyan('·')} ${cwdRel(dest)}  ${chalk.gray('(片段, ' + fmtBytes(fs.statSync(dest).size) + ')')}`);
      }

      if (realSelected.includes('config') && variant) {
        const configs = findConfigs(variant.path);
        const optimal = configs.find(c => c.isOptimal);
        const cfgPath = optimal ? optimal.path : configs[0].path;
        const dest = copyFileToCwd(cfgPath, cwd, 'juice.yaml');
        console.log(`   ${chalk.cyan('·')} ${cwdRel(dest)}  ${chalk.gray('(配置, ' + fmtBytes(fs.statSync(dest).size) + ')')}`);
      }

      console.log();
      if (realSelected.includes('snippet') && realSelected.includes('template')) {
        const snipFile = outputBaseName + '-snippet' + path.extname(path.join(variant.path, 'snippet.html'));
        const tplFile = outputBaseName + path.extname(version.templatePath);
        console.log(
          '  ' + chalk.dim('💡 下一步：') + '\n' +
          '     ' + chalk.cyan(`juice -s ${snipFile} -f ${tplFile}`) +
          (realSelected.includes('config') ? chalk.cyan(' -c juice.yaml') : '') + '\n'
        );
      } else if (realSelected.includes('template')) {
        const tplFile = outputBaseName + path.extname(version.templatePath);
        console.log(
          '  ' + chalk.dim('💡 下一步：') + '\n' +
          '     ' + chalk.cyan(`juice -f ${tplFile}`) + '\n'
        );
      }
      return;
    }
  }
}

// ─── Main Entry ──────────────────────────────────────────────────────────────

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function dirSize(dir) {
  let size = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      size += dirSize(p);
    } else {
      size += fs.statSync(p).size;
    }
  }
  return size;
}

function countFiles(dir) {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      count += countFiles(path.join(dir, entry.name));
    } else {
      count++;
    }
  }
  return count;
}

function findNextEdmVersion(targetDir) {
  let v = 1;
  while (true) {
    const candidate = path.join(targetDir, 'edm-v' + v);
    if (!fs.existsSync(candidate)) return candidate;
    v++;
  }
}

async function runInitMode({ initPath, template, snippet, config, all }) {
  const cwd = process.cwd();

  // --all: copy entire EDM directory
  if (all) {
    let edmDir;
    try {
      edmDir = resolveEdmDir();
    } catch (err) {
      console.error(chalk.red(`\n  ✘ ${err.message}\n`));
      process.exit(1);
    }
    const target = all === true ? cwd : path.resolve(all);
    const destDir = path.join(target, 'edm');

    // Prevent deleting the source when target overlaps
    if (path.resolve(edmDir) === path.resolve(destDir)) {
      console.log(chalk.yellow('目标目录与 EDM 资源库相同，无需拷贝。\n'));
      return;
    }
    console.log(chalk.cyan(`\n  拷贝 EDM 资源库...`));
    console.log(chalk.gray(`  源：${edmDir}`));
    console.log(chalk.gray(`  目标：${destDir}`));

    if (fs.existsSync(destDir)) {
      const { select } = await import('@inquirer/prompts');
      const vName = findNextEdmVersion(target);
      const action = await select({
        message: `目录 ${destDir} 已存在：`,
        choices: [
          { name: '覆盖', value: 'overwrite' },
          { name: `版本（${path.basename(vName)}）`, value: 'version' },
          { name: '跳过', value: 'skip' },
        ],
      });
      if (action === 'skip') {
        console.log(chalk.gray('已跳过。\n'));
        return;
      }
      if (action === 'version') {
        copyDir(edmDir, vName);
        const edmSize = dirSize(vName);
        const fileCount = countFiles(vName);
        console.log(chalk.green(`\n✔ 已拷贝 EDM 资源库 → ${path.basename(vName)}（${fileCount} 个文件，${fmtBytes(edmSize)}）\n`));
        return;
      }
      // overwrite: remove and replace
      fs.rmSync(destDir, { recursive: true, force: true });
    }

    copyDir(edmDir, destDir);
    const edmSize = dirSize(destDir);
    const fileCount = countFiles(destDir);
    console.log(chalk.green(`\n✔ 已拷贝 EDM 资源库（${fileCount} 个文件，${fmtBytes(edmSize)}）\n`));
    return;
  }

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

      const { checkbox } = await import('@inquirer/prompts');
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
