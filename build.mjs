// BIOLOGY ビルドスクリプト（依存パッケージなし）
// src/ の ES モジュールを依存順に並べて1つのスクリプトにまとめ、
// CSS とともに src/index.html に埋め込んで、ルートの index.html を出力する。
//
// 対応している構文（src/ ではこの書き方だけを使う）:
//   import { a, b as c } from './x.js';
//   export function f() {}   export const x = ...;   export let / export class
//   export { a, b };
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(ROOT, 'src');
const ENTRY = resolve(SRC, 'main.js');

const IMPORT_RE = /^\s*import\s*\{([\s\S]*?)\}\s*from\s*['"](.+?)['"];?[ \t]*$/gm;
const EXPORT_DECL_RE = /^export\s+(async\s+function\*?|function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;
const EXPORT_LIST_RE = /^export\s*\{([\s\S]*?)\};?[ \t]*$/gm;

const modules = new Map(); // abs path -> { id, code, deps }
const order = [];

function load(file, stack = []) {
  if (modules.has(file)) return;
  if (stack.includes(file)) {
    throw new Error('循環 import: ' + [...stack, file].map((f) => relative(SRC, f)).join(' -> '));
  }
  const src = readFileSync(file, 'utf8');
  if (/^\s*import\s+(?!\{)/m.test(src.replace(IMPORT_RE, ''))) {
    throw new Error(`${relative(SRC, file)}: 名前付き import 以外は未対応です`);
  }
  const deps = [];
  let code = src.replace(IMPORT_RE, (_, names, spec) => {
    const dep = resolve(dirname(file), spec);
    deps.push(dep);
    const binds = names
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const m = s.match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/);
        if (!m) throw new Error(`${relative(SRC, file)}: import 句を解釈できません: ${s}`);
        return m[2] ? `${m[1]}: ${m[2]}` : m[1];
      });
    return `const { ${binds.join(', ')} } = __m[${JSON.stringify(relative(SRC, dep))}];`;
  });
  const exported = [];
  code = code.replace(EXPORT_DECL_RE, (_, kind, name) => {
    exported.push(name);
    return `${kind} ${name}`;
  });
  code = code.replace(EXPORT_LIST_RE, (_, names) => {
    names.split(',').map((s) => s.trim()).filter(Boolean).forEach((n) => exported.push(n));
    return '';
  });
  if (/^export\s/m.test(code)) {
    throw new Error(`${relative(SRC, file)}: 未対応の export 構文があります`);
  }
  modules.set(file, { id: relative(SRC, file), code, exported });
  for (const d of deps) load(d, [...stack, file]);
  order.push(file);
}

load(ENTRY);

const bundle = [
  "'use strict';",
  'const __m = Object.create(null);',
  ...order.map((f) => {
    const m = modules.get(f);
    return `// ---- ${m.id} ----\n__m[${JSON.stringify(m.id)}] = (function () {\n${m.code.trim()}\nreturn { ${m.exported.join(', ')} };\n})();`;
  }),
].join('\n\n');

const css = readFileSync(resolve(SRC, 'styles.css'), 'utf8');
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
let html = readFileSync(resolve(SRC, 'index.html'), 'utf8');

// </script> がスクリプト中に現れると HTML が壊れるので防ぐ
const safeBundle = bundle.replace(/<\/script/gi, '<\\/script');
const buildDate = new Date().toISOString().slice(0, 10);

html = html
  .replace('/*__STYLE__*/', () => css)
  .replace('/*__SCRIPT__*/', () => `(function () {\nconst __BUILD__ = ${JSON.stringify({ version: pkg.version, date: buildDate })};\nwindow.__BIOLOGY_BUILD__ = __BUILD__;\n${safeBundle}\n})();`);

writeFileSync(resolve(ROOT, 'index.html'), html);
console.log(`index.html を出力しました（${order.length} モジュール, ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB）`);
