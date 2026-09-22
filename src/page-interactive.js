import fs from 'fs';
import path from 'path';
import { dump as yamlDump } from 'js-yaml';
import chalk from 'chalk';
import { loadYaml } from './index.js';
import {
  resolveEdmDir,
  findBrands,
  findTemplateVersions,
  findSeriesDirs,
  findSnippetVariants,
  filterSeries,
  findLocalConfig,
  promptBrand,
  promptTemplateVersion,
  promptOutputName,
} from './snippet.js';
import { runPageMode } from './page.js';

/**
 * 交互式页面装配：品牌 → 模板版本 → 多选板块（跨系列）→ 生成 page.yaml → 执行。
 *
 * 生成的 page.yaml 落在当前目录，板块 vars 自动取自各变体目录的 juice.yaml
 * （variables 字段）；生成后可手工调整板块顺序 / 增删板块 / 编辑 vars 再重跑。
 */
async function runPageInteractive({ cliConfigPath, outputName }) {
  const { checkbox, confirm } = await import('@inquirer/prompts');

  const edmDir = resolveEdmDir();
  const cwd = process.cwd();

  // 1. 品牌 → 模板版本
  const brand = await promptBrand(findBrands(edmDir));
  const versions = findTemplateVersions(brand.path);
  const version = await promptTemplateVersion(versions);

  // 2. 收集品牌下所有片段变体（按版本 series.allow/block 过滤系列）
  const allSeries = filterSeries(findSeriesDirs(brand.path), version.meta);
  const variants = [];
  for (const s of allSeries) {
    for (const v of findSnippetVariants(s.path)) {
      variants.push({ series: s.name, seriesMeta: s.meta, ...v });
    }
  }
  if (variants.length === 0) {
    throw new Error(`品牌「${brand.meta.name || brand.name}」下没有可用的片段变体（series/*/variant/snippet.html）`);
  }

  // 3. 多选板块（choice 顺序 = 组装顺序）
  const selected = await checkbox({
    message: '选择页面板块（空格勾选，按列表顺序组装；至少 1 项）：',
    choices: variants.map((v) => ({
      name: `${v.seriesMeta.name || v.series} / ${v.meta.name || v.name} ${chalk.gray(`(${v.series}/${v.name})`)}`,
      value: v,
      description: v.meta.description || undefined,
    })),
    validate: (arr) => (arr.length === 0 ? '至少选择一个板块' : true),
  });

  // 4. 输出文件名
  const defaultBase = outputName || `${brand.name}-${version.name}-page`;
  const outBase = await promptOutputName(defaultBase, cwd);

  // 5. 生成 page.yaml（板块 vars 取自各变体目录 juice.yaml 的 variables）
  const toRef = (p) => {
    const rel = path.relative(cwd, p);
    return (rel.startsWith('..') ? p : rel).split(path.sep).join('/');
  };

  const sectionEntries = [];
  for (const v of selected) {
    const entry = { snippet: toRef(v.path + '/snippet.html') };
    const localCfgPath = findLocalConfig(v.path);
    if (localCfgPath) {
      const localVars = loadYaml(localCfgPath).variables;
      if (localVars && typeof localVars === 'object' && Object.keys(localVars).length > 0) {
        entry.vars = localVars;
      }
    }
    sectionEntries.push(entry);
  }

  const pageSpec = { template: toRef(version.templatePath), outputName: outBase, sections: sectionEntries };
  const pageYamlPath = path.join(cwd, 'page.yaml');

  if (fs.existsSync(pageYamlPath)) {
    const overwrite = await confirm({ message: '当前目录已存在 page.yaml，覆盖？', default: true });
    if (!overwrite) throw new Error('已取消（page.yaml 未覆盖）');
  }
  fs.writeFileSync(pageYamlPath, yamlDump(pageSpec, { lineWidth: 120 }), 'utf8');

  // 6. 汇总确认
  console.log(
    '\n' + chalk.cyan('═══════════════════════════════════════════') + '\n' +
    chalk.bold('  页面装配汇总') + '\n' +
    chalk.cyan('═══════════════════════════════════════════') + '\n' +
    `  品牌：      ${chalk.green(brand.meta.name || brand.name)} ${chalk.gray(`(${brand.name})`)}\n` +
    `  模板版本：  ${chalk.green(version.meta.name || version.name)} ${chalk.gray(`(${version.name})`)}\n` +
    `  板块（${selected.length} 个）：\n` +
    selected.map((v, i) => `    ${chalk.gray(`#${i + 1}`)} ${v.series}/${v.name}${sectionEntries[i].vars ? chalk.gray(' (+vars)') : ''}`).join('\n') + '\n' +
    `  page.yaml： ${chalk.cyan('./page.yaml')} ${chalk.gray('(已生成，可手工调整后重跑 juice build -p page.yaml)')}\n` +
    chalk.cyan('═══════════════════════════════════════════\n')
  );

  const proceed = await confirm({ message: '确认执行页面装配？', default: true });
  if (!proceed) {
    console.log(chalk.gray('已取消（page.yaml 已生成，可稍后执行 juice build -p page.yaml）。'));
    return;
  }

  // 7. 执行（page.yaml 自身作为配置层；若有 -c 则优先级更高）
  if (cliConfigPath) {
    console.log(chalk.gray(`  使用 CLI 指定配置：${cliConfigPath}`));
  }
  await runPageMode({ page: pageYamlPath, config: cliConfigPath, outputName: outBase });
}

export { runPageInteractive };
