// A9 呼吸と発酵（呼吸商）
// 呼吸商 RQ ＝ 放出したCO₂の体積 ÷ 吸収したO₂の体積（同じ温度・圧力のもとでは物質量の比と同じ）
//   炭水化物（グルコース）：C₆H₁₂O₆ ＋ 6O₂ ＋ 6H₂O → 6CO₂ ＋ 12H₂O　　RQ ＝ 6/6 ＝ 1.0
//   脂肪（トリステアリン）：2C₅₇H₁₁₀O₆ ＋ 163O₂ → 114CO₂ ＋ 110H₂O　　RQ ＝ 114/163 ≒ 0.70
//   タンパク質：約0.8（アミノ酸の種類によって異なる。窒素は尿素などとして排出される）
// アルコール発酵：C₆H₁₂O₆ → 2C₂H₅OH ＋ 2CO₂（O₂を使わない）
export const SUBSTRATES = {
  carb: { name: '炭水化物', example: 'グルコース', rq: 1.0, eq: 'C₆H₁₂O₆ ＋ 6O₂ ＋ 6H₂O → 6CO₂ ＋ 12H₂O', o2: 6, co2: 6 },
  fat: { name: '脂肪', example: 'トリステアリン', rq: 114 / 163, eq: '2C₅₇H₁₁₀O₆ ＋ 163O₂ → 114CO₂ ＋ 110H₂O', o2: 163, co2: 114 },
  protein: { name: 'タンパク質', example: 'アミノ酸', rq: 0.8, eq: '（アミノ酸の種類によって異なる。約0.8）', o2: null, co2: null },
};

export function rq(co2, o2) {
  return co2 / o2;
}

// 呼吸計（KOH を入れたフラスコと水を入れたフラスコ）
//   KOH はCO₂を吸収するので、KOH側の気体の減少量 ＝ 吸収したO₂の量
//   水側の気体の減少量 ＝ 吸収したO₂ − 放出したCO₂
export function respirometer(o2, co2) {
  return { koh: o2, water: o2 - co2 };
}
export function fromRespirometer(kohDecrease, waterDecrease) {
  const o2 = kohDecrease;
  const co2 = kohDecrease - waterDecrease;
  return { o2, co2, rq: co2 / o2 };
}

// 酵母がグルコースを呼吸とアルコール発酵に使う。glucose：消費したグルコース［mol］、fermFrac：そのうち発酵に使った割合
export function yeast(glucose, fermFrac) {
  const aer = glucose * (1 - fermFrac);
  const fer = glucose * fermFrac;
  const o2 = 6 * aer;
  const co2 = 6 * aer + 2 * fer;
  return { aer, fer, o2, co2, ethanol: 2 * fer, rq: o2 > 0 ? co2 / o2 : Infinity };
}

// O₂吸収量とCO₂放出量から、呼吸と発酵に使われたグルコースを求める
//   呼吸：O₂ 6 につきグルコース 1、CO₂ 6　→ 呼吸のグルコース ＝ O₂ ÷ 6
//   発酵：CO₂ 2 につきグルコース 1　　　　→ 発酵のグルコース ＝ (CO₂ − O₂) ÷ 2
export function splitGlucose(o2, co2) {
  return { aer: o2 / 6, fer: (co2 - o2) / 2 };
}

// アルコール発酵ではグルコース1分子あたり ATP 2分子。呼吸ではそれよりずっと多い（教科書により最大約38分子など目安が異なるので、数値は問わない）
export const ATP_FERM = 2;
