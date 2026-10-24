// A2 遺伝の分離比 の問題（用語は「顕性・潜性」で統一）
import { fmt, fracText } from '../lib/format.js';
import { makeRng } from '../lib/rng.js';
import { distinctNumbers } from './common.js';
import { simulate, expected } from '../models/genetics.js';

// エンドウの形質（左が顕性）
const TRAITS = [
  { name: '種子の形', dom: '丸', rec: 'しわ', A: 'A', a: 'a' },
  { name: '子葉の色', dom: '黄色', rec: '緑色', A: 'Y', a: 'y' },
  { name: '花の色', dom: '紫色', rec: '白色', A: 'P', a: 'p' },
  { name: 'さやの形', dom: 'ふくれ', rec: 'くびれ', A: 'V', a: 'v' },
];

export const A2 = [
  {
    id: 'a2-f2-pheno',
    stage: 'a2',
    level: 1,
    kind: 'term',
    make(rng) {
      const t = rng.pick(TRAITS);
      return {
        text: `エンドウの${t.name}で、${t.dom}（顕性）の純系と${t.rec}（潜性）の純系を交配してできた F1 を自家受精させた。F2 の表現型の比 ${t.dom} : ${t.rec} はどうなるか。`,
        correct: '3 : 1',
        wrong: ['1 : 1', '1 : 2 : 1', '1 : 3', '9 : 3 : 3 : 1', '2 : 1'],
        explanation: `F1（${t.A}${t.a}）どうしの交配で F2 の遺伝子型は ${t.A}${t.A} : ${t.A}${t.a} : ${t.a}${t.a} ＝ 1 : 2 : 1 になる。${t.A}${t.A} と ${t.A}${t.a} はどちらも顕性の${t.dom}になるから、表現型は ${t.dom} : ${t.rec} ＝ 3 : 1 となる。`,
      };
    },
  },
  {
    id: 'a2-f2-geno',
    stage: 'a2',
    level: 1,
    kind: 'term',
    make(rng) {
      const t = rng.pick(TRAITS);
      const g = (x, y) => `${x}${y}`;
      return {
        text: `遺伝子型 ${t.A}${t.a} の個体どうしを交配したとき、子の遺伝子型の比 ${g(t.A, t.A)} : ${g(t.A, t.a)} : ${g(t.a, t.a)} はどうなるか。`,
        correct: '1 : 2 : 1',
        wrong: ['3 : 1 : 0', '1 : 1 : 1', '2 : 1 : 1', '1 : 3 : 1', '0 : 1 : 1'],
        explanation: `両親とも ${t.A} と ${t.a} の配偶子を 1 : 1 の割合でつくる（分離の法則）。それらが同じ確率で受精するから、子の遺伝子型は 1 : 2 : 1 となる。`,
      };
    },
  },
  {
    id: 'a2-testcross-infer',
    stage: 'a2',
    level: 2,
    kind: 'term',
    make(rng) {
      const t = rng.pick(TRAITS);
      const hetero = rng.chance(0.5);
      const n = rng.pick([40, 60, 80, 100, 120]);
      const result = hetero ? `${t.dom} ${n / 2 + rng.int(-3, 3)}個体、${t.rec} ${n / 2 + rng.int(-3, 3)}個体` : `すべて${t.dom}（${n}個体）`;
      return {
        text: `${t.dom}（顕性）の個体の遺伝子型を調べるため、${t.rec}（潜性）の個体と交配したところ、子は${result}であった。調べた個体の遺伝子型はどれか。`,
        correct: hetero ? `${t.A}${t.a}` : `${t.A}${t.A}`,
        wrong: [`${t.A}${t.A}`, `${t.A}${t.a}`, `${t.a}${t.a}`, `${t.A}${t.A} と ${t.A}${t.a} の両方の可能性がある`],
        explanation: hetero
          ? `潜性ホモ接合体（${t.a}${t.a}）との交配（検定交雑）で子が約 1 : 1 に分かれたので、調べた個体は ${t.A} と ${t.a} を 1 : 1 でつくる ${t.A}${t.a} である。${t.a}${t.a} の配偶子は ${t.a} だけなので、子の表現型の比が調べた個体の配偶子の比をそのまま表すからである。`
          : `検定交雑で子がすべて顕性になったので、調べた個体は ${t.A} の配偶子しかつくらない ${t.A}${t.A} である。${t.A}${t.a} なら潜性の子が約半数現れるはずだからである。`,
      };
    },
  },
  {
    id: 'a2-di-fraction',
    stage: 'a2',
    level: 2,
    kind: 'calc',
    make(rng) {
      const [t1, t2] = rng.sample(TRAITS, 2);
      const which = rng.pick([
        { label: `${t1.dom}・${t2.dom}`, n: 9 },
        { label: `${t1.dom}・${t2.rec}`, n: 3 },
        { label: `${t1.rec}・${t2.dom}`, n: 3 },
        { label: `${t1.rec}・${t2.rec}`, n: 1 },
      ]);
      const frac = (k) => fracText(k, 16);
      return {
        text: `エンドウの${t1.name}（${t1.dom}が顕性）と${t2.name}（${t2.dom}が顕性）の遺伝子は別々の染色体にある。両方とも顕性の純系と両方とも潜性の純系を交配して得た F1 を自家受精させたとき、F2 のうち「${which.label}」の個体の割合はいくらか。`,
        correct: frac(which.n),
        wrong: ['9/16', '3/16', '1/16', '1/4', '3/4', '1/2'],
        explanation: `2組の遺伝子は独立に遺伝するので、F2 は (3 : 1) × (3 : 1) ＝ 9 : 3 : 3 : 1 に分かれる。「${which.label}」はこのうち ${which.n} にあたるから、${which.n}/16 となる。`,
      };
    },
  },
  {
    id: 'a2-recomb-calc',
    stage: 'a2',
    level: 2,
    kind: 'calc',
    make(rng) {
      const rPct = rng.pick([4, 5, 8, 10, 12, 15, 16, 20, 25, 30]);
      const N = rng.pick([200, 400, 500, 1000]);
      const rec = (N * rPct) / 100;
      const r1 = Math.round(rec / 2);
      const r2 = rec - r1;
      const p1 = Math.round((N - rec) / 2);
      const p2 = N - rec - p1;
      const d = distinctNumbers(rPct, [100 - rPct, rPct / 2, (r1 / N) * 100, rPct * 2, (rec / p1) * 100], ' %', 1);
      return {
        text: `遺伝子 A と B が連鎖している AaBb（A と B が同じ染色体上）の個体に aabb を交配したところ、子の表現型は [AB] ${p1}、[Ab] ${r1}、[aB] ${r2}、[ab] ${p2} であった。A と B の間の組換え価は何%か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `組換えで生じたのは数の少ない [Ab] と [aB] で、組換え価 ＝ (${r1} ＋ ${r2}) ÷ ${N} × 100 ＝ ${rPct}% となる。aabb の配偶子は ab だけなので、子の表現型の比が AaBb の配偶子の比をそのまま表すからである。`,
      };
    },
  },
  {
    id: 'a2-gamete-ratio',
    stage: 'a2',
    level: 3,
    kind: 'calc',
    make(rng) {
      const k = rng.pick([3, 4, 7, 9, 19]);
      const rPct = 100 / (k + 1);
      const ratio = (a, b) => `AB : Ab : aB : ab ＝ ${a} : ${b} : ${b} : ${a}`;
      const others = [3, 4, 7, 9, 19].filter((x) => x !== k);
      return {
        text: `AaBb の個体（A と B、a と b がそれぞれ同じ染色体上にある）で、A と B の間の組換え価が ${fmt(rPct, 1)}% のとき、この個体がつくる配偶子の比はどうなるか。`,
        correct: ratio(k, 1),
        wrong: [ratio(1, k), ratio(1, 1), ...others.map((x) => ratio(x, 1)), `AB : Ab : aB : ab ＝ ${k} : 0 : 0 : ${k}`],
        explanation: `組換え価 ${fmt(rPct, 1)}% なので、組換え型の配偶子（Ab と aB）が合わせて ${fmt(rPct, 1)}%、残りが非組換え型（AB と ab）になる。AB : Ab : aB : ab ＝ (1−r)/2 : r/2 : r/2 : (1−r)/2 だから、${k} : 1 : 1 : ${k} となる。`,
      };
    },
  },
  {
    id: 'a2-terms',
    stage: 'a2',
    level: 1,
    kind: 'term',
    make(rng) {
      const Q = [
        { q: '対立遺伝子をヘテロ接合でもつとき、表現型に現れるほうの形質', a: '顕性形質', why: '顕性・潜性は「優れている・劣っている」ではなく、ヘテロ接合体で表現型に現れるかどうかを表すからである' },
        { q: '対立遺伝子をヘテロ接合でもつとき、表現型に現れないほうの形質', a: '潜性形質', why: '潜性形質は、潜性の遺伝子をホモ接合でもつときにだけ現れるからである' },
        { q: '同じ遺伝子座に同じ対立遺伝子をもつ状態（AA や aa）', a: 'ホモ接合', why: '相同染色体の同じ位置にある2つの対立遺伝子が同じだからである' },
        { q: '個体がもつ遺伝子の組合せを記号で表したもの（AA、Aa など）', a: '遺伝子型', why: '形や色などとして現れる性質（表現型）とは区別して、遺伝子の組合せそのものを表すからである' },
      ];
      const x = rng.pick(Q);
      return {
        text: `「${x.q}」を何というか。`,
        correct: x.a,
        wrong: [...Q.map((y) => y.a), 'ヘテロ接合', '表現型'],
        explanation: `これは${x.a}である。${x.why}。`,
      };
    },
  },
  {
    id: 'a2-linkage-terms',
    stage: 'a2',
    level: 2,
    kind: 'term',
    make(rng) {
      const Q = [
        { q: '2組の対立遺伝子が同じ染色体上にあり、いっしょに行動して配偶子に入ること', a: '連鎖', why: '同じ染色体上の遺伝子は、減数分裂で同じ娘細胞に分配されやすいからである' },
        { q: '減数分裂のときに相同染色体の一部が交換され、連鎖している遺伝子の組合せが変わること', a: '組換え', why: '第一分裂前期に対合した相同染色体の間で乗換えが起こるからである' },
        { q: '2組の対立遺伝子が別々の染色体にあり、互いに影響せずに配偶子に分配されること', a: '独立の法則', why: '別々の染色体は減数分裂で互いに無関係に娘細胞へ分かれるからである' },
      ];
      const x = rng.pick(Q);
      return {
        text: `「${x.q}」を何というか。`,
        correct: x.a,
        wrong: [...Q.map((y) => y.a), '分離の法則', '突然変異'],
        explanation: `これは${x.a}である。${x.why}。`,
      };
    },
  },
  {
    id: 'a2-large-numbers',
    stage: 'a2',
    level: 1,
    kind: 'graph',
    make(rng) {
      const seed = rng.int(1, 1e9);
      const small = rng.pick([12, 16, 20]);
      const big = 10000;
      const cs = simulate('mono', small, makeRng(seed));
      const cb = simulate('mono', big, makeRng(seed + 1));
      const e = expected('mono');
      return {
        text: `Aa × Aa の交配を乱数でシミュレーションし、子の数 n＝${small} と n＝${big} の結果を比べた（図）。この結果からいえることとして最も適当なものはどれか。`,
        chart: {
          x: { min: 0, max: 1, label: '表現型' },
          y: { min: 0, max: 1, label: '割合', step: 0.25, digits: 2 },
          bars: {
            categories: ['[A]', '[a]'],
            groups: [
              { values: cs.map((c) => c / small), color: 'c1', label: `n＝${small}` },
              { values: cb.map((c) => c / big), color: 'c2', label: `n＝${big}` },
              { values: e, color: 'c4', label: '理論値 3 : 1' },
            ],
          },
          alt: '子の数による結果の違いの棒グラフ',
        },
        correct: '子の数が多いほど、結果は理論比 3 : 1 に近づく',
        wrong: ['子の数が少ないほど、結果は理論比 3 : 1 に近づく', '子の数に関係なく、いつも正確に 3 : 1 になる', '子の数が多いほど、[a] の割合が増え続ける'],
        explanation: '1回ごとの受精でどの配偶子が出会うかは偶然で決まるので、n が少ないと理論比からずれやすい。数を多くすると偶然のばらつきが打ち消し合うから、理論比に近づく。',
      };
    },
  },
  {
    id: 'a2-di-testcross',
    stage: 'a2',
    level: 2,
    kind: 'term',
    make(rng) {
      const linked = rng.chance(0.5);
      return {
        text: linked
          ? 'AaBb（A と B が同じ染色体上にあり、組換えがまったく起こらない）の個体に aabb を交配した。子の表現型の比 [AB] : [Ab] : [aB] : [ab] はどうなるか。'
          : 'AaBb（A と B は別々の染色体上にある）の個体に aabb を交配した。子の表現型の比 [AB] : [Ab] : [aB] : [ab] はどうなるか。',
        correct: linked ? '1 : 0 : 0 : 1' : '1 : 1 : 1 : 1',
        wrong: ['1 : 1 : 1 : 1', '1 : 0 : 0 : 1', '9 : 3 : 3 : 1', '3 : 1 : 1 : 3', '0 : 1 : 1 : 0'],
        explanation: linked
          ? '組換えが起こらない（完全連鎖）と、AaBb は AB と ab の配偶子しかつくらないので 1 : 0 : 0 : 1 になる。aabb の配偶子は ab だけなので、子の表現型の比は配偶子の比と同じになるからである。'
          : '独立の場合、AaBb は AB : Ab : aB : ab ＝ 1 : 1 : 1 : 1 の配偶子をつくる。aabb の配偶子は ab だけなので、子の表現型の比は配偶子の比と同じ 1 : 1 : 1 : 1 になる。',
      };
    },
  },
  {
    id: 'a2-crossing-over',
    stage: 'a2',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '連鎖している遺伝子の間で組換えが起こるのはいつか。',
        correct: '減数分裂の第一分裂前期に、対合した相同染色体の間で乗換えが起こるとき',
        wrong: ['体細胞分裂の中期に、染色体が赤道面に並ぶとき', '受精のときに、精子と卵の核が合体するとき', 'S期に、DNAが複製されるとき'],
        explanation: '減数分裂の第一分裂前期に相同染色体が対合して二価染色体をつくり、その一部が交換される（乗換え）。そのため連鎖している遺伝子の組合せが変わり、組換えが起こる。',
      };
    },
  },
];
