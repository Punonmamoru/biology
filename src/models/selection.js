// A25 自然選択と遺伝子頻度
// 1つの遺伝子座の対立遺伝子 A（頻度 p）・a（頻度 q ＝ 1 − p）。
// 毎世代、自由交配で AA : Aa : aa ＝ p² : 2pq : q² の子が生まれ、遺伝子型ごとの「生き残って子を残す割合」w で選択を受ける。
//   次の世代の q' ＝ (pq·wAa ＋ q²·waa) ÷ (p²·wAA ＋ 2pq·wAa ＋ q²·waa)
export function nextQ(q, w) {
  const p = 1 - q;
  const mean = p * p * w.AA + 2 * p * q * w.Aa + q * q * w.aa;
  if (mean <= 0) return q;
  return (p * q * w.Aa + q * q * w.aa) / mean;
}

export function trajectory(q0, w, gens) {
  const out = [q0];
  let q = q0;
  for (let g = 1; g <= gens; g++) {
    q = nextQ(q, w);
    out.push(q);
  }
  return out;
}

// 場面（プリセット）
//  industrial：工業暗化。暗色型の遺伝子 C（顕性）と明色型の c（潜性）。明色型（cc）が鳥に食べられやすい。
//              A ＝ C（暗色・顕性）、a ＝ c（明色・潜性）として、waa ＝ 明色型の生き残る割合。
//  lethal：潜性致死。aa は子を残さない（waa ＝ 0）。q_n ＝ q₀ ÷ (1 ＋ n·q₀)
//  hetero：ヘテロ接合体が有利（鎌状赤血球貧血症とマラリア）。平衡の q ＝ s ÷ (s ＋ t)
export const PRESETS = {
  industrial: { q0: 0.99, gens: 80 },
  lethal: { q0: 0.5, gens: 40 },
  hetero: { q0: 0.05, gens: 60 },
};

export function fitness(preset, strength) {
  // strength：選択の強さ（0〜1）
  if (preset === 'industrial') return { AA: 1, Aa: 1, aa: 1 - strength };
  if (preset === 'lethal') return { AA: 1, Aa: 1, aa: 0 };
  // hetero：AA（正常）はマラリアにかかりやすい（1 − s）、aa（鎌状）は貧血で（1 − t）、Aa が最も有利
  return { AA: 1 - strength, Aa: 1, aa: 0.2 };
}

export function lethalQ(q0, n) {
  return q0 / (1 + n * q0);
}

// ヘテロ接合体有利の平衡頻度（a の遺伝子頻度）
export function heteroEquilibrium(s, t) {
  return s / (s + t);
}

// 表現型の割合：A_ （顕性形質）＝ 1 − q²、aa（潜性形質）＝ q²
export function recessivePhenotype(q) {
  return q * q;
}
