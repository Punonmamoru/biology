// A5 光合成の限定要因
// 3つの環境要因それぞれについて「その要因だけで決まる光合成速度の上限」を考え、
// 実際の光合成速度は、その中で最も小さい上限（＝最も不足している要因）でほぼ決まる（限定要因の考え方）。
//   光の強さによる上限   ：L(I) ＝ ALPHA × I（弱い光では光の強さに比例する）
//   CO₂濃度による上限    ：C(c) ＝ C_MAX × c ／ (C_HALF ＋ c)（CO₂濃度が高いほど大きいが、しだいに頭打ち）
//   温度による上限       ：T(t) ＝ T_MAX × f(t)（酵素反応なので最適温度で最大。高温では酵素が失活して急に下がる）
// 実際の速度 P ＝ (L⁻ⁿ ＋ C⁻ⁿ ＋ T⁻ⁿ)^(−1/n)（n ＝ 4）。最小の上限にほぼ等しく、曲線はなめらかに頭打ちになる。
// 光合成速度は総光合成速度（呼吸は差し引かない）の相対値。数値は模式。
export const ALPHA = 4; // 光の強さ 1 キロルクスあたり
export const C_MAX = 180;
export const C_HALF = 0.05; // %
export const T_MAX = 150;
export const T_OPT = 30; // 最適温度（模式）
export const N_SMOOTH = 4;
export const CO2_AIR = 0.04; // 大気のCO₂濃度［%］

export const FACTORS = {
  light: { name: '光の強さ', short: '光' },
  co2: { name: 'CO₂濃度', short: 'CO₂' },
  temp: { name: '温度', short: '温度' },
};

export function lightCap(I) {
  return ALPHA * Math.max(0, I);
}
export function co2Cap(c) {
  return c <= 0 ? 0 : (C_MAX * c) / (C_HALF + c);
}
// 温度による上限：最適温度より低い側はゆるやかに、高い側は急に下がる
export function tempFactor(t) {
  const w = t <= T_OPT ? 14 : 7;
  return Math.exp(-Math.pow((t - T_OPT) / w, 2));
}
export function tempCap(t) {
  return T_MAX * tempFactor(t);
}

export function caps(I, c, t) {
  return { light: lightCap(I), co2: co2Cap(c), temp: tempCap(t) };
}

export function rate(I, c, t) {
  const k = caps(I, c, t);
  const vals = [k.light, k.co2, k.temp];
  if (vals.some((v) => v <= 0)) return 0;
  return Math.pow(vals.reduce((a, v) => a + Math.pow(v, -N_SMOOTH), 0), -1 / N_SMOOTH);
}

// 限定要因：上限が最も小さい要因。2番目との差が CLOSE 未満なら「ほぼ同じ」とする
export const CLOSE = 0.1;
export function limitingFactor(I, c, t) {
  const k = caps(I, c, t);
  const order = Object.keys(k).sort((a, b) => k[a] - k[b]);
  const [first, second] = order;
  const close = k[second] > 0 ? (k[second] - k[first]) / k[second] < CLOSE : false;
  return { factor: first, second, close, caps: k };
}

// 光の強さを上げても速度がほとんど増えなくなる光の強さ（光の上限が、他の要因の上限と等しくなる点）
export function lightSaturationOf(c, t) {
  return Math.min(co2Cap(c), tempCap(t)) / ALPHA;
}
