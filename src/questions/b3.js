// B3 免疫の一次応答・二次応答 の問題
import { antibodyModel, responseShape, PRIMARY, SECONDARY, FLOOR, peakDelay } from '../models/immune.js';
import { sample } from '../lib/series.js';

function twoExposureChart(d1, d2, antigen2, log) {
  const m = antibodyModel([{ day: d1, antigen: 'A' }, { day: d2, antigen: antigen2 }]);
  const series = [{ points: sample((t) => m.level('A', t), 0, 80, 240), color: 'c1', width: 3, label: '抗原Aに対する抗体' }];
  if (antigen2 === 'B') series.push({ points: sample((t) => m.level('B', t), 0, 80, 240), color: 'c2', dash: 'dash', width: 3, label: '抗原Bに対する抗体', labelAt: Math.min(70, d2 + 16) });
  return {
    x: { min: 0, max: 80, label: '日数', step: 10 },
    y: log ? { min: 0.01, max: 1000, log: true, label: '抗体量（相対値・対数）' } : { min: 0, max: 120, step: 20, label: '抗体量（相対値）' },
    series,
    vlines: [
      { x: d1, color: 'muted', label: '1回目 A' },
      { x: d2, color: 'muted', label: `2回目 ${antigen2}`, dy: 18 },
    ],
    alt: '抗体量の変化のグラフ',
  };
}

export const B3 = [
  {
    id: 'b3-second-feature',
    stage: 'b3',
    level: 1,
    kind: 'graph',
    make(rng) {
      const d1 = rng.int(0, 5);
      const d2 = rng.int(30, 45);
      return {
        text: `図は、ある動物に抗原Aを${d1}日目と${d2}日目の2回注射したときの、抗原Aに対する抗体量の変化である。2回目の注射後の抗体産生の特徴として正しいものはどれか。`,
        chart: twoExposureChart(d1, d2, 'A', true),
        correct: '1回目より速く、多量の抗体がつくられる',
        wrong: ['1回目より遅いが、多量の抗体がつくられる', '1回目より速いが、少量の抗体しかつくられない', '1回目と同じ速さで、同じ量の抗体がつくられる', '1回目より遅く、少量の抗体しかつくられない'],
        explanation: '2回目は1回目より速く、多量の抗体がつくられる（二次応答）。1回目の侵入でできた記憶細胞が、同じ抗原の再侵入ですぐに増殖して抗体産生細胞になるからである。',
      };
    },
  },
  {
    id: 'b3-memory-reason',
    stage: 'b3',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: '同じ抗原が2回目に侵入したとき、二次応答が起こる理由として最も適当なものはどれか。',
        correct: '1回目の侵入のときにつくられた記憶細胞が体内に残っているから',
        wrong: ['1回目につくられた抗体が、減らずにすべて血液中に残っているから', '1回目の抗原が体内で増え続けているから', '2回目には樹状細胞が直接抗体をつくるから', 'あらゆる抗原に反応できる抗体が1回目につくられたから'],
        explanation: '1回目の免疫応答では、B細胞やT細胞の一部が記憶細胞として長く残る。同じ抗原が再び侵入すると記憶細胞がすばやく増殖・分化するから、二次応答が起こる。',
      };
    },
  },
  {
    id: 'b3-other-antigen',
    stage: 'b3',
    level: 2,
    kind: 'graph',
    make(rng) {
      const d1 = rng.int(0, 5);
      const d2 = rng.int(30, 45);
      return {
        text: `ある動物に、${d1}日目に抗原Aを、${d2}日目に別の抗原Bを注射した。図はそれぞれに対する抗体量の変化である（縦軸は対数目盛り）。抗原Bに対する抗体産生について正しいものはどれか。`,
        chart: twoExposureChart(d1, d2, 'B', true),
        correct: '抗原Bに対しては、一次応答（遅く、少ない）が起こる',
        wrong: ['抗原Bに対しても、二次応答（速く、多い）が起こる', '抗原Bに対しては、抗体がまったくつくられない', '抗原Aに対する抗体が抗原Bと結合し、抗原Bを排除する', '抗原Bに対しては、抗原Aのときより遅く少量だが二次応答が起こる'],
        explanation: '抗原Bには一次応答が起こる。記憶細胞は1回目の抗原Aに特異的で、抗原Bの記憶細胞はまだないからである。',
      };
    },
  },
  {
    id: 'b3-cells',
    stage: 'b3',
    level: 1,
    kind: 'term',
    make(rng) {
      const Q = [
        { q: '抗体をつくって放出する細胞', a: '形質細胞（抗体産生細胞）', why: 'B細胞がヘルパーT細胞によって活性化されると、増殖して形質細胞に分化するからである' },
        { q: '抗原を取り込んで、ヘルパーT細胞に抗原の情報を提示する細胞', a: '樹状細胞', why: '樹状細胞は抗原を取り込んでリンパ節へ移動し、抗原提示によってT細胞を活性化するからである' },
        { q: '同じ抗原を認識したB細胞を活性化させる細胞', a: 'ヘルパーT細胞', why: 'ヘルパーT細胞は抗原提示を受けて活性化し、同じ抗原を認識したB細胞やキラーT細胞のはたらきを促すからである' },
        { q: 'ウイルスに感染した細胞を直接攻撃して破壊する細胞', a: 'キラーT細胞', why: 'キラーT細胞は感染細胞の表面の抗原を認識し、その細胞を直接破壊するからである（細胞性免疫）' },
      ];
      const x = rng.pick(Q);
      return {
        text: `獲得免疫で、「${x.q}」はどれか。`,
        correct: x.a,
        wrong: Q.map((y) => y.a).concat(['マクロファージ']),
        explanation: `${x.q}は${x.a}である。${x.why}。`,
      };
    },
  },
  {
    id: 'b3-vaccine',
    stage: 'b3',
    level: 1,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: 'ワクチンによる予防接種のしくみとして最も適当なものはどれか。',
          correct: '無毒化・弱毒化した病原体や抗原を接種し、記憶細胞をつくらせておく',
          wrong: ['他の動物につくらせた抗体を注射し、すぐに病原体を排除させる', '抗生物質を注射し、病原体の増殖を止めておく', '記憶細胞そのものを注射し、すぐに二次応答を起こさせる'],
          explanation: 'ワクチンは、無毒化・弱毒化した病原体や抗原を接種して記憶細胞をつくらせる方法である。本物の病原体が侵入したときに二次応答がすばやく起こるから、発症を防いだり軽くしたりできる。',
        };
      }
      return {
        text: '毒ヘビにかまれたとき、ウマなどにつくらせておいた抗体をふくむ血清を注射する治療法を何というか。',
        correct: '血清療法',
        wrong: ['予防接種', '化学療法', '自己免疫療法'],
        explanation: 'これは血清療法である。すでにできている抗体を注射するので、自分で抗体をつくるのを待たずにすぐに毒を無毒化できるからである。',
      };
    },
  },
  {
    id: 'b3-ratio-log',
    stage: 'b3',
    level: 3,
    kind: 'graph',
    make(rng) {
      const k = rng.pick([1, 2, 3]);
      const a1 = rng.pick([0.1, 1]);
      const a2 = a1 * Math.pow(10, k);
      const d1 = 5;
      const d2 = rng.int(35, 45);
      const f = (t) => FLOOR + a1 * responseShape(t - d1, PRIMARY) + a2 * responseShape(t - d2, SECONDARY);
      const lab = (n) => `約${n}倍`;
      return {
        text: '図は、同じ抗原を2回注射したときの抗体量の変化を、縦軸を対数目盛りにして表したものである。二次応答での抗体量の最大値は、一次応答の最大値のおよそ何倍か。',
        chart: {
          x: { min: 0, max: 80, label: '日数', step: 10 },
          y: { min: 0.01, max: 10000, log: true, label: '抗体量（相対値・対数）' },
          series: [{ points: sample(f, 0, 80, 240), color: 'c1', width: 3 }],
          vlines: [{ x: d1, color: 'muted', label: '1回目' }, { x: d2, color: 'muted', label: '2回目' }],
          alt: '対数目盛りの抗体量のグラフ',
        },
        correct: lab(Math.pow(10, k)),
        wrong: [2, 5, 10, 100, 1000, 10000].filter((n) => n !== Math.pow(10, k)).map(lab),
        explanation: `一次応答の山は約${a1}、二次応答の山は約${a2}なので、約${Math.pow(10, k)}倍である。対数目盛りでは目盛り1つ分上がるごとに10倍になるから、山の高さの差が${k}目盛りなら10の${k}乗倍と読める。`,
      };
    },
  },
  {
    id: 'b3-days-read',
    stage: 'b3',
    level: 2,
    kind: 'graph',
    make(rng) {
      const d1 = rng.int(0, 4);
      const d2 = rng.int(30, 40);
      const which = rng.pick([1, 2]);
      const ans = which === 1 ? peakDelay(PRIMARY) : peakDelay(SECONDARY);
      const lab = (n) => `約${n}日`;
      return {
        text: `図は、${d1}日目と${d2}日目に同じ抗原Aを注射したときの抗体量の変化である（縦軸は対数目盛り）。${which}回目の注射から、抗体量が最大になるまでおよそ何日かかっているか。`,
        chart: twoExposureChart(d1, d2, 'A', true),
        correct: lab(ans),
        wrong: [1, 2, 6, 12, 25, 40].filter((n) => n !== ans).map(lab),
        explanation: `${which}回目の注射から約${ans}日で最大になっている。${which === 1 ? '一次応答では、抗原に合うリンパ球が活性化・増殖して形質細胞になるまでに時間がかかるからである。' : '二次応答では記憶細胞がすぐに増殖して形質細胞になるから、一次応答（約12日）より速く最大になる。'}`,
      };
    },
  },
  {
    id: 'b3-primary-slow',
    stage: 'b3',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '一次応答で、抗原の侵入から抗体が増えはじめるまでに1週間ほどかかる理由として最も適当なものはどれか。',
        correct: 'その抗原に合うリンパ球はもともと少なく、活性化・増殖して抗体産生細胞になるまでに時間がかかるから',
        wrong: ['抗体が血液中を全身に運ばれるのに1週間かかるから', '抗原が体内で十分に増えるまで、免疫はまったくはたらかないから', '一次応答では自然免疫だけがはたらき、抗体はつくられないから'],
        explanation: '抗原に合うB細胞やT細胞は最初はごく少数しかない。それらが抗原提示を受けて活性化し、増殖・分化して形質細胞になるまでに時間がかかるから、一次応答は遅い。',
      };
    },
  },
  {
    id: 'b3-disorders',
    stage: 'b3',
    level: 2,
    kind: 'term',
    make(rng) {
      const Q = [
        { q: '花粉など、本来は無害な抗原に対して免疫が過敏に反応し、体に不都合が起こること', a: 'アレルギー', why: '同じ抗原に2回目以降に反応するとき、免疫反応が過剰に起こるからである' },
        { q: '免疫が自分の体の成分を抗原として認識し、攻撃してしまう病気', a: '自己免疫疾患', why: '本来は自分の成分に反応するリンパ球は排除されるが、そのしくみがうまくはたらかないことがあるからである' },
        { q: 'HIVがヘルパーT細胞に感染して破壊し、免疫のはたらきが低下する病気', a: '後天性免疫不全症候群（エイズ）', why: 'ヘルパーT細胞が減ると、B細胞やキラーT細胞を活性化できなくなるからである' },
      ];
      const x = rng.pick(Q);
      return {
        text: `「${x.q}」を何というか。`,
        correct: x.a,
        wrong: Q.map((y) => y.a).concat(['拒絶反応']),
        explanation: `これは${x.a}である。${x.why}。`,
      };
    },
  },
];
