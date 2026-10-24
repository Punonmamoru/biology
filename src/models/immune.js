// B3 免疫の一次応答・二次応答のモデル（抗体量は相対値）
// 抗原が侵入するたびに、その抗原に対する抗体の産生が起こる。
//   一次応答：潜伏期が長く（約1週間）、量が少ない
//   二次応答：同じ抗原の記憶細胞があるとき。立ち上がりが速く、量が非常に多く、長く続く
// 記憶細胞は抗原ごとに特異的なので、別の抗原Bでは一次応答になる。
export const PRIMARY = { lag: 4, rise: 8, decay: 9, amp: 1 };
export const SECONDARY = { lag: 1.5, rise: 4.5, decay: 30, amp: 100 };
export const FLOOR = 0.01; // 検出限界程度の基礎量
export const MEMORY_DAYS = 7; // 記憶細胞ができるまでの日数（これより前の再侵入は一次応答として扱う）

// 侵入からの経過日数 tau に対する応答の形（最大値1）
export function responseShape(tau, k) {
  const s = tau - k.lag;
  if (s <= 0) return 0;
  if (s < k.rise) return (1 - Math.cos((Math.PI * s) / k.rise)) / 2;
  return Math.exp(-(s - k.rise) / k.decay);
}

// exposures: [{ day, antigen: 'A' | 'B' }]
// 返り値：抗原ごとの抗体量を返す関数
export function antibodyModel(exposures) {
  const sorted = exposures.slice().sort((a, b) => a.day - b.day);
  const events = sorted.map((e, i) => {
    const memory = sorted.slice(0, i).some((p) => p.antigen === e.antigen && e.day - p.day >= MEMORY_DAYS);
    return { ...e, kind: memory ? 'secondary' : 'primary', k: memory ? SECONDARY : PRIMARY };
  });
  return {
    events,
    level(antigen, t) {
      let v = FLOOR;
      for (const e of events) if (e.antigen === antigen) v += e.k.amp * responseShape(t - e.day, e.k);
      return v;
    },
  };
}

// 侵入後、抗体量が最大になるまでの日数
export function peakDelay(k) {
  return k.lag + k.rise;
}
