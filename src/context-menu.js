'use strict';

/**
 * Windows 右键菜单注册 / 取消注册
 *
 * 使用 ExtendedSubCommandsKey 实现级联菜单（参考 WinRAR 和 Windows Defender 的实现）。
 * 子命令存储在 Classes 根下的共享容器中，各文件类型父菜单通过 ExtendedSubCommandsKey 引用。
 *
 * 与旧版 SubCommands + CommandStore 方案的区别：
 *   - 不依赖 CommandStore（HKCU CommandStore 在某些 Windows 版本下不被正确解析）
 *   - ExtendedSubCommandsKey 指向 Classes 根下的相对路径，子命令内联存储
 *
 * 菜单结构（按文件类型区分）：
 *   .html / .htm：
 *     📧 用 juice 生成邮件 HTML
 *       ├── 📄 作为模板，生成邮件 HTML   → juice -f（后台执行）
 *       ├── 🧩 作为片段，拼接邮件 HTML   → juice -s（交互选择模板）
 *       └── 📂 打开 PowerShell        （可选）
 *
 *   .yaml / .yml：
 *     📧 用 juice 生成邮件 HTML
 *       └── ⚙️ 作为配置，拼接邮件 HTML   → juice -c（交互选择品牌/模板/片段）
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

  const result = spawnSync('reg', args, { stdio: 'pipe' });
  if (result.status !== 0) {
    const msg = (result.stderr || '').toString().trim();
    console.warn(chalk.yellow(`  ⚠  reg add 失败\n     键：${key}\n     原因：${msg}`));
    return false;
  }
  return true;
}

function regDelete(key) {
  if (!isWindows) return false;
  const result = spawnSync('reg', ['delete', key, '/f'], { stdio: 'pipe' });
  return result.status === 0;
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
  generate: 'JuiceEmail.Generate',
  snippet:  'JuiceEmail.Snippet',
  config:   'JuiceEmail.WithConfig',
  pwsh:     'JuiceEmail.OpenPwsh',
};

const PARENT_KEY_NAME = 'JuiceEmail';

// ExtendedSubCommandsKey 指向的容器路径（相对于 HKCU\Software\Classes）
const SUB_CMDS_CONTAINER_HTML = 'JuiceEmail.SubCommands';
const SUB_CMDS_CONTAINER_YAML = 'JuiceEmail.SubCommands.Yaml';

// ─── 旧版残留清理 ─────────────────────────────────────────────────────────────

// 旧版 HKLM 父菜单路径（v1 使用 HKCR/HKLM，需管理员权限写入）
const LEGACY_HKLM_ROOTS = [
  'HKEY_LOCAL_MACHINE\\Software\\Classes\\SystemFileAssociations\\.html\\shell',
  'HKEY_LOCAL_MACHINE\\Software\\Classes\\SystemFileAssociations\\.htm\\shell',
  'HKEY_LOCAL_MACHINE\\Software\\Classes\\SystemFileAssociations\\.yaml\\shell',
  'HKEY_LOCAL_MACHINE\\Software\\Classes\\SystemFileAssociations\\.yml\\shell',
];

// 旧版 CommandStore 子命令路径（v1-v2.1.12 使用 SubCommands + CommandStore 方案）
const LEGACY_HKCU_CMDSTORE = 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\CommandStore\\shell';
const LEGACY_HKLM_CMDSTORE = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\CommandStore\\shell';

/**
 * 清理旧版本残留在 HKLM 的父菜单（v1 使用 HKCR/HKLM，需要管理员权限）
 * 没有管理员权限时静默失败，不影响后续 HKCU 写入
 */
function cleanLegacyHklmParents() {
  if (!isWindows) return;
  for (const root of LEGACY_HKLM_ROOTS) {
    regDelete(`${root}\\${PARENT_KEY_NAME}`);
  }
}

/**
 * 清理旧版本 CommandStore 子命令残留（HKCU + HKLM）
 */
function cleanLegacyCommandStore() {
  if (!isWindows) return;
  for (const name of Object.values(SUBCMDS)) {
    regDelete(`${LEGACY_HKCU_CMDSTORE}\\${name}`);
    regDelete(`${LEGACY_HKLM_CMDSTORE}\\${name}`);
  }
}

// ─── PowerShell 包装 ──────────────────────────────────────────────────────────

/**
 * 为交互式命令包一层 PowerShell：
 * - 成功：窗口自动关闭
 * - 失败：窗口保持开启，显示重新执行的命令
 */
function wrapInteractive(nodePath, scriptPath, cliArgs) {
  const node = nodePath.replace(/'/g, "''");
  const script = scriptPath.replace(/'/g, "''");
  // %1 由 Windows Explorer 在 CreateProcess 前展开为实际文件路径
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
 * @param {'html'|'yaml'} kind - 子命令集合类型
 */
function registerSubCommands(containerPath, kind, nodePath, scriptPath, iconPath, pwshPath) {
  if (kind === 'html') {
    // HTML：作为模板生成
    const genKey = `${containerPath}\\shell\\${SUBCMDS.generate}`;
    regAdd(genKey, 'MUIVerb', 'REG_SZ', '📄 作为模板，生成邮件 HTML');
    regAdd(genKey, 'Icon', 'REG_SZ', iconPath);
    regAdd(`${genKey}\\command`, '', 'REG_SZ', `"${nodePath}" "${scriptPath}" -f %1`);

    // HTML：作为片段拼接
    const snipKey = `${containerPath}\\shell\\${SUBCMDS.snippet}`;
    regAdd(snipKey, 'MUIVerb', 'REG_SZ', '🧩 作为片段，拼接邮件 HTML');
    regAdd(snipKey, 'Icon', 'REG_SZ', iconPath);
    regAdd(`${snipKey}\\command`, '', 'REG_SZ', wrapInteractive(nodePath, scriptPath, '-s %1'));
  } else {
    // YAML：作为配置拼接
    const cfgKey = `${containerPath}\\shell\\${SUBCMDS.config}`;
    regAdd(cfgKey, 'MUIVerb', 'REG_SZ', '⚙️ 作为配置，拼接邮件 HTML');
    regAdd(cfgKey, 'Icon', 'REG_SZ', iconPath);
    regAdd(`${cfgKey}\\command`, '', 'REG_SZ', wrapInteractive(nodePath, scriptPath, '-c %1'));
  }

  // pwsh — 始终显示（可选）
  if (pwshPath) {
    const pwshKey = `${containerPath}\\shell\\${SUBCMDS.pwsh}`;
    regAdd(pwshKey, 'MUIVerb', 'REG_SZ', '📂 打开 PowerShell');
    regAdd(pwshKey, 'Icon', 'REG_SZ', pwshPath);
    regAdd(`${pwshKey}\\command`, '', 'REG_SZ',
      `"${pwshPath}" -NoExit -Command "Set-Location -LiteralPath (Split-Path '%1')"`);
  }
}

// ─── 注册 ─────────────────────────────────────────────────────────────────────

async function registerContextMenu() {
  if (!isWindows) {
    console.log(chalk.gray('  右键菜单仅支持 Windows，已跳过。\n'));
    return;
  }

  console.log(chalk.cyan('\n  注册 juice 右键菜单（当前用户，无需管理员权限）...\n'));

  // 清理所有旧版残留，避免新旧方案冲突
  cleanLegacyHklmParents();
  cleanLegacyCommandStore();

  const nodePath = getNodePath();
  const scriptPath = getJuiceScript();
  const iconPath = getIconPath();
  const pwshPath = resolvePwsh();

  let ok = true;

  // 先删除旧容器再重建，避免注册残留旧子命令（如旧版 HTML 容器的 WithConfig）
  regDelete(`${HKCU_SHELL}\\${SUB_CMDS_CONTAINER_HTML}`);
  regDelete(`${HKCU_SHELL}\\${SUB_CMDS_CONTAINER_YAML}`);

  // HTML 容器：generate + snippet + pwsh
  const htmlContainer = `${HKCU_SHELL}\\${SUB_CMDS_CONTAINER_HTML}`;
  registerSubCommands(htmlContainer, 'html', nodePath, scriptPath, iconPath, pwshPath);

  // YAML 容器：config + pwsh
  const yamlContainer = `${HKCU_SHELL}\\${SUB_CMDS_CONTAINER_YAML}`;
  registerSubCommands(yamlContainer, 'yaml', nodePath, scriptPath, iconPath, pwshPath);

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
    (pwshPath ? `      └── 📂 打开 PowerShell\n` : '') +
    `\n  ${chalk.bold('.yaml / .yml')} 文件右键：\n` +
    `    ${chalk.bold('📧 用 juice 生成邮件 HTML')}\n` +
    (pwshPath
      ? `      ├── ⚙️ 作为配置，拼接邮件 HTML  →  juice -c（交互选择品牌/模板/片段）\n` +
        `      └── 📂 打开 PowerShell\n`
      : `      └── ⚙️ 作为配置，拼接邮件 HTML  →  juice -c（交互选择品牌/模板/片段）\n`) +
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

  // 清理 HKCU 父菜单（4 个文件类型）
  const allRoots = [...HTML_ROOTS, ...YAML_ROOTS];
  for (const root of allRoots) {
    if (regDelete(`${root}\\${PARENT_KEY_NAME}`)) removed++;
  }

  // 清理两个子命令容器
  if (regDelete(`${HKCU_SHELL}\\${SUB_CMDS_CONTAINER_HTML}`)) removed++;
  if (regDelete(`${HKCU_SHELL}\\${SUB_CMDS_CONTAINER_YAML}`)) removed++;

  // 清理旧版共享容器（v2.1.14 之前只有一个容器）
  regDelete(`${HKCU_SHELL}\\JuiceEmail.SubCommands`);

  // 清理旧版残留（HKLM 父菜单 + CommandStore）
  cleanLegacyHklmParents();
  cleanLegacyCommandStore();

  if (removed > 0) {
    console.log(chalk.green(`  ✔ 已移除 ${removed} 个右键菜单项。\n`));
  } else {
    console.log(chalk.gray('  ℹ  未找到已注册的右键菜单，无需卸载。\n'));
  }
}

module.exports = { registerContextMenu, unregisterContextMenu };
