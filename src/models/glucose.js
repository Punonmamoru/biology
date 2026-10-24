// B2 血糖値の調節モデル（定性的な形を保証する簡単な微分方程式）
// 状態：S＝胃の中の糖, Q＝小腸の糖, G＝血糖値[mg/100mL], I＝インスリン（相対値）, N＝グルカゴン（相対値）
//   dS/dt = −ks·S,  dQ/dt = ks·S − ka·Q（胃から小腸へ送られ、小腸で吸収される）
//   dG/dt = ka·Q（吸収）＋ 肝臓からの放出 − 組織への取り込み
//           肝臓からの放出   = (p0 + pg·N) / (1 + hi·I)   …グルカゴンで増え、インスリンで抑えられる
//           組織への取り込み = (u0 + si·S·I)·G             …インスリンが効くほど増える
//   dI/dt = kI·(cap·sec(G) − I)      sec(G) は血糖値が高いほど大きい
//   dN/dt = kN·(low(G) − N)          low(G) は血糖値が低いほど大きい
//   dX/dt = kX·(I − X)               X＝インスリンの作用（血中インスリンより少し遅れて効く）
// 上式の I のはたらき（放出の抑制・取り込みの促進）は X を通して効かせる。時間の単位は分。
// 健康な人では、食後に上昇した血糖値が空腹時の値（約100）へ戻り、空腹時を下回らない（教科書の図の形）。
export const PRESETS = {
  healthy: { label: '健康', meal: 1, cap: 1, sens: 1 },
  type1: { label: '1型糖尿病', meal: 1, cap: 0.03, sens: 1 },
  type2: { label: '2型糖尿病', meal: 1, cap: 0.5, sens: 0.2 },
};

export const P = {
  ks: 1 / 20, // 胃から小腸へ送られる速さ
  ka: 1 / 30, // 小腸からの吸収速度
  dose: 170, // 食事量1のとき血液に入る糖の総量（mg/100mL 相当）
  u0: 0.0028, // インスリンによらない取り込み（脳など）
  si: 0.05, // インスリンによる取り込み
  p0: 0.75, // 肝臓からの基礎的な放出
  pg: 1.8, // グルカゴンによる肝臓からの放出（グリコーゲンの分解）
  hi: 1, // インスリンによる肝臓からの放出の抑制
  kI: 1 / 15,
  kN: 1 / 15,
  kX: 1 / 4, // インスリンの作用の遅れは短くする（長いと食後に空腹時より下がる「行き過ぎ」が出る）
  gHalf: 140,
  gLow: 80,
};

export function sec(G) {
  const r = Math.pow(G / P.gHalf, 6);
  return r / (1 + r);
}

export function low(G) {
  return 1 / (1 + Math.pow(G / P.gLow, 6));
}

const KEYS = ['S', 'Q', 'G', 'I', 'N', 'X'];

function deriv(s, prm) {
  const { S, Q, G, I, N, X } = s;
  const absorb = P.ka * Q;
  const liver = (P.p0 + P.pg * N) / (1 + P.hi * X);
  const uptake = (P.u0 + P.si * prm.sens * X) * G;
  return {
    S: -P.ks * S,
    Q: P.ks * S - absorb,
    G: absorb + liver - uptake,
    I: P.kI * (prm.cap * sec(G) - I),
    N: P.kN * (low(G) - N),
    X: P.kX * (I - X),
  };
}

function step(s, prm, dt) {
  const add = (a, d, k) => {
    const o = {};
    for (const n of KEYS) o[n] = a[n] + d[n] * k;
    return o;
  };
  const k1 = deriv(s, prm);
  const k2 = deriv(add(s, k1, dt / 2), prm);
  const k3 = deriv(add(s, k2, dt / 2), prm);
  const k4 = deriv(add(s, k3, dt), prm);
  const o = {};
  for (const n of KEYS) o[n] = s[n] + (dt / 6) * (k1[n] + 2 * k2[n] + 2 * k3[n] + k4[n]);
  return o;
}

// 食事前の安定状態（食事なしで十分長く計算する）
export function fasting(prm) {
  let s = { S: 0, Q: 0, G: 100, I: prm.cap * sec(100), N: low(100), X: prm.cap * sec(100) };
  for (let i = 0; i < 3000; i++) s = step(s, prm, 1);
  return s;
}

// 食事（t=0）から minutes 分後までを計算。prm = { meal, cap, sens }
export function simulate(prm, minutes = 300, dt = 1) {
  const s0 = fasting(prm);
  let s = { ...s0, S: P.dose * prm.meal };
  const out = [{ t: 0, ...s }];
  for (let t = dt; t <= minutes + 1e-9; t += dt) {
    s = step(s, prm, dt);
    out.push({ t, ...s });
  }
  return out;
}

export function summarize(run) {
  let peak = run[0];
  for (const r of run) if (r.G > peak.G) peak = r;
  let iPeak = run[0];
  for (const r of run) if (r.I > iPeak.I) iPeak = r;
  const at = (min) => run.reduce((b, r) => (Math.abs(r.t - min) < Math.abs(b.t - min) ? r : b), run[0]);
  return { fastingG: run[0].G, peakG: peak.G, peakT: peak.t, insulinPeakT: iPeak.t, insulinPeak: iPeak.I, g120: at(120).G, gEnd: run[run.length - 1].G, minG: Math.min(...run.map((r) => r.G)) };
}

// 表示用の基準（健康な人の空腹時を 1 とする相対値）
let ref = null;
export function hormoneRef() {
  if (!ref) {
    const f = fasting(PRESETS.healthy);
    ref = { I: f.I, N: f.N };
  }
  return ref;
}
