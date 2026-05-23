#!/usr/bin/env node
// Smoke test: verify CLI starts, normal mode produces output files

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const JUICE = `"${process.execPath}" "${path.resolve(__dirname, '..', 'bin', 'juice.js')}"`;
const EDM = path.resolve(__dirname, '..', 'edm');
const TMP = path.resolve(__dirname, '..', 'test', '.tmp');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
  }
}

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

console.log('\nSmoke tests:\n');

test('juice --help exits 0', () => {
  execSync(`${JUICE} --help`, { stdio: 'pipe' });
});

test('juice --version shows version', () => {
  const out = execSync(`${JUICE} --version`, { encoding: 'utf8', stdio: 'pipe' });
  if (!/\d+\.\d+\.\d+/.test(out)) throw new Error('no version in output');
});

test('juice -f template.html produces output', () => {
  const template = path.join(EDM, 'elabscience', 'templates', 'standard', 'template.html');
  const src = path.join(TMP, 'test.html');
  fs.copyFileSync(template, src);

  execSync(`${JUICE} -f "${src}"`, { stdio: 'pipe', cwd: TMP });

  const normal = path.join(TMP, 'test.output.html');
  const minified = path.join(TMP, 'test.minified.html');
  if (!fs.existsSync(normal)) throw new Error('missing .output.html');
  if (!fs.existsSync(minified)) throw new Error('missing .minified.html');
  if (fs.statSync(minified).size >= fs.statSync(normal).size) throw new Error('minified not smaller');
});

test('rawHtml: true renders HTML tags in variables', () => {
  const template = path.join(TMP, 'rawtest.html');
  const config = path.join(TMP, 'rawtest.yaml');
  fs.writeFileSync(template, '<p>{{val}}</p>');
  fs.writeFileSync(config, 'rawHtml: true\nvariables:\n  val: "<sup>test</sup>"');

  execSync(`${JUICE} -f "${template}" -c "${config}"`, { stdio: 'pipe', cwd: TMP });

  const output = fs.readFileSync(path.join(TMP, 'rawtest.output.html'), 'utf8');
  if (!output.includes('<sup>test</sup>')) throw new Error('HTML tag not rendered');
  if (output.includes('&lt;sup&gt;')) throw new Error('HTML tag was escaped');
});

test('juice -c with nonexistent config throws', () => {
  try {
    execSync(`${JUICE} -c ./nonexistent.yaml -f "${path.join(EDM, 'elabscience', 'templates', 'standard', 'template.html')}"`, { stdio: 'pipe' });
    throw new Error('should have failed');
  } catch (e) {
    // expected
  }
});

fs.rmSync(TMP, { recursive: true, force: true });

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
