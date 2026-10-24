// 引き継ぎコード：端末内の進捗を文字列にして、別の端末で読み込めるようにする
// （通信はしない。コードを自分で書き写す・コピーする）
import { normalize, emptyProgress } from './progress.js';
import { STAGES } from './stages.js';

const PREFIX = 'BIO1';
const KEYS = ['visited', 'answered', 'correct', 'hard', 'best'];

function checksum(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 0x10000).toString(16).toUpperCase().padStart(4, '0');
}

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeProgress(p) {
  const data = {
    s: Object.fromEntries(STAGES.map((st) => {
      const x = p.stages[st.id];
      return [st.id, [...KEYS.map((k) => x[k]), Object.keys(x.tasks)]];
    })),
    k: [p.streak, p.bestStreak, p.rounds, p.perfect],
    m: p.misses.slice(-30).map((m) => [m.g, m.s, m.c]),
    b: Object.keys(p.badges),
    f: Object.keys(p.flags),
  };
  const body = toBase64Url(JSON.stringify(data));
  return `${PREFIX}-${checksum(body)}-${body}`;
}

// 失敗したときは Error（メッセージは画面にそのまま出せる日本語）を投げる
export function decodeProgress(code) {
  const clean = String(code || '').replace(/\s+/g, '');
  const m = clean.match(/^BIO1-([0-9A-F]{4})-([A-Za-z0-9_-]+)$/);
  if (!m) throw new Error('引き継ぎコードの形式が正しくありません（BIO1- で始まるコードを全部貼り付けてください）。');
  if (checksum(m[2]) !== m[1]) throw new Error('コードの一部が欠けているか、まちがっています。もう一度コピーしてください。');
  let data;
  try {
    data = JSON.parse(fromBase64Url(m[2]));
  } catch (e) {
    throw new Error('コードを読み取れませんでした。');
  }
  const p = emptyProgress();
  for (const st of STAGES) {
    const row = data.s && data.s[st.id];
    if (!Array.isArray(row)) continue;
    KEYS.forEach((k, i) => (p.stages[st.id][k] = Number(row[i]) || 0));
    const tasks = Array.isArray(row[KEYS.length]) ? row[KEYS.length] : [];
    for (const t of tasks) p.stages[st.id].tasks[String(t)] = 1;
  }
  const k = Array.isArray(data.k) ? data.k : [];
  [p.streak, p.bestStreak, p.rounds, p.perfect] = [0, 1, 2, 3].map((i) => Number(k[i]) || 0);
  const now = Date.now();
  p.misses = (Array.isArray(data.m) ? data.m : []).map(([g, s, c]) => ({ g: String(g), s: Number(s) >>> 0, c: Number(c) || 0, st: String(g).split('-')[0], t: now }));
  for (const b of Array.isArray(data.b) ? data.b : []) p.badges[String(b)] = now;
  for (const f of Array.isArray(data.f) ? data.f : []) p.flags[String(f)] = 1;
  return normalize(p);
}
