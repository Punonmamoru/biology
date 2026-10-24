// localStorage の安全なラッパー。使えない環境（プライベートモード等）ではメモリ上に保持する。
const memory = new Map();
const PREFIX = 'biology.';

function ls() {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    const k = PREFIX + '__probe__';
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch (e) {
    return null;
  }
}

let cached;
function store() {
  if (cached === undefined) cached = ls();
  return cached;
}

export function storageAvailable() {
  return !!store();
}

export function loadJSON(key, fallback) {
  try {
    const s = store();
    const raw = s ? s.getItem(PREFIX + key) : memory.get(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

export function saveJSON(key, value) {
  const raw = JSON.stringify(value);
  try {
    const s = store();
    if (s) s.setItem(PREFIX + key, raw);
    else memory.set(key, raw);
    return true;
  } catch (e) {
    memory.set(key, raw);
    return false;
  }
}

export function removeKey(key) {
  try {
    const s = store();
    if (s) s.removeItem(PREFIX + key);
  } catch (e) {
    /* 無視 */
  }
  memory.delete(key);
}
