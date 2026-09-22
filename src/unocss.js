import chalk from 'chalk';

/**
 * 内建 UnoCSS 编译（opt-in）
 *
 * 设计：
 *   - 仅在使用方显式启用（CLI --unocss 或配置 unocss: true）时才加载 @unocss/core /
 *     @unocss/preset-wind3（这两个包放在 optionalDependencies，核心邮件链路不硬依赖）。
 *   - email-safe：关闭 preflights（不注入全局 reset，避免破坏邮件客户端默认样式）、
 *     关闭 @layer 包裹（扁平输出，邮件客户端兼容性更好）、生成纯值原子 CSS（无 CSS 变量）。
 *   - 生成的 CSS 注入 <head> 的 <style> 后，交给 juice 统一内联到元素 style 属性。
 *
 * 注意：UnoCSS 仅扫描 class 属性里的工具类，无法解析 Handlebars 动态 class
 * （如 class="{{cls}}"）；用户应使用静态工具类。
 */

let _generatorPromise = null;

async function getGenerator() {
  if (!_generatorPromise) {
    _generatorPromise = (async () => {
      let coreMod;
      let presetMod;
      try {
        [coreMod, presetMod] = await Promise.all([
          import('@unocss/core'),
          import('@unocss/preset-wind3'),
        ]);
      } catch (err) {
        throw new Error(
          '未找到 UnoCSS 依赖。请先安装：npm install @unocss/core @unocss/preset-wind3',
          { cause: err },
        );
      }
      const { createGenerator } = coreMod;
      const presetWind3 = presetMod.default || presetMod.presetWind3;
      if (typeof presetWind3 !== 'function') {
        throw new Error('@unocss/preset-wind3 导出异常，请检查安装版本。');
      }
      return createGenerator({
        presets: [presetWind3()],
        // email-safe：不注入全局 reset / preflight，避免破坏邮件客户端默认样式
        preflights: false,
        // 扁平输出，不包裹 @layer（邮件客户端对 @layer 支持差）
        layerEnabled: false,
      });
    })();
  }
  return _generatorPromise;
}

/**
 * 把 UnoCSS 生成的 CSS 处理为 email-safe 形态：
 *   - 去掉 UnoCSS 注入的 --un-* 自定义属性声明，并把 var(--un-*) 就地替换为具体值
 *     （邮件客户端不支持 CSS 变量，否则 background-color 等会整体失效）；
 *   - 归一化颜色：rgb(R G B / A) → rgba(R,G,B,A)（逗号语法兼容性更好）；
 *   - 清掉 /* layer: default *\/ 注释噪声（已关闭 @layer，仅剩注释）。
 * @param {string} css
 * @returns {string}
 */
function emailSafe(css) {
  if (!css) return css;

  // 1. 收集并移除 --un-* 自定义属性声明，同时把 var(--un-*) 替换为对应值
  const vars = {};
  css = css.replace(/--un-([\w-]+)\s*:\s*([^;]+);/g, (m, name, val) => {
    vars[name.trim()] = val.trim();
    return '';
  });
  css = css.replace(/var\(\s*--un-([\w-]+)\s*\)/g, (m, name) => vars[name.trim()] ?? '1');

  // 2. rgb(R G B / A) → rgba(R,G,B,A)；rgb(R G B) → rgb(R,G,B)
  css = css.replace(
    /rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+)\s*)?\)/g,
    (m, r, g, b, a) => (a ? `rgba(${r},${g},${b},${a})` : `rgb(${r},${g},${b})`),
  );

  // 3. 清掉 /* ... */ 注释
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');

  return css;
}

/**
 * 编译 UnoCSS 工具类为原子 CSS（已做 email-safe 处理）。
 * @param {string} html 已渲染的 HTML（含 class 属性）
 * @returns {Promise<string>} CSS 文本（可能为空）
 */
export async function compileUnoCss(html) {
  const generator = await getGenerator();
  const { css } = await generator.generate(html, { preflights: false });
  return emailSafe(css || '');
}

/**
 * 将生成的 CSS 注入 <head>（无 <head> 则追加到文档末尾）。
 * @param {string} html
 * @param {string} css
 * @returns {string}
 */
export function injectUnoStyle(html, css) {
  if (!css || !css.trim()) return html;
  const styleTag = `<style data-unocss="atomic">\n${css}\n</style>`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}\n${styleTag}`);
  }
  return `${html}\n${styleTag}`;
}

/**
 * 统一的 UnoCSS 应用入口（opt-in）。
 * @param {string} html 即将交给 juice 内联的 HTML
 * @param {boolean} enabled 是否启用
 * @returns {Promise<string>}
 */
export async function applyUnoCss(html, enabled) {
  if (!enabled) return html;
  const css = await compileUnoCss(html);
  return injectUnoStyle(html, css);
}
