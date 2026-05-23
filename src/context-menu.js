'use strict';

/**
 * Windows 右键菜单注册 / 取消注册
 *
 * 使用 ExtendedSubCommandsKey 实现级联菜单（参考 WinRAR 和 Windows Defender 的实现）。
 * 子命令存储在 Classes 根下的共享容器中，各文件类型父菜单通过 ExtendedSubCommandsKey 引用。
 *
 * 菜单结构：
 *   .html / .htm：
 *     📧 用 juice 生成邮件 HTML
 *       ├── 📄 作为模板，生成邮件 HTML   → juice -f（后台执行）
 *       ├── 🧩 作为片段，拼接邮件 HTML   → juice -s（交互选择模板）
 *       ├── 📋 查看可用资源              → juice view
 *       ├── 📦 拷贝全部资源              → juice init --all
 *       ├── 📥 选择资源拷贝              → juice init
 *       └── 📂 打开 PowerShell        （可选）
 *
 *   .yaml / .yml：
 *     📧 用 juice 生成邮件 HTML
 *       ├── ⚙️ 作为配置，拼接邮件 HTML   → juice -c（交互选择品牌/模板/片段）
 *       ├── 📋 查看可用资源
 *       ├── 📦 拷贝全部资源
 *       ├── 📥 选择资源拷贝
 *       └── 📂 打开 PowerShell        （可选）
 *
 *   文件夹 / 空白处：
 *     📧 用 juice 生成邮件 HTML
 *       ├── 📋 查看可用资源
 *       ├── 📦 拷贝全部资源
 *       ├── 📥 选择资源拷贝
 *       └── 📂 在此打开终端           （可选）
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// ─── 路径工具 ─────────────────────────────────────────────────────────────────

function getNodePath() {
  return process.execPath;
}

function getJuiceScript() {
  return path.resolve(__dirname, '..', 'bin', 'juice.js');
}

function getIconPath() {
  return path.resolve(__dirname, '..', 'icons', 'juice-icon.ico');
}

// ─── 注册表操作封装 ───────────────────────────────────────────────────────────

const isWindows = process.platform === 'win32';

function regAdd(key, valueName, type, data) {
  if (!isWindows) return false;
  const args = ['add', key, '/f'];
  if (valueName === '') {
    args.push('/ve');
  } else {
    args.push('/v', valueName);
  }
  if (type) args.push('/t', type);
  if (data !== undefined) args.push('/d', data);

  try {
    const result = spawnSync('reg', args, { stdio: 'pipe', timeout: 10000 });
    if (result.status !== 0) {
      const msg = (result.stderr || '').toString().trim();
      console.warn(chalk.yellow(`  ⚠  reg add 失败\n     键：${key}\n     原因：${msg}`));
      return false;
    }
    return true;
  } catch (e) {
    console.warn(chalk.yellow(`  ⚠  reg add 超时：${key}`));
    return false;
  }
}

function regDelete(key) {
  if (!isWindows) return false;
  try {
    const result = spawnSync('reg', ['delete', key, '/f'], { stdio: 'pipe', timeout: 10000 });
    return result.status === 0;
  } catch (_) {
    return false;
  }
}

// ─── 菜单结构常量 ─────────────────────────────────────────────────────────────

// 使用 HKCU，无需管理员权限
const HKCU_SHELL = 'HKEY_CURRENT_USER\\Software\\Classes';

// HTML 文件右键
const HTML_ROOTS = [
  `${HKCU_SHELL}\\SystemFileAssociations\\.html\\shell`,
  `${HKCU_SHELL}\\SystemFileAssociations\\.htm\\shell`,
];

// YAML 文件右键
const YAML_ROOTS = [
  `${HKCU_SHELL}\\SystemFileAssociations\\.yaml\\shell`,
  `${HKCU_SHELL}\\SystemFileAssociations\\.yml\\shell`,
];

// 子命令名称常量
const SUBCMDS = {
  generate:  'JuiceEmail.Generate',
  snippet:   'JuiceEmail.Snippet',
  config:    'JuiceEmail.WithConfig',
  viewEdm:   'JuiceEmail.ViewEdm',
  initEdm:   'JuiceEmail.InitEdm',
  pwsh:      'JuiceEmail.OpenPwsh',
};

const PARENT_KEY_NAME = 'JuiceEmail';

// ExtendedSubCommandsKey 指向的容器路径（相对于 HKCU\Software\Classes）
const SUB_CMDS_CONTAINER_HTML = 'JuiceEmail.SubCommands';
const SUB_CMDS_CONTAINER_YAML = 'JuiceEmail.SubCommands.Yaml';
const SUB_CMDS_CONTAINER_DIR  = 'JuiceEmail.SubCommands.Dir';
const SUB_CMDS_CONTAINER_BG   = 'JuiceEmail.SubCommands.Bg';

// ─── 旧版残留清理 ─────────────────────────────────────────────────────────────

const LEGACY_HKLM_ROOTS = [
  'HKEY_LOCAL_MACHINE\\Software\\Classes\\SystemFileAssociations\\.html\\shell',
  'HKEY_LOCAL_MACHINE\\Software\\Classes\\SystemFileAssociations\\.htm\\shell',
  'HKEY_LOCAL_MACHINE\\Software\\Classes\\SystemFileAssociations\\.yaml\\shell',
  'HKEY_LOCAL_MACHINE\\Software\\Classes\\SystemFileAssociations\\.yml\\shell',
];

const LEGACY_HKCU_CMDSTORE = 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\CommandStore\\shell';
const LEGACY_HKLM_CMDSTORE = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\CommandStore\\shell';

function cleanLegacyHklmParents() {
  if (!isWindows) return;
  for (const root of LEGACY_HKLM_ROOTS) {
    regDelete(`${root}\\${PARENT_KEY_NAME}`);
  }
}

function cleanLegacyCommandStore() {
  if (!isWindows) return;
  for (const name of Object.values(SUBCMDS)) {
    regDelete(`${LEGACY_HKCU_CMDSTORE}\\${name}`);
    regDelete(`${LEGACY_HKLM_CMDSTORE}\\${name}`);
  }
  // Also clean up old Dir CommandStore entries from v2.3.x SubCommands attempt
  for (const name of ['JuiceEmailDir.View', 'JuiceEmailDir.CopyAll', 'JuiceEmailDir.CopyPick', 'JuiceEmailDir.Pwsh']) {
    regDelete(`${LEGACY_HKCU_CMDSTORE}\\${name}`);
    regDelete(`${LEGACY_HKLM_CMDSTORE}\\${name}`);
  }
}

// ─── PowerShell 包装 ──────────────────────────────────────────────────────────

function wrapInteractive(nodePath, scriptPath, cliArgs) {
  const node = nodePath.replace(/'/g, "''");
  const script = scriptPath.replace(/'/g, "''");
  const ps = [
    `& '${node}' '${script}' ${cliArgs}`,
    `if ($LASTEXITCODE) {`,
    `  Write-Host ''`,
    `  Write-Host '[Failed] Exit code:' $LASTEXITCODE`,
    `  Write-Host '[Re-run] juice ${cliArgs}'`,
    `  Write-Host ''`,
    `  Read-Host 'Press Enter to close'`,
    `}`,
  ].join('; ');
  return `powershell.exe -Command "${ps}"`;
}

// ─── 工具：查找 PowerShell 7 ─────────────────────────────────────────────────

function resolvePwsh() {
  const candidates = [
    'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
    'C:\\Program Files (x86)\\PowerShell\\7\\pwsh.exe',
    path.join(process.env['LOCALAPPDATA'] || '', 'Microsoft', 'PowerShell', 'pwsh.exe'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const result = spawnSync('where', ['pwsh'], { stdio: 'pipe' });
    const line = result.stdout.toString().trim().split('\n')[0].trim();
    if (line && fs.existsSync(line)) return line;
  } catch (_) {}
  return null;
}

// ─── 注册子命令到容器 ────────────────────────────────────────────────────────

/**
 * 向指定容器注册子命令
 * @param {string} containerPath - 容器完整注册表路径
 * @param {'html'|'yaml'|'dir'|'bg'} kind - 子命令集合类型
 */
function registerSubCommands(containerPath, kind, nodePath, scriptPath, iconPath, pwshPath) {
  const node = nodePath.replace(/'/g, "''");
  const script = scriptPath.replace(/'/g, "''");

  // Shared resource commands (added to all containers)
  function regResourceCmds(dirPrefix) {
    const cd = dirPrefix || '';

    // 📋 查看可用资源
    const vKey = `${containerPath}\\shell\\JuiceEmail.ViewRes`;
    regAdd(vKey, 'MUIVerb', 'REG_SZ', '📋 查看可用资源');
    regAdd(vKey, 'Icon', 'REG_SZ', iconPath);
    const vPs = `${cd}& '${node}' '${script}' view; Write-Host ''; Read-Host 'Press Enter to close'`;
    regAdd(`${vKey}\\command`, '', 'REG_SZ', `powershell.exe -Command "${vPs}"`);

    // 📦 拷贝全部资源
    const aKey = `${containerPath}\\shell\\JuiceEmail.CopyAll`;
    regAdd(aKey, 'MUIVerb', 'REG_SZ', '📦 拷贝全部资源');
    regAdd(aKey, 'Icon', 'REG_SZ', iconPath);
    const aPs = `${cd}& '${node}' '${script}' init --all .; Write-Host ''; Read-Host 'Press Enter to close'`;
    regAdd(`${aKey}\\command`, '', 'REG_SZ', `powershell.exe -Command "${aPs}"`);

    // 📥 选择资源拷贝
    const pKey = `${containerPath}\\shell\\JuiceEmail.CopyPick`;
    regAdd(pKey, 'MUIVerb', 'REG_SZ', '📥 选择资源拷贝');
    regAdd(pKey, 'Icon', 'REG_SZ', iconPath);
    const pPs = `${cd}& '${node}' '${script}' init; Write-Host ''; Read-Host 'Press Enter to close'`;
    regAdd(`${pKey}\\command`, '', 'REG_SZ', `powershell.exe -Command "${pPs}"`);
  }

  if (kind === 'html') {
    const genKey = `${containerPath}\\shell\\${SUBCMDS.generate}`;
    regAdd(genKey, 'MUIVerb', 'REG_SZ', '📄 作为模板，生成邮件 HTML');
    regAdd(genKey, 'Icon', 'REG_SZ', iconPath);
    regAdd(`${genKey}\\command`, '', 'REG_SZ', `"${nodePath}" "${scriptPath}" -f %1`);

    const snipKey = `${containerPath}\\shell\\${SUBCMDS.snippet}`;
    regAdd(snipKey, 'MUIVerb', 'REG_SZ', '🧩 作为片段，拼接邮件 HTML');
    regAdd(snipKey, 'Icon', 'REG_SZ', iconPath);
    regAdd(`${snipKey}\\command`, '', 'REG_SZ', wrapInteractive(nodePath, scriptPath, '-s %1'));

    regResourceCmds(`Set-Location (Split-Path '%1'); `);

    if (pwshPath) {
      const pwshKey = `${containerPath}\\shell\\${SUBCMDS.pwsh}`;
      regAdd(pwshKey, 'MUIVerb', 'REG_SZ', '📂 打开 PowerShell');
      regAdd(pwshKey, 'Icon', 'REG_SZ', pwshPath);
      regAdd(`${pwshKey}\\command`, '', 'REG_SZ',
        `"${pwshPath}" -NoExit -Command "Set-Location -LiteralPath (Split-Path '%1')"`);
    }
  } else if (kind === 'yaml') {
    const cfgKey = `${containerPath}\\shell\\${SUBCMDS.config}`;
    regAdd(cfgKey, 'MUIVerb', 'REG_SZ', '⚙️ 作为配置，拼接邮件 HTML');
    regAdd(cfgKey, 'Icon', 'REG_SZ', iconPath);
    regAdd(`${cfgKey}\\command`, '', 'REG_SZ', wrapInteractive(nodePath, scriptPath, '-c %1'));

    regResourceCmds(`Set-Location (Split-Path '%1'); `);

    if (pwshPath) {
      const pwshKey = `${containerPath}\\shell\\${SUBCMDS.pwsh}`;
      regAdd(pwshKey, 'MUIVerb', 'REG_SZ', '📂 打开 PowerShell');
      regAdd(pwshKey, 'Icon', 'REG_SZ', pwshPath);
      regAdd(`${pwshKey}\\command`, '', 'REG_SZ',
        `"${pwshPath}" -NoExit -Command "Set-Location -LiteralPath (Split-Path '%1')"`);
    }
  } else if (kind === 'dir' || kind === 'bg') {
    // Directory / Background: cd to the target directory first
    const dirRef = kind === 'dir' ? '%1' : '%V';
    const cd = `Set-Location '${dirRef}'; `;

    // 📋 查看可用资源
    const vKey = `${containerPath}\\shell\\JuiceEmail.ViewRes`;
    regAdd(vKey, 'MUIVerb', 'REG_SZ', '📋 查看可用资源');
    regAdd(vKey, 'Icon', 'REG_SZ', iconPath);
    const vPs = `${cd}& '${node}' '${script}' view; Write-Host ''; Read-Host 'Press Enter to close'`;
    regAdd(`${vKey}\\command`, '', 'REG_SZ', `powershell.exe -Command "${vPs}"`);

    // 📦 拷贝全部资源
    const aKey = `${containerPath}\\shell\\JuiceEmail.CopyAll`;
    regAdd(aKey, 'MUIVerb', 'REG_SZ', '📦 拷贝全部资源');
    regAdd(aKey, 'Icon', 'REG_SZ', iconPath);
    const aPs = `${cd}& '${node}' '${script}' init --all .; Write-Host ''; Read-Host 'Press Enter to close'`;
    regAdd(`${aKey}\\command`, '', 'REG_SZ', `powershell.exe -Command "${aPs}"`);

    // 📥 选择资源拷贝
    const pKey = `${containerPath}\\shell\\JuiceEmail.CopyPick`;
    regAdd(pKey, 'MUIVerb', 'REG_SZ', '📥 选择资源拷贝');
    regAdd(pKey, 'Icon', 'REG_SZ', iconPath);
    const pPs = `${cd}& '${node}' '${script}' init; Write-Host ''; Read-Host 'Press Enter to close'`;
    regAdd(`${pKey}\\command`, '', 'REG_SZ', `powershell.exe -Command "${pPs}"`);

    if (pwshPath) {
      const pwshKey = `${containerPath}\\shell\\JuiceEmail.Pwsh`;
      regAdd(pwshKey, 'MUIVerb', 'REG_SZ', '📂 在此打开终端');
      regAdd(pwshKey, 'Icon', 'REG_SZ', pwshPath);
      regAdd(`${pwshKey}\\command`, '', 'REG_SZ',
        `"${pwshPath}" -NoExit -Command "Set-Location -LiteralPath '${dirRef}'"`);
    }
  }
}

// ─── 注册 ─────────────────────────────────────────────────────────────────────

async function registerContextMenu() {
  if (!isWindows) {
    console.log(chalk.gray('  右键菜单仅支持 Windows，已跳过。\n'));
    return;
  }

  console.log(chalk.cyan('\n  注册 juice 右键菜单（当前用户，无需管理员权限）...\n'));

  // 清理所有旧版残留
  cleanLegacyHklmParents();
  cleanLegacyCommandStore();

  const nodePath = getNodePath();
  const scriptPath = getJuiceScript();
  const iconPath = getIconPath();
  const pwshPath = resolvePwsh();

  let ok = true;

  // 先删除旧容器再重建
  console.log(chalk.gray('  清理旧版菜单...'));
  regDelete(`${HKCU_SHELL}\\${SUB_CMDS_CONTAINER_HTML}`);
  regDelete(`${HKCU_SHELL}\\${SUB_CMDS_CONTAINER_YAML}`);
  regDelete(`${HKCU_SHELL}\\${SUB_CMDS_CONTAINER_DIR}`);
  regDelete(`${HKCU_SHELL}\\${SUB_CMDS_CONTAINER_BG}`);
  // Clean up old individual Dir/Bg entries from v2.3.x
  for (const root of [`${HKCU_SHELL}\\Directory\\shell`, `${HKCU_SHELL}\\Directory\\Background\\shell`]) {
    regDelete(`${root}\\${PARENT_KEY_NAME}`);
    for (const suffix of ['Init', 'View', 'Browse', 'Pwsh']) {
      regDelete(`${root}\\JuiceEmail.${suffix}`);
    }
  }

  // HTML 容器
  console.log(chalk.gray('  注册 .html 文件菜单...'));
  registerSubCommands(`${HKCU_SHELL}\\${SUB_CMDS_CONTAINER_HTML}`, 'html', nodePath, scriptPath, iconPath, pwshPath);

  // YAML 容器
  console.log(chalk.gray('  注册 .yaml 文件菜单...'));
  registerSubCommands(`${HKCU_SHELL}\\${SUB_CMDS_CONTAINER_YAML}`, 'yaml', nodePath, scriptPath, iconPath, pwshPath);

  // .html / .htm → 引用 HTML 容器
  for (const root of HTML_ROOTS) {
    const parentKey = `${root}\\${PARENT_KEY_NAME}`;
    ok = regAdd(parentKey, 'MUIVerb', 'REG_SZ', '📧 用 juice 生成邮件 HTML') && ok;
    regAdd(parentKey, 'Icon', 'REG_SZ', iconPath);
    regAdd(parentKey, 'ExtendedSubCommandsKey', 'REG_SZ', SUB_CMDS_CONTAINER_HTML);
  }

  // .yaml / .yml → 引用 YAML 容器
  for (const root of YAML_ROOTS) {
    const parentKey = `${root}\\${PARENT_KEY_NAME}`;
    ok = regAdd(parentKey, 'MUIVerb', 'REG_SZ', '📧 用 juice 生成邮件 HTML') && ok;
    regAdd(parentKey, 'Icon', 'REG_SZ', iconPath);
    regAdd(parentKey, 'ExtendedSubCommandsKey', 'REG_SZ', SUB_CMDS_CONTAINER_YAML);
  }

  // Directory / Background → 各自独立容器
  console.log(chalk.gray('  注册文件夹/空白处菜单...'));
  registerSubCommands(`${HKCU_SHELL}\\${SUB_CMDS_CONTAINER_DIR}`, 'dir', nodePath, scriptPath, iconPath, pwshPath);
  registerSubCommands(`${HKCU_SHELL}\\${SUB_CMDS_CONTAINER_BG}`, 'bg', nodePath, scriptPath, iconPath, pwshPath);

  // Directory → 引用 Dir 容器
  const dirParent = `${HKCU_SHELL}\\Directory\\shell\\${PARENT_KEY_NAME}`;
  ok = regAdd(dirParent, 'MUIVerb', 'REG_SZ', '📧 用 juice 生成邮件 HTML') && ok;
  regAdd(dirParent, 'Icon', 'REG_SZ', iconPath);
  regAdd(dirParent, 'ExtendedSubCommandsKey', 'REG_SZ', SUB_CMDS_CONTAINER_DIR);

  // Directory\Background → 引用 Bg 容器
  const bgParent = `${HKCU_SHELL}\\Directory\\Background\\shell\\${PARENT_KEY_NAME}`;
  ok = regAdd(bgParent, 'MUIVerb', 'REG_SZ', '📧 用 juice 生成邮件 HTML') && ok;
  regAdd(bgParent, 'Icon', 'REG_SZ', iconPath);
  regAdd(bgParent, 'ExtendedSubCommandsKey', 'REG_SZ', SUB_CMDS_CONTAINER_BG);

  if (!ok) {
    console.log(chalk.yellow('  ⚠  部分注册表项写入失败，右键菜单可能不完整。\n'));
  }

  console.log(
    '\n' +
    chalk.green('  ✔ 右键菜单注册完成！') + '\n\n' +
    `  ${chalk.bold('.html / .htm')} 文件右键：\n` +
    `    ${chalk.bold('📧 用 juice 生成邮件 HTML')}\n` +
    `      ├── 📄 作为模板，生成邮件 HTML  →  juice -f（后台执行）\n` +
    `      ├── 🧩 作为片段，拼接邮件 HTML  →  juice -s（交互选择模板）\n` +
    `      ├── 📋 查看可用资源              →  juice view\n` +
    `      ├── 📦 拷贝全部资源              →  juice init --all\n` +
    `      ├── 📥 选择资源拷贝              →  juice init\n` +
    (pwshPath ? `      └── 📂 打开 PowerShell\n` : '') +
    `\n  ${chalk.bold('.yaml / .yml')} 文件右键：\n` +
    `    ${chalk.bold('📧 用 juice 生成邮件 HTML')}\n` +
    `      ├── ⚙️ 作为配置，拼接邮件 HTML  →  juice -c（交互选择品牌/模板/片段）\n` +
    `      ├── 📋 查看可用资源\n` +
    `      ├── 📦 拷贝全部资源\n` +
    `      ├── 📥 选择资源拷贝\n` +
    (pwshPath ? `      └── 📂 打开 PowerShell\n` : '') +
    `\n  ${chalk.bold('文件夹 / 空白处')} 右键：\n` +
    `    ${chalk.bold('📧 用 juice 生成邮件 HTML')}\n` +
    `      ├── 📋 查看可用资源\n` +
    `      ├── 📦 拷贝全部资源\n` +
    `      ├── 📥 选择资源拷贝\n` +
    (pwshPath ? `      └── 📂 在此打开终端\n` : '') +
    '\n' +
    chalk.gray('  注意：如菜单未出现，请重启文件资源管理器（explorer.exe）。\n')
  );
}

// ─── 取消注册 ─────────────────────────────────────────────────────────────────

async function unregisterContextMenu() {
  if (!isWindows) {
    console.log(chalk.gray('  右键菜单仅支持 Windows，已跳过。\n'));
    return;
  }

  console.log(chalk.cyan('\n  取消注册 juice 右键菜单...\n'));

  let removed = 0;

  // 清理文件类型父菜单
  const allRoots = [
    ...HTML_ROOTS,
    ...YAML_ROOTS,
    `${HKCU_SHELL}\\Directory\\shell`,
    `${HKCU_SHELL}\\Directory\\Background\\shell`,
  ];
  for (const root of allRoots) {
    if (regDelete(`${root}\\${PARENT_KEY_NAME}`)) removed++;
  }

  // 清理旧版 Dir/Bg 独立条目 (v2.3.x individual entries)
  for (const root of [`${HKCU_SHELL}\\Directory\\shell`, `${HKCU_SHELL}\\Directory\\Background\\shell`]) {
    for (const suffix of ['Init', 'View', 'Browse', 'Pwsh']) {
      if (regDelete(`${root}\\JuiceEmail.${suffix}`)) removed++;
    }
  }

  // 清理所有容器（含旧版残留）
  for (const container of [SUB_CMDS_CONTAINER_HTML, SUB_CMDS_CONTAINER_YAML, SUB_CMDS_CONTAINER_DIR, SUB_CMDS_CONTAINER_BG]) {
    if (regDelete(`${HKCU_SHELL}\\${container}`)) removed++;
  }
  // 旧版共享容器 (v2.1.14)
  regDelete(`${HKCU_SHELL}\\JuiceEmail.SubCommands`);

  // 旧版残留（HKLM 父菜单 + CommandStore）
  cleanLegacyHklmParents();
  cleanLegacyCommandStore();

  if (removed > 0) {
    console.log(chalk.green(`  ✔ 已移除 ${removed} 个右键菜单项。\n`));
  } else {
    console.log(chalk.gray('  ℹ  未找到已注册的右键菜单，无需卸载。\n'));
  }
}

module.exports = { registerContextMenu, unregisterContextMenu };
