// B5 生態系のバランス（キーストーン種）の問題
import { KATA, assignmentQuestion, distinctNumbers } from './common.js';
import { simulate, SCALE } from '../models/keystone.js';

export const B5 = [
  {
    id: 'b5-keystone-def',
    stage: 'b5',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: 'キーストーン種の説明として最も適当なものはどれか。',
        correct: '個体数は多くなくても、生態系のバランスを保つうえで大きな影響をもつ種',
        wrong: ['生態系の中で最も個体数が多い種', '食物連鎖の出発点となる生産者', '人間によってほかの地域から持ち込まれて定着した種'],
        explanation: 'キーストーン種は、個体数は少なくても生態系のバランスに大きな影響をもつ種である。ラッコのように上位の捕食者であることが多く、その種がいなくなると食物網を通じて多くの生物に影響が広がるからである。',
      };
    },
  },
  {
    id: 'b5-indirect',
    stage: 'b5',
    level: 2,
    kind: 'term',
    make(rng) {
      const dir = rng.pick(['減少', '増加']);
      const target = rng.pick(['ウニ', 'ケルプ']);
      const T = {
        '減少-ウニ': ['増加する（ラッコに食べられる量が減るから）', '減少する（ラッコと同じように数が減るから）', '変化しない（ウニはケルプを食べて生活しているから）', '減少する（ケルプが増えすぎるから）'],
        '減少-ケルプ': ['減少する（増えたウニに多く食べられるから）', '増加する（ラッコに食べられなくなるから）', '変化しない（ラッコはケルプを食べないから）', '増加する（ウニが減るから）'],
        '増加-ウニ': ['減少する（ラッコに多く食べられるから）', '増加する（ラッコと同じように数が増えるから）', '変化しない（ウニはケルプを食べて生活しているから）', '増加する（ケルプが減るから）'],
        '増加-ケルプ': ['増加する（ウニが減って食べられる量が減るから）', '減少する（ラッコに食べられるから）', '変化しない（ラッコはケルプを食べないから）', '減少する（ウニが増えるから）'],
      }[`${dir}-${target}`];
      return {
        text: `ラッコはウニを食べ、ウニはケルプ（大型の海藻）を食べる。ある海域でラッコが${dir}すると、その後${target}の量はどうなると考えられるか。`,
        correct: T[0],
        wrong: T.slice(1),
        explanation: `${target}は${T[0].split('（')[0]}と考えられる。${T[0].split('（')[1].replace('）', '')}である。ラッコはケルプを直接食べないが、ウニを介してケルプに影響をおよぼす（間接効果）。`,
      };
    },
  },
  {
    id: 'b5-indirect-def',
    stage: 'b5',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: '食物網で、ある生物が、直接の捕食・被食の関係にない別の生物に、ほかの生物を介して影響をおよぼすことを何というか。',
        correct: '間接効果',
        wrong: ['種間競争', '環境形成作用', '生物濃縮', '共生'],
        explanation: 'これは間接効果である。ラッコがウニを減らすことでケルプが守られるように、生物どうしが食物網でつながっているから、影響が別の生物にまで伝わる。',
      };
    },
  },
  {
    id: 'b5-graph-identify',
    stage: 'b5',
    level: 2,
    kind: 'graph',
    make(rng) {
      const o1 = rng.pick([0, 0.1, 0.2, 0.3]);
      const run = simulate({ o0: 1, o1, tHunt: 20, tEnd: 120 });
      const names = ['ラッコ', 'ウニ', 'ケルプ'];
      const val = { ラッコ: (r) => r.o * SCALE.o, ウニ: (r) => r.u * SCALE.u, ケルプ: (r) => r.k * SCALE.k };
      const order = rng.shuffle(names);
      const labels = KATA.slice(0, 3);
      const styles = [{ color: 'c1', dash: 'solid' }, { color: 'c2', dash: 'dash' }, { color: 'c4', dash: 'dot' }];
      const aq = assignmentQuestion(labels, order);
      return {
        text: 'ラッコ・ウニ・ケルプ（海藻）がいる海域で、20年目からラッコの乱獲が始まった。図のア〜ウは3種の個体数（相対値）の変化を表している。ア〜ウの組合せとして正しいものはどれか。',
        chart: {
          x: { min: 0, max: 120, label: '時間（年）', step: 20 },
          y: { min: 0, max: 105, label: '個体数（相対値）', step: 20 },
          series: order.map((n, i) => ({ points: run.map((r) => [r.t, val[n](r)]), ...styles[i], width: 3, label: labels[i] })),
          vlines: [{ x: 20, color: 'muted', label: '乱獲開始' }],
          alt: '3種の個体数の変化ア・イ・ウ',
        },
        correct: aq.correct,
        wrong: aq.wrong,
        explanation: '乱獲で最初に急に減るのがラッコで、捕食者が減ったウニがそのあと増える。増えたウニに食べられるからケルプは遅れて減る。',
      };
    },
  },
  {
    id: 'b5-trophic',
    stage: 'b5',
    level: 1,
    kind: 'term',
    make() {
      const aq = assignmentQuestion(['ケルプ', 'ウニ', 'ラッコ'], ['生産者', '一次消費者', '二次消費者']);
      return {
        text: 'ケルプ（海藻）→ ウニ → ラッコ という食物連鎖で、それぞれの栄養段階の組合せとして正しいものはどれか。',
        correct: aq.correct,
        wrong: aq.wrong,
        explanation: 'ケルプは光合成で有機物をつくる生産者、それを食べるウニは一次消費者、ウニを食べるラッコは二次消費者である。栄養段階は、生産者から何段階目に食べるかで決まるからである。',
      };
    },
  },
  {
    id: 'b5-starfish',
    stage: 'b5',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '北アメリカの岩礁の潮間帯で、イガイやフジツボなどを食べるヒトデを人為的に取り除き続けた。その結果として最も適当なものはどれか。',
        correct: 'イガイが岩場を独占し、そこに見られる生物の種数が減った',
        wrong: ['ヒトデに食べられていた生物がすべて増え、種数も増えた', 'ヒトデに食べられていた生物がすべて絶滅した', '生物の種類や数にほとんど変化が見られなかった'],
        explanation: 'ヒトデを除くと、競争に強いイガイが岩場を独占し、ほかの生物のすみかがなくなって種数が減った。ヒトデはイガイを食べることで多くの種が共存できる状態を保っていたから、キーストーン種といえる。',
      };
    },
  },
  {
    id: 'b5-resilience',
    stage: 'b5',
    level: 2,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: '台風や山火事などで生態系が乱されても、その程度が小さければやがて元の状態に戻る。生態系のこのような性質を何というか。',
          correct: '復元力',
          wrong: ['生物濃縮', '富栄養化', '間接効果'],
          explanation: 'これは生態系の復元力である。撹乱が小さければ、残った生物の成長や周りからの移入で元の状態に戻るから、生態系のバランスが保たれる。',
        };
      }
      return {
        text: '「生態系のバランスが保たれている」状態の説明として最も適当なものはどれか。',
        correct: '生物の種類や個体数が変動しながらも、一定の範囲内に保たれている状態',
        wrong: ['すべての生物の個体数がまったく変化しない状態', '最も強い捕食者だけが生き残った状態', '生産者と消費者の個体数がつねに等しい状態'],
        explanation: '生態系では個体数はつねに変動しているが、その変動が一定の範囲内におさまっている。捕食・被食などの関係が増えすぎた種を減らす向きにはたらくから、バランスが保たれる。',
      };
    },
  },
  {
    id: 'b5-kelp-habitat',
    stage: 'b5',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: 'ラッコが減ってケルプの森が大きく失われた海域では、ケルプの森をすみかや産卵場所にしていた魚類はどうなると考えられるか。',
        correct: 'すみかや産卵場所が減るので、減少する',
        wrong: ['ラッコと直接の関係がないので、影響を受けない', 'ラッコに食べられなくなるので、必ず増加する', 'ウニとの競争に勝って、増加する'],
        explanation: '魚類はすみかや産卵場所を失うので減少すると考えられる。ラッコの減少の影響は、ウニ・ケルプを通じて、さらにケルプを利用する多くの生物へと間接的に広がるからである。',
      };
    },
  },
  {
    id: 'b5-graph-ratio',
    stage: 'b5',
    level: 3,
    kind: 'graph',
    make(rng) {
      const o1 = rng.pick([0, 0.2, 0.4, 0.6]);
      const run = simulate({ o0: 1, o1, tHunt: 20, tEnd: 120 });
      const before = run.find((r) => r.t >= 19);
      const end = run[run.length - 1];
      const target = rng.pick(['ウニ', 'ケルプ']);
      const up = target === 'ウニ';
      return {
        text: `図は、20年目からラッコの乱獲が始まった海域のラッコ・ウニ・ケルプの個体数（相対値）である。乱獲後に十分時間がたったとき、${target}の個体数は乱獲前と比べてどうなったか。`,
        chart: {
          x: { min: 0, max: 120, label: '時間（年）', step: 20 },
          y: { min: 0, max: 105, label: '個体数（相対値）', step: 20 },
          series: [
            { points: run.map((r) => [r.t, r.o * SCALE.o]), color: 'c4', dash: 'dashdot', width: 3, label: 'ラッコ' },
            { points: run.map((r) => [r.t, r.u * SCALE.u]), color: 'c2', dash: 'dash', width: 3, label: 'ウニ' },
            { points: run.map((r) => [r.t, r.k * SCALE.k]), color: 'c3', width: 3, label: 'ケルプ' },
          ],
          vlines: [{ x: 20, color: 'muted', label: '乱獲開始' }],
          alt: 'ラッコ・ウニ・ケルプの個体数のグラフ',
        },
        correct: up ? '増えて、乱獲前より多い値で落ち着いた' : '減って、乱獲前より少ない値で落ち着いた',
        wrong: up
          ? ['減って、乱獲前より少ない値で落ち着いた', '一時的に増えたが、乱獲前と同じ値に戻った', 'ラッコと同じ割合で減り続けた']
          : ['増えて、乱獲前より多い値で落ち着いた', '一時的に減ったが、乱獲前と同じ値に戻った', 'ラッコと同じ割合で増え続けた'],
        explanation: `${target}は乱獲前の約${Math.round(before[up ? 'u' : 'k'] * SCALE[up ? 'u' : 'k'])}から約${Math.round(end[up ? 'u' : 'k'] * SCALE[up ? 'u' : 'k'])}になって落ち着いた。ラッコが減るとウニを食べる量が減ってウニが増え、増えたウニがケルプを多く食べるからである。`,
      };
    },
  },
  {
    id: 'b5-survey-calc',
    stage: 'b5',
    level: 1,
    kind: 'calc',
    make(rng) {
      const u0 = rng.pick([2, 3, 4, 5]);
      const k = rng.pick([3, 4, 5, 6, 8, 10]);
      const u1 = u0 * k;
      const kelp0 = rng.pick([60, 70, 80, 90]);
      const kelp1 = rng.pick([5, 10, 15, 20]);
      const d = distinctNumbers(k, [u1 - u0, k + 1, kelp0 / kelp1, 1 / k, k - 1, k * 2, u1 + u0], ' 倍', 2);
      return {
        text: `ある海域で、ラッコが乱獲される前と後に調査を行った。ウニの密度は 1m² あたり ${u0}個体から ${u1}個体に、ケルプがおおう面積の割合は ${kelp0}% から ${kelp1}% に変化した。ウニの密度は何倍になったか。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `${u1} ÷ ${u0} ＝ ${k}倍になった。ラッコに食べられなくなったウニが増え、そのウニがケルプを食べたので、ケルプの割合は ${kelp0}% から ${kelp1}% に減ったと考えられる（間接効果）。`,
      };
    },
  },
];
