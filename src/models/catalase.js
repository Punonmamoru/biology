// B14 酵素のはたらき（カタラーゼ）
// 過酸化水素の分解 2H₂O₂ → 2H₂O ＋ O₂ を、肝臓片（カタラーゼ）や酸化マンガン(IV)（無機触媒）が促進する。
// 残っている過酸化水素の量 S について dS/dt ＝ −k·E·S（触媒が多いほど速い）。触媒は反応の前後で変化しないので E は減らない。
// 発生する酸素の体積は分解した過酸化水素の量に比例する（3%過酸化水素水 1 mL あたり 約10 mL。25℃・1気圧の目安）。
export const O2_PER_ML = 10;
export const T_ADD = 6; // 追加の操作をする時刻（分）
export const T_END = 12;

export const CATALYSTS = {
  liver: { name: '肝臓片', k: 1.2, note: '肝臓の細胞に含まれる酵素カタラーゼが過酸化水素を分解する' },
  mno2: { name: '酸化マンガン(IV)', k: 0.9, note: '酸化マンガン(IV)は無機触媒で、カタラーゼと同じ反応を促進する' },
  boiled: { name: '煮沸した肝臓片', k: 0, note: 'カタラーゼはタンパク質でできているので、煮沸すると変性してはたらきを失う' },
  sand: { name: '石英砂', k: 0, note: '石英砂は触媒としてはたらかないので、肝臓片を加えたときの泡が肝臓片の固形物によるものではないことを確かめる対照になる' },
  none: { name: '何も入れない', k: 0.002, note: '過酸化水素は触媒がないとごくゆっくりとしか分解しない' },
};

// 6分後の追加操作：none / h2o2（過酸化水素水を追加）/ cat（同じ触媒を追加）
// 返り値：[{ t, o2, s }]（o2：発生した酸素の累計 mL、s：残っている過酸化水素水 mL相当）
export function simulate({ cat = 'liver', h2o2 = 2, amount = 1, add = 'none', addH2o2 = 2, dt = 0.02 } = {}) {
  const c = CATALYSTS[cat];
  let E = amount;
  let S = h2o2;
  let o2 = 0;
  const out = [];
  const every = Math.round(0.1 / dt);
  let i = 0;
  let added = false;
  for (let t = 0; t <= T_END + 1e-9; t += dt, i++) {
    if (!added && t >= T_ADD - 1e-9) {
      added = true;
      if (add === 'h2o2') S += addH2o2;
      if (add === 'cat') E += amount;
    }
    if (i % every === 0) out.push({ t: Math.round(t * 100) / 100, o2, s: S });
    const d = S * (1 - Math.exp(-c.k * E * dt));
    S -= d;
    o2 += d * O2_PER_ML;
  }
  return out;
}

// 反応が終わるまでに発生する酸素の総量（mL）
export function totalO2(h2o2) {
  return h2o2 * O2_PER_ML;
}

// はじめの1分間に発生した酸素の量（mL/分）
export function initialRate(run) {
  const p = run.find((r) => r.t >= 1 - 1e-9);
  return p ? p.o2 : 0;
}
