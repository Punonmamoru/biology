// モデルの形の検証：node tests/models.mjs
// 仕様書で「保証する形」とした性質を、数値で確認する。1件でも不合格なら終了コード1。
import { makeRng } from '../src/lib/rng.js';
import * as cc from '../src/models/cellcycle.js';
import * as gl from '../src/models/glucose.js';
import * as im from '../src/models/immune.js';
import * as ph from '../src/models/photosynthesis.js';
import * as ks from '../src/models/keystone.js';
import * as en from '../src/models/enzyme.js';
import * as ge from '../src/models/genetics.js';
import * as po from '../src/models/population.js';

const results = [];
let current = '';
function section(name) {
  current = name;
  console.log(`\n# ${name}`);
}
function check(desc, ok, detail = '') {
  results.push({ stage: current, desc, ok: !!ok, detail });
  console.log(`  ${ok ? '✓' : '✗'} ${desc}${detail ? '（' + detail + '）' : ''}`);
}
const f = (x, d = 2) => Number(x.toFixed(d));
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ---------- B1 ----------
section('B1 細胞周期とDNA量');
{
  const rng = makeRng(1);
  let shapeOk = true;
  let detail = '';
  for (let i = 0; i < 500; i++) {
    const p = { G1: rng.int(2, 20), S: rng.int(2, 12), G2: rng.int(1, 8), M: rng.int(1, 4) };
    const T = cc.cycleLength(p);
    const eps = 1e-6;
    const g1 = cc.dnaAt(p.G1 / 2, p);
    const sMid = cc.dnaAt(p.G1 + p.S / 2, p);
    const g2 = cc.dnaAt(p.G1 + p.S + p.G2 / 2, p);
    const mEnd = cc.dnaAt(T - eps, p);
    const next = cc.dnaAt(T + eps, p);
    let mono = true;
    for (let k = 0; k < 20; k++) if (cc.dnaAt(p.G1 + (p.S * (k + 1)) / 21, p) < cc.dnaAt(p.G1 + (p.S * k) / 21, p)) mono = false;
    if (!(g1 === 2 && near(sMid, 3, 1e-9) && g2 === 4 && mEnd === 4 && next === 2 && mono)) {
      shapeOk = false;
      detail = JSON.stringify(p);
    }
  }
  check('G1期=2、S期で2→4へ直線的に増加（中点で3・単調増加）、G2期=4、M期終了で2に戻る（500通りの期の長さ）', shapeOk, detail);
  const L = cc.phaseLengthsFromCounts(24, { G1: 40, S: 32, G2: 16, M: 12 });
  check('各期の時間 = 全周期 × 細胞数の割合（24時間, 40/32/16/12個 → M期 2.88時間, 合計24時間）', near(L.M, 2.88, 1e-9) && near(L.G1 + L.S + L.G2 + L.M, 24, 1e-9), `M=${f(L.M)}`);
}

// ---------- B2 ----------
section('B2 血糖値の調節');
{
  const H = gl.simulate(gl.PRESETS.healthy);
  const sH = gl.summarize(H);
  check('健康：空腹時の血糖値が約100（90〜110 mg/100mL）', sH.fastingG >= 90 && sH.fastingG <= 110, `${f(sH.fastingG, 0)}`);
  check('健康：食後に血糖値が上昇する（ピーク ≧ 空腹時＋30）', sH.peakG >= sH.fastingG + 30, `ピーク ${f(sH.peakG, 0)}（${sH.peakT}分）`);
  check('健康：血糖値の上昇に続いてインスリンが上昇する（インスリンのピークは血糖値のピークより後）', sH.insulinPeakT > sH.peakT && sH.insulinPeak > H[0].I * 2, `血糖 ${sH.peakT}分 → インスリン ${sH.insulinPeakT}分、${f(sH.insulinPeak / H[0].I, 1)}倍`);
  const g180 = H[180].G;
  check('健康：食後2〜3時間で元に戻る（180分で空腹時±10以内）', near(g180, sH.fastingG, 10), `180分 ${f(g180, 0)}`);
  const below = H.filter((r) => r.G < sH.fastingG - 3);
  const gnMax = Math.max(...below.map((r) => r.N));
  check('負のフィードバック：血糖値が空腹時より下がるとグルカゴンが増える', below.length > 0 && gnMax > H[0].N * 1.1, `グルカゴン最大 ${f(gnMax / H[0].N, 2)}倍`);
  const high = H.filter((r) => r.G > sH.fastingG + 20);
  check('負のフィードバック：血糖値が高い間はグルカゴンが減る', high.every((r) => r.N < H[0].N), '');
  const T1 = gl.simulate(gl.PRESETS.type1);
  const s1 = gl.summarize(T1);
  check('1型：インスリンがほとんど分泌されない（健康の最大値の10%未満）', s1.insulinPeak < sH.insulinPeak * 0.1, `${f(s1.insulinPeak / sH.insulinPeak, 3)}`);
  check('1型：血糖値が高く、下がりにくい（ピーク＞健康＋80、2時間後＞200）', s1.peakG > sH.peakG + 80 && s1.g120 > 200, `ピーク ${f(s1.peakG, 0)}、2時間後 ${f(s1.g120, 0)}`);
  const T2 = gl.simulate(gl.PRESETS.type2);
  const s2 = gl.summarize(T2);
  check('2型：インスリンは分泌される（1型の5倍以上）が、血糖値は健康より高く下がりにくい', s2.insulinPeak > s1.insulinPeak * 5 && s2.peakG > sH.peakG + 30 && s2.g120 > sH.g120 + 30, `ピーク ${f(s2.peakG, 0)}、2時間後 ${f(s2.g120, 0)}`);
  check('2型：空腹時血糖値が126以上（糖尿病型の目安）', s2.fastingG >= 126, `${f(s2.fastingG, 0)}`);
  const peaks = [0.5, 1, 1.5, 2].map((m) => gl.summarize(gl.simulate({ ...gl.PRESETS.healthy, meal: m })).peakG);
  check('食事量が多いほど血糖値のピークが高い', peaks.every((v, i) => i === 0 || v > peaks[i - 1]), peaks.map((v) => f(v, 0)).join(' < '));
  const effs = [0.2, 0.5, 1, 1.5].map((sv) => gl.summarize(gl.simulate({ meal: 1, cap: 1, sens: sv })).peakG);
  check('インスリンが効きにくいほど血糖値のピークが高い', effs.every((v, i) => i === 0 || v < effs[i - 1]), effs.map((v) => f(v, 0)).join(' > '));
  const noMeal = gl.simulate({ ...gl.PRESETS.healthy, meal: 0 });
  check('食事なしでは血糖値は一定', noMeal.every((r) => near(r.G, noMeal[0].G, 0.5)), '');
}

// ---------- B3 ----------
section('B3 免疫の一次応答・二次応答');
{
  let ok = true;
  let fasterOk = true;
  let bOk = true;
  let detail = '';
  const firstReach = (fn, start, level) => {
    for (let t = start; t < start + 60; t += 0.05) if (fn(t) >= level) return t - start;
    return Infinity;
  };
  for (const d1 of [0, 5, 10, 20, 30]) {
    for (const gap of [10, 20, 40, 60]) {
      const d2 = d1 + gap;
      const m = im.antibodyModel([{ day: d1, antigen: 'A' }, { day: d2, antigen: 'A' }]);
      const fA = (t) => m.level('A', t);
      let p1 = 0;
      for (let t = d1; t < d2; t += 0.05) p1 = Math.max(p1, fA(t));
      let p2 = 0;
      for (let t = d2; t < d2 + 60; t += 0.05) p2 = Math.max(p2, fA(t));
      if (!(p2 > p1 * 10)) {
        ok = false;
        detail = `d1=${d1}, d2=${d2}: ${f(p1)} → ${f(p2)}`;
      }
      const single = im.antibodyModel([{ day: d1, antigen: 'A' }]);
      const r1 = firstReach((t) => single.level('A', t), d1, 0.5);
      const onlySecond = (t) => m.level('A', t) - single.level('A', t) + im.FLOOR;
      const r2 = firstReach(onlySecond, d2, 0.5);
      if (!(r2 < r1)) fasterOk = false;
      const mb = im.antibodyModel([{ day: d1, antigen: 'A' }, { day: d2, antigen: 'B' }]);
      let pb = 0;
      let tb = 0;
      for (let t = d2; t < d2 + 60; t += 0.05) {
        const v = mb.level('B', t);
        if (v > pb) {
          pb = v;
          tb = t - d2;
        }
      }
      let pa = 0;
      let ta = 0;
      for (let t = d1; t < d1 + 60; t += 0.05) {
        const v = single.level('A', t);
        if (v > pa) {
          pa = v;
          ta = t - d1;
        }
      }
      if (!(near(pb, pa, pa * 0.01) && near(tb, ta, 0.1) && mb.events[1].kind === 'primary')) bOk = false;
    }
  }
  check('二次応答のピーク ＞ 一次応答のピーク（10倍以上、20通りの侵入日）', ok, detail);
  check('二次応答は一次応答より速く立ち上がる（同じ量に達するまでの日数が短い）', fasterOk);
  check('2回目が別の抗原Bなら一次応答と同じ形（ピーク量・ピークまでの日数が一致）＝記憶細胞は特異的', bOk);
  check('一次応答は侵入後しばらく（潜伏期）抗体が増えない', im.responseShape(im.PRIMARY.lag - 0.1, im.PRIMARY) === 0 && im.PRIMARY.lag > im.SECONDARY.lag, `潜伏期 一次 ${im.PRIMARY.lag}日 > 二次 ${im.SECONDARY.lag}日`);
}

// ---------- B4 ----------
section('B4 光の強さと光合成');
{
  const S = ph.PLANTS.sun;
  const D = ph.PLANTS.shade;
  check('陽生植物は Pmax・呼吸速度 R が陰生植物より大きい', S.Pmax > D.Pmax && S.R > D.R);
  const icS = ph.compensationPoint(S);
  const icD = ph.compensationPoint(D);
  check('補償点で見かけの光合成速度 = 0（光合成速度 = 呼吸速度）', near(ph.apparent(S, icS), 0, 1e-12) && near(ph.apparent(D, icD), 0, 1e-12));
  check('補償点：陽生植物 ＞ 陰生植物', icS > icD, `${f(icS)} ＞ ${f(icD)} キロルクス`);
  check('光飽和点：陽生植物 ＞ 陰生植物', ph.saturationPoint(S) > ph.saturationPoint(D), `${f(ph.saturationPoint(S), 1)} ＞ ${f(ph.saturationPoint(D), 1)}`);
  check('光の強さ0での見かけの光合成速度 = −呼吸速度', ph.apparent(S, 0) === -S.R && ph.apparent(D, 0) === -D.R);
  const x = ph.crossingPoint(S, D);
  let below = true;
  let above = true;
  for (let I = 0; I < x - 1e-6; I += x / 50) if (!(ph.apparent(D, I) > ph.apparent(S, I))) below = false;
  for (let I = x + 0.01; I <= 60; I += 0.5) if (!(ph.apparent(S, I) > ph.apparent(D, I))) above = false;
  check('2本の曲線が弱光側で1回だけ交差する（交点より弱い光では陰生植物が有利、強い光では陽生植物が有利）', x != null && x < 10 && below && above, `交点 ${f(x)} キロルクス`);
  let mono = true;
  for (let I = 0; I < 100; I += 0.5) if (ph.apparent(S, I + 0.5) <= ph.apparent(S, I) || ph.apparent(D, I + 0.5) <= ph.apparent(D, I)) mono = false;
  check('見かけの光合成速度は光が強いほど大きく、頭打ちに近づく（単調増加・Pmax−R を超えない）', mono && ph.apparent(S, 1e6) < S.Pmax - S.R);
  check('弱光（補償点の間）では陰生植物だけがCO₂を吸収する', ph.apparent(D, (icD + icS) / 2) > 0 && ph.apparent(S, (icD + icS) / 2) < 0);
}

// ---------- B5 ----------
section('B5 生態系のバランス');
{
  const base = ks.simulate({ o0: 1, o1: 1 });
  check('ラッコが変わらなければ、ウニ・ケルプも一定に保たれる', base.every((r) => near(r.u, base[0].u, 1e-6) && near(r.k, base[0].k, 1e-6)));
  const levels = [1, 0.8, 0.6, 0.4, 0.2, 0];
  const ends = levels.map((o1) => {
    const run = ks.simulate({ o0: 1, o1, tEnd: 300 });
    return run[run.length - 1];
  });
  check('ラッコが減るほど、最終的なウニの個体数が多い', ends.every((e, i) => i === 0 || e.u > ends[i - 1].u), ends.map((e) => f(e.u * ks.SCALE.u, 0)).join(' < '));
  check('ラッコが減るほど、最終的なケルプの量が少ない（間接効果）', ends.every((e, i) => i === 0 || e.k < ends[i - 1].k), ends.map((e) => f(e.k * ks.SCALE.k, 0)).join(' > '));
  const run = ks.simulate({ o0: 1, o1: 0.2, tHunt: 20, tEnd: 300 });
  const pre = run.find((r) => r.t >= 19.5);
  const end = run[run.length - 1];
  const half = (key) => run.find((r) => r.t > 20 && Math.abs(r[key] - pre[key]) >= Math.abs(end[key] - pre[key]) / 2).t;
  check('ウニの増加がケルプの減少より先に起こる（ラッコ → ウニ → ケルプの順に影響が伝わる）', half('u') < half('k'), `変化の半分に達する時刻 ウニ ${f(half('u'), 1)}年 ＜ ケルプ ${f(half('k'), 1)}年`);
  check('個体数が負にならない', run.every((r) => r.u > 0 && r.k > 0));
}

// ---------- A1 ----------
section('A1 酵素の反応速度');
{
  const V = 60;
  const K = 4;
  check('[S] = Km のとき v = Vmax/2', near(en.rate(K, V, K), V / 2, 1e-12));
  let sat = true;
  for (let S = 0; S < 1000; S += 1) if (en.rate(S + 1, V, K) <= en.rate(S, V, K) || en.rate(S, V, K) >= V) sat = false;
  check('v は [S] とともに単調に増え、Vmax を超えずに近づく（飽和）', sat && near(en.rate(1e7, V, K), V, 1e-3));
  const c = en.inhibited('competitive', V, K, 4, 2);
  check('競争的阻害：Vmax は不変', c.Vmax === V && near(en.rate(1e8, c.Vmax, c.Km), V, 1e-2), `Vmax ${c.Vmax}`);
  check('競争的阻害：見かけの Km が増加（Km\' = Km(1+[I]/Ki)）', near(c.Km, K * (1 + 4 / 2), 1e-12), `Km ${K} → ${c.Km}`);
  const n = en.inhibited('noncompetitive', V, K, 4, 2);
  check('非競争的阻害：Vmax が低下し、Km は不変', n.Vmax < V && n.Km === K && near(en.rate(K, n.Vmax, n.Km), n.Vmax / 2, 1e-12), `Vmax ${V} → ${n.Vmax}`);
  let lower = true;
  for (let S = 0.1; S < 100; S += 0.5) if (en.rate(S, c.Vmax, c.Km) > en.rate(S, V, K) || en.rate(S, n.Vmax, n.Km) > en.rate(S, V, K)) lower = false;
  check('阻害剤があると、どの基質濃度でも反応速度は阻害なし以下', lower);
  const L0 = en.lineweaver(V, K);
  const Lc = en.lineweaver(c.Vmax, c.Km);
  const Ln = en.lineweaver(n.Vmax, n.Km);
  let linear = true;
  for (let S = 0.5; S < 50; S += 0.5) if (!near(1 / en.rate(S, V, K), L0.slope * (1 / S) + L0.yIntercept, 1e-9)) linear = false;
  check('ラインウィーバー・バーク：1/v = (Km/Vmax)(1/[S]) + 1/Vmax の直線', linear && near(L0.yIntercept, 1 / V, 1e-12) && near(L0.xIntercept, -1 / K, 1e-12));
  check('ラインウィーバー・バーク：競争的阻害は y切片が同じで傾きが大きい', near(Lc.yIntercept, L0.yIntercept, 1e-12) && Lc.slope > L0.slope);
  check('ラインウィーバー・バーク：非競争的阻害は x切片が同じで y切片が大きい', near(Ln.xIntercept, L0.xIntercept, 1e-12) && Ln.yIntercept > L0.yIntercept);
  const To = en.optimumTemp();
  let unimodal = true;
  for (let T = 0; T < 80; T += 0.5) {
    const d = en.tempRate(T + 0.5) - en.tempRate(T);
    if (T + 0.5 <= To && d <= 0) unimodal = false;
    if (T >= To && d >= 0) unimodal = false;
  }
  check('温度：最適温度を頂点とする山型（その手前は増加、その先は減少）', unimodal, `最適温度 ${f(To, 1)}℃`);
  check('温度：最適温度がヒトの酵素の目安（35〜45℃）', To >= 35 && To <= 45);
  check('温度：高温（70℃）で処理すると最適温度に戻しても回復しない（不可逆）', en.afterTreatment(70) < en.tempRate(To) * 0.05, `${f(en.afterTreatment(70) / en.tempRate(To), 4)}`);
  check('温度：低温（5℃）で処理しても最適温度に戻せば回復する', near(en.afterTreatment(5), en.tempRate(To), 1e-12));
  const optOk = Object.values(en.ENZYMES).every((e) => {
    let best = 0;
    let bv = -1;
    for (let p = 0; p <= 14; p += 0.01) if (en.phRate(p, e.opt) > bv) {
      bv = en.phRate(p, e.opt);
      best = p;
    }
    return near(best, e.opt, 0.011);
  });
  check('pH：ペプシン約2・だ液アミラーゼ約7・トリプシン約8で最大', optOk && en.ENZYMES.pepsin.opt === 2 && en.ENZYMES.amylase.opt === 7 && en.ENZYMES.trypsin.opt === 8);
}

// ---------- A2 ----------
section('A2 遺伝の分離比');
{
  for (const t of ['mono', 'testMono', 'di']) check(`理論比の合計が1（${t}）`, near(ge.expected(t).reduce((a, b) => a + b, 0), 1, 1e-12));
  const big = (type, r = 0.5, seed = 7) => {
    const c = ge.simulate(type, 10000, makeRng(seed), r);
    const n = c.reduce((a, b) => a + b, 0);
    return c.map((x) => x / n);
  };
  const dev = (obs, exp) => Math.max(...obs.map((p, i) => Math.abs(p - exp[i])));
  const m = big('mono');
  check('n=10000 で一遺伝子雑種が 3:1 に近い（ずれ2%未満）', dev(m, ge.expected('mono')) < 0.02, m.map((x) => f(x, 3)).join(' : '));
  const tm = big('testMono');
  check('n=10000 で検定交雑（Aa×aa）が 1:1 に近い', dev(tm, ge.expected('testMono')) < 0.02, tm.map((x) => f(x, 3)).join(' : '));
  const di = big('di');
  check('n=10000 で二遺伝子雑種が 9:3:3:1 に近い', dev(di, ge.expected('di')) < 0.02, di.map((x) => f(x * 16, 2)).join(' : ') + '（16倍）');
  const r20 = big('testDi', 0.2);
  check('組換え価20%の検定交雑で AB:Ab:aB:ab ≒ 0.4:0.1:0.1:0.4', dev(r20, ge.expected('testDi', 0.2)) < 0.02, r20.map((x) => f(x, 3)).join(' : '));
  const rv = ge.recombinationValue(ge.simulate('testDi', 10000, makeRng(3), 0.2));
  check('検定交雑の結果から求めた組換え価がもとの r に近い（20% ± 2%）', near(rv, 0.2, 0.02), `${f(rv * 100, 1)}%`);
  const r0 = ge.simulate('testDi', 5000, makeRng(4), 0);
  check('組換え価0%（完全連鎖）では [Ab]・[aB] が現れない', r0[1] === 0 && r0[2] === 0);
  const r50 = big('testDi', 0.5);
  check('組換え価50%では独立と同じ 1:1:1:1', dev(r50, [0.25, 0.25, 0.25, 0.25]) < 0.02);
  const g = ge.gameteRatio(0.2);
  check('配偶子比 = (1−r)/2 : r/2 : r/2 : (1−r)/2', near(g.AB, 0.4, 1e-12) && near(g.Ab, 0.1, 1e-12) && near(g.aB, 0.1, 1e-12) && near(g.ab, 0.4, 1e-12));
  const meanDev = (n) => {
    let s = 0;
    for (let i = 0; i < 300; i++) {
      const c = ge.simulate('mono', n, makeRng(1000 + i));
      s += Math.abs(c[0] / n - 0.75);
    }
    return s / 300;
  };
  const d10 = meanDev(10);
  const d1000 = meanDev(1000);
  check('n が大きいほど理論比からのずれが小さい（平均のずれ n=10 ＞ n=1000）', d1000 < d10 / 5, `${f(d10, 3)} ＞ ${f(d1000, 4)}`);
}

// ---------- A3 ----------
section('A3 個体群の成長');
{
  const N0 = 10;
  const r = 0.5;
  const K = 500;
  let mono = true;
  let underK = true;
  let underExp = true;
  for (let t = 0; t < 60; t += 0.1) {
    const a = po.logistic(t, N0, r, K);
    if (po.logistic(t + 0.1, N0, r, K) <= a) mono = false;
    if (a >= K) underK = false;
    if (a > po.exponential(t, N0, r) + 1e-9) underExp = false;
  }
  check('ロジスティック成長：N₀＜K なら単調に増加し、K を超えない', mono && underK && near(po.logistic(0, N0, r, K), N0, 1e-9));
  check('ロジスティック成長：十分時間がたつと K に近づく', near(po.logistic(80, N0, r, K), K, 0.01));
  check('ロジスティック成長は指数関数的成長を上回らない', underExp);
  let best = 0;
  let bn = 0;
  for (let n = 0; n <= K; n += 0.5) if (po.logisticRate(n, r, K) > best) {
    best = po.logisticRate(n, r, K);
    bn = n;
  }
  check('増加速度 dN/dt は N = K/2 で最大', near(bn, K / 2, 0.5), `N = ${bn}`);
  const ti = po.inflectionTime(N0, r, K);
  check('変曲点の時刻に N = K/2', near(po.logistic(ti, N0, r, K), K / 2, 1e-6));
  let down = true;
  for (let t = 0; t < 40; t += 0.1) if (po.logistic(t + 0.1, 900, r, K) >= po.logistic(t, 900, r, K) || po.logistic(t, 900, r, K) < K) down = false;
  check('N₀＞K なら減少して K に近づく', down);
  // ロトカ・ヴォルテラ
  let lagOk = true;
  let consOk = true;
  let posOk = true;
  let detail = '';
  for (const p of [po.LV_DEFAULT, { ...po.LV_DEFAULT, a: 0.6 }, { ...po.LV_DEFAULT, a: 1.4, d: 0.8 }, { ...po.LV_DEFAULT, b: 0.15, d: 0.3 }]) {
    const run = po.lotkaVolterra(p, 60);
    const px = po.peakTimes(run, 'x');
    const py = po.peakTimes(run, 'y');
    const period = (px[px.length - 1] - px[0]) / (px.length - 1);
    for (const ty of py) {
      const prev = px.filter((tx) => tx < ty).pop();
      if (prev == null) continue;
      const lag = ty - prev;
      if (!(lag > 0 && lag < period / 2)) {
        lagOk = false;
        detail = `a=${p.a}: lag ${f(lag)} / period ${f(period)}`;
      }
    }
    const H = (q) => p.c * q.x - p.d * Math.log(q.x) + p.b * q.y - p.a * Math.log(q.y);
    const h0 = H(run[0]);
    if (!run.every((q) => near(H(q), h0, Math.abs(h0) * 1e-4))) consOk = false;
    if (!run.every((q) => q.x > 0 && q.y > 0)) posOk = false;
    if (!detail) detail = `例：被食者の山 ${px.slice(0, 2).map((t) => f(t, 1)).join(', ')} → 捕食者の山 ${py.slice(0, 2).map((t) => f(t, 1)).join(', ')}`;
  }
  check('捕食者の山は被食者の山より遅れて現れる（遅れは0より大きく半周期未満、4通りのパラメーター）', lagOk, detail);
  check('被食者・捕食者の変動は周期的（保存量が一定＝同じ輪をくり返す）', consOk);
  check('個体数が負にならない', posOk);
  check('標識再捕法：N = M × C ÷ R', po.markRecapture(50, 40, 5) === 400);
}

const ng = results.filter((r) => !r.ok);
console.log(`\n${results.length} 項目中 ${results.length - ng.length} 項目合格${ng.length ? `、${ng.length} 項目不合格` : ''}`);
process.exitCode = ng.length ? 1 : 0;
