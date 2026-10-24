// 4択問題の共通部品（DOM に依存しない純粋関数。Node の検証スクリプトからも使う）
import { makeRng } from '../lib/rng.js';
import { fmt } from '../lib/format.js';

export const LEVEL_LABEL = { 1: '★基礎', 2: '★★標準', 3: '★★★発展' };
export const KIND_LABEL = { calc: '計算', graph: 'グラフ読み取り', term: '用語・しくみ' };
export const KATA = ['ア', 'イ', 'ウ', 'エ', 'オ'];

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ジェネレーター定義：{ id, stage, level, kind, make(rng) }
// make は { text, correct, wrong: [3個以上], explanation, chart?, ordered? } を返す
export function generate(gen, seed) {
  const rng = makeRng((seed ^ hashStr(gen.id)) >>> 0);
  const raw = gen.make(rng);
  const correct = String(raw.correct);
  const seen = new Set([correct]);
  const pool = [];
  for (const w of raw.wrong) {
    const s = String(w);
    if (!seen.has(s)) {
      seen.add(s);
      pool.push(s);
    }
  }
  if (pool.length < 3) throw new Error(`${gen.id}: 誤答の候補が足りません（seed=${seed}）`);
  // ordered: 誤答候補を「よくある誤解」の順に並べてあるときは先頭から使う
  const wrong = raw.ordered ? pool.slice(0, 3) : rng.sample(pool, 3);
  const choices = rng.shuffle([correct, ...wrong]);
  return {
    gen: gen.id,
    seed,
    stage: gen.stage,
    level: gen.level,
    kind: gen.kind,
    text: raw.text,
    choices,
    answer: choices.indexOf(correct),
    correct,
    explanation: raw.explanation,
    chart: raw.chart || null,
  };
}

// 数値の選択肢（単位つき）
export function numChoice(x, unit = '', digits = 2) {
  return fmt(x, digits) + unit;
}

// 「ア：X　イ：Y　ウ：Z」形式の組合せ選択肢
export function assignmentText(labels, names) {
  return labels.map((l, i) => `${l}：${names[i]}`).join('　');
}

export function permutations(arr) {
  if (arr.length <= 1) return [arr.slice()];
  const out = [];
  arr.forEach((x, i) => {
    for (const p of permutations([...arr.slice(0, i), ...arr.slice(i + 1)])) out.push([x, ...p]);
  });
  return out;
}

// 組合せ問題：正しい対応と、それ以外の並べ替えを誤答にする
export function assignmentQuestion(labels, names) {
  const correct = assignmentText(labels, names);
  const wrong = permutations(names)
    .map((p) => assignmentText(labels, p))
    .filter((s) => s !== correct);
  return { correct, wrong };
}

// 値をいくつかの候補の中から重複なく誤答として集める
export function distinctNumbers(correct, cands, unit = '', digits = 2) {
  const c = numChoice(correct, unit, digits);
  const out = [];
  for (const v of cands) {
    if (!Number.isFinite(v) || v <= 0) continue;
    const s = numChoice(v, unit, digits);
    if (s !== c && !out.includes(s)) out.push(s);
  }
  return { correct: c, wrong: out };
}
