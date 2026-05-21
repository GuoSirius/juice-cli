'use strict';

/**
 * Windows 右键菜单注册 / 取消注册
 *
 * 风格参考 PowerShell 7 的右键菜单实现：
 *   - 使用 MUIVerb（菜单显示文字）+ Icon 键
 *   - 通过 ExtendedSubCommandsKey 实现子菜单（"用 juice 处理" → 子项）
 *   - 注册到 SystemFileAssociations，兼容任意关联方式打开的 .html/.htm
 *
 * 菜单结构：
 *   📧 用 juice 生成邮件 HTML
 *     ├── ⚡ 生成邮件 HTML（标准 + 压缩）
 *     ├── 🧩 邮件片段组装（交互选择模板）
 *     └── 📂 在此目录打开 PowerShell
 *
 * 需要以管理员权限运行。
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
  } catch (e) {
    const msg = e.stderr ? e.stderr.toString().trim() : e.message;
    console.warn(chalk.yellow(`  ⚠  reg add 失败（可能需要管理员权限）\n     键：${key}\n     原因：${msg}`));
  }
}

/**
 * 执行 reg delete，键不存在时静默忽略
 */
function regDelete(key) {
  try {
    execSync(`reg delete "${key}" /f`, { stdio: 'pipe' });
  } catch (_) {}
}

/**
 * 转义注册表数据中的特殊字符（反斜杠和双引号）
 */
function escapeRegData(str) {
  // reg.exe 中反斜杠需要双写，双引号需要转义
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// ─── 菜单结构常量 ─────────────────────────────────────────────────────────────

// 根键：SystemFileAssociations 对 .html/.htm 通用
const ROOTS = [
  'HKEY_CLASSES_ROOT\\SystemFileAssociations\\.html\\shell',
  'HKEY_CLASSES_ROOT\\SystemFileAssociations\\.htm\\shell',
];

// 父菜单键名（与 PowerShell 7 风格保持一致：不含特殊字符的英文键名）
const PARENT_KEY_NAME = 'JuiceEmail';
// 子命令注册表空间（SubCommands 引用的命令存放在 shell\JuiceEmail.SubCommands 下）
// PowerShell 7 的做法：在 shell 同级放一个专用 SubCommands 键
const SUBCMD_SPACE = 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\CommandStore\\shell';

// ─── 注册 ─────────────────────────────────────────────────────────────────────

async function registerContextMenu() {
  console.log(chalk.cyan('\n  注册 juice 右键菜单（PowerShell 7 风格）...\n'));

  const nodePath = getNodePath();
  const scriptPath = getJuiceScript();
  const iconPath = getIconPath();

  // 子命令 1：生成（标准 + 压缩）
  const subCmd1 = `JuiceEmail.Generate`;
  // 子命令 2：片段组装
  const subCmd2 = `JuiceEmail.Snippet`;
  // 子命令 3：在此打开 PowerShell（可选便利项）
  const subCmd3 = `JuiceEmail.OpenPwsh`;

  // ── 注册子命令到 CommandStore ─────────────────────────────────────────────

  // 子命令 1：普通模式 - juice 生成
  const generateCmd = `"${nodePath}" "${scriptPath}" -f "%1"`;
  regAdd(`${SUBCMD_SPACE}\\${subCmd1}`, '', 'REG_SZ', '⚡ 生成邮件 HTML（标准 + 压缩）');
  regAdd(`${SUBCMD_SPACE}\\${subCmd1}`, 'Icon', 'REG_SZ', iconPath);
  regAdd(`${SUBCMD_SPACE}\\${subCmd1}\\command`, '', 'REG_SZ', generateCmd);

  // 子命令 2：片段模式 - 片段组装（交互选择模板）
  const snippetCmd = `"${nodePath}" "${scriptPath}" -s "%1"`;
  regAdd(`${SUBCMD_SPACE}\\${subCmd2}`, '', 'REG_SZ', '🧩 邮件片段组装（交互选择模板）');
  regAdd(`${SUBCMD_SPACE}\\${subCmd2}`, 'Icon', 'REG_SZ', iconPath);
  regAdd(`${SUBCMD_SPACE}\\${subCmd2}\\command`, '', 'REG_SZ', snippetCmd);

  // 子命令 3：在文件目录打开 pwsh（如果安装了 PowerShell 7）
  const pwshPath = resolvePwsh();
  if (pwshPath) {
    const pwshCmd = `"${pwshPath}" -NoExit -Command "Set-Location -LiteralPath '%W'"`;
    regAdd(`${SUBCMD_SPACE}\\${subCmd3}`, '', 'REG_SZ', '📂 在此目录打开 PowerShell 7');
    regAdd(`${SUBCMD_SPACE}\\${subCmd3}`, 'Icon', 'REG_SZ', pwshPath);
    regAdd(`${SUBCMD_SPACE}\\${subCmd3}\\command`, '', 'REG_SZ', pwshCmd);
  }

  // ── 注册父菜单到 SystemFileAssociations ──────────────────────────────────

  let subCommands = `${subCmd1};${subCmd2}`;
  if (pwshPath) subCommands += `;${subCmd3}`;

  for (const root of ROOTS) {
    const parentKey = `${root}\\${PARENT_KEY_NAME}`;

    // MUIVerb：菜单显示文字
    regAdd(parentKey, 'MUIVerb', 'REG_SZ', '📧 用 juice 生成邮件 HTML');
    // Icon：使用自定义图标
    regAdd(parentKey, 'Icon', 'REG_SZ', iconPath);
    // SubCommands：引用 CommandStore 中的子命令（分号分隔）
    regAdd(parentKey, 'SubCommands', 'REG_SZ', subCommands);
    // Extended：取消注释可让菜单仅在按住 Shift 时显示（默认不加）
    // regAdd(parentKey, 'Extended', 'REG_SZ', '');
  }

  console.log(
    '\n' +
    chalk.green('  ✔ 右键菜单注册完成！') + '\n\n' +
    `  在 ${chalk.cyan('.html')} / ${chalk.cyan('.htm')} 文件上右键即可看到：\n` +
    `  ${chalk.bold('📧 用 juice 生成邮件 HTML')}\n` +
    `    ├── ⚡ 生成邮件 HTML（标准 + 压缩）  →  juice -f\n` +
    `    ├── 🧩 邮件片段组装（交互选择模板） →  juice -s\n` +
    (pwshPath ? `    └── 📂 在此目录打开 PowerShell 7\n` : '') +
    '\n' +
    chalk.gray('  注意：如菜单未出现，请重启文件资源管理器（explorer.exe）。\n')
  );
}

// ─── 取消注册 ─────────────────────────────────────────────────────────────────

async function unregisterContextMenu() {
  console.log(chalk.cyan('\n  取消注册 juice 右键菜单...\n'));

  for (const root of ROOTS) {
    regDelete(`${root}\\${PARENT_KEY_NAME}`);
  }

  regDelete(`${SUBCMD_SPACE}\\JuiceEmail.Generate`);
  regDelete(`${SUBCMD_SPACE}\\JuiceEmail.Snippet`);
  regDelete(`${SUBCMD_SPACE}\\JuiceEmail.OpenPwsh`);

  console.log(chalk.green('  ✔ 右键菜单已移除。\n'));
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
  // 尝试 where.exe
  try {
    const result = execSync('where pwsh', { stdio: 'pipe' }).toString().trim().split('\n')[0].trim();
    if (result && require('fs').existsSync(result)) return result;
  } catch (_) {}
  return null;
}

module.exports = { registerContextMenu, unregisterContextMenu };
