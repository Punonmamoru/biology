// A1 酵素の反応速度
// ミカエリス・メンテンの式：v = Vmax[S] / (Km + [S])
export function rate(S, Vmax, Km) {
  return (Vmax * S) / (Km + S);
}

// 阻害剤があるときの見かけの Vmax・Km
//   競争的阻害  ：Km' = Km(1 + [I]/Ki)、Vmax は不変（活性部位を基質と奪い合う）
//   非競争的阻害：Vmax' = Vmax / (1 + [I]/Ki)、Km は不変（活性部位以外に結合する）
export function inhibited(kind, Vmax, Km, I, Ki) {
  const f = 1 + I / Ki;
  if (kind === 'competitive') return { Vmax, Km: Km * f };
  if (kind === 'noncompetitive') return { Vmax: Vmax / f, Km };
  return { Vmax, Km };
}

// ラインウィーバー・バークの式：1/v = (Km/Vmax)(1/[S]) + 1/Vmax
export function lineweaver(Vmax, Km) {
  return { slope: Km / Vmax, yIntercept: 1 / Vmax, xIntercept: -1 / Km };
}

// 温度：温度上昇による反応速度の増加（Q10 ≒ 2）× 熱変性していない酵素の割合
export const TEMP = { Q10: 2, T0: 20, Tm: 43, w: 2.5 };
export function activeFraction(T) {
  return 1 / (1 + Math.exp((T - TEMP.Tm) / TEMP.w));
}
export function tempRate(T) {
  return Math.pow(TEMP.Q10, (T - TEMP.T0) / 10) * activeFraction(T);
}
export function optimumTemp() {
  let best = 0;
  let bv = -1;
  for (let T = 0; T <= 80; T += 0.05) {
    const v = tempRate(T);
    if (v > bv) {
      bv = v;
      best = T;
    }
  }
  return best;
}
// 温度 Th で処理したあと、最適温度に戻して測った反応速度（熱変性は不可逆なので戻らない）
export function afterTreatment(Th) {
  const remain = Th > optimumTemp() ? activeFraction(Th) / activeFraction(optimumTemp()) : 1;
  return tempRate(optimumTemp()) * Math.min(1, remain);
}

// pH：最適pHを頂点とする山型
export const ENZYMES = {
  pepsin: { name: 'ペプシン', where: '胃液', opt: 2 },
  amylase: { name: 'だ液アミラーゼ', where: 'だ液', opt: 7 },
  trypsin: { name: 'トリプシン', where: 'すい液', opt: 8 },
};
export const PH_WIDTH = 1.6;
export function phRate(pH, opt) {
  return Math.exp(-Math.pow((pH - opt) / PH_WIDTH, 2));
}
