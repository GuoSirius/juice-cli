'use strict';

/**
 * Windows 右键菜单注册 / 取消注册
 *
 * 使用 HKEY_CURRENT_USER，无需管理员权限，仅对当前用户生效。
 *
 * 菜单结构（所有文件类型统一）：
 *   .html / .htm / .yaml / .yml：
 *     📧 用 juice 生成邮件 HTML
 *       ├── 📄 作为模板，生成邮件 HTML   → juice -f（后台执行）
 *       ├── 🧩 作为片段，拼接邮件 HTML   → juice -s（交互选择模板）
 *       ├── ⚙️ 作为配置，拼接邮件 HTML   → juice -c（交互选择品牌/模板/片段）
 *       └── 📂 打开 PowerShell        （可选）
 */

const { execSync } = require('child_process');
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

/**
 * 执行 reg add，失败时打印警告而不中断
 */
function regAdd(key, valueName, type, data) {
  const vFlag = valueName === '' ? '/ve' : `/v "${valueName}"`;
  const tFlag = type ? `/t ${type}` : '';
  const dFlag = data !== undefined ? `/d "${escapeRegData(data)}"` : '';
  const cmd = `reg add "${key}" ${vFlag} ${tFlag} ${dFlag} /f`.replace(/\s+/g, ' ').trim();
  try {
    execSync(cmd, { stdio: 'pipe' });
    return true;
  } catch (e) {
    const msg = e.stderr ? e.stderr.toString().trim() : e.message;
    console.warn(chalk.yellow(`  ⚠  reg add 失败\n     键：${key}\n     原因：${msg}`));
    return false;
  }
}

/**
 * 执行 reg delete，键不存在时静默忽略，返回是否实际删除了
 */
function regDelete(key) {
  try {
    execSync(`reg delete "${key}" /f`, { stdio: 'pipe' });
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * 转义注册表数据中的特殊字符
 */
function escapeRegData(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/%/g, '%%');
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

// CommandStore 子命令注册空间
const SUBCMD_SPACE = 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\CommandStore\\shell';

// 子命令名称常量（register / unregister 共用，避免硬编码不一致）
const SUBCMDS = {
  generate: 'JuiceEmail.Generate',
  snippet:  'JuiceEmail.Snippet',
  config:   'JuiceEmail.WithConfig',
  pwsh:     'JuiceEmail.OpenPwsh',
};

const PARENT_KEY_NAME = 'JuiceEmail';

/**
 * 为需要交互式终端输入的命令包一层 powershell -NoExit，
 * 从右键菜单启动时才能正常显示 inquirer 提示。
 * -f 命令不需要（非交互模式，直接生成文件）
 */
function wrapInteractive(nodePath, scriptPath, cliArgs) {
  return `powershell.exe -NoExit -Command "& '${nodePath}' '${scriptPath}' ${cliArgs}"`;
}

// ─── 注册 ─────────────────────────────────────────────────────────────────────

async function registerContextMenu() {
  console.log(chalk.cyan('\n  注册 juice 右键菜单（当前用户，无需管理员权限）...\n'));

  const nodePath = getNodePath();
  const scriptPath = getJuiceScript();
  const iconPath = getIconPath();

  let ok = true;

  // ── 子命令 1：普通模式 - juice 生成（非交互，不需终端）─────────────────
  const generateCmd = `"${nodePath}" "${scriptPath}" -f %1`;
  ok = regAdd(`${SUBCMD_SPACE}\\${SUBCMDS.generate}`, '', 'REG_SZ', '📄 作为模板，生成邮件 HTML') && ok;
  regAdd(`${SUBCMD_SPACE}\\${SUBCMDS.generate}`, 'Icon', 'REG_SZ', iconPath);
  regAdd(`${SUBCMD_SPACE}\\${SUBCMDS.generate}\\command`, '', 'REG_SZ', generateCmd);

  // ── 子命令 2：片段模式 - 片段组装（交互，需要终端）────────────────────────
  const snippetCmd = wrapInteractive(nodePath, scriptPath, '-s %1');
  ok = regAdd(`${SUBCMD_SPACE}\\${SUBCMDS.snippet}`, '', 'REG_SZ', '🧩 作为片段，拼接邮件 HTML') && ok;
  regAdd(`${SUBCMD_SPACE}\\${SUBCMDS.snippet}`, 'Icon', 'REG_SZ', iconPath);
  regAdd(`${SUBCMD_SPACE}\\${SUBCMDS.snippet}\\command`, '', 'REG_SZ', snippetCmd);

  // ── 子命令 3：配置文件模式 - 交互式生成（交互，需要终端）──────────────────
  const configCmd = wrapInteractive(nodePath, scriptPath, '-c %1');
  ok = regAdd(`${SUBCMD_SPACE}\\${SUBCMDS.config}`, '', 'REG_SZ', '⚙️ 作为配置，拼接邮件 HTML') && ok;
  regAdd(`${SUBCMD_SPACE}\\${SUBCMDS.config}`, 'Icon', 'REG_SZ', iconPath);
  regAdd(`${SUBCMD_SPACE}\\${SUBCMDS.config}\\command`, '', 'REG_SZ', configCmd);

  // ── 子命令 4：在文件目录打开 pwsh（可选）──────────────────────────────────
  const pwshPath = resolvePwsh();
  if (pwshPath) {
    const pwshCmd = `"${pwshPath}" -NoExit -Command "Set-Location -LiteralPath (Split-Path '%1')"`;
    ok = regAdd(`${SUBCMD_SPACE}\\${SUBCMDS.pwsh}`, '', 'REG_SZ', '📂 打开 PowerShell') && ok;
    regAdd(`${SUBCMD_SPACE}\\${SUBCMDS.pwsh}`, 'Icon', 'REG_SZ', pwshPath);
    regAdd(`${SUBCMD_SPACE}\\${SUBCMDS.pwsh}\\command`, '', 'REG_SZ', pwshCmd);
  }

  // ── 所有文件类型共用同一套子命令 ────────────────────────────────────────
  const allSubs = pwshPath
    ? `${SUBCMDS.generate};${SUBCMDS.snippet};${SUBCMDS.config};${SUBCMDS.pwsh}`
    : `${SUBCMDS.generate};${SUBCMDS.snippet};${SUBCMDS.config}`;

  // .html / .htm
  for (const root of HTML_ROOTS) {
    const parentKey = `${root}\\${PARENT_KEY_NAME}`;
    ok = regAdd(parentKey, 'MUIVerb', 'REG_SZ', '📧 用 juice 生成邮件 HTML') && ok;
    regAdd(parentKey, 'Icon', 'REG_SZ', iconPath);
    regAdd(parentKey, 'SubCommands', 'REG_SZ', allSubs);
  }

  // .yaml / .yml（与 .html 共享同一套子命令）
  for (const root of YAML_ROOTS) {
    const parentKey = `${root}\\${PARENT_KEY_NAME}`;
    ok = regAdd(parentKey, 'MUIVerb', 'REG_SZ', '📧 用 juice 生成邮件 HTML') && ok;
    regAdd(parentKey, 'Icon', 'REG_SZ', iconPath);
    regAdd(parentKey, 'SubCommands', 'REG_SZ', allSubs);
  }

  // ── 输出 ──────────────────────────────────────────────────────────────────
  if (!ok) {
    console.log(chalk.yellow('  ⚠  部分注册表项写入失败，右键菜单可能不完整。\n'));
  }

  console.log(
    '\n' +
    chalk.green('  ✔ 右键菜单注册完成！') + '\n\n' +
    `  ${chalk.bold('.html / .htm / .yaml / .yml')} 文件右键：\n` +
    `    ${chalk.bold('📧 用 juice 生成邮件 HTML')}\n` +
    `      ├── 📄 作为模板，生成邮件 HTML  →  juice -f（后台执行）\n` +
    `      ├── 🧩 作为片段，拼接邮件 HTML  →  juice -s（交互选择模板）\n` +
    `      ├── ⚙️ 作为配置，拼接邮件 HTML  →  juice -c（交互选择品牌/模板/片段）\n` +
    (pwshPath ? `      └── 📂 打开 PowerShell\n` : '') +
    '\n' +
    chalk.gray('  注意：如菜单未出现，请重启文件资源管理器（explorer.exe）。\n')
  );
}

// ─── 取消注册 ─────────────────────────────────────────────────────────────────

async function unregisterContextMenu() {
  console.log(chalk.cyan('\n  取消注册 juice 右键菜单...\n'));

  let removed = 0;

  // 清理 HTML 父菜单
  for (const root of HTML_ROOTS) {
    if (regDelete(`${root}\\${PARENT_KEY_NAME}`)) removed++;
  }

  // 清理 YAML 父菜单
  for (const root of YAML_ROOTS) {
    if (regDelete(`${root}\\${PARENT_KEY_NAME}`)) removed++;
  }

  // 清理子命令
  for (const name of Object.values(SUBCMDS)) {
    regDelete(`${SUBCMD_SPACE}\\${name}`);
  }

  if (removed > 0) {
    console.log(chalk.green(`  ✔ 已移除 ${removed} 个右键菜单项。\n`));
  } else {
    console.log(chalk.gray('  ℹ  未找到已注册的右键菜单，无需卸载。\n'));
  }
}

// ─── 工具：查找 PowerShell 7 ─────────────────────────────────────────────────

function resolvePwsh() {
  const candidates = [
    'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
    'C:\\Program Files (x86)\\PowerShell\\7\\pwsh.exe',
    path.join(process.env['LOCALAPPDATA'] || '', 'Microsoft', 'PowerShell', 'pwsh.exe'),
  ];
  for (const p of candidates) {
    if (require('fs').existsSync(p)) return p;
  }
  try {
    const result = execSync('where pwsh', { stdio: 'pipe' }).toString().trim().split('\n')[0].trim();
    if (result && require('fs').existsSync(result)) return result;
  } catch (_) {}
  return null;
}

module.exports = { registerContextMenu, unregisterContextMenu };
