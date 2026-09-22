import Handlebars from 'handlebars';

// 隔离实例：避免 helper 注册污染全局 Handlebars
const hb = Handlebars.create();

// ─── blockHelperMissing 覆写：对齐 Mustache section 语义 ─────────────────────
// Handlebars 原生把 '' 和 0 视为「真值」（渲染正块），与 Mustache（falsy → 渲染反块）
// 不一致；现有模板 {{^banner.link}}（link 为空串时）行为会翻转，必须覆写对齐。
hb.registerHelper('blockHelperMissing', function (context, options) {
  const inverse = options.inverse;
  const fn = options.fn;

  if (Array.isArray(context)) {
    if (context.length === 0) return inverse(this);
    if (options.ids) options.ids = [options.name];
    return hb.helpers.each(context, options);
  }
  // Mustache 语义：'' / 0 / false / null / undefined 均视为 falsy → 渲染反块
  if (!context) return inverse(this);
  if (options.data && options.ids) {
    const data = hb.Utils.createFrame(options.data);
    data.contextPath = hb.Utils.appendContextPath(options.data.contextPath, options.name);
    options = { data };
  }
  // Mustache 语义：对象 section 压栈上下文；字符串/数字/布尔 section 保持父级上下文
  // （否则 {{#email}}mailto:{{email}}{{/email}} 这类块内父级引用会渲染为空）
  return fn(typeof context === 'object' ? context : this, options);
});

// ─── 内置逻辑判断 helper（需求④：循环索引之外的必要逻辑） ────────────────────
// 用法：{{#if (eq status "active")}}...{{/if}}、{{#if (gt count 3)}}...{{/if}}
hb.registerHelper({
  eq: (a, b) => a === b,
  ne: (a, b) => a !== b,
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
  and: (...args) => {
    args.pop(); // 末位为 Handlebars options 对象
    return args.every(Boolean);
  },
  or: (...args) => {
    args.pop();
    return args.some(Boolean);
  },
  not: (v) => !v,
});

/**
 * 统一模板渲染入口（原 Mustache 渲染的 Handlebars 等价实现）。
 *
 * 引擎映射说明：
 *   - rawHtml: true  → 编译选项 noEscape: true（与原 Mustache.escape=identity 行为一致，
 *                      变量值中的 <sup> 等标签直接渲染）
 *   - rawHtml: false → Handlebars 默认转义（与原 Mustache 默认行为一致）
 *   - {{{var}}}      → 恒不转义（Handlebars 原生，不受 rawHtml 影响）
 *   - {{#list}}      → 数组迭代（与 Mustache 兼容）
 *   - {{#each list}} → 额外提供 @index / @first / @last（需求④：循环索引）
 *   - {{> name}}     → partial 引入（partials 参数传入 name → 内容映射）
 *
 * @param {string} source 模板源（HTML + Handlebars/Mustache 语法）
 * @param {object} vars   渲染上下文
 * @param {{rawHtml?:boolean, partials?:Record<string,string>|null}} [opts]
 * @returns {string}
 */
export function renderTemplate(source, vars, { rawHtml = false, partials = null } = {}) {
  const compileOpts = rawHtml ? { noEscape: true } : {};
  const compiled = hb.compile(source, compileOpts);
  const runtimeOpts = partials ? { partials } : undefined;
  return compiled(vars || {}, runtimeOpts);
}

export { hb as handlebars };
