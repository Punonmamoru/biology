// B6 酸素解離曲線
// 酸素ヘモグロビンの割合 S(P) ＝ Pⁿ / (P50ⁿ ＋ Pⁿ)（ヒルの式。n≒2.7 でS字形になる）
// CO₂分圧が高いほど P50（半分が酸素ヘモグロビンになる酸素分圧）が大きくなり、曲線は右へずれる。
// 単位：分圧［相対値。教科書の図と同じく肺胞のO₂分圧を100とする］、割合［%］。数値は教科書の図の目安（肺：O₂ 100・CO₂ 40、組織：O₂ 30・CO₂ 70）に合わせた模式。
export const HILL_N = 2.7;
export const P50_BASE = 27; // CO₂分圧 40 のときの P50
export const P50_SLOPE = 14 / 30; // CO₂分圧が 1 上がるごとの P50 の増加

export const LUNG = { pO2: 100, pCO2: 40 };
export const TISSUE = { pO2: 30, pCO2: 70 };

export function p50(pCO2) {
  return P50_BASE + P50_SLOPE * (pCO2 - 40);
}

// 酸素ヘモグロビンの割合［%］
export function saturation(pO2, pCO2) {
  if (pO2 <= 0) return 0;
  const r = Math.pow(pO2 / p50(pCO2), HILL_N);
  return (100 * r) / (1 + r);
}

// 肺で酸素ヘモグロビンだったもののうち、組織で酸素を放出した割合［%］
export function releaseFraction(sLung, sTissue) {
  return ((sLung - sTissue) / sLung) * 100;
}

// 肺と組織の条件から、肺・組織での割合と放出の割合をまとめて求める
export function exchange(lung = LUNG, tissue = TISSUE) {
  const sL = saturation(lung.pO2, lung.pCO2);
  const sT = saturation(tissue.pO2, tissue.pCO2);
  return { sLung: sL, sTissue: sT, released: sL - sT, fraction: releaseFraction(sL, sT) };
}

// 血液 100 mL が組織で放出する酸素の体積［mL］（ヘモグロビン 1 g は最大 1.34 mL の酸素と結合）
export const O2_PER_HB = 1.34;
export function releasedVolume(hbPer100mL, sLung, sTissue) {
  return hbPer100mL * O2_PER_HB * ((sLung - sTissue) / 100);
}
