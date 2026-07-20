// 集中管理散落在各模块中的魔法字符串与输出后缀。
// 改一处即可全局生效，避免「改了 A 忘了 B/C」的漂移隐患。

export const ICON_FILE = 'favicon.ico';
export const SNIPPET_FILE = 'snippet.html';
export const META_FILE = '_meta.yaml';
export const META_FILE_ALT = '_meta.yml';

// 默认配置文件候选名（按优先级从高到低排列）
export const DEFAULT_CONFIG_NAMES = ['juice.yaml', 'juice.yml'];

// 片段模式输出文件后缀（作用于不带扩展名的 baseName）
export const SNIPPET_OUTPUT_SUFFIXES = ['.raw.html', '.html', '.output.html', '.minified.html'];

// 普通模式输出文件默认后缀（可被 config.output.* 覆盖）
export const DEFAULT_NORMAL_SUFFIX = '.output.html';
export const DEFAULT_MINIFIED_SUFFIX = '.minified.html';
