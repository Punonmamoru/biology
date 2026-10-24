// B1 細胞周期とDNA量のモデル
// 細胞1個あたりのDNA量（相対値）：G1期=2、S期で2→4へ直線的に増加、G2期=4、
// M期は4のまま、M期の終わり（細胞質分裂）で2に戻る。
export const PHASES = ['G1', 'S', 'G2', 'M'];
export const PHASE_NAMES = {
  G1: 'G1期（DNA合成準備期）',
  S: 'S期（DNA合成期）',
  G2: 'G2期（分裂準備期）',
  M: 'M期（分裂期）',
};
export const M_SUBPHASES = ['前期', '中期', '後期', '終期'];

export function cycleLength(p) {
  return p.G1 + p.S + p.G2 + p.M;
}

// t（時間）に対する周期内の位置
export function phaseAt(t, p) {
  const T = cycleLength(p);
  let u = ((t % T) + T) % T;
  for (const ph of PHASES) {
    if (u < p[ph]) return { phase: ph, elapsed: u, frac: u / p[ph] };
    u -= p[ph];
  }
  return { phase: 'M', elapsed: p.M, frac: 1 };
}

export function dnaAt(t, p) {
  const { phase, frac } = phaseAt(t, p);
  if (phase === 'G1') return 2;
  if (phase === 'S') return 2 + 2 * frac;
  return 4; // G2・M
}

// M期をさらに前期・中期・後期・終期に分ける（模式的に等分）
export function mSubphase(frac) {
  return M_SUBPHASES[Math.min(3, Math.floor(frac * 4))];
}

// グラフ用の点列（細胞質分裂での急な減少を垂直線として描く）
export function dnaSeries(p, cycles = 2, t0 = 0) {
  const pts = [];
  const T = cycleLength(p);
  for (let c = 0; c < cycles; c++) {
    const b = t0 + c * T;
    pts.push([b, 2], [b + p.G1, 2], [b + p.G1 + p.S, 4], [b + p.G1 + p.S + p.G2, 4], [b + T, 4], [b + T, 2]);
  }
  return pts;
}

// 観察した細胞数の割合から各期の長さを求める：各期の時間 = 全周期 × その期の細胞数の割合
export function phaseLengthsFromCounts(total, counts) {
  const n = PHASES.reduce((a, k) => a + (counts[k] || 0), 0);
  const out = {};
  for (const k of PHASES) out[k] = n > 0 ? (total * (counts[k] || 0)) / n : 0;
  return out;
}
