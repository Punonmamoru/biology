// A12 植物ホルモン（オーキシン）
// オーキシン濃度と成長への効果（教科書の図の目安による模式）
//   根・芽・茎で最適濃度が違い、根が最も低い濃度で最適、茎が最も高い濃度で最適になる。
//   最適濃度より高いと促進の効果が小さくなり、さらに高いと成長を抑制する（効果が負になる）。
//   最適濃度の目安：根 10⁻¹⁰ mol/L、芽 10⁻⁸ mol/L、茎 10⁻⁵ mol/L（模式）
// 効果 E(x)（x ＝ log₁₀ 濃度。最適濃度で ＋1、正なら促進、負なら抑制。相対値）
//   最適濃度より低い側：exp(−((x − 最適)/A)²)（濃度が低いと効果はほぼ0）
//   最適濃度より高い側：2·exp(−((x − 最適)/B)²) − 1（最適濃度＋W で 0 になり、それより高いと抑制）
export const ORGANS = {
  root: { name: '根', opt: -10, color: 'c2', dash: 'solid' },
  bud: { name: '芽', opt: -8, color: 'c4', dash: 'dash' },
  stem: { name: '茎', opt: -5, color: 'c3', dash: 'dot' },
};
export const W = 2.2; // 促進から抑制に変わる、最適濃度からの距離（log₁₀ の差）
export const A = 1.5;
export const B = W / Math.sqrt(Math.log(2));
export const X_MIN = -13;
export const X_MAX = -2;

export function effect(organ, x) {
  const d = x - ORGANS[organ].opt;
  if (d <= 0) return Math.exp(-Math.pow(d / A, 2));
  return 2 * Math.exp(-Math.pow(d / B, 2)) - 1;
}

// 促進から抑制に変わる濃度（log₁₀）
export function zeroPoint(organ) {
  return ORGANS[organ].opt + W;
}

// 植物を水平に置くと、オーキシンは重力の方向（下側）に多く移動する。
// 上側の濃度 x（log）、下側は ratio 倍（log で + log₁₀(ratio)）
export function horizontal(organ, xUpper, ratio = 4) {
  const xLower = xUpper + Math.log10(ratio);
  const up = effect(organ, xUpper);
  const low = effect(organ, xLower);
  // 下側のほうがよく伸びると上へ曲がる（負の重力屈性）、上側のほうがよく伸びると下へ曲がる（正の重力屈性）
  const diff = low - up;
  const bend = Math.abs(diff) < 0.02 ? 'none' : diff > 0 ? 'up' : 'down';
  return { xLower, up, low, bend };
}

// アベナ屈曲試験（ウェント）：寒天片中のオーキシン量がある範囲では、屈曲角度はオーキシン濃度に比例する
export function curvature(conc, k) {
  return k * conc;
}
