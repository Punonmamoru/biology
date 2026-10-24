// A3 個体群の成長 の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers } from './common.js';
import { logistic, lotkaVolterra, LV_DEFAULT } from '../models/population.js';
import { sample } from '../lib/series.js';

export const A3 = [
  {
    id: 'a3-k-def',
    stage: 'a3',
    level: 1,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: 'ある環境で、個体群が維持できる最大の個体数を何というか。',
          correct: '環境収容力',
          wrong: ['内的自然増加率', '個体群密度', '生存曲線', '密度効果'],
          explanation: 'これは環境収容力（K）である。食物や生活空間などの資源には限りがあるので、ある環境が養える個体数には上限があるからである。',
        };
      }
      return {
        text: '個体群密度が高くなると、食物や生活空間の不足、排出物の増加などによって個体の発育や増殖率が変化する。このような影響を何というか。',
        correct: '密度効果',
        wrong: ['環境収容力', '間接効果', '生物濃縮', '競争的排除'],
        explanation: 'これは密度効果である。密度が高くなると1個体あたりの資源が減るから、出生率が下がったり死亡率が上がったりして、個体群の成長がおさえられる。',
      };
    },
  },
  {
    id: 'a3-k-read',
    stage: 'a3',
    level: 2,
    kind: 'graph',
    make(rng) {
      const K = rng.pick([200, 300, 400, 500, 600, 800]);
      const r = rng.pick([0.4, 0.5, 0.6, 0.8]);
      const N0 = rng.pick([5, 10, 20]);
      const d = distinctNumbers(K, [K / 2, K * 2, K * 1.5, N0, K - 100], ' 個体', 0);
      return {
        text: 'ある生物を一定の容器の中で飼育したときの個体数の変化を図に示した。この環境の環境収容力はおよそいくらか。',
        chart: {
          x: { min: 0, max: 30, label: '時間（日）', step: 5 },
          y: { min: 0, max: K * 1.25, label: '個体数', step: K >= 600 ? 200 : 100 },
          series: [{ points: sample((t) => logistic(t, N0, r, K), 0, 30, 200), color: 'c1', width: 3 }],
          alt: 'S字形の成長曲線',
        },
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `個体数は約${K}に近づくと、それ以上増えなくなっているので、環境収容力は約${K}個体である。個体数が増えると密度効果がはたらき、増加速度がしだいに0に近づくからである。`,
      };
    },
  },
  {
    id: 'a3-max-growth',
    stage: 'a3',
    level: 2,
    kind: 'calc',
    make(rng) {
      const K = rng.pick([200, 400, 600, 800, 1000, 1200]);
      const d = distinctNumbers(K / 2, [K, K / 4, (K * 3) / 4, K / 10, K * 2], ' 個体', 0);
      return {
        text: `個体数 N が dN/dt ＝ rN(K − N)/K にしたがって増える（ロジスティック成長）個体群がある。環境収容力 K ＝ ${K} のとき、個体数の増加速度 dN/dt が最大になるのは、個体数がいくらのときか。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `rN(K − N)/K は N の2次関数で、N ＝ K/2 のとき最大になるので、${K} ÷ 2 ＝ ${K / 2}個体である。N が小さいと増える個体のもとが少なく、N が K に近いと密度効果が強くはたらくから、その中間で最も速く増える。`,
      };
    },
  },
  {
    id: 'a3-rate-calc',
    stage: 'a3',
    level: 3,
    kind: 'calc',
    make(rng) {
      const K = rng.pick([500, 1000, 2000]);
      const frac = rng.pick([0.1, 0.2, 0.25, 0.5, 0.75, 0.8, 0.9]);
      const N = K * frac;
      const r = rng.pick([0.1, 0.2, 0.4, 0.5]);
      const ans = (r * N * (K - N)) / K;
      const d = distinctNumbers(ans, [r * N, r * (K - N), (r * N * K) / (K - N), r * K, ans * 2, (r * N * N) / K, (r * N * (K + N)) / K, ans / 2, ans * 4], '', 2);
      return {
        text: `個体数 N が dN/dt ＝ rN(K − N)/K にしたがって増えている。r ＝ ${r}、K ＝ ${K}、現在の個体数 N ＝ ${N} のとき、増加速度 dN/dt はいくらか。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `dN/dt ＝ ${r} × ${N} × (${K} − ${N})／${K} ＝ ${fmt(ans, 2)} となる。(K − N)/K は「まだ残っている環境の余裕」の割合を表していて、指数関数的成長 rN にこの割合をかけたものだからである。`,
      };
    },
  },
  {
    id: 'a3-exponential',
    stage: 'a3',
    level: 2,
    kind: 'calc',
    make(rng) {
      const tau = rng.pick([20, 30, 60]);
      const k = rng.pick([3, 4, 5, 6, 8]);
      const N0 = rng.pick([1, 2, 5, 10, 100]);
      const T = tau * k;
      const ans = N0 * Math.pow(2, k);
      const d = distinctNumbers(ans, [N0 * 2 * k, N0 * k, N0 * Math.pow(2, k - 1), N0 * Math.pow(2, k + 1), N0 * k * k], ' 個', 0);
      return {
        text: `ある細菌は、条件がよいと ${tau}分ごとに分裂して数が2倍になる。はじめに ${N0}個あった細菌は、資源が十分にあれば ${T}分後に何個になるか。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `${T}分の間に ${k}回分裂するので、${N0} × 2^${k} ＝ ${ans}個になる。資源に制限がなければ一定時間ごとに倍々に増える（指数関数的成長）からである。`,
      };
    },
  },
  {
    id: 'a3-lv-identify',
    stage: 'a3',
    level: 2,
    kind: 'graph',
    make(rng) {
      const p = { ...LV_DEFAULT, a: rng.pick([0.8, 1, 1.2]), d: rng.pick([0.4, 0.5, 0.6]) };
      const run = lotkaVolterra(p, 25);
      const predFirst = rng.chance(0.5);
      const labels = predFirst ? { y: KATA[0], x: KATA[1] } : { x: KATA[0], y: KATA[1] };
      const scaleY = 2.5; // 捕食者は見やすいように縦軸を2.5倍して描く
      return {
        text: '図のア・イは、ある被食者と捕食者の個体数の周期的な変動を表している（2種の変動の幅は、見やすいように縦方向の倍率を変えてそろえてある）。捕食者はどちらか。理由とともに選べ。',
        chart: {
          x: { min: 0, max: 25, label: '時間', step: 5 },
          y: { min: 0, max: Math.max(...run.map((q) => Math.max(q.x, q.y * scaleY))) * 1.1, label: '個体数（相対値）', ticks: [] },
          series: [
            { points: run.map((q) => [q.t, q.x]), color: 'c3', width: 3, label: labels.x, dash: predFirst ? 'dash' : 'solid' },
            { points: run.map((q) => [q.t, q.y * scaleY]), color: 'c2', width: 3, label: labels.y, dash: predFirst ? 'solid' : 'dash' },
          ],
          alt: '2種の個体数の周期的変動ア・イ',
        },
        correct: `${labels.y}：もう一方の山よりも遅れて山が現れるから`,
        wrong: [
          `${labels.x}：もう一方の山よりも先に山が現れるから`,
          `${labels.x}：もう一方の山よりも遅れて山が現れるから`,
          `${labels.y}：もう一方の山よりも先に山が現れるから`,
          `${labels.x}：個体数の変動の周期が短いから`,
        ],
        explanation: `捕食者は${labels.y}である。被食者が増えるとそれを食べる捕食者が遅れて増え、捕食者が増えると被食者が減るから、捕食者の山は被食者の山より遅れて現れる。`,
      };
    },
  },
  {
    id: 'a3-lv-sequence',
    stage: 'a3',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '被食者と捕食者の個体数が周期的に変動するとき、被食者が増えはじめたあとに起こることの順として正しいものはどれか。',
        correct: '捕食者が増える → 被食者が減る → 捕食者が減る',
        wrong: ['被食者が減る → 捕食者が増える → 捕食者が減る', '捕食者が減る → 被食者が減る → 捕食者が増える', '捕食者が増える → 捕食者が減る → 被食者が減る'],
        explanation: '被食者が増えるとえさが豊富になった捕食者が増え、増えた捕食者に食べられて被食者が減る。えさが減ると捕食者も減るから、この順に変動がくり返される。',
      };
    },
  },
  {
    id: 'a3-mark-recapture',
    stage: 'a3',
    level: 2,
    kind: 'calc',
    make(rng) {
      const N = rng.pick([200, 300, 400, 500, 600, 800, 1000, 1200]);
      const M = rng.pick([20, 25, 40, 50, 60, 80, 100]);
      const R = rng.pick([2, 4, 5, 8, 10]);
      const C = (N * R) / M;
      if (!Number.isInteger(C) || C > N || C < R + 1) return this.make(rng);
      const d = distinctNumbers(N, [M * R / C, M + C, (C * R) / M, M * C, N / 2, N * 2], ' 匹', 0);
      return {
        text: `ある池でコイを ${M}匹捕まえ、標識をつけて放した。十分に時間がたってから再び ${C}匹を捕まえたところ、その中に標識のある個体が ${R}匹いた。この池のコイはおよそ何匹と推定できるか（標識再捕法）。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `全体の数 ＝ 標識した数 × 2回目に捕まえた数 ÷ 2回目の中の標識個体数 ＝ ${M} × ${C} ÷ ${R} ＝ ${N}匹となる。標識個体が池全体に均等に混ざっていれば、2回目の捕獲での標識個体の割合が、池全体での標識個体の割合に等しいと考えられるからである。`,
      };
    },
  },
  {
    id: 'a3-curve-shape',
    stage: 'a3',
    level: 1,
    kind: 'term',
    make(rng) {
      const logi = rng.chance(0.5);
      return {
        text: logi
          ? '資源に限りのある実際の環境で、個体数が増えるにつれて増加の勢いが落ち、やがて一定になるときの成長曲線はどのような形か。'
          : '食物や空間に制限がない理想的な条件で、個体数が一定の割合で増え続けるときの成長曲線はどのような形か。',
        correct: logi ? 'S字形（ロジスティック曲線）' : 'J字形（指数関数的に増え続ける）',
        wrong: ['S字形（ロジスティック曲線）', 'J字形（指数関数的に増え続ける）', '直線（一定の数ずつ増える）', '山形（いったん増えたあと0まで減る）'],
        explanation: logi
          ? '実際の環境では、個体数が増えると密度効果がはたらいて増加の勢いが弱まり、環境収容力に近づいて一定になる。そのため成長曲線はS字形になる。'
          : '制限がなければ、個体数に比例した速さで増え続けるので、増え方がどんどん大きくなる。そのため成長曲線はJ字形になる。',
      };
    },
  },
  {
    id: 'a3-r-k-effect',
    stage: 'a3',
    level: 3,
    kind: 'graph',
    make(rng) {
      const K = 500;
      const r = 0.4;
      const change = rng.pick(['r', 'K']);
      const r2 = change === 'r' ? 0.8 : r;
      const K2 = change === 'K' ? 800 : K;
      return {
        text: `図の実線は、ある個体群のロジスティック成長（r ＝ ${r}、K ＝ ${K}）を表す。条件を1つだけ変えたところ、破線のようになった。変えた条件として最も適当なものはどれか。`,
        chart: {
          x: { min: 0, max: 30, label: '時間', step: 5 },
          y: { min: 0, max: 1000, label: '個体数', step: 200 },
          series: [
            { points: sample((t) => logistic(t, 10, r, K), 0, 30, 200), color: 'c1', width: 3, label: 'もとの条件' },
            { points: sample((t) => logistic(t, 10, r2, K2), 0, 30, 200), color: 'c2', dash: 'dash', width: 3, label: '変えたあと' },
          ],
          alt: '2本のロジスティック曲線',
        },
        correct: change === 'r' ? '内的自然増加率 r を大きくした' : '環境収容力 K を大きくした（えさや空間を増やした）',
        wrong: ['内的自然増加率 r を大きくした', '環境収容力 K を大きくした（えさや空間を増やした）', '最初の個体数を少なくした', '内的自然増加率 r を小さくした'],
        explanation: change === 'r'
          ? '破線は最終的な個体数は同じ（K ＝ 500）で、K に達するのが早くなっているので、r を大きくしたと考えられる。r は増え方の速さを、K は環境が養える上限を決めているからである。'
          : '破線は増え方の速さはほぼ同じで、落ち着く個体数が大きくなっているので、K を大きくしたと考えられる。K は食物や空間などの環境の条件で決まる上限だからである。',
      };
    },
  },
];
