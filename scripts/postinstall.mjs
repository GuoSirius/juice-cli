#!/usr/bin/env node
/**
 * postinstall 钩子：在「桌面环境 + 有右键菜单」时默认注册 Windows 右键菜单。
 *
 * 右键菜单（Explorer 上下文菜单）仅在 Windows 桌面的图形外壳中存在；
 * 在 CI、SSH-headless、容器或纯服务器环境下注册没有意义，也不应产生副作用。
 * 这种情况下仅打印提示并跳过，用户仍可显式执行 `juice --install` 手动注册
 * （bin/juice.js 内的 registerContextMenu 自带 isWindows 守卫）。
 */
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 判断当前是否为可注册右键菜单的 Windows 交互式桌面会话。
 * @returns {boolean}
 */
function hasDesktopContextMenu() {
  // 右键菜单仅 Windows 平台存在
  if (process.platform !== 'win32') return false;
  // CI 环境通常无图形桌面
  if (process.env.CI && process.env.CI !== 'false') return false;
  // SSH / 无图形外壳的远程会话
  if (process.env.SSH_CONNECTION || process.env.SSH_TTY) return false;
  // 交互式登录会话会暴露 SESSIONNAME（Console / RDP-Tcp#...）；
  // 缺失时不强制否定，交由显式 juice --install 处理。
  return true;
}

if (!hasDesktopContextMenu()) {
  console.log('\n  [juice] 非桌面环境，跳过右键菜单自动注册。');
  console.log('  [juice] 如需手动注册，请在 Windows 桌面执行：juice --install\n');
  process.exit(0);
}

const script = path.resolve(__dirname, '..', 'bin', 'juice.js');
const result = spawnSync(process.execPath, [script, '--install'], { stdio: 'inherit' });
process.exit(result.status ?? 0);
