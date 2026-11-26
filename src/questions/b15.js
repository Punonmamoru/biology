// B15 心臓の拍動と自律神経 の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers } from './common.js';
import { simulate, loewi, AUTONOMIC } from '../models/heart.js';

export const B15 = [
  {
    id: 'b15-co-calc',
    stage: 'b15',
    level: 1,
    kind: 'calc',
    make(rng) {
      const hr = rng.pick([60, 65, 70, 72, 75, 80, 120, 150]);
      const sv = rng.pick([60, 65, 70, 75, 80, 90, 100]);
      const co = (hr * sv) / 1000;
      const d = distinctNumbers(co, [hr + sv, (hr * sv) / 100, sv / hr, co * 2, co / 2, (hr * sv) / 10000], ' L', 2);
      return {
        text: `心拍数が ${hr} 回/分、1回の拍動で心臓（左心室）から送り出される血液の量（1回拍出量）が ${sv} mL のとき、心臓が1分間に送り出す血液の量（心拍出量）は何 L か。ただし、心拍出量 ＝ 1回拍出量 × 心拍数 とする。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `心拍出量 ＝ 1回拍出量 × 心拍数 ＝ ${sv} × ${hr} ＝ ${hr * sv} mL ＝ ${fmt(co, 2)} L となる。1分間に ${hr} 回、毎回 ${sv} mL ずつ送り出すので、かけ合わせればよいからである。`,
      };
    },
  },
  {
    id: 'b15-pulse',
    stage: 'b15',
    level: 1,
    kind: 'calc',
    make(rng) {
      const sec = rng.pick([10, 15, 20, 30]);
      const n = rng.int(Math.round(sec * 1), Math.round(sec * 1.5));
      const hr = (n * 60) / sec;
      const d = distinctNumbers(hr, [n, n * sec, (n * sec) / 60, hr / 2, hr + 10], ' 回/分', 0);
      return {
        text: `手首で脈拍を ${sec} 秒間数えたところ、${n} 回であった。1分間あたりの心拍数は何回か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `1分は ${sec} 秒の ${60 / sec} 倍なので、${n} × ${60 / sec} ＝ ${fmt(hr, 0)} 回/分となる。脈拍は心臓の拍動に合わせて動脈が拍動するものなので、脈拍の数から心拍数がわかるからである。`,
      };
    },
  },
  {
    id: 'b15-circulation',
    stage: 'b15',
    level: 2,
    kind: 'calc',
    make(rng) {
      const blood = rng.pick([4.5, 5, 5.5, 6]);
      const co = rng.pick([4.5, 5, 6, 10, 15, 20]);
      const min = blood / co;
      const sec = min * 60;
      const d = distinctNumbers(sec, [co / blood * 60, blood * co, sec * 2, sec / 2, blood * 60], ' 秒', 0);
      return {
        text: `ある人の血液の量は ${blood} L で、心拍出量（心臓が1分間に送り出す血液の量）は ${co} L/分である。体内の血液と同じ量の血液を心臓が送り出すのにかかる時間は何秒か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `${blood} ÷ ${co} ＝ ${fmt(min, 2)} 分 ＝ ${fmt(sec, 0)} 秒となる。運動中は心拍出量が増えるので、血液はより短い時間で全身をめぐり、筋肉に多くの酸素を運べるからである。`,
      };
    },
  },
  {
    id: 'b15-sv-calc',
    stage: 'b15',
    level: 2,
    kind: 'calc',
    make(rng) {
      const hr = rng.pick([100, 120, 130, 150, 160]);
      const sv = rng.pick([80, 90, 100]);
      const co = (hr * sv) / 1000;
      const d = distinctNumbers(sv, [co * hr, hr, sv * 2, sv / 2, sv + 20], ' mL', 0);
      return {
        text: `運動中のある人の心拍出量は ${fmt(co, 2)} L/分、心拍数は ${hr} 回/分であった。1回拍出量は何 mL か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `1回拍出量 ＝ 心拍出量 ÷ 心拍数 ＝ ${fmt(co * 1000, 0)} mL ÷ ${hr} ＝ ${sv} mL となる。心拍出量は1回拍出量と心拍数の積なので、心拍数でわれば1回分の量が求められるからである。`,
      };
    },
  },
  {
    id: 'b15-autonomic',
    stage: 'b15',
    level: 1,
    kind: 'term',
    make(rng) {
      const rows = AUTONOMIC.filter((r) => !r.p.startsWith('—'));
      const r = rng.pick(rows);
      const side = rng.pick(['s', 'p']);
      const name = side === 's' ? '交感神経' : '副交感神経';
      const other = side === 's' ? 'p' : 's';
      const extra = { 心臓の拍動: '変化しない', 瞳孔: '変化しない', 気管支: '変化しない', '胃・腸のぜん動': '変化しない', 'ぼうこう（排尿）': '変化しない' };
      return {
        text: `${name}がはたらいたとき、「${r.organ}」はどうなるか。`,
        correct: r[side],
        wrong: [r[other], extra[r.organ] || '変化しない', side === 's' ? '副交感神経がはたらいたときと同じ変化をする' : '交感神経がはたらいたときと同じ変化をする'],
        explanation: `${name}がはたらくと、${r.organ}は「${r[side]}」となる。交感神経と副交感神経は、多くの器官に対して互いに反対のはたらき（拮抗的なはたらき）をするからである。`,
      };
    },
  },
  {
    id: 'b15-center',
    stage: 'b15',
    level: 2,
    kind: 'term',
    make(rng) {
      const Q = [
        { text: '心臓の拍動のリズムをつくり出している、右心房にある部分を何というか。', correct: '洞房結節（ペースメーカー）', wrong: ['延髄', '視床下部', '弁'], explanation: '右心房にある洞房結節（ペースメーカー）が周期的に興奮し、それが心臓全体に伝わって拍動が起こる。そのため心臓は、体から取り出しても自動的に拍動を続ける（自動性）。' },
        { text: '心臓の拍動を調節する中枢がある部位はどこか。', correct: '延髄', wrong: ['大脳', '小脳', '洞房結節'], explanation: '心臓の拍動の中枢は延髄にある。延髄は血液中の二酸化炭素濃度の変化などを感知し、自律神経を通じて拍動の速さを調節するからである。' },
        { text: '自律神経系のはたらきを調節する最高の中枢はどこか。', correct: '間脳の視床下部', wrong: ['大脳', '小脳', '脊髄'], explanation: '自律神経系の最高の中枢は間脳の視床下部にある。視床下部は体内の状態を感知し、自律神経系と内分泌系の両方を通じて体内環境を調節するからである。' },
      ];
      return rng.pick(Q);
    },
  },
  {
    id: 'b15-transmitter',
    stage: 'b15',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '交感神経と副交感神経の末端から主に放出される物質の組合せとして正しいものはどれか。',
        correct: '交感神経：ノルアドレナリン　副交感神経：アセチルコリン',
        wrong: ['交感神経：アセチルコリン　副交感神経：ノルアドレナリン', '交感神経：インスリン　副交感神経：グルカゴン', '交感神経：チロキシン　副交感神経：アセチルコリン'],
        explanation: '交感神経の末端からは主にノルアドレナリンが、副交感神経の末端からはアセチルコリンが放出される。これらの物質が器官の細胞に作用して、はたらきを促進したり抑制したりするからである。',
      };
    },
  },
  {
    id: 'b15-exercise-graph',
    stage: 'b15',
    level: 2,
    kind: 'graph',
    make(rng) {
      const t0 = rng.pick([2, 3, 4]);
      const t1 = t0 + rng.pick([4, 5, 6]);
      const run = simulate({ x: rng.pick([0.5, 0.7, 0.9]), t0, t1, tEnd: 18 });
      const ask = rng.pick(['up', 'down']);
      return {
        text: `図は、ある人が運動をしたときの心拍数の変化である。${ask === 'up' ? `${t0}〜${t0 + 1}分ごろに心拍数が急に増えているときの自律神経のはたらきとして正しいものはどれか。` : `${t1}分以降に心拍数がしだいに減っているときの自律神経のはたらきとして正しいものはどれか。`}`,
        chart: {
          x: { min: 0, max: 18, label: '時間（分）', step: 2 },
          y: { min: 40, max: 200, label: '心拍数（回/分）', step: 20 },
          series: [{ points: run.map((r) => [r.t, r.hr]), color: 'c2', width: 3 }],
          alt: '運動による心拍数の変化のグラフ',
        },
        correct: ask === 'up' ? '交感神経のはたらきが強まり、副交感神経のはたらきが弱まっている' : '副交感神経のはたらきが強まり、交感神経のはたらきが弱まっている',
        wrong: ask === 'up'
          ? ['副交感神経のはたらきが強まり、交感神経のはたらきが弱まっている', '交感神経も副交感神経もはたらいていない', '心臓は自律神経とは関係なく拍動が速くなる']
          : ['交感神経のはたらきが強まり、副交感神経のはたらきが弱まっている', '交感神経も副交感神経もはたらいていない', '心臓の拍動が止まりかけている'],
        explanation: ask === 'up'
          ? '運動を始めると、交感神経のはたらきが強まり、副交感神経のはたらきが弱まる。運動が続いて血液中の二酸化炭素濃度が上がると延髄がこれを感知してさらに拍動を促進するので、心臓の拍動が速く強くなり、筋肉に多くの酸素が運ばれる。'
          : '運動をやめると、副交感神経のはたらきが強まり、交感神経のはたらきが弱まる。そのため心臓の拍動はしだいに遅くなり、安静時の心拍数にもどる。',
      };
    },
  },
  {
    id: 'b15-loewi',
    stage: 'b15',
    level: 3,
    kind: 'graph',
    make(rng) {
      const run = loewi();
      const order = rng.shuffle(['a', 'b']);
      const lab = { [order[0]]: KATA[0], [order[1]]: KATA[1] };
      return {
        text: `【発展】カエルの心臓Aの迷走神経（副交感神経）を10〜20秒の間刺激し、心臓Aの中を流れた液を、神経をつないでいない心臓Bに流した。図のア・イは心臓Aと心臓Bの拍動の速さの変化である。心臓Bはどちらか。また、この実験からわかることを選べ。`,
        chart: {
          x: { min: 0, max: 40, label: '時間（秒）', step: 5 },
          y: { min: 0, max: 1.2, label: '拍動の速さ（相対値）', step: 0.2, digits: 1 },
          regions: [{ x0: 10, x1: 20, label: '刺激', fill: 'region' }],
          series: order.map((k, i) => ({ points: run.map((r) => [r.t, r[k]]), color: i ? 'c1' : 'c2', dash: i ? 'dash' : 'solid', width: 3, label: KATA[i], labelAt: k === 'a' ? 13 : 27 })),
          alt: '心臓A・Bの拍動の速さの変化ア・イ',
        },
        correct: `${lab.b}：神経の末端から放出された化学物質が、心臓のはたらきを変えている`,
        wrong: [
          `${lab.a}：神経の末端から放出された化学物質が、心臓のはたらきを変えている`,
          `${lab.b}：神経の電気的な興奮が、液を通って心臓Bに直接伝わっている`,
          `${lab.a}：心臓Bは心臓Aの拍動の音を感じて遅くなっている`,
        ],
        explanation: `心臓Bは${lab.b}で、心臓Aより少し遅れて拍動が遅くなっている。神経をつないでいない心臓Bが、心臓Aを通った液だけで同じ変化を示したので、神経の末端から液の中に化学物質（のちにアセチルコリンとわかった）が放出されていると考えられるからである。`,
      };
    },
  },
];
