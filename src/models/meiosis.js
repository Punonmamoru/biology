// A20 減数分裂と遺伝的多様性
// 細胞1個あたりの DNA 量（相対値。G1期の体細胞＝2）
//   G1期 2 → S期で 4 に → 第一分裂（相同染色体が分かれる）の終わりに 2 → 第二分裂（染色分体が分かれる）の終わりに 1
// 染色体数：2n → 第一分裂のあと n → 第二分裂のあとも n
export const PHASES = [
  { id: 'G1', name: '間期（G1期）', len: 8 },
  { id: 'S', name: '間期（S期）', len: 6 },
  { id: 'G2', name: '間期（G2期）', len: 3 },
  { id: 'M1', name: '第一分裂', len: 4 },
  { id: 'M2', name: '第二分裂', len: 3 },
];
export const TOTAL = PHASES.reduce((a, p) => a + p.len, 0);

export function phaseAt(t) {
  let acc = 0;
  for (const p of PHASES) {
    if (t < acc + p.len) return { ...p, from: acc, frac: (t - acc) / p.len };
    acc += p.len;
  }
  const last = PHASES[PHASES.length - 1];
  return { ...last, from: TOTAL - last.len, frac: 1 };
}

export function dnaAt(t) {
  const p = phaseAt(t);
  if (p.id === 'G1') return 2;
  if (p.id === 'S') return 2 + 2 * p.frac;
  if (p.id === 'G2') return 4;
  if (p.id === 'M1') return p.frac < 0.95 ? 4 : 2;
  return t >= TOTAL || p.frac >= 0.95 ? 1 : 2;
}

// 染色体数（2n を基準に、n の何倍か）
export function chromosomeSetsAt(t) {
  const p = phaseAt(t);
  if (p.id === 'M1') return p.frac < 0.95 ? 2 : 1;
  if (p.id === 'M2') return 1;
  return 2;
}

// 乗換えがないとき、1個体がつくる配偶子の染色体の組合せ ＝ 2ⁿ。受精による子の組合せ ＝ 2ⁿ × 2ⁿ
export function gameteTypes(n) {
  return Math.pow(2, n);
}
export function zygoteTypes(n) {
  return Math.pow(2, n) * Math.pow(2, n);
}
