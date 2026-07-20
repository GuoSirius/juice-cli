import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import {
  resolveEdmDir, loadMeta, findBrands, findTemplateVersions,
  findSeriesDirs, filterSeries, findSnippetVariants, findConfigs,
  promptOutputName,
} from './snippet.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

function deriveDefaultName(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const tplMatch = normalized.match(/edm\/([^/]+)\/templates\/([^/]+)/);
  if (tplMatch) return `${tplMatch[1]}-${tplMatch[2]}`;
  const snipMatch = normalized.match(/edm\/([^/]+)\/series\/([^/]+)\/([^/]+)/);
  if (snipMatch) return `${snipMatch[1]}-${snipMatch[2]}-${snipMatch[3]}`;
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

  // Always copy the corresponding template's ico (overwrite), even for
  // snippet/config copies whose source has no sibling ico.
  const iconSrc = findIconForFile(resolved);
  if (iconSrc && fs.existsSync(iconSrc)) {
    const iconDest = path.join(cwd, 'favicon.ico');
    fs.copyFileSync(iconSrc, iconDest);
    console.log(`   ${chalk.cyan('·')} ./${path.relative(cwd, iconDest)}  ${chalk.gray('(图标, ' + fmtBytes(fs.statSync(iconDest).size) + ')')}`);
  }
  console.log();
}

// ─── Interactive Init ────────────────────────────────────────────────────────

async function selectWithNav(message, choices, showBack) {
  const { select } = await import('@inquirer/prompts');
  const all = [];
  if (showBack) all.push({ name: '.. 返回上级', value: 'back' });
  all.push(...choices);
  all.push({ name: '✕ 退出', value: 'exit' });
  return select({ message, choices: all, loop: false });
}

async function interactiveInit(edmDir, cwd) {
  let step = 'brand';
  let brand = null, version = null, series = null, variant = null;
  let hadVariantStep = false; // track if variant step was actually shown

  while (true) {
    if (step === 'brand') {
      const brands = findBrands(edmDir);
      const choices = brands.map(b => ({
        name: formatName(b.meta, b.name) + (b.meta.description ? ' — ' + chalk.dim(b.meta.description) : ''),
        value: b,
      }));
      const result = await selectWithNav('选择品牌：', choices, false);
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
      const result = await selectWithNav('选择模板版本：', choices, true);
      if (result === 'back') { step = 'brand'; continue; }
      if (result === 'exit') { console.log(chalk.gray('已退出。\n')); return; }
      version = result;
      step = 'series';
      continue;
    }

    if (step === 'series') {
      let allSeries = findSeriesDirs(brand.path);
      // Apply template version series filtering (allow/block in _meta.yaml)
      allSeries = filterSeries(allSeries, version.meta);
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
      const result = await selectWithNav('选择片段系列：', choices, true);
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
      hadVariantStep = true;
      const choices = variants.map(v => ({
        name: formatName(v.meta, v.name) + (v.meta.description ? ' — ' + chalk.dim(v.meta.description) : ''),
        value: v,
      }));
      const result = await selectWithNav('选择片段变体：', choices, true);
      if (result === 'back') { step = 'series'; continue; }
      if (result === 'exit') { console.log(chalk.gray('已退出。\n')); return; }
      variant = result;
      step = 'copy';
      continue;
    }

    if (step === 'copy') {
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

      console.log(chalk.dim(`\n  品牌：${brand.meta.name || brand.name}  →  模板：${version.meta.name || version.name}`));
      if (series) console.log(chalk.dim(`  系列：${series.meta.name || series.name}${variant ? '  →  变体：' + (variant.meta.name || variant.name) : ''}`));

      // Loop: confirm / shortcuts / customize, allow back at any point
      let selected = copyItems.filter(c => c.checked).map(c => c.value);
      while (true) {
        const picked = selected
          .map(v => copyItems.find(c => c.value === v))
          .filter(Boolean)
          .map(c => c.name.replace(/^[^\s]+\s/, ''));
        const summary = picked.length > 0 ? picked.join(' + ') : '(未选择)';
        const mainChoices = [];
        // Quick shortcut: snippet + config only (skip template)
        if (variant && copyItems.some(c => c.value === 'snippet') && copyItems.some(c => c.value === 'config')) {
          mainChoices.push({ name: '🧩 仅片段 + 配置', value: 'snippet-config' });
        }
        if (picked.length > 0) {
          mainChoices.push({ name: `✅ 确认拷贝（${summary}）`, value: 'confirm' });
        }
        mainChoices.push({ name: `🔄 自定义选择（${summary}）`, value: 'edit' });

        const action = await selectWithNav(
          '拷贝操作：',
          mainChoices,
          true
        );
        if (action === 'back') { step = hadVariantStep ? 'variant' : (series ? 'series' : 'version'); break; }
        if (action === 'exit') { console.log(chalk.gray('已退出。\n')); return; }
        if (action === 'edit') {
          const { checkbox } = await import('@inquirer/prompts');
          selected = await checkbox({
            message: '选择要拷贝的内容：',
            choices: copyItems,
          });
          if (selected.length === 0) { console.log(chalk.dim('  (已清空选择)\n')); }
          continue;
        }
        if (action === 'snippet-config') {
          selected = ['snippet', 'config'];
          // fall through to confirmation below
        } else if (selected.length === 0) {
          console.log(chalk.gray('未选择任何内容。\n'));
          step = hadVariantStep ? 'variant' : (series ? 'series' : 'version');
          break;
        }

        const defaultBaseName = variant
          ? `${brand.name}-${version.name}-${series.name}-${variant.name}`
          : `${brand.name}-${version.name}`;
        const outputBaseName = await promptOutputName(defaultBaseName, cwd);

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
          const optimal = configs.find(c => c.isOptimal);
          const cfgPath = optimal ? optimal.path : configs[0].path;
          const dest = copyFileToCwd(cfgPath, cwd, 'juice.yaml');
          console.log(`   ${chalk.cyan('·')} ${cwdRel(dest)}  ${chalk.gray('(配置, ' + fmtBytes(fs.statSync(dest).size) + ')')}`);
        }

        // Always copy the corresponding template's ico (overwrite), regardless of
        // which items were selected.
        const icon = copyIcon(version.path, brand.path, cwd);
        if (icon) console.log(`   ${chalk.cyan('·')} ${cwdRel(icon)}  ${chalk.gray('(图标, ' + fmtBytes(fs.statSync(icon).size) + ')')}`);

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
        break;
      }
      if (step === 'copy') return; // confirmed and copied
      continue; // went back
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

/**
 * Always copy the corresponding template's favicon.ico into CWD, overwriting any
 * existing file. Source priority: the template version dir → the brand's first
 * template version. (The variant's own ico is intentionally NOT used — the user
 * wants the series' corresponding *template* ico.)
 *
 * Returns the destination path if an ico was copied, otherwise null.
 */
function copyIcon(versionDir, brandDir, cwd) {
  const candidates = [];
  if (versionDir) candidates.push(path.join(versionDir, 'favicon.ico'));
  try {
    const versions = findTemplateVersions(brandDir);
    if (versions.length > 0) {
      candidates.push(path.join(versions[0].path, 'favicon.ico'));
    }
  } catch (_) {}
  for (const src of candidates) {
    if (fs.existsSync(src)) {
      const dest = path.join(cwd, 'favicon.ico');
      fs.copyFileSync(src, dest); // always overwrite, never version
      return dest;
    }
  }
  return null;
}

/**
 * Resolve the favicon.ico that should accompany a directly-copied file
 * (--template / --snippet / --config, or a browse copy action).
 *  - Template file (.../templates/<version>/x.html): its sibling ico.
 *  - Series/snippet/config file: the brand's first template version ico.
 * Returns the ico source path, or null if it cannot be resolved.
 */
function findIconForFile(srcPath) {
  const normalized = srcPath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const idx = parts.indexOf('edm');
  if (idx === -1 || idx + 1 >= parts.length) return null;
  const brandDir = parts.slice(0, idx + 2).join(path.sep);

  if (normalized.includes('/templates/')) {
    const sib = path.join(path.dirname(srcPath), 'favicon.ico');
    if (fs.existsSync(sib)) return sib;
  }
  try {
    const versions = findTemplateVersions(brandDir);
    if (versions.length > 0) {
      return path.join(versions[0].path, 'favicon.ico');
    }
  } catch (_) {}
  return null;
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

  if (all) {
    const pkgEdm = path.resolve(__dirname, '..', 'edm');
    const edmDir = fs.existsSync(pkgEdm) ? pkgEdm : (() => {
      try { return resolveEdmDir(); } catch (_) { return null; }
    })();
    if (!edmDir) {
      console.error(chalk.red('\n  ✘ EDM 资源库不存在，无法拷贝。\n'));
      process.exit(1);
    }
    const target = all === true ? cwd : path.resolve(all);
    const destDir = path.join(target, 'edm');

    if (path.resolve(edmDir) === path.resolve(destDir)) {
      console.log(chalk.yellow('目标目录与 EDM 资源库相同，无需拷贝。\n'));
      return;
    }
    console.log(chalk.cyan(`\n  拷贝 EDM 资源库...`));

    if (fs.existsSync(destDir)) {
      const { select } = await import('@inquirer/prompts');
      const vName = findNextEdmVersion(target);
      const action = await select({
        message: `目录 edm/ 已存在：`,
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
      fs.rmSync(destDir, { recursive: true, force: true });
    }

    copyDir(edmDir, destDir);
    const edmSize = dirSize(destDir);
    const fileCount = countFiles(destDir);
    console.log(chalk.green(`\n✔ 已拷贝 EDM 资源库（${fileCount} 个文件，${fmtBytes(edmSize)}）\n`));
    return;
  }

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

  if (initPath) {
    const { parseViewPath } = await import('./view.js');
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
      const snipPath = path.join(parsed.variantData.path, 'snippet.html');
      const configs = findConfigs(parsed.variantData.path);
      const brandDir = path.join(edmDir, parsed.brand);
      const versions = findTemplateVersions(brandDir);
      const version = versions[0];
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

      // Always copy the corresponding template's ico (overwrite).
      const icon = copyIcon(version.path, brandDir, cwd);
      if (icon) console.log(`   ${chalk.cyan('·')} ${cwdRel(icon)}  ${chalk.gray('(图标, ' + fmtBytes(fs.statSync(icon).size) + ')')}`);

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

  let edmDir;
  try {
    edmDir = resolveEdmDir();
  } catch (err) {
    console.error(chalk.red(`\n  ✘ ${err.message}\n`));
    process.exit(1);
  }
  await interactiveInit(edmDir, cwd);
}

export { runInitMode };
