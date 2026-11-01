// A7 遺伝子発現の調節（大腸菌のラクトースオペロン）
// 調節遺伝子 → リプレッサー（調節タンパク質）。リプレッサーがオペレーターに結合すると、
// RNAポリメラーゼがプロモーターに結合できなくなり（教科書の説明）、構造遺伝子（β-ガラクトシダーゼなどの遺伝子）は転写されない。
// ラクトースがあると、ラクトースからできる物質がリプレッサーに結合し、リプレッサーはオペレーターに結合できなくなる → 転写が起こる。
// （発展）グルコースがあると、ラクトースがあっても転写はわずかしか起こらない
//   （グルコースがないときに転写を促進するタンパク質（CRP・CAP）がはたらかないため）。
export const MUTANTS = {
  none: { name: '野生型（変異なし）', short: '野生型' },
  noRepressor: { name: '調節遺伝子の変異①（リプレッサーがつくられない）', short: '調節遺伝子の変異①' },
  operator: { name: 'オペレーターの変異（リプレッサーが結合できない）', short: 'オペレーターの変異' },
  noInducer: { name: '調節遺伝子の変異②（ラクトースからできる物質と結合できないリプレッサーがつくられる）', short: '調節遺伝子の変異②' },
};

export const LEVEL = { off: 0, low: 0.1, high: 1 };
export const LEVEL_NAME = { off: '転写されない（オフ）', low: '転写はわずか', high: 'さかんに転写される（オン）' };

export function operonState({ lactose, glucose, mutant = 'none' }) {
  const repressorMade = mutant !== 'noRepressor';
  // ラクトースからできる物質がリプレッサーに結合しているか
  const inducerBound = repressorMade && lactose && mutant !== 'noInducer';
  const repressorBound = repressorMade && !inducerBound && mutant !== 'operator';
  const activatorBound = !glucose; // グルコースがないとき転写を促進するタンパク質が結合する（発展）
  let level;
  if (repressorBound) level = 'off';
  else level = activatorBound ? 'high' : 'low';
  return { repressorMade, inducerBound, repressorBound, activatorBound, level, value: LEVEL[level] };
}

// グルコースとラクトースを両方含む培地での培養（二段階の増殖）
// 菌はまずグルコースを使って増える。グルコースがなくなるとラクトースオペロンの転写が始まり、
// β-ガラクトシダーゼがつくられるまでの間、増殖がいったん止まる。その後ラクトースを使って再び増える。
export const DIAUXIE = { N0: 1, G0: 40, L0: 160, muG: 0.9, muL: 0.6, K: 2, tau: 0.5, delay: 0.6, T: 12 };

// β-ガラクトシダーゼの量 E（相対値。さかんに転写されている状態が続いたときを 1 とする）。
// 転写がオンになってから酵素がたまりはじめるまで少し時間がかかる（delay）。
// 転写がオフのときは新たにつくられず、増殖で菌が増えた分だけうすまる（増殖しなければ量は変わらない）。
export function diauxie(p = DIAUXIE, dt = 0.005, every = 10) {
  let N = p.N0;
  let G = p.G0;
  let L = p.L0;
  let E = 0;
  let onSince = null;
  const out = [];
  const steps = Math.round(p.T / dt);
  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    const s = operonState({ lactose: L > 0.5, glucose: G > 0.5, mutant: 'none' });
    if (s.level === 'high') onSince = onSince == null ? t : onSince;
    else onSince = null;
    if (i % every === 0) out.push({ t, N, G, L, E, level: s.level });
    const gG = (p.muG * G) / (p.K + G);
    const gL = (p.muL * E * L) / (p.K + L);
    const mu = gG + gL;
    G = Math.max(0, G - gG * N * dt);
    L = Math.max(0, L - gL * N * dt);
    N += mu * N * dt;
    const making = onSince != null && t - onSince >= p.delay;
    E += (making ? (1 - E) / p.tau : -mu * E) * dt;
  }
  return out;
}

// グルコースがなくなる時刻（G が初めて 0.5 未満になる時刻）
export function glucoseOutTime(run) {
  const r = run.find((q) => q.G < 0.5);
  return r ? r.t : null;
}

// 1分子のmRNAにふくまれる、翻訳される領域の塩基数（アミノ酸1個＝3塩基、終止コドン3塩基を加える）
export function codingBases(aminoAcids) {
  return (aminoAcids + 1) * 3;
}
