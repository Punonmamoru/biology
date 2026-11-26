// A23 カルビン回路（光や CO₂ を止めたときの RuBP と PGA の量の変化）
// 2つの反応だけを考えた模式：
//   CO₂ の固定（ルビスコ）：RuBP ＋ CO₂ → PGA    速さ ＝ B × CO₂ × [RuBP]
//   PGA の還元と RuBP の再生：PGA → RuBP          速さ ＝ A × 光 × [PGA]（光化学反応でつくられた ATP・NADPH を使う）
// RuBP と PGA の合計は一定とする（回路の中の物質のやりとりだけを見る）。
// 定常状態では [RuBP] : [PGA] ＝ B·CO₂ の逆数 : A·光 の逆数 になり、ふだんは PGA のほうが多い。
export const TOTAL = 9;
export const A = 0.6; // 1/分（光が100%のとき）
export const B = 1.2; // 1/分（CO₂ が100%のとき）
export const T_CHANGE = 4; // 条件を変える時刻（分）
export const T_END = 12;

export function steady(light, co2) {
  const a = A * light;
  const b = B * co2;
  if (a + b === 0) return null;
  return { rubp: (TOTAL * a) / (a + b), pga: (TOTAL * b) / (a + b) };
}

// 時刻 t の RuBP・PGA（light・co2 は 0〜1。t < T_CHANGE ではどちらも 1）
export function at(t, light, co2) {
  const s0 = steady(1, 1);
  if (t <= T_CHANGE) return { ...s0 };
  const s1 = steady(light, co2);
  if (!s1) return { ...s0 }; // 光も CO₂ もないと、どちらの反応も止まり、量は変わらない
  const k = A * light + B * co2;
  const e = Math.exp(-k * (t - T_CHANGE));
  return { rubp: s1.rubp + (s0.rubp - s1.rubp) * e, pga: s1.pga + (s0.pga - s1.pga) * e };
}

// ¹⁴CO₂ を与えたあとの放射能の分布（カルビンの実験の模式）
// CO₂ はまず PGA に取り込まれ、PGA から糖などがつくられる。
//   PGA の放射能 a：da/dt ＝ 1 − a/τ、糖など b：db/dt ＝ a/τ
export const TAU = 6; // 秒
export function label(t) {
  if (t <= 0) return { pga: 100, sugar: 0 };
  const a = TAU * (1 - Math.exp(-t / TAU));
  const b = t - a;
  return { pga: (100 * a) / t, sugar: (100 * b) / t };
}

// 光合成の反応式 6CO₂ ＋ 12H₂O → C₆H₁₂O₆ ＋ 6O₂ ＋ 6H₂O の質量の関係（mg）
export const M = { CO2: 44, GLUCOSE: 180, O2: 32, H2O: 18 };
export function glucoseFromCO2(mgCO2) {
  return (mgCO2 * M.GLUCOSE) / (6 * M.CO2);
}
export function o2FromGlucose(mgGlucose) {
  return (mgGlucose * 6 * M.O2) / M.GLUCOSE;
}
