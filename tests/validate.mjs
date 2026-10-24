// 自動検証スクリプト：node tests/validate.mjs
//  1. 全問題ジェネレーターを各5,000回実行し、問題文・選択肢・解説・図の不備を検査する
//  2. 各ステージのジェネレーター数（8種類以上）と、計算・グラフ読み取り・用語の3系統がそろうか
//  3. 用語チェック（旧用語が残っていないか）
//  4. 単一HTML・完全オフライン（外部への参照がないか）
//  5. ライト/ダーク両テーマの色トークンのコントラスト
//  6. 引き継ぎコードの往復（作成→読み込み）
// 1件でも問題があれば終了コード1で終わる。
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GENERATORS } from '../src/questions/index.js';
import { generate } from '../src/questions/common.js';
import { STAGES } from '../src/stages.js';
import { emptyProgress, normalize } from '../src/progress.js';
import { encodeProgress, decodeProgress } from '../src/transfer.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RUNS = Number(process.env.RUNS) || 5000;
const DETERMINISM_RUNS = 300;
let failures = 0;
const lines = [];
const log = (s = '') => {
  lines.push(s);
  console.log(s);
};
const fail = (msg) => {
  failures++;
  log('  ✗ ' + msg);
};

// ---------- 1. 問題ジェネレーター ----------
const BAD_TEXT = /NaN|undefined|Infinity|\bnull\b|\[object /;
const REASON = /から|ため|ので/;

function badNumbers(obj, path = 'chart') {
  const out = [];
  if (typeof obj === 'number') {
    if (!Number.isFinite(obj)) out.push(path);
  } else if (typeof obj === 'string') {
    if (BAD_TEXT.test(obj)) out.push(path + '="' + obj + '"');
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => out.push(...badNumbers(v, `${path}[${i}]`)));
  } else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) if (v !== null) out.push(...badNumbers(v, `${path}.${k}`));
  }
  return out;
}

const CATS = ['空文字', 'NaN/undefined/Infinity混入', '選択肢の重複', '正答が選択肢にない/複数', '選択肢が4つでない', '解説が2〜3文でない', '解説に理由がない', '図の数値異常', '例外', '難易度・種類の不正', '再現性（同じシードで同じ問題）'];
const totals = Object.fromEntries(CATS.map((c) => [c, 0]));
const perGen = [];
const t0 = Date.now();
log(`# 1. 問題ジェネレーター検証（各 ${RUNS.toLocaleString()} 回）`);
for (const g of GENERATORS) {
  const counts = Object.fromEntries(CATS.map((c) => [c, 0]));
  const examples = {};
  const hit = (cat, ex) => {
    counts[cat]++;
    if (!examples[cat]) examples[cat] = ex;
  };
  if (![1, 2, 3].includes(g.level) || !['calc', 'graph', 'term'].includes(g.kind) || !STAGES.some((s) => s.id === g.stage)) hit('難易度・種類の不正', g.id);
  for (let seed = 0; seed < RUNS; seed++) {
    let q;
    try {
      q = generate(g, seed);
    } catch (e) {
      hit('例外', `seed=${seed}: ${e.message}`);
      continue;
    }
    const texts = [q.text, q.explanation, ...q.choices];
    if (texts.some((s) => typeof s !== 'string' || !s.trim())) hit('空文字', `seed=${seed}`);
    const bad = texts.find((s) => BAD_TEXT.test(String(s)));
    if (bad) hit('NaN/undefined/Infinity混入', `seed=${seed}: ${bad}`);
    if (q.choices.length !== 4) hit('選択肢が4つでない', `seed=${seed}`);
    const shown = q.choices.map((c) => String(c).trim());
    if (new Set(shown).size !== shown.length) hit('選択肢の重複', `seed=${seed}: ${shown.join(' | ')}`);
    const nCorrect = shown.filter((c) => c === String(q.correct).trim()).length;
    if (q.choices[q.answer] !== q.correct || nCorrect !== 1) hit('正答が選択肢にない/複数', `seed=${seed}`);
    const sentences = q.explanation.split('。').filter((s) => s.trim()).length;
    if (sentences < 2 || sentences > 3) hit('解説が2〜3文でない', `seed=${seed}: ${q.explanation}`);
    if (!REASON.test(q.explanation)) hit('解説に理由がない', `seed=${seed}: ${q.explanation}`);
    if (q.chart) {
      const b = badNumbers(q.chart);
      if (b.length) hit('図の数値異常', `seed=${seed}: ${b[0]}`);
    }
    if (seed < DETERMINISM_RUNS) {
      const again = generate(g, seed);
      if (JSON.stringify(again) !== JSON.stringify(q)) hit('再現性（同じシードで同じ問題）', `seed=${seed}`);
    }
  }
  const errs = CATS.reduce((a, c) => a + counts[c], 0);
  CATS.forEach((c) => (totals[c] += counts[c]));
  perGen.push({ id: g.id, stage: g.stage, level: g.level, kind: g.kind, errs });
  if (errs) {
    fail(`${g.id}: ${errs} 件`);
    for (const [c, ex] of Object.entries(examples)) log(`      ${c}: ${ex}`);
  }
}
const nQ = GENERATORS.length * RUNS;
log(`ジェネレーター ${GENERATORS.length} 種 × ${RUNS.toLocaleString()} 回 ＝ ${nQ.toLocaleString()} 問を検査（${((Date.now() - t0) / 1000).toFixed(1)} 秒）`);
log('');
log('| 検査項目 | 不備の件数 |');
log('|---|---|');
for (const c of CATS) log(`| ${c} | ${totals[c]} |`);
log('');

// ---------- 2. ステージごとの構成 ----------
log('# 2. ステージごとのジェネレーター構成');
log('');
log('| ステージ | 種類数 | 計算 | グラフ | 用語 | ★ | ★★ | ★★★ | 判定 |');
log('|---|---|---|---|---|---|---|---|---|');
for (const s of STAGES) {
  const gs = GENERATORS.filter((g) => g.stage === s.id);
  const k = (kind) => gs.filter((g) => g.kind === kind).length;
  const l = (lv) => gs.filter((g) => g.level === lv).length;
  const ok = gs.length >= 8 && k('calc') && k('graph') && k('term');
  log(`| ${s.code} ${s.title} | ${gs.length} | ${k('calc')} | ${k('graph')} | ${k('term')} | ${l(1)} | ${l(2)} | ${l(3)} | ${ok ? 'OK' : 'NG'} |`);
  if (!ok) fail(`${s.code}: 種類数8以上・3系統の条件を満たしていません`);
}
const ids = GENERATORS.map((g) => g.id);
if (new Set(ids).size !== ids.length) fail('ジェネレーターIDが重複しています');
log('');

// ---------- 3. 用語チェック ----------
log('# 3. 用語チェック（旧用語）');
const OLD = [String.fromCharCode(0x512a, 0x6027), String.fromCharCode(0x52a3, 0x6027)]; // 旧用語2語（このファイル自身が検出されないよう文字コードで作る）
const scanTargets = ['src', 'tests', 'build.mjs', 'index.html', 'README.md', 'QA_REPORT.md'];
function walk(p) {
  const full = join(ROOT, p);
  let st;
  try {
    st = statSync(full);
  } catch (e) {
    return [];
  }
  if (st.isDirectory()) return readdirSync(full).flatMap((f) => walk(join(p, f)));
  return [p];
}
const files = scanTargets.flatMap(walk);
let oldHits = 0;
for (const f of files) {
  const txt = readFileSync(join(ROOT, f), 'utf8');
  txt.split('\n').forEach((line, i) => {
    for (const w of OLD) {
      if (line.includes(w)) {
        oldHits++;
        fail(`${f}:${i + 1} に旧用語「${w}」`);
      }
    }
  });
}
log(`${files.length} ファイルを検査：旧用語 ${oldHits} 件`);
log('');

// ---------- 4. 単一HTML・オフライン ----------
log('# 4. 単一HTML・完全オフライン');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const OFFLINE = [
  [/https?:\/\//i, '外部URL（http/https）'],
  [/<script[^>]+src=/i, '外部スクリプトの読み込み'],
  [/<link[^>]+href=/i, '外部スタイル・フォントの読み込み'],
  [/@import/i, 'CSS @import'],
  [/\bfetch\s*\(/, 'fetch による通信'],
  [/XMLHttpRequest/, 'XMLHttpRequest による通信'],
  [/sendBeacon/, 'sendBeacon による通信'],
  [/WebSocket/, 'WebSocket による通信'],
  [/\bimport\s*\(/, '動的 import'],
];
for (const [re, name] of OFFLINE) {
  if (re.test(html)) fail(`index.html に ${name} があります`);
}
const srcFiles = walk('src');
const newest = Math.max(...srcFiles.map((f) => statSync(join(ROOT, f)).mtimeMs), statSync(join(ROOT, 'build.mjs')).mtimeMs);
if (statSync(join(ROOT, 'index.html')).mtimeMs + 1 < newest) fail('index.html が src/ より古いです（node build.mjs を実行してください）');
log(`index.html ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB：外部参照・通信の検査を実施`);
log('');

// ---------- 5. テーマのコントラスト ----------
log('# 5. ライト/ダークの色コントラスト（WCAG の比）');
const css = readFileSync(join(ROOT, 'src/styles.css'), 'utf8');
function tokens(block) {
  const out = {};
  for (const m of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) out[m[1]] = m[2];
  return out;
}
const light = tokens(css.slice(css.indexOf(':root {'), css.indexOf('@media (prefers-color-scheme: dark)')));
const dark = tokens(css.slice(css.indexOf(':root[data-theme="dark"]')));
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const PAIRS = [
  ['fg', 'bg', 7], ['fg', 'surface', 7], ['muted', 'surface', 4.5], ['accent-fg', 'accent', 4.5], ['ok', 'surface', 3], ['ng', 'surface', 3],
  ['c1', 'surface', 3], ['c2', 'surface', 3], ['c3', 'surface', 3], ['c4', 'surface', 3], ['c5', 'surface', 3], ['fg', 'accent-soft', 4.5],
];
log('');
log('| 前景 / 背景 | 基準 | ライト | ダーク |');
log('|---|---|---|---|');
for (const [f, b, min] of PAIRS) {
  const rl = ratio(light[f], light[b]);
  const rd = ratio(dark[f], dark[b]);
  log(`| ${f} / ${b} | ${min} | ${rl.toFixed(2)} | ${rd.toFixed(2)} |`);
  if (rl < min || rd < min) fail(`${f} / ${b} のコントラスト不足（ライト ${rl.toFixed(2)}、ダーク ${rd.toFixed(2)}）`);
}
const darkMedia = tokens(css.slice(css.indexOf('@media (prefers-color-scheme: dark)'), css.indexOf(':root[data-theme="dark"]')));
for (const k of Object.keys(dark)) if (darkMedia[k] !== dark[k]) fail(`ダーク（自動）とダーク（手動）で --${k} が一致しません`);
log('');

// ---------- 6. 引き継ぎコード ----------
log('# 6. 引き継ぎコードの往復');
{
  const p = emptyProgress();
  p.stages.b2.answered = 12;
  p.stages.b2.correct = 9;
  p.stages.a1.tasks = { comp: 1, lb: 1 };
  p.bestStreak = 7;
  p.misses = [{ g: 'b4-gross-calc', s: 123, c: 2, st: 'b4', t: 1 }];
  p.badges = { first: 1 };
  p.flags = { savedSummary: 1 };
  const code = encodeProgress(p);
  const back = decodeProgress(code);
  const strip = (x) => JSON.stringify({ ...normalize(x), misses: x.misses.map((m) => [m.g, m.s, m.c]), badges: Object.keys(x.badges) });
  if (strip(back) !== strip(p)) fail('引き継ぎコードで進捗が復元されません');
  let rejected = 0;
  for (const broken of [code.slice(0, -3), code.replace('BIO1', 'BIO2'), 'abc', '']) {
    try {
      decodeProgress(broken);
    } catch (e) {
      rejected++;
    }
  }
  if (rejected !== 4) fail('壊れた引き継ぎコードを受け付けてしまいました');
  log(`コード長 ${code.length} 文字。復元一致・破損コード4種の拒否を確認`);
}
log('');

log(failures ? `結果：NG（${failures} 件）` : '結果：すべて合格（不備 0 件）');
process.exitCode = failures ? 1 : 0;
