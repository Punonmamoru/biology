// 学習の進捗（端末内の localStorage にだけ保存。どこにも送信しない）
import { loadJSON, saveJSON } from './lib/storage.js';
import { STAGES } from './stages.js';

const KEY = 'progress.v1';
const MAX_MISSES = 60;

export function emptyStage() {
  return { visited: 0, answered: 0, correct: 0, hard: 0, best: 0, tasks: {} };
}

export function emptyProgress() {
  const stages = {};
  for (const s of STAGES) stages[s.id] = emptyStage();
  return { v: 1, stages, streak: 0, bestStreak: 0, rounds: 0, perfect: 0, misses: [], badges: {}, flags: {} };
}

// 壊れたデータや古い形式でも動くように整える
export function normalize(p) {
  const base = emptyProgress();
  if (!p || typeof p !== 'object') return base;
  const out = { ...base, ...p };
  out.stages = {};
  for (const s of STAGES) {
    const src = (p.stages && p.stages[s.id]) || {};
    const st = { ...emptyStage(), ...src };
    for (const k of ['visited', 'answered', 'correct', 'hard', 'best']) st[k] = Math.max(0, Math.floor(Number(st[k]) || 0));
    st.correct = Math.min(st.correct, st.answered);
    st.tasks = st.tasks && typeof st.tasks === 'object' ? { ...st.tasks } : {};
    out.stages[s.id] = st;
  }
  for (const k of ['streak', 'bestStreak', 'rounds', 'perfect']) out[k] = Math.max(0, Math.floor(Number(out[k]) || 0));
  out.misses = Array.isArray(p.misses) ? p.misses.filter((m) => m && typeof m.g === 'string').slice(-MAX_MISSES) : [];
  out.badges = p.badges && typeof p.badges === 'object' ? { ...p.badges } : {};
  out.flags = p.flags && typeof p.flags === 'object' ? { ...p.flags } : {};
  return out;
}

let state = null;
const listeners = new Set();

export function getProgress() {
  if (!state) state = normalize(loadJSON(KEY, null));
  return state;
}

export function saveProgress() {
  saveJSON(KEY, getProgress());
  for (const fn of listeners) fn(state);
}

export function replaceProgress(p) {
  state = normalize(p);
  saveProgress();
}

export function onProgress(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function markVisited(stageId) {
  const p = getProgress();
  p.stages[stageId].visited += 1;
  saveProgress();
}

export function markTask(stageId, taskId) {
  const p = getProgress();
  const st = p.stages[stageId];
  if (st.tasks[taskId]) return false;
  st.tasks[taskId] = 1;
  saveProgress();
  return true;
}

// 1問の解答を記録
export function recordAnswer(q, chosen) {
  const p = getProgress();
  const st = p.stages[q.stage];
  const ok = chosen === q.answer;
  st.answered += 1;
  if (ok) {
    st.correct += 1;
    if (q.level === 3) st.hard += 1;
    p.streak += 1;
    p.bestStreak = Math.max(p.bestStreak, p.streak);
  } else {
    p.streak = 0;
    p.misses.push({ g: q.gen, s: q.seed, c: chosen, st: q.stage, t: Date.now() });
    if (p.misses.length > MAX_MISSES) p.misses.splice(0, p.misses.length - MAX_MISSES);
  }
  saveProgress();
  return ok;
}

export function recordRound(stageId, score, total) {
  const p = getProgress();
  p.rounds += 1;
  if (score === total) p.perfect += 1;
  if (p.stages[stageId]) p.stages[stageId].best = Math.max(p.stages[stageId].best, Math.round((score / total) * 10));
  saveProgress();
}

export function clearMisses() {
  getProgress().misses = [];
  saveProgress();
}

export function setFlag(name) {
  const p = getProgress();
  if (p.flags[name]) return;
  p.flags[name] = 1;
  saveProgress();
}
