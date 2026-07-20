import chalk from 'chalk';

/**
 * 将字节数格式化为人类可读字符串。
 * @param {number} b 字节数
 * @returns {string} 例如 "512 B" 或 "16.6 KB"
 */
export function fmtBytes(b) {
  return b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`;
}

/**
 * 将元数据与目录名格式化为展示名称：
 * 若 _meta.name 存在且与目录名不同，显示为「名称 (目录名)」，否则仅目录名。
 */
export function formatName(meta, dirName) {
  const display = meta.name || dirName;
  return display !== dirName
    ? chalk.bold.cyan(display) + ' ' + chalk.gray(`(${dirName})`)
    : chalk.bold.cyan(dirName);
}
