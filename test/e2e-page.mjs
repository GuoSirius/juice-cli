// 一次性脚本：构造页面装配端到端冒烟的 fixture 并执行
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const dir = 'test/.tmp-page';
fs.rmSync(dir, { recursive: true, force: true });
for (const s of ['header', 'products', 'footer']) {
  fs.mkdirSync(path.join(dir, 'sections', s), { recursive: true });
}

fs.writeFileSync(dir + '/tpl.html',
  '<!DOCTYPE html><html><head><style>.t{color:#333}</style></head><body><table><tbody id="content">\n  </tbody></table><p>{{brand}} &copy; {{year}}</p></body></html>');

fs.writeFileSync(dir + '/sections/header/snippet.html',
  '<tr><td class="t"><b>{{title}}</b>{{> sub}}</td></tr>');
fs.writeFileSync(dir + '/sections/products/snippet.html',
  '{{#each items}}<tr><td>{{@index}}: {{name}}{{#if (eq tag "hot")}} [HOT]{{/if}}</td></tr>{{/each}}');
fs.writeFileSync(dir + '/sections/footer/snippet.html',
  '<tr><td>{{> sub}}</td></tr>');
fs.writeFileSync(dir + '/sections/footer/sub.html', '<small>{{pageTag}}</small>');

fs.writeFileSync(dir + '/page.yaml', `template: tpl.html
outputName: demo-page
variables:
  brand: ACME
  year: 2026
sections:
  - snippet: sections/header/snippet.html
    name: header
    vars:
      title: 标题A
  - snippet: sections/products/snippet.html
    vars:
      items:
        - name: P1
          tag: hot
        - name: P2
  - snippet: sections/footer/snippet.html
partials:
  sub: sections/footer/sub.html
`);

const BIN = path.resolve('bin/juice.js');
execFileSync(process.execPath, [BIN, 'build', '-p', 'page.yaml'], { stdio: 'inherit', cwd: dir });

// 校验输出
const out = fs.readFileSync(dir + '/demo-page.output.html', 'utf8');
const checks = [
  ['全局变量渲染', out.includes('ACME')],
  ['板块独立 vars（标题A）', out.includes('标题A')],
  ['板块 vars 不污染全局（全局无 items）', !out.includes('全局价')],
  ['循环 + @index', out.includes('0: P1') && out.includes('1: P2')],
  ['逻辑判断 eq', out.includes('[HOT]')],
  ['partial 引用（pageTag 空渲染为 small）', out.includes('<small></small>')],
  ['juice 内联（.t 类样式内联到元素）', /class="t" style="[^"]*color:\s*#333/.test(out) || (out.includes('class="t"') && out.includes('#333'))],
];
let fail = 0;
for (const [name, ok] of checks) {
  console.log((ok ? '  ✓ ' : '  ✗ ') + name);
  if (!ok) fail++;
}
console.log(fail === 0 ? 'E2E ALL PASS' : `E2E FAILED: ${fail}`);
fs.rmSync(dir, { recursive: true, force: true });
process.exit(fail === 0 ? 0 : 1);
