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

const ng = results.filter((r) => !r.ok);
console.log(`\n${results.length} 項目中 ${results.length - ng.length} 項目合格${ng.length ? `、${ng.length} 項目不合格` : ''}`);
process.exitCode = ng.length ? 1 : 0;
