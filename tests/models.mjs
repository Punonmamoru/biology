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
import * as ox from '../src/models/oxygen.js';
import * as kd from '../src/models/kidney.js';
import * as bi from '../src/models/biome.js';
import * as dn from '../src/models/dna.js';
import * as nv from '../src/models/nerve.js';
import * as lm from '../src/models/limiting.js';
import * as pg from '../src/models/popgen.js';
import * as op from '../src/models/operon.js';
import * as sv from '../src/models/survival.js';
import * as rs from '../src/models/respiration.js';
import * as mu from '../src/models/muscle.js';
import * as ph2 from '../src/models/phylo.js';
import * as ax from '../src/models/auxin.js';
import * as pr from '../src/models/production.js';
import * as su from '../src/models/succession.js';
import * as sy from '../src/models/synapse.js';
import * as bt from '../src/models/biotech.js';
import * as bh from '../src/models/behavior.js';
import * as pp from '../src/models/photoperiod.js';
import * as th from '../src/models/thyroid.js';
import * as cb from '../src/models/carbon.js';
import * as vi from '../src/models/vision.js';
import * as mg from '../src/models/morphogen.js';
import * as me from '../src/models/meiosis.js';
import { TEMPLATE as B9_TEMPLATE } from '../src/dojo/b9.js';

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
  const dips = [0.5, 1, 1.5, 2].map((m) => {
    const sm = gl.summarize(gl.simulate({ ...gl.PRESETS.healthy, meal: m }));
    return sm.fastingG - sm.minG;
  });
  check('健康：食後に上昇した血糖値は空腹時の値へ戻り、空腹時を下回らない（食事量0.5〜2倍、下回りは1 mg/100mL未満）', dips.every((d) => d < 1), `下回り ${dips.map((d) => f(d, 1)).join('・')}`);
  check('負のフィードバック：血糖値が低いほどグルカゴンの分泌が大きくなる（60＞100＞140 mg/100mL）', gl.low(60) > gl.low(100) && gl.low(100) > gl.low(140), `${f(gl.low(60), 2)} ＞ ${f(gl.low(100), 2)} ＞ ${f(gl.low(140), 3)}`);
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
  check('一次応答：抗体が増えはじめるまで約1週間（6〜7日）、最大まで約2週間（12〜16日）', im.PRIMARY.lag >= 6 && im.PRIMARY.lag <= 7 && im.peakDelay(im.PRIMARY) >= 12 && im.peakDelay(im.PRIMARY) <= 16, `${im.PRIMARY.lag}日・${im.peakDelay(im.PRIMARY)}日`);
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
  const flat = [S, D].every((p) => {
    const is = ph.saturationPoint(p);
    return ph.gross(p, is) >= 0.98 * p.Pmax && ph.gross(p, 3 * is) - ph.gross(p, is) < 0.01 * p.Pmax;
  });
  check('光飽和点より強い光では光合成速度が増えない（飽和点で最大値の98%以上、飽和点の3倍の光でも増加は最大値の1%未満）', flat, `陽生 ${f(ph.gross(S, ph.saturationPoint(S)) / S.Pmax * 100, 1)}%・陰生 ${f(ph.gross(D, ph.saturationPoint(D)) / D.Pmax * 100, 1)}%`);
  check('弱い光では光合成速度が光の強さにほぼ比例する（補償点の2倍までで直線からのずれ5%未満）', [S, D].every((p) => { const I = 2 * ph.compensationPoint(p); return Math.abs(ph.gross(p, I) - p.alpha * I) < 0.05 * p.alpha * I; }));
  check('陽生植物の光飽和点はグラフの横軸（0〜60キロルクス）の中ほどにある', ph.saturationPoint(S) > 15 && ph.saturationPoint(S) < 40, `${f(ph.saturationPoint(S), 1)} キロルクス`);
  check('光の強さ0での見かけの光合成速度 = −呼吸速度', ph.apparent(S, 0) === -S.R && ph.apparent(D, 0) === -D.R);
  const x = ph.crossingPoint(S, D);
  let below = true;
  let above = true;
  for (let I = 0; I < x - 1e-6; I += x / 50) if (!(ph.apparent(D, I) > ph.apparent(S, I))) below = false;
  for (let I = x + 0.01; I <= 60; I += 0.5) if (!(ph.apparent(S, I) > ph.apparent(D, I))) above = false;
  check('2本の曲線が弱光側で1回だけ交差する（交点より弱い光では陰生植物が有利、強い光では陽生植物が有利）', x != null && x < 10 && below && above, `交点 ${f(x)} キロルクス`);
  let mono = true;
  for (let I = 0; I < 100; I += 0.5) if (ph.apparent(S, I + 0.5) < ph.apparent(S, I) || ph.apparent(D, I + 0.5) < ph.apparent(D, I)) mono = false;
  check('見かけの光合成速度は光が強いほど大きく（減らない）、Pmax−R を超えない', mono && ph.apparent(S, 1e6) <= S.Pmax - S.R + 1e-9);
  check('弱光（補償点の間）では陰生植物だけがCO₂を吸収する', ph.apparent(D, (icD + icS) / 2) > 0 && ph.apparent(S, (icD + icS) / 2) < 0);
}

// ---------- B5 ----------
section('B5 生態系のバランス');
{
  const base = ks.simulate({ o0: 1, o1: 1 });
  check('表示は3種とも乱獲前＝100の相対値', near(base[0].o * ks.SCALE.o, 100, 1e-9) && near(base[0].u * ks.SCALE.u, 100, 1e-9) && near(base[0].k * ks.SCALE.k, 100, 1e-9));
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

// ---------- B6 ----------
section('B6 酸素解離曲線');
{
  const S = (p, c = 40) => ox.saturation(p, c);
  let mono = true;
  for (let p = 0; p < 100; p += 0.5) if (!(S(p + 0.5) > S(p))) mono = false;
  check('O₂分圧が高いほど酸素ヘモグロビンの割合が大きい（0%〜100%の範囲、単調増加）', mono && S(0) === 0 && S(100) < 100);
  let maxSlope = 0;
  let pMax = 0;
  for (let p = 0.5; p < 100; p += 0.5) {
    const sl = S(p + 0.5) - S(p);
    if (sl > maxSlope) { maxSlope = sl; pMax = p; }
  }
  check('S字形：傾きが最大になる点がO₂分圧（相対値）の中ほど（10〜50）にあり、低い側・高い側では傾きが小さい', pMax > 10 && pMax < 50 && S(5) - S(0) < maxSlope && S(100) - S(99.5) < maxSlope, `傾き最大 O₂分圧 ${pMax}`);
  let right = true;
  for (let p = 1; p < 100; p += 1) if (!(S(p, 70) < S(p, 40))) right = false;
  check('CO₂分圧が高いと右へずれる（同じO₂分圧で割合が小さい、P50が大きい）', right && ox.p50(70) > ox.p50(40), `P50 ${f(ox.p50(40), 0)} → ${f(ox.p50(70), 0)}（相対値）`);
  const ex = ox.exchange();
  check('教科書の目安：肺胞（O₂100・CO₂40）で約95〜98%、組織（O₂30・CO₂70）で約30%', ex.sLung >= 95 && ex.sLung <= 98 && near(ex.sTissue, 30, 3), `${f(ex.sLung, 1)}%・${f(ex.sTissue, 1)}%`);
  check('放出した割合 ＝（肺 − 組織）÷ 肺 × 100（95%・30% → 68.4%）', near(ox.releaseFraction(95, 30), 68.42, 0.01));
  check('組織のCO₂分圧が高いほど、放出される酸素の割合が大きい', ox.exchange(ox.LUNG, { pO2: 30, pCO2: 70 }).fraction > ox.exchange(ox.LUNG, { pO2: 30, pCO2: 40 }).fraction);
}

// ---------- B7 ----------
section('B7 腎臓のはたらき');
{
  const F = kd.filtrateVolume(1.5, kd.concentrationRatio(0.1, 12));
  check('原尿量 ＝ 尿量 × イヌリンの濃縮率（1.5 L × 120 ＝ 180 L）', near(F, 180, 1e-9));
  const rate = (id) => {
    const s0 = kd.substanceById(id);
    return kd.reabsorption(F * 1000, 1500, s0.filtrate, s0.urine);
  };
  check('グルコースは再吸収率100%（尿中に出ない）', near(rate('glucose').rate, 1, 1e-12));
  check('タンパク質はろ過されない（原尿中0）', rate('protein').filtered === 0);
  check('イヌリンは再吸収率0%', near(rate('inulin').rate, 0, 1e-9));
  check('水の再吸収率は約99%（1 − 1.5/180）', near(kd.waterReabsorption(F, 1.5), 0.99167, 1e-4), `${f(kd.waterReabsorption(F, 1.5) * 100, 1)}%`);
  check('尿素の再吸収率は水・グルコースよりずっと小さい（約44%）', rate('urea').rate < 0.6 && rate('urea').rate > 0.3, `${f(rate('urea').rate * 100, 1)}%`);
  const all = kd.SUBSTANCES.filter((x) => x.filtrate > 0).every((x) => { const r = rate(x.id).rate; return r >= -1e-9 && r <= 1 + 1e-9; });
  check('どの物質も再吸収率が0〜100%に入る（濃縮率がイヌリンを超える物質がない）', all);
}

// ---------- B8 ----------
section('B8 バイオーム');
{
  const inside = (pt, poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const polys = bi.polygons();
  let agree = 0;
  let total = 0;
  let bad = '';
  for (let T = bi.T_MIN + 0.13; T < bi.T_MAX; T += 0.71) {
    for (let P = 7; P < bi.P_MAX; P += 43) {
      const c = bi.classify(T, P);
      const hits = polys.filter((pg) => inside([T, P], pg.points)).map((pg) => pg.id);
      total++;
      if ((c === null && hits.length === 0) || (hits.length === 1 && hits[0] === c)) agree++;
      else if (!bad) bad = `T=${f(T, 2)}, P=${P}: 判定 ${c} / 図 ${hits.join(',')}`;
    }
  }
  check('図の区画（多角形）と判定（classify）が一致する（格子点で重なり・すき間なし）', agree === total, `${agree}/${total} ${bad}`);
  // 森林と草原の境界がなめらか（気温0.1℃ごとに、森林になる最小の降水量の変化が小さい）
  const forestFrom = (T) => {
    for (let P = 0; P <= bi.pEnvelope(T); P += 1) {
      const c = bi.classify(T, P);
      if (c && bi.BIOMES[c].kind === '森林') return P;
    }
    return null;
  };
  let maxJump = 0;
  let jumpAt = 0;
  let prev = forestFrom(-4.9);
  for (let i = 1; i <= 348; i++) {
    const T = Math.round((-4.9 + i * 0.1) * 10) / 10; // −4.8〜29.9℃
    const cur = forestFrom(T);
    if (Math.abs(cur - prev) > maxJump) { maxJump = Math.abs(cur - prev); jumpAt = T; }
    prev = cur;
  }
  check('森林と草原の境界は連続（気温0.1℃あたりの変化が15 mm以下。20℃付近でも段差がない）', maxJump <= 15, `最大の変化 ${maxJump} mm（${f(jumpAt, 1)}℃付近）、20℃で ${forestFrom(19.9)} → ${forestFrom(20.1)} mm`);
  // 折れ曲がりがない（0.5℃ごとの区間の傾きの変化が小さい）＝なめらかな曲線
  const gc = bi.GRASS_CURVE;
  let maxBend = 0;
  let bendAt = 0;
  for (let i = 1; i < gc.length - 1; i++) {
    const s0 = (gc[i][1] - gc[i - 1][1]) / (gc[i][0] - gc[i - 1][0]);
    const s1 = (gc[i + 1][1] - gc[i][1]) / (gc[i + 1][0] - gc[i][0]);
    if (Math.abs(s1 - s0) > maxBend) { maxBend = Math.abs(s1 - s0); bendAt = gc[i][0]; }
  }
  const mono = gc.every((p, i) => i === 0 || p[1] >= gc[i - 1][1]);
  check('森林と草原の境界はなめらかな曲線（0.5℃ごとの傾きの変化が 25 mm/℃ 以下で折れ曲がりがなく、気温とともに単調に増える）', maxBend <= 25 && mono, `傾きの変化の最大 ${f(maxBend, 1)} mm/℃（${f(bendAt, 1)}℃付近）`);
  let agree2 = 0;
  let total2 = 0;
  for (let T = 19.05; T < 21; T += 0.1) {
    for (let P = 600; P < 1400; P += 10) {
      const c = bi.classify(T, P);
      const hits = polys.filter((pg) => inside([T, P], pg.points)).map((pg) => pg.id);
      total2++;
      if (hits.length === 1 && hits[0] === c) agree2++;
    }
  }
  check('20℃付近（19〜21℃・600〜1400 mm）の細かい格子でも、図の区画と判定が一致する', agree2 === total2, `${agree2}/${total2}`);
  const cities = { 東京: 'laurel', 札幌: 'temperate', 那覇: 'subtropical', シンガポール: 'tropical', カイロ: 'desert', ローマ: 'sclerophyll' };
  check('代表的な都市の判定が教科書と合う（東京＝照葉樹林、札幌＝夏緑樹林、那覇＝亜熱帯多雨林、シンガポール＝熱帯多雨林、カイロ＝砂漠、ローマ＝硬葉樹林）', Object.entries(cities).every(([n, b]) => { const c = bi.CITIES.find((x) => x.name === n); return bi.classify(c.T, c.P) === b; }));
  let dryOk = true;
  const seq = [];
  for (let P = 4000; P >= 0; P -= 50) { const b = bi.classify(27, P); if (seq[seq.length - 1] !== b) seq.push(b); }
  dryOk = seq.join('>') === 'tropical>monsoon>savanna>desert';
  check('熱帯（27℃）で降水量を減らすと 熱帯多雨林→雨緑樹林→サバンナ→砂漠', dryOk, seq.join('→'));
  const seq2 = [];
  for (let T = 19.5; T >= -10; T -= 0.5) { const b = bi.classify(T, 1550); if (b && seq2[seq2.length - 1] !== b) seq2.push(b); }
  check('降水量が多い地域（1550 mm）で気温を下げると 照葉樹林→夏緑樹林→針葉樹林→ツンドラ', seq2.join('>') === 'laurel>temperate>taiga>tundra', seq2.join('→'));
  check('垂直分布：丘陵帯→山地帯→亜高山帯→高山帯（森林限界 約2500 m）', bi.verticalZone(300).zone === '丘陵帯' && bi.verticalZone(1000).zone === '山地帯' && bi.verticalZone(2000).zone === '亜高山帯' && bi.verticalZone(2800).zone === '高山帯' && bi.TREE_LINE === 2500);
  check('気温の減率：100 m で 0.6℃（16℃ → 2500 m で 1℃）', near(bi.tempAt(16, 0, 2500), 1, 1e-9));
  const tokyo = [5.4, 6.1, 9.4, 14.3, 18.8, 21.9, 25.7, 26.9, 23.3, 18.0, 12.5, 7.7];
  check('暖かさの指数：東京 約130 → 照葉樹林（85〜180）', near(bi.warmthIndex(tokyo), 130, 0.05) && bi.biomeByWI(bi.warmthIndex(tokyo)) === 'laurel', `${f(bi.warmthIndex(tokyo), 1)}`);
}

// ---------- B9 ----------
section('B9 DNAとタンパク質合成');
{
  const codons = Object.keys(dn.CODON_TABLE);
  const stops = codons.filter((c) => dn.CODON_TABLE[c] === null);
  const aas = new Set(codons.map((c) => dn.CODON_TABLE[c]).filter(Boolean));
  check('遺伝暗号表：64コドン、終止コドン3つ（UAA・UAG・UGA）、アミノ酸20種類、AUG＝メチオニン', codons.length === 64 && stops.sort().join() === 'UAA,UAG,UGA' && aas.size === 20 && dn.CODON_TABLE.AUG === 'Met');
  check('転写：鋳型鎖 A・T・G・C → mRNA U・A・C・G', dn.transcribe('ATGC') === 'UACG');
  const m = dn.transcribe(B9_TEMPLATE);
  const before = dn.aminoSequence(m);
  check('図解道場の遺伝子：AUG から翻訳が始まり終止コドンで終わる（アミノ酸8個）', dn.translate(m).stopped && before.length === 8 && before[0] === 'Met');
  const kinds = new Set();
  for (let i = 2; i < 29; i++) for (const b of 'ATGC') if (b !== B9_TEMPLATE[i]) kinds.add(dn.compareProteins(before, dn.aminoSequence(dn.transcribe(dn.substitute(B9_TEMPLATE, i, b)))).kind);
  const ns = [2, 3, 4].every((i) => [...'ATGC'].filter((b) => b !== B9_TEMPLATE[i]).every((b) => dn.compareProteins(before, dn.aminoSequence(dn.transcribe(dn.substitute(B9_TEMPLATE, i, b)))).kind === 'nostart'));
  check('開始コドン（AUG）をこわす置換は「翻訳が始まらない」で、「途中で終止」とは区別される', ns);
  check('置換では「変わらない」「1つだけ変わる」「途中で終止」のどれも起こりうる', ['same', 'one', 'shorter'].every((k) => kinds.has(k)), [...kinds].join('・'));
  let shiftOk = true;
  for (let i = 5; i < 22; i++) {
    const c = dn.compareProteins(before, dn.aminoSequence(dn.transcribe(dn.deleteAt(B9_TEMPLATE, i))));
    if (!(c.kind === 'many' || c.kind === 'shorter')) shiftOk = false;
  }
  check('翻訳される部分での1塩基の欠失は、2つ以上のアミノ酸を変えるか途中で終止させる（フレームシフト）', shiftOk);
}

// ---------- B10 ----------
section('B10 DNAの塩基組成');
{
  let ok = true;
  for (let a = 5; a <= 45; a += 0.5) {
    const c = dn.compositionFromA(a);
    if (!(c.A === c.T && c.G === c.C && near(c.A + c.T + c.G + c.C, 100, 1e-9))) ok = false;
  }
  check('2本鎖DNA：A＝T、G＝C、合計100%（シャルガフの規則）', ok);
  const r = dn.strandComposition({ A: 35, T: 20, G: 15, C: 30 });
  check('1本鎖の組成から相補鎖と2本鎖全体を求める：鎖2のA＝鎖1のT、2本鎖全体はA＝T・G＝C', r.s2.A === 20 && r.s2.G === 30 && near(r.both.A, r.both.T, 1e-9) && near(r.both.G, r.both.C, 1e-9) && near(r.both.A, 27.5, 1e-9));
  check('10塩基対で3.4 nm（1塩基対 0.34 nm）', near(dn.lengthNm(10), 3.4, 1e-9));
  const human = dn.lengthNm(dn.GENOMES[0].bp * 2) * 1e-9;
  check('ヒトの体細胞のDNA（30億塩基対×2）の全長は約2 m', near(human, 2.04, 0.01), `${f(human, 2)} m`);
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

// ---------- A4 ----------
section('A4 興奮の伝導');
{
  const ts = Array.from({ length: 601 }, (_, i) => i * 0.01);
  const wave = (stim) => ts.map((t) => nv.membrane(t, stim));
  const w = wave(20);
  const iMax = w.indexOf(Math.max(...w));
  const iMin = w.indexOf(Math.min(...w));
  check('静止電位 約−70 mV、ピーク 約＋40 mV（細胞内が正に逆転）', w[0] === -70 && near(Math.max(...w), 40, 0.5), `静止 ${w[0]}、ピーク ${f(Math.max(...w), 1)}`);
  let up = true;
  for (let i = 101; i <= iMax; i++) if (w[i] < w[i - 1] - 1e-9) up = false;
  let down = true;
  for (let i = iMax + 1; i <= 240; i++) if (w[i] > w[i - 1] + 1e-9) down = false;
  check('刺激後、ピークまで単調に上昇（脱分極）し、そのあと単調に下降（再分極）する', up && down);
  check('再分極のあと一時的に静止電位より低くなり（過分極）、静止電位にもどる', ts[iMin] > ts[iMax] && w[iMin] < -70 && near(w[w.length - 1], -70, 1e-6), `最小 ${f(w[iMin], 1)} mV（${f(ts[iMin], 2)} ms）`);
  const above = ts.filter((t, i) => w[i] > -70 + 1).length * 0.01;
  check('活動電位の持続は1〜2ミリ秒程度', above >= 1 && above <= 2, `${f(above, 2)} ms`);
  const sub = [2, 5, 9, 9.9].map((s) => Math.max(...wave(s)));
  check('閾値未満の刺激では閾値の膜電位（−55 mV）に届かず、活動電位は生じない', sub.every((m) => m < nv.THRESHOLD) && sub[0] < sub[3], sub.map((m) => f(m, 1)).join(', '));
  const peaks = [10, 15, 25, 40].map((s) => Math.max(...wave(s)));
  check('閾値以上の刺激では、刺激の強さに関係なく同じ大きさの活動電位（全か無かの法則）', peaks.every((m) => m === peaks[0]));
  const resp = Array.from({ length: 41 }, (_, s) => nv.nerveResponse(s));
  let mono = resp.every((r, i) => i === 0 || r >= resp[i - 1]);
  const steps = new Set(resp).size;
  check('神経（繊維の束）では、刺激を強くすると興奮の大きさが段階的に大きくなり、最大で一定になる', mono && resp[0] === 0 && resp[40] === 1 && steps > 5, `段階 ${steps}`);
  const v = nv.velocity(60, nv.latency(60, 30, 2.5), 20, nv.latency(20, 30, 2.5));
  check('2点刺激：伝導速度 ＝ 距離の差 ÷ 時間の差（30 m/s を再現、伝達の時間 2.5 ms は打ち消される）', near(v, 30, 1e-9));
}

// ---------- A5 ----------
section('A5 光合成の限定要因');
{
  const T = 25;
  const lowLightSame = Math.abs(lm.rate(3, 0.02, T) - lm.rate(3, 0.12, T)) / lm.rate(3, 0.12, T) < 0.02;
  check('弱い光では、CO₂濃度を変えても光合成速度がほとんど変わらない（光の強さが限定要因）', lowLightSame && lm.limitingFactor(3, 0.02, T).factor === 'light', `${f(lm.rate(3, 0.02, T), 2)} / ${f(lm.rate(3, 0.12, T), 2)}`);
  check('強い光では、CO₂濃度が高いほど光合成速度が大きい（CO₂濃度が限定要因）', lm.rate(45, 0.12, T) > lm.rate(45, 0.04, T) * 1.3 && lm.limitingFactor(45, 0.04, T).factor === 'co2');
  const tLow = Math.abs(lm.rate(3, 0.08, 15) - lm.rate(3, 0.08, 30)) / lm.rate(3, 0.08, 30);
  check('弱い光では温度を変えても速度はほとんど変わらず、強い光では温度の影響が大きい', tLow < 0.02 && lm.rate(45, 0.08, 30) > lm.rate(45, 0.08, 15) * 1.5, `弱光での差 ${f(tLow * 100, 1)}%`);
  let monoI = true;
  for (const c of [0.02, 0.04, 0.12]) for (let I = 1; I <= 50; I++) if (lm.rate(I, c, T) < lm.rate(I - 1, c, T)) monoI = false;
  const sat = lm.rate(50, 0.04, T) - lm.rate(40, 0.04, T);
  check('光を強くすると速度は単調に増え、やがて頭打ちになる（光飽和）', monoI && sat < 1, `40→50 キロルクスでの増加 ${f(sat, 2)}`);
  const tc = Array.from({ length: 46 }, (_, t) => lm.rate(45, 0.12, t));
  const tOpt = tc.indexOf(Math.max(...tc));
  check('温度に対して山形で、最適温度より高温側で急に低下する', tOpt >= 25 && tOpt <= 32 && tc[tOpt + 10] < tc[tOpt - 10], `最適 ${tOpt}℃、−10℃ ${f(tc[tOpt - 10], 1)}・＋10℃ ${f(tc[tOpt + 10], 1)}`);
  let capOk = true;
  for (const I of [2, 10, 30, 50]) for (const c of [0.01, 0.04, 0.15]) for (const t of [5, 20, 30, 40]) {
    const k = lm.caps(I, c, t);
    if (lm.rate(I, c, t) > Math.min(k.light, k.co2, k.temp) + 1e-9) capOk = false;
  }
  check('実際の速度は、3つの要因の上限のうち最も小さいものをこえない', capOk);
  check('3つの要因のどれもが限定要因になりうる', ['light', 'co2', 'temp'].every((x) => [[5, 0.12, 30], [45, 0.03, 30], [45, 0.12, 12]].some(([I, c, t]) => lm.limitingFactor(I, c, t).factor === x)));
}

// ---------- A6 ----------
section('A6 集団遺伝');
{
  let sumOk = true;
  let maxAa = 0;
  let pAt = 0;
  for (let i = 0; i <= 100; i++) {
    const p = i / 100;
    const g = pg.genotypeFreq(p);
    if (!near(g.AA + g.Aa + g.aa, 1, 1e-12)) sumOk = false;
    if (g.Aa > maxAa) { maxAa = g.Aa; pAt = p; }
  }
  check('p² ＋ 2pq ＋ q² ＝ 1、Aa の頻度は p ＝ 0.5 で最大（0.5）', sumOk && pAt === 0.5 && near(maxAa, 0.5, 1e-12));
  let keep = true;
  for (const p of [0.1, 0.3, 0.5, 0.8]) {
    const g = pg.genotypeFreq(p);
    if (!near(pg.alleleFreqFromGenotypeFreq(g.AA, g.Aa), p, 1e-12)) keep = false;
  }
  check('自由交配でできた次の世代でも遺伝子頻度は変わらない（p² ＋ pq ＝ p）', keep);
  check('個体数から遺伝子頻度：AA 36・Aa 48・aa 16 → p ＝ 0.6', near(pg.alleleFreqFromCounts(36, 48, 16), 0.6, 1e-12));
  check('潜性形質の割合から q：q² ＝ 1/10000 → q ＝ 0.01、保因者 2pq ≒ 1.98%', near(pg.qFromRecessive(1 / 10000), 0.01, 1e-12) && near(pg.genotypeFreq(0.99).Aa, 0.0198, 1e-9));
  const rng = makeRng(42);
  const reps = 200;
  const smallRuns = pg.driftLines(10, 0.5, 100, reps, rng);
  const largeRuns = pg.driftLines(10000, 0.5, 100, reps, rng);
  const fs = pg.fixationSummary(smallRuns);
  const fl = pg.fixationSummary(largeRuns);
  const sd = (runs) => Math.sqrt(runs.reduce((a, r) => a + Math.pow(r[r.length - 1] - 0.5, 2), 0) / runs.length);
  check('遺伝的浮動：小さな集団（N＝10）は固定・消失が多く、大きな集団（N＝10000）は100世代でもほとんど変わらない', (fs.fixed + fs.lost) / reps > 0.7 && fl.fixed + fl.lost === 0 && sd(largeRuns) < 0.05, `N＝10：固定・消失 ${fs.fixed + fs.lost}/${reps}、N＝10000：ずれの標準偏差 ${f(sd(largeRuns), 3)}`);
  const meanSmall = smallRuns.reduce((a, r) => a + r[r.length - 1], 0) / reps;
  check('遺伝的浮動は偶然による変化で、方向性がない（多数の集団の平均はほぼ変わらない）', near(meanSmall, 0.5, 0.1), `平均 ${f(meanSmall, 3)}`);
}

// ---------- A7 ----------
section('A7 遺伝子発現の調節');
{
  const S = (lactose, glucose, mutant = 'none') => op.operonState({ lactose, glucose, mutant });
  check('ラクトースなし：リプレッサーがオペレーターに結合し、転写されない（グルコースの有無によらない）', S(false, false).repressorBound && S(false, false).level === 'off' && S(false, true).level === 'off');
  check('ラクトースあり・グルコースなし：リプレッサーが外れ、さかんに転写される', !S(true, false).repressorBound && S(true, false).inducerBound && S(true, false).level === 'high');
  check('（発展）ラクトースあり・グルコースあり：転写はわずか', S(true, true).level === 'low');
  check('調節遺伝子・オペレーターの変異：ラクトースがなくても転写される', ['noRepressor', 'operator'].every((m) => S(false, false, m).level !== 'off' && S(true, false, m).level === 'high'));
  check('ラクトースからできる物質と結合できないリプレッサー：ラクトースがあっても転写されない', S(true, false, 'noInducer').level === 'off');
  const run = op.diauxie();
  const tG = op.glucoseOutTime(run);
  const beforeE = Math.max(...run.filter((q) => q.t < tG).map((q) => q.E));
  const at = (t) => run[Math.round(t / (run[1].t - run[0].t))];
  const lagGrowth = at(tG + 0.5).N / at(tG).N;
  const glcGrowth = at(tG - 0.5).N / at(tG - 1).N;
  check('二段階の増殖：グルコースがある間は酵素がなく、なくなったあとに酵素が増え、その間に増殖が一時停滞する', beforeE < 0.01 && at(tG + 2).E > 0.8 && lagGrowth < glcGrowth && at(op.DIAUXIE.T).N > at(tG + 0.5).N * 3, `グルコース枯渇 ${f(tG, 1)} 時間、停滞期の増加 ${f(lagGrowth, 2)} 倍／0.5時間`);
  check('mRNAの翻訳される領域：(アミノ酸数 ＋ 1) × 3（終止コドンを含む）', op.codingBases(1023) === 3072);
}

// ---------- A8 ----------
section('A8 生存曲線');
{
  const xs = Array.from({ length: 101 }, (_, i) => i);
  const decreasing = Object.values(sv.TYPES).every((t) => xs.every((x, i) => i === 0 || sv.survivors(x, t.k) <= sv.survivors(x - 1, t.k)));
  check('どの型も生存数は年齢とともに減少し、1000 から始まって寿命で約1になる', decreasing && Object.values(sv.TYPES).every((t) => sv.survivors(0, t.k) === 1000 && near(sv.survivors(100, t.k), 1, 1e-6)));
  const half = (k) => sv.survivors(50, k);
  check('年齢50での生存数：晩死型 ＞ 平均型 ＞ 早死型', half(sv.TYPES.late.k) > half(sv.TYPES.mid.k) && half(sv.TYPES.mid.k) > half(sv.TYPES.early.k), `${f(half(6), 0)}・${f(half(1), 0)}・${f(half(0.25), 0)}`);
  const lin = xs.slice(1).map((x) => Math.log10(sv.survivors(x, 1)) - Math.log10(sv.survivors(x - 1, 1)));
  check('平均型は対数目盛りで直線（年齢あたりの死亡率が一定）', lin.every((d) => near(d, lin[0], 1e-9)));
  const mt = (k) => sv.lifeTable(sv.lxFromCurve(k)).map((r) => r.mortality);
  const mLate = mt(6);
  const mEarly = mt(0.25);
  check('晩死型は若い区分の死亡率が低く老齢で高い、早死型は最初の区分の死亡率が最も高い', mLate[0] < 0.01 && mLate[8] > 0.5 && mEarly[0] === Math.max(...mEarly) && mEarly[0] > 0.9, `晩死型 ${f(mLate[0], 3)}→${f(mLate[8], 2)}、早死型 区分1 ${f(mEarly[0], 3)}`);
  check('生命表：死亡率 ＝ 死亡数 ÷ はじめの生存数（1000・700・420 → 0.3・0.4）', sv.lifeTable([1000, 700, 420]).map((r) => f(r.mortality, 3)).join() === '0.3,0.4');
  check('生命表から型を判定（死亡率一定 → 平均型、初期が高い → 早死型、老齢が高い → 晩死型）', sv.typeOfTable([1000, 500, 250, 125, 63]) === 'mid' && sv.typeOfTable([1000, 100, 50, 40, 32]) === 'early' && sv.typeOfTable([1000, 980, 951, 856, 428]) === 'late');
}

// ---------- A9 ----------
section('A9 呼吸と発酵');
{
  check('呼吸商：炭水化物 1.0、脂肪（トリステアリン）114/163 ≒ 0.70、タンパク質 約0.8', rs.SUBSTRATES.carb.rq === 1 && near(rs.SUBSTRATES.fat.rq, 0.70, 0.005) && rs.SUBSTRATES.protein.rq === 0.8, `${f(rs.SUBSTRATES.fat.rq, 3)}`);
  // 反応式の原子の数がつり合っているか（C・H・O）
  const atoms = (c, h2, o) => ({ C: c, H: h2, O: o });
  const sum = (...xs) => xs.reduce((a, x) => ({ C: a.C + x.C, H: a.H + x.H, O: a.O + x.O }), { C: 0, H: 0, O: 0 });
  const mul = (k, x) => ({ C: k * x.C, H: k * x.H, O: k * x.O });
  const eqs = [
    [sum(atoms(6, 12, 6), mul(6, atoms(0, 0, 2)), mul(6, atoms(0, 2, 1))), sum(mul(6, atoms(1, 0, 2)), mul(12, atoms(0, 2, 1)))],
    [sum(mul(2, atoms(57, 110, 6)), mul(163, atoms(0, 0, 2))), sum(mul(114, atoms(1, 0, 2)), mul(110, atoms(0, 2, 1)))],
    [sum(mul(2, atoms(51, 98, 6)), mul(145, atoms(0, 0, 2))), sum(mul(102, atoms(1, 0, 2)), mul(98, atoms(0, 2, 1)))],
    [sum(mul(2, atoms(57, 104, 6)), mul(160, atoms(0, 0, 2))), sum(mul(114, atoms(1, 0, 2)), mul(104, atoms(0, 2, 1)))],
    [atoms(6, 12, 6), sum(mul(2, atoms(2, 6, 1)), mul(2, atoms(1, 0, 2)))],
  ];
  check('反応式の原子の数がつり合う（グルコースの呼吸、トリステアリン・トリパルミチン・トリオレイン、アルコール発酵）', eqs.every(([l, r]) => l.C === r.C && l.H === r.H && l.O === r.O));
  const r = rs.fromRespirometer(10, 3);
  check('呼吸計：KOH側 10・水側 3 → O₂ 10、CO₂ 7、呼吸商 0.7', r.o2 === 10 && r.co2 === 7 && near(r.rq, 0.7, 1e-12));
  let splitOk = true;
  for (const fr of [0, 0.25, 0.5, 0.75, 0.9]) {
    const y = rs.yeast(6, fr);
    const sp = rs.splitGlucose(y.o2, y.co2);
    if (!(near(sp.aer, y.aer, 1e-9) && near(sp.fer, y.fer, 1e-9))) splitOk = false;
  }
  check('O₂吸収量とCO₂放出量から、呼吸と発酵のグルコースを正しく逆算できる', splitOk);
  check('発酵の割合が大きいほど CO₂÷O₂ が大きく、発酵75%で2になる', rs.yeast(6, 0.75).rq === 2 && rs.yeast(6, 0.5).rq < rs.yeast(6, 0.75).rq && rs.yeast(6, 0).rq === 1);
}

// ---------- A10 ----------
section('A10 筋収縮');
{
  let peakT = 0;
  let peak = 0;
  for (let t = 0; t <= 0.3; t += 0.0005) { const v = mu.tension(t, [0]); if (v > peak) { peak = v; peakT = t; } }
  check('単収縮：潜伏期 約0.01秒、収縮期 約0.04秒（ピーク 約0.05秒）、約0.1秒でもとにもどる', mu.tension(0.009, [0]) === 0 && peakT > 0.04 && peakT < 0.06 && mu.tension(0.1, [0]) < peak * 0.01, `ピーク ${f(peakT, 3)} 秒、0.1秒で ${f(mu.tension(0.1, [0]) / peak * 100, 1)}%`);
  const types = [2, 5, 15, 30, 60, 100].map((x) => mu.contractionType(x).type);
  check('刺激の頻度を上げると 単収縮 → 不完全強縮 → 完全強縮', types.join() === 'single,single,incomplete,incomplete,complete,complete', types.join('・'));
  const tet = mu.contractionType(100).max / mu.SINGLE_PEAK;
  check('完全強縮の張力は単収縮の数倍（2〜4倍）', tet >= 2 && tet <= 4, `${f(tet, 2)} 倍`);
  const rip = (x) => { const r = mu.contractionType(x); return (r.max - r.min) / r.max; };
  check('問題で「完全強縮」とする頻度（80・100回/秒）では張力のゆれが0.5%未満、「不完全強縮」（20〜30回/秒）ではゆれが5%以上で、図で区別できる', rip(80) < 0.005 && rip(100) < 0.005 && [20, 25, 30].every((x) => rip(x) > 0.05), `80回/秒 ${f(rip(80) * 100, 2)}%、30回/秒 ${f(rip(30) * 100, 1)}%`);
  check('サルコメアの長さと張力：2.0〜2.2 μm で最大、3.6 μm で0、2.2 μm より長いと直線的に減少', mu.sarcomereTension(2.0) === 1 && mu.sarcomereTension(2.2) === 1 && mu.sarcomereTension(3.6) === 0 && near(mu.sarcomereTension(2.9), 0.5, 1e-9));
  check('2.0 μm より短いと張力は減少する', mu.sarcomereTension(1.8) < 1 && mu.sarcomereTension(1.5) < mu.sarcomereTension(1.8));
  const b1 = mu.bands(2.6);
  const b2 = mu.bands(2.2);
  check('収縮（2.6 → 2.2 μm）で暗帯は不変、明帯とH帯は短くなる', b1.A === b2.A && b2.I < b1.I && b2.H < b1.H && near(b1.H, 0.6, 1e-9) && near(b1.I, 1.0, 1e-9));
}

// ---------- A11 ----------
section('A11 分子系統と分子時計');
{
  check('違いの数は分岐年代に比例（D ＝ 2rt）', ph2.diffs(100, 0.2) === 40 && near(ph2.divergenceTime(40, 0.2), 100, 1e-9));
  check('比例による分岐年代の推定：80百万年で18 → 72 なら 320 百万年', near(ph2.proportionalTime(80, 18, 72), 320, 1e-9));
  let treeOk = true;
  for (const pair of [['A', 'B'], ['A', 'C'], ['B', 'C']]) {
    const m = ph2.distanceMatrix({ pair, t1: 30, t2: 90, t3: 250, rate: 0.2 });
    const { steps } = ph2.upgma(m);
    if (!(steps[0].members.sort().join() === [...pair].sort().join() && steps[1].members.length === 3 && !steps[1].members.includes('D'))) treeOk = false;
    if (!near(steps[0].height / 0.2, 30, 1e-9) || !near(steps[2].height / 0.2, 250, 1e-9)) treeOk = false;
  }
  check('違いの数の表から、正しい形の系統樹と分岐年代を復元できる（3通りの形）', treeOk);
  check('分子進化の速度の順：フィブリノペプチド ＞ ヘモグロビン ＞ シトクロム c ＞ ヒストン', ph2.RATE_ORDER.join() === 'フィブリノペプチド,ヘモグロビン,シトクロム c,ヒストンH4');
}

// ---------- A12 ----------
section('A12 植物ホルモン（オーキシン）');
{
  const opt = (o) => {
    let best = -99;
    let bx = 0;
    for (let x = ax.X_MIN; x <= ax.X_MAX; x += 0.01) { const e = ax.effect(o, x); if (e > best) { best = e; bx = x; } }
    return bx;
  };
  const o = { root: opt('root'), bud: opt('bud'), stem: opt('stem') };
  check('最適濃度は 根 ＜ 芽 ＜ 茎（約10⁻¹⁰・10⁻⁸・10⁻⁵ mol/L）', o.root < o.bud && o.bud < o.stem && near(o.root, -10, 0.05) && near(o.stem, -5, 0.05), `${f(o.root, 1)}・${f(o.bud, 1)}・${f(o.stem, 1)}`);
  check('高濃度では抑制（効果が負）、低濃度では効果ほぼ0', ['root', 'bud', 'stem'].every((k) => ax.effect(k, ax.zeroPoint(k) + 0.5) < 0 && ax.effect(k, ax.ORGANS[k].opt - 4) < 0.01));
  check('茎の成長を促進する濃度（10⁻⁶）で、根の成長は抑制される', ax.effect('stem', -6) > 0.3 && ax.effect('root', -6) < -0.5);
  let smooth = true;
  for (const k of ['root', 'bud', 'stem']) for (let x = ax.X_MIN; x < ax.X_MAX; x += 0.01) if (Math.abs(ax.effect(k, x + 0.01) - ax.effect(k, x)) > 0.02) smooth = false;
  check('効果の曲線はなめらか（段差なし）', smooth);
  const s = ax.horizontal('stem', -7.5, 4);
  const r = ax.horizontal('root', -7.5, 4);
  check('水平に置くと（上側 10⁻⁷·⁵、下側4倍）茎は上へ、根は下へ曲がる', s.bend === 'up' && r.bend === 'down');
}

// ---------- A13 ----------
section('A13 生態系の物質生産');
{
  const b = pr.budget();
  check('生産者：純生産量 ＝ 総生産量 − 呼吸量 ＝ 成長量 ＋ 被食量 ＋ 枯死量', near(b.P.net, b.P.gross - b.P.resp, 1e-9) && near(b.P.net, b.P.growth + b.P.grazed + b.P.dead, 1e-9));
  check('消費者：同化量 ＝ 摂食量 − 不消化排出量、生産量 ＝ 同化量 − 呼吸量 ＝ 成長量 ＋ 被食量 ＋ 死滅量', [b.C1, b.C2].every((c) => near(c.assim, c.intake - c.undigested, 1e-9) && near(c.prod, c.assim - c.resp, 1e-9) && near(c.prod, c.growth + c.grazed + c.dead, 1e-9)));
  check('生産者の被食量 ＝ 一次消費者の摂食量、一次消費者の被食量 ＝ 二次消費者の摂食量', b.P.grazed === b.C1.intake && b.C1.grazed === b.C2.intake);
  const e = pr.efficiency(b);
  check('上の栄養段階ほど同化量が小さく、エネルギー効率は数%〜十数%', b.C1.assim < b.P.gross && b.C2.assim < b.C1.assim && e.c1 > 1 && e.c1 < 20, `一次 ${f(e.c1, 1)}%・二次 ${f(e.c2, 1)}%`);
  const ages = Array.from({ length: 150 }, (_, i) => pr.forest(i + 1));
  const iBest = ages.reduce((bi, q, i) => (q.net > ages[bi].net ? i : bi), 0);
  check('森林：総生産量は頭打ち、呼吸量は増え続け、純生産量は若い時期に最大となってその後減少', ages.every((q, i) => i === 0 || q.resp > ages[i - 1].resp) && near(ages[149].gross, ages[99].gross, 0.5) && iBest > 5 && iBest < 60 && ages[149].net < ages[iBest].net * 0.7, `純生産量が最大の林齢 ${iBest + 1} 年`);
  const ages2 = Array.from({ length: 1000 }, (_, i) => pr.forest(i + 1));
  check('森林：どの林齢でも呼吸量は総生産量より小さく、純生産量は正（1〜1000年）', ages2.every((q) => q.resp < q.gross && q.net > 0), `1000年で純生産量 ${f(ages2[999].net, 1)}`);
}

// ---------- B11 ----------
section('B11 植生の遷移');
{
  const order = [0, 60, 130, 200, 320, 500].map((t) => su.stageAt(t).id).join();
  check('遷移の順：荒原 → 草原 → 低木林 → 陽樹林 → 混交林 → 陰樹林', order === 'bare,grass,shrub,sun,mixed,climax', order);
  let mono = true;
  for (let t = 1; t <= 600; t++) if (su.state(t).floorLight > su.state(t - 1).floorLight + 1e-9) mono = false;
  check('林床の相対照度は遷移とともに小さくなる（単調に減少）', mono);
  const sunEnd = su.STAGES.find((x) => x.id === 'mixed').from;
  check('陽樹林の段階のうちに林床が暗くなり（相対照度10%未満）、陽樹の芽ばえが育たなくなる', !su.seedlingGrows('sun', su.state(sunEnd - 10).floorLight) && su.seedlingGrows('sun', su.state(su.STAGES.find((x) => x.id === 'sun').from - 30).floorLight), `混交林の直前 ${f(su.state(sunEnd - 10).floorLight, 1)}%`);
  check('極相林の林床（相対照度 約3%）でも陰樹の芽ばえは育つ', su.seedlingGrows('shade', su.state(600).floorLight) && !su.seedlingGrows('sun', su.state(600).floorLight), `${f(su.state(600).floorLight, 1)}%`);
  check('陽樹の割合はいったん増えてから減り、陰樹は後半に増えて優占する', su.state(250).sunTrees > 70 && su.state(600).sunTrees < 5 && su.state(600).shadeTrees > 95);
  check('相対照度 ＝ 林床 ÷ 林外 × 100（5 ÷ 100 → 5%）', su.relativeLight(5, 100) === 5);
}

// ---------- A14 ----------
section('A14 シナプスと興奮の統合');
{
  const peak = (inp) => { let m = -999; for (let t = 0; t <= sy.T_END; t += 0.05) m = Math.max(m, sy.potential(t, inp)); return m; };
  const fires = (c) => sy.firstCrossing(sy.buildInputs(c)) != null;
  check('EPSP 1回（＋10 mV）では閾値（−55 mV）に達しない', !fires({ nA: 1 }) && near(peak(sy.buildInputs({ nA: 1 })), -60, 0.01));
  check('時間的加重：数ミリ秒の間隔（2〜5ミリ秒）の2回で閾値に達し、長い間隔（20ミリ秒）では達しない', [2, 3, 4, 5].every((x) => fires({ nA: 2, interval: x })) && !fires({ nA: 2, interval: 20 }));
  check('空間的加重：A と B の同時入力で閾値に達する', fires({ nA: 1, useB: true }));
  check('抑制性シナプス（IPSP）が加わると閾値に達しなくなる', !fires({ nA: 1, useB: true, useC: true }) && peak(sy.buildInputs({ nA: 1, useC: true })) < peak(sy.buildInputs({ nA: 1 })));
  check('同時入力の単純な和：EPSP 10 mV × 2 − IPSP 6 mV → −56 mV', sy.summedPeak(2, 1) === -56);
}

// ---------- A15 ----------
section('A15 PCRと電気泳動');
{
  check('PCR：n サイクルで 2ⁿ 倍（1分子 → 10サイクルで1024、30サイクルで約10億）', bt.copies(1, 10) === 1024 && bt.copies(1, 30) === 1073741824 && bt.cyclesToReach(1, 1e6) === 20);
  check('PCR の温度：熱変性 ＞ 伸長 ＞ アニーリング（95・72・55℃）', bt.STEPS[0].temp > bt.STEPS[2].temp && bt.STEPS[2].temp > bt.STEPS[1].temp);
  let mono = true;
  for (let i = 1; i < bt.LADDER.length; i++) if (!(bt.distanceOf(bt.LADDER[i]) > bt.distanceOf(bt.LADDER[i - 1]))) mono = false;
  check('短い断片ほど遠くまで移動し、移動距離から長さを逆算できる', mono && near(bt.lengthOf(bt.distanceOf(1234)), 1234, 1e-6));
  const fr = (c) => bt.fragments(6000, c).join();
  check('環状DNAの断片：1か所 → 全長1本、2か所 → 2本（合計は全長）', fr([500]) === '6000' && fr([500, 2500]) === '4000,2000' && fr([1500, 4500]) === '3000,3000');
}

// ---------- A16 ----------
section('A16 動物の行動');
{
  check('ダンスの角度：太陽と同じ方位 → 真上（0°）、反対 → 真下（180°）', bh.danceAngle(180, 180) === 0 && Math.abs(bh.danceAngle(90, 270)) === 180);
  check('太陽の方向から時計回り90°のえさ場 → 真上から右へ90°（太陽 南、えさ場 西）', bh.danceAngle(180, 270) === 90 && bh.danceAngle(180, 90) === -90);
  let inv = true;
  for (const sun of [90, 135, 180, 225, 270]) for (let food = 0; food < 360; food += 15) if (bh.foodAzimuth(sun, bh.danceAngle(sun, food)) !== food) inv = false;
  check('ダンスの角度と太陽の方位から、えさ場の方位を正しく逆算できる', inv);
  check('近いと円形ダンス、遠いと8の字ダンス。遠いほど回数が少ない', bh.danceType(50) === 'round' && bh.danceType(500) === 'waggle' && bh.dancesPer15s(2000) < bh.dancesPer15s(500));
}

// ---------- A17 ----------
section('A17 光周性と花芽形成');
{
  const cr = 10.5;
  check('短日植物：暗期14時間で花芽形成、暗期10時間ではしない', pp.flowers('short', 14, cr) && !pp.flowers('short', 10, cr));
  check('長日植物：暗期10時間で花芽形成、暗期14時間ではしない', pp.flowers('long', 10, cr) && !pp.flowers('long', 14, cr));
  const dp = pp.darkPeriods(10, 6, 1);
  check('光中断：暗期14時間を6時間後に1時間中断 → 6時間と7時間に分かれ、最長7時間', dp.periods.join() === '6,7' && dp.longest === 7);
  check('光中断で、短日植物は花芽を形成しなくなり、長日植物は形成するようになる', !pp.flowers('short', dp.longest, cr) && pp.flowers('long', dp.longest, cr));
  check('中性植物は日長に関係なく花芽を形成する', [4, 10, 20].every((d) => pp.flowers('neutral', d, cr)));
}

// ---------- B12 ----------
section('B12 ホルモンと負のフィードバック');
{
  const s = (c) => th.steady(c);
  const n = s('normal');
  check('正常：TRH・TSH・チロキシンは一定（正常値 100%）に保たれる', near(n.H, 1, 1e-6) && near(n.S, 1, 1e-6) && near(n.T, 1, 1e-6));
  const a = s('thyroidectomy');
  check('甲状腺の除去：チロキシン減少、TRH・TSH 増加', a.T < 0.1 && a.H > 1.5 && a.S > 1.5);
  const b = s('injection');
  check('チロキシンの注射：TRH・TSH 減少、チロキシン増加', b.T > 1.5 && b.H < 0.6 && b.S < 0.6);
  const c = s('pituitary');
  check('脳下垂体の除去：TSH なし、チロキシン減少、TRH 増加', c.S < 0.01 && c.T < 0.1 && c.H > 1.5);
  const d = s('iodine');
  check('ヨウ素不足：チロキシン減少、TSH 増加（甲状腺が刺激され続ける）', d.T < 1 && d.S > 1);
}

// ---------- B13 ----------
section('B13 炭素の循環');
{
  const a = cb.atmosphereChange(cb.BASE);
  check('大気中の炭素は ＋50億トン/年（約2.4 ppm/年）', a.change === 50 && near(a.change / cb.PPM_PER, cb.TREND, 0.05));
  check('化石燃料の燃焼を0にすると、大気中の炭素は減る', cb.atmosphereChange({ ...cb.BASE, fossil: 0 }).change < 0);
  const months = Array.from({ length: 12 }, (_, m) => cb.co2(2021 + (m + 0.5) / 12) - cb.TREND * ((m + 0.5) / 12));
  const iMax = months.indexOf(Math.max(...months));
  const iMin = months.indexOf(Math.min(...months));
  check('季節変動：5月ごろ最大、9〜10月ごろ最小、振れ幅 約6 ppm', iMax === 4 && (iMin === 8 || iMin === 9) && near(Math.max(...months) - Math.min(...months), 6, 1), `最大 ${iMax + 1}月、最小 ${iMin + 1}月`);
  check('長期的に増加（2020年→2023年で約7 ppm）', near(cb.co2(2023.37) - cb.co2(2020.37), 7.2, 0.1));
}

// ---------- A18 ----------
section('A18 視覚');
{
  const bt = vi.breakTime();
  check('暗順応曲線の屈曲点は約7〜10分', bt > 7 && bt < 10, `${f(bt, 1)} 分`);
  let mono = true;
  for (let t = 0.1; t <= 40; t += 0.1) if (vi.thresholdLog(t) > vi.thresholdLog(t - 0.1) + 1e-9) mono = false;
  check('閾値は時間とともに下がり続け、30分で約5けた下がる', mono && vi.thresholdLog(0) - vi.thresholdLog(30) > 4.5, `${f(vi.thresholdLog(0) - vi.thresholdLog(30), 1)} けた`);
  check('黄斑（0°）は錐体が最大で桿体はほとんどない、周辺は桿体が多い', vi.cones(0) > 100 && vi.rods(0) < 1 && vi.rods(20) > vi.cones(20) * 10);
  check('盲斑（鼻側 約15°）には錐体も桿体もない', vi.cones(15) === 0 && vi.rods(15) === 0);
  check('盲斑の大きさ：2 cm × 1.7 ÷ 34 cm ＝ 0.1 cm', near(vi.retinaSize(2, 34), 0.1, 1e-12));
}

// ---------- A19 ----------
section('A19 発生と位置情報');
{
  let mono = true;
  for (let x = 0.01; x <= 1; x += 0.01) if (mg.bicoid(x) >= mg.bicoid(x - 0.01)) mono = false;
  check('ビコイドの濃度は前端で最大、後方ほど低い（単調減少）', mono);
  check('ビコイドがないと、頭部・胸部になる範囲がない', mg.boundary(0) === 0);
  check('ビコイドを2倍にすると、境界が「濃度が半分になる距離」だけ後方へずれる（半分なら前方へ）', near(mg.boundary(2) - mg.boundary(1), mg.halfDistance(), 1e-9) && near(mg.boundary(1) - mg.boundary(0.5), mg.halfDistance(), 1e-9));
}

// ---------- A20 ----------
section('A20 減数分裂と遺伝的多様性');
{
  const at = {};
  let acc = 0;
  for (const p of me.PHASES) { at[p.id] = acc + p.len / 2; acc += p.len; }
  check('DNA 量：G1 2 → G2 4 → 第一分裂のあと 2 → 第二分裂のあと 1', me.dnaAt(at.G1) === 2 && me.dnaAt(at.G2) === 4 && me.dnaAt(acc - me.PHASES[4].len - 0.01) === 2 && me.dnaAt(acc) === 1);
  check('染色体数：第一分裂の終わりに 2n → n、第二分裂では n のまま', me.chromosomeSetsAt(at.G2) === 2 && me.chromosomeSetsAt(acc - me.PHASES[4].len - 0.01) === 1 && me.chromosomeSetsAt(acc) === 1);
  check('配偶子の組合せ 2ⁿ（ヒト n＝23 で 8,388,608 通り）、受精で 2ⁿ × 2ⁿ', me.gameteTypes(23) === 8388608 && me.zygoteTypes(3) === 64);
}

const ng = results.filter((r) => !r.ok);
console.log(`\n${results.length} 項目中 ${results.length - ng.length} 項目合格${ng.length ? `、${ng.length} 項目不合格` : ''}`);
process.exitCode = ng.length ? 1 : 0;
