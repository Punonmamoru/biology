// B15 心臓の拍動と自律神経
// 運動の強さ x（0〜1）のとき、交感神経のはたらきが強まり副交感神経のはたらきが弱まって、
// 心拍数と1回拍出量が増える。運動をやめると、副交感神経のはたらきで心拍数はしだいに安静時にもどる。
// 心拍出量（1分間に心臓が送り出す血液の量）＝ 1回拍出量 × 心拍数
export const REST = { hr: 70, sv: 70 }; // 安静時の心拍数（回/分）と1回拍出量（mL）
export const MAX = { hr: 180, sv: 100 };
export const BLOOD_L = 5; // 成人の血液の量の目安（L、体重の約13分の1）
export const TAU_ON = 0.5; // 運動を始めたときに心拍数が上がる速さ（分）
export const TAU_OFF = 1.5; // 運動をやめたときに心拍数がもどる速さ（分）

export function target(x) {
  return { hr: REST.hr + (MAX.hr - REST.hr) * x, sv: REST.sv + (MAX.sv - REST.sv) * Math.min(1, x * 1.6) };
}

export function cardiacOutput(hr, sv) {
  return (hr * sv) / 1000; // L/分
}

// 運動を t0 分から t1 分まで強さ x で行ったときの経過。dt＝0.05分
export function simulate({ x = 0.5, t0 = 2, t1 = 8, tEnd = 16, dt = 0.05 } = {}) {
  let hr = REST.hr;
  let sv = REST.sv;
  const out = [];
  for (let t = 0; t <= tEnd + 1e-9; t += dt) {
    const ex = t >= t0 && t < t1;
    const g = ex ? target(x) : REST;
    const tau = ex ? TAU_ON : TAU_OFF;
    out.push({ t: Math.round(t * 100) / 100, hr, sv, co: cardiacOutput(hr, sv), ex });
    hr += (g.hr - hr) * (1 - Math.exp(-dt / tau));
    sv += (g.sv - sv) * (1 - Math.exp(-dt / tau));
  }
  return out;
}

// 交感神経・副交感神経のはたらき（教科書の表）
export const AUTONOMIC = [
  { organ: '心臓の拍動', s: '促進（速くなる）', p: '抑制（遅くなる）' },
  { organ: '瞳孔', s: '拡大', p: '縮小' },
  { organ: '気管支', s: '拡張', p: '収縮' },
  { organ: '胃・腸のぜん動', s: '抑制', p: '促進' },
  { organ: '体表の血管', s: '収縮', p: '—（分布しない）' },
  { organ: '立毛筋', s: '収縮（鳥はだ）', p: '—（分布しない）' },
  { organ: '汗腺（発汗）', s: '促進', p: '—（分布しない）' },
  { organ: 'ぼうこう（排尿）', s: '抑制', p: '促進' },
];

// レーヴィの実験の模式：心臓Aの迷走神経（副交感神経）を t0 から刺激すると、
// Aの拍動がすぐに遅くなり、Aを通った液を受ける心臓Bも少し遅れて遅くなる
export function loewi({ t0 = 10, t1 = 20, tEnd = 40, delay = 3 } = {}) {
  const f = (t, s0, s1) => {
    if (t < s0) return 1;
    if (t < s1) return 1 - 0.55 * (1 - Math.exp(-(t - s0) / 1.2));
    const atEnd = 1 - 0.55 * (1 - Math.exp(-(s1 - s0) / 1.2));
    return 1 - (1 - atEnd) * Math.exp(-(t - s1) / 4);
  };
  const out = [];
  for (let t = 0; t <= tEnd + 1e-9; t += 0.2) out.push({ t: Math.round(t * 10) / 10, a: f(t, t0, t1), b: f(t, t0 + delay, t1 + delay) });
  return out;
}
