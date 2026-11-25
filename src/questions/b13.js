// B13 細胞の大きさとミクロメーター の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers } from './common.js';
import { SPECIMENS, RESOLUTION } from '../models/micrometer.js';

// 接眼 e 目盛りと対物 o 目盛りが重なる組（1目盛りの長さが小数第2位までで表せるもの）
const PAIRS = [];
for (const e of [4, 5, 8, 10, 12, 15, 16, 20, 25, 40]) {
  for (let o = 1; o <= 12; o++) {
    const u = (10 * o) / e;
    if (o < e && Math.abs(u * 100 - Math.round(u * 100)) < 1e-9 && u >= 0.5) PAIRS.push({ e, o, u });
  }
}

export const B13 = [
  {
    id: 'b13-calibrate',
    stage: 'b13',
    level: 2,
    kind: 'calc',
    make(rng) {
      const { e, o, u } = rng.pick(PAIRS);
      const d = distinctNumbers(u, [(10 * e) / o, o / e, e / o, 10 * o * e / 100, u * 10, u / 10], ' μm', 2);
      return {
        text: `ある倍率で観察すると、接眼ミクロメーターの ${e} 目盛りと対物ミクロメーターの ${o} 目盛りがちょうど重なった。対物ミクロメーターの1目盛りは 10 μm である。接眼ミクロメーター1目盛りの長さは何 μm か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `対物ミクロメーター ${o} 目盛りの長さは 10 × ${o} ＝ ${10 * o} μm で、これが接眼ミクロメーター ${e} 目盛りにあたるので、${10 * o} ÷ ${e} ＝ ${fmt(u, 2)} μm となる。対物ミクロメーターは試料と同じく拡大されるので、その目盛りを基準にして接眼ミクロメーターの1目盛りの長さを決めるからである。`,
      };
    },
  },
  {
    id: 'b13-measure',
    stage: 'b13',
    level: 2,
    kind: 'calc',
    make(rng) {
      const { e, o, u } = rng.pick(PAIRS.filter((p) => p.u >= 1));
      const n = rng.int(3, 30);
      const L = n * u;
      const d = distinctNumbers(L, [n * 10, (n * e) / o, n / u, L * 10, L / 10, n * u + u], ' μm', 2);
      return {
        text: `接眼ミクロメーターの ${e} 目盛りと対物ミクロメーターの ${o} 目盛り（1目盛り 10 μm）が重なる倍率で細胞を観察したところ、細胞の長さは接眼ミクロメーターの ${n} 目盛り分であった。この細胞の長さは何 μm か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `接眼1目盛りは 10 × ${o} ÷ ${e} ＝ ${fmt(u, 2)} μm なので、細胞の長さは ${n} × ${fmt(u, 2)} ＝ ${fmt(L, 2)} μm となる。測るときに目盛りを読むのは接眼ミクロメーターなので、その1目盛りの長さをかければよいからである。`,
      };
    },
  },
  {
    id: 'b13-mag-change',
    stage: 'b13',
    level: 3,
    kind: 'calc',
    make(rng) {
      const u10 = rng.pick([10, 12, 14, 16, 20]);
      const m2 = rng.pick([40, 20]);
      const u2 = (u10 * 10) / m2;
      const n = rng.int(4, 24);
      const L = n * u2;
      const d = distinctNumbers(L, [n * u10, (n * u10 * m2) / 10, L * 2, L / 2, n * u10 / 2], ' μm', 1);
      return {
        text: `対物レンズ10倍のとき、接眼ミクロメーター1目盛りは ${u10} μm であった。対物レンズを ${m2} 倍に変えて（接眼レンズは同じ）ある細胞を観察すると、細胞の長さは接眼ミクロメーターの ${n} 目盛り分であった。この細胞の長さは何 μm か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `対物レンズの倍率が ${m2 / 10} 倍になると、接眼1目盛りが表す長さは 1/${m2 / 10} になるので ${u10} ÷ ${m2 / 10} ＝ ${fmt(u2, 2)} μm、細胞の長さは ${n} × ${fmt(u2, 2)} ＝ ${fmt(L, 1)} μm となる。接眼ミクロメーターは拡大されないが、試料は ${m2 / 10} 倍大きく見えるからである。`,
      };
    },
  },
  {
    id: 'b13-speed',
    stage: 'b13',
    level: 3,
    kind: 'calc',
    make(rng) {
      const u = rng.pick([2.5, 3.5, 4, 5]);
      const n = rng.int(4, 20);
      const t = rng.pick([2, 4, 5, 8, 10]);
      const v = (n * u) / t;
      const d = distinctNumbers(v, [n / t, (n * u) * t, n * u, (t * u) / n, v * 10], ' μm/秒', 2);
      return {
        text: `オオカナダモの葉の細胞で原形質流動を観察した。接眼ミクロメーター1目盛りが ${u} μm の倍率で、1つの葉緑体が ${t} 秒間に接眼ミクロメーターの ${n} 目盛り分移動した。葉緑体の移動の速さは何 μm/秒か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `移動した距離は ${n} × ${u} ＝ ${fmt(n * u, 2)} μm なので、速さは ${fmt(n * u, 2)} ÷ ${t} ＝ ${fmt(v, 2)} μm/秒となる。目盛りの数を長さに直してから時間でわらないと、速さの単位にならないからである。`,
      };
    },
  },
  {
    id: 'b13-scale-graph',
    stage: 'b13',
    level: 3,
    kind: 'graph',
    make(rng) {
      // 0 の次に重なるのが (e, o) になるよう、e と o が互いに素な組だけを使う
      const gcd = (a, b) => (b ? gcd(b, a % b) : a);
      const { e, o, u } = rng.pick(PAIRS.filter((p) => p.e <= 20 && gcd(p.e, p.o) === 1));
      const N = e * 2;
      const series = [];
      for (let i = 0; i <= N; i++) series.push({ points: [[i, 0], [i, i % 5 === 0 ? 1.4 : 0.9]], color: 'fg', width: 1.6 });
      const step = 10 / u;
      for (let k = 0; k * step <= N + 1e-9; k++) series.push({ points: [[k * step, 0], [k * step, k % 5 === 0 ? -1.4 : -0.9]], color: 'c1', width: 1.6 });
      const d = distinctNumbers(u, [(10 * e) / o, o / e, u * 2, u / 2, 10 / u], ' μm', 2);
      return {
        text: '図は、顕微鏡で見た接眼ミクロメーター（上側の黒い目盛り）と対物ミクロメーター（下側の青い目盛り、1目盛り 10 μm）である。左端で両方の0の線がそろっている。接眼ミクロメーター1目盛りの長さは何 μm か。',
        chart: {
          x: { min: -0.5, max: N + 0.5, label: '接眼ミクロメーターの目盛り', step: 5, grid: false },
          y: { min: -2, max: 2, ticks: [] },
          series,
          texts: [{ x: N / 2, y: 1.75, text: '接眼ミクロメーター' }, { x: N / 2, y: -1.75, text: '対物ミクロメーター（1目盛り 10 μm）', color: 'c1' }],
          alt: '接眼ミクロメーターと対物ミクロメーターの目盛り',
        },
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `0の次に目盛りが重なるのは、接眼 ${e} 目盛りと対物 ${o} 目盛りの位置なので、10 × ${o} ÷ ${e} ＝ ${fmt(u, 2)} μm となる。重なる2点の間では、接眼の目盛り数と対物の目盛り数が同じ長さを表しているからである。`,
      };
    },
  },
  {
    id: 'b13-why',
    stage: 'b13',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '対物レンズの倍率を変えたときは、接眼ミクロメーター1目盛りの長さを求め直す必要がある。その理由として正しいものはどれか。',
        correct: '接眼ミクロメーターは拡大されないが、試料は倍率に応じて拡大されるから',
        wrong: ['接眼ミクロメーターも試料と同じ倍率で拡大されるから', '対物ミクロメーターの1目盛りの長さが倍率によって変わるから', '倍率を変えると試料の実際の大きさが変わるから'],
        explanation: '接眼ミクロメーターは接眼レンズの中にあるので、対物レンズの倍率を変えても見かけの目盛りの間隔は変わらない。一方、試料は対物レンズの倍率に応じて大きく見えるので、接眼1目盛りが表す実際の長さは倍率に反比例して変わる。',
      };
    },
  },
  {
    id: 'b13-micrometer-term',
    stage: 'b13',
    level: 1,
    kind: 'term',
    make(rng) {
      const Q = [
        { text: '対物ミクロメーターについての説明として正しいものはどれか。', correct: 'スライドガラスに 1 mm を100等分した目盛りがあり、1目盛りは 10 μm である', wrong: ['接眼レンズの中に入れて使い、1目盛りは倍率によって変わる', 'スライドガラスに 1 mm を10等分した目盛りがあり、1目盛りは 100 μm である', '試料の長さを測るとき、試料といっしょにのせたまま読む'], explanation: '対物ミクロメーターは、スライドガラスに 1 mm を100等分した目盛りが刻まれたもので、1目盛りは 10 μm である。ステージにのせて試料と同じく拡大されるので、接眼ミクロメーターの1目盛りの長さを求める基準に使う。' },
        { text: '細胞の長さを測るとき、実際に目盛りを読むのはどれか。', correct: '接眼ミクロメーター（対物ミクロメーターは外してから試料を観察する）', wrong: ['対物ミクロメーター（試料と重ねて読む）', '接眼ミクロメーターと対物ミクロメーターの両方を重ねて読む', 'ステージの目盛り'], explanation: '試料の長さは接眼ミクロメーターの目盛りで読む。対物ミクロメーターは接眼1目盛りの長さを求めるために使い、求めたあとは外して試料のプレパラートにかえるからである。' },
        { text: '1 mm は何 μm か。', correct: '1000 μm', wrong: ['10 μm', '100 μm', '1000000 μm'], explanation: '1 mm ＝ 1000 μm、1 μm ＝ 1000 nm である。μ（マイクロ）は100万分の1を表すので、1 μm は 1 m の100万分の1、つまり 1 mm の1000分の1だからである。' },
      ];
      return rng.pick(Q);
    },
  },
  {
    id: 'b13-size-graph',
    stage: 'b13',
    level: 1,
    kind: 'graph',
    make(rng) {
      const pool = [...SPECIMENS, { id: 'egg', name: 'ヒトの卵', length: 140 }, { id: 'virus', name: 'インフルエンザウイルス', length: 0.1 }];
      const items = rng.sample(pool, 4);
      const ask = rng.int(0, 3);
      return {
        text: `図は、ア〜エの大きさ（長さ・直径の目安）を対数目盛りで表したものである。ア〜エは ${items.map((x) => x.name).sort().join('・')} のいずれかである。${items[ask].name}はどれか。`,
        chart: {
          x: { min: 0, max: 1 },
          y: { min: 0.01, max: 1000, log: true, label: '大きさ（μm）' },
          bars: { categories: KATA.slice(0, 4), groups: [{ label: '大きさ', values: items.map((x) => x.length), color: 'c1' }] },
          alt: 'ア〜エの大きさの棒グラフ（対数目盛り）',
        },
        correct: KATA[ask],
        wrong: KATA.slice(0, 4).filter((_, i) => i !== ask),
        explanation: `${items[ask].name}は約${items[ask].length} μm なので${KATA[ask]}である。大きさの目安は、ゾウリムシ 約200 μm、ヒトの卵 約140 μm、ヒトの口腔上皮細胞 約60 μm、ヒトの赤血球 約7〜8 μm、大腸菌 約3 μm、インフルエンザウイルス 約0.1 μm で、対数目盛りでは1目盛りで10倍になるから比べやすい。`,
      };
    },
  },
  {
    id: 'b13-resolution',
    stage: 'b13',
    level: 2,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: '光学顕微鏡で見分けることができる2点間の最小の距離（分解能）はおよそどれくらいか。',
          correct: `約${RESOLUTION.light} μm`,
          wrong: ['約0.1 mm', '約0.2 nm', '約20 μm'],
          explanation: `光学顕微鏡の分解能は約${RESOLUTION.light} μm で、肉眼（約0.1 mm）よりずっと小さいものを見分けられる。さらに小さい構造は、分解能が約0.2 nm の電子顕微鏡を使わないと見分けられないからである。`,
        };
      }
      return {
        text: '次のうち、光学顕微鏡では見えず、電子顕微鏡を使わないと形がわからないものはどれか。',
        correct: 'インフルエンザウイルス（約0.1 μm）',
        wrong: ['ゾウリムシ（約200 μm）', 'ヒトの赤血球（約7〜8 μm）', 'ヒトの口腔上皮細胞（約60 μm）'],
        explanation: 'インフルエンザウイルスは約0.1 μm で、光学顕微鏡の分解能（約0.2 μm）より小さい。そのため光学顕微鏡では形を見分けられず、電子顕微鏡が必要になるからである。',
      };
    },
  },
];
