// A11 分子系統と分子時計 の問題
import { fmt } from '../lib/format.js';
import { distinctNumbers } from './common.js';
import { diffs, distanceMatrix, pairKey, proportionalTime } from '../models/phylo.js';

const matrixText = (m) => ['AB', 'AC', 'AD', 'BC', 'BD', 'CD'].map((k) => `${k[0]}–${k[1]} ${m[k]}`).join('、');

export const A11 = [
  {
    id: 'a11-proportion',
    stage: 'a11',
    level: 2,
    kind: 'calc',
    make(rng) {
      const t1 = rng.pick([40, 60, 80, 100]);
      const D1 = rng.pick([10, 12, 15, 16, 20]);
      const k = rng.pick([1.5, 2, 2.5, 3, 4, 5]);
      const D2 = D1 * k;
      if (!Number.isInteger(D2)) return this.make(rng);
      const ans = proportionalTime(t1, D1, D2);
      const d = distinctNumbers(ans, [ans / 2, ans * 2, t1 + D2, (t1 * D1) / D2, t1 * (D2 - D1) / D1], ' 百万年前', 0);
      return {
        text: `あるタンパク質のアミノ酸配列を比べると、生物Xと生物Yでは ${D1} か所、生物Xと生物Zでは ${D2} か所が異なっていた。化石の記録から、XとYは ${t1} 百万年前に分岐したことがわかっている。置換の速さが一定だとすると、XとZが分岐したのは何百万年前と推定できるか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `違いの数は分岐してからの時間に比例するので、${t1} × ${D2} ÷ ${D1} ＝ ${fmt(ans, 0)} 百万年前となる。分岐後はそれぞれの系統で一定の速さで置換が積み重なるからである（分子時計）。`,
      };
    },
  },
  {
    id: 'a11-rate',
    stage: 'a11',
    level: 3,
    kind: 'calc',
    make(rng) {
      const t = rng.pick([50, 80, 100, 200, 400]);
      const r = rng.pick([0.05, 0.1, 0.2, 0.25]);
      const D = diffs(t, r);
      if (!Number.isInteger(D)) return this.make(rng);
      const ans = r * 100;
      const d = distinctNumbers(ans, [ans * 2, ans / 2, ans * 4, t / D, D, D / 2], ' 個', 1);
      return {
        text: `2種の生物は ${t} 百万年前に共通の祖先から分岐し、あるタンパク質のアミノ酸配列には ${D} か所の違いがある。1つの系統で、1億年あたり平均何個のアミノ酸が置換したと考えられるか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `分岐後は2つの系統それぞれで置換が起こるので、1つの系統あたりの置換数は ${D} ÷ 2 ＝ ${fmt(D / 2, 1)} 個である。これが ${t} 百万年（${fmt(t / 100, 1)} 億年）の間に起こったから、1億年あたり ${fmt(D / 2, 1)} ÷ ${fmt(t / 100, 1)} ＝ ${fmt(ans, 1)} 個となる。`,
      };
    },
  },
  {
    id: 'a11-closest',
    stage: 'a11',
    level: 2,
    kind: 'calc',
    make(rng) {
      const pair = rng.pick([['A', 'B'], ['A', 'C'], ['B', 'C']]);
      const m = distanceMatrix({ pair, t1: rng.pick([20, 30, 40]), t2: rng.pick([80, 100, 120]), t3: rng.pick([200, 250, 300]), rate: 0.2 });
      const third = ['A', 'B', 'C'].find((x) => !pair.includes(x));
      const tree = `((${pair[0]}, ${pair[1]}), ${third}), D`;
      const others = [['A', 'B'], ['A', 'C'], ['B', 'C']].filter((p) => p.join() !== pair.join()).map((p) => `((${p[0]}, ${p[1]}), ${['A', 'B', 'C'].find((x) => !p.includes(x))}), D`);
      return {
        text: `生物A〜Dのあるタンパク質のアミノ酸配列を比べ、違いの数を調べた（${matrixText(m)}）。違いの数が少ないほど近縁であるとして系統樹を作ると、どのような形になるか（( ) でまとめたものが1つのなかまを表す）。`,
        correct: tree,
        wrong: [...others, `((${pair[0]}, D), ${pair[1]}), ${third}`, `((${third}, D), ${pair[0]}), ${pair[1]}`],
        explanation: `違いの数が最も少ない ${pair[0]} と ${pair[1]}（${m[pairKey(pair[0], pair[1])]}）が最も近縁で、次に ${third} がこのなかまに近く、D は A〜C のどれとも違いが大きい。違いの数は分岐してからの時間に比例するので、違いが小さい組ほど最近まで共通の祖先をもっていたと考えられるからである。`,
      };
    },
  },
  {
    id: 'a11-tree-time',
    stage: 'a11',
    level: 3,
    kind: 'calc',
    make(rng) {
      const t2 = rng.pick([60, 80, 100]);
      const t3 = rng.pick([200, 240, 300]);
      const rate = 0.25;
      const m = distanceMatrix({ pair: ['A', 'B'], t1: 20, t2, t3, rate });
      const ans = (t2 * m.CD) / m.AC;
      const d = distinctNumbers(ans, [t2 * 2, (t2 * m.AC) / m.CD, t2 + m.CD, m.CD, ans / 2, ans * 2, ans - t2], ' 百万年前', 0);
      return {
        text: `生物A〜Dのあるタンパク質のアミノ酸の違いの数は、${matrixText(m)} であった。AとCが分岐したのが ${t2} 百万年前だとすると、CとDが分岐したのは何百万年前と推定できるか（置換の速さは一定とする）。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `違いの数は分岐年代に比例するので、${t2} × ${m.CD} ÷ ${m.AC} ＝ ${fmt(ans, 0)} 百万年前となる。CとDの違い ${m.CD} はAとCの違い ${m.AC} の ${fmt(m.CD / m.AC, 2)} 倍だから、分岐年代も同じ倍率で古いと考えられるのである。`,
      };
    },
  },
  {
    id: 'a11-two-proteins',
    stage: 'a11',
    level: 2,
    kind: 'graph',
    make(rng) {
      const fastIsA = rng.chance(0.5);
      const rF = 0.4;
      const rS = 0.05;
      const lab = fastIsA ? { fast: 'ア', slow: 'イ' } : { fast: 'イ', slow: 'ア' };
      return {
        text: '図のア・イは、2種類のタンパク質について、いろいろな生物の組の分岐年代とアミノ酸の違いの数の関係を表したものである。生存に重要なはたらきをもち、機能上の制約が大きいタンパク質はどちらか。理由とともに選べ。',
        chart: {
          x: { min: 0, max: 500, label: '分岐した年代（百万年前）', step: 100 },
          y: { min: 0, max: 420, label: 'アミノ酸の違いの数', step: 100 },
          series: [
            { points: [[0, 0], [500, diffs(500, fastIsA ? rF : rS)]], color: 'c1', width: 3, label: 'ア', labelAt: 450 },
            { points: [[0, 0], [500, diffs(500, fastIsA ? rS : rF)]], color: 'c2', dash: 'dash', width: 3, label: 'イ', labelAt: 450 },
          ],
          alt: '2本の直線ア・イ',
        },
        correct: `${lab.slow}：違いの数がふえる速さ（置換の速さ）が小さいから`,
        wrong: [`${lab.fast}：違いの数がふえる速さ（置換の速さ）が大きいから`, `${lab.fast}：違いの数がふえる速さ（置換の速さ）が小さいから`, `${lab.slow}：違いの数がふえる速さ（置換の速さ）が大きいから`, `${lab.fast}：直線が原点を通るから`],
        explanation: `${lab.slow}の直線の傾きが小さく、置換がゆっくり蓄積している。機能上重要な部分のアミノ酸が変わると生存に不利になり、その変異は自然選択によって集団から取り除かれるので、置換の速さが小さくなるからである。`,
      };
    },
  },
  {
    id: 'a11-neutral',
    stage: 'a11',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: 'DNAの塩基配列に生じる突然変異の多くは、生存に有利でも不利でもなく、遺伝的浮動によって偶然に集団に広まったり失われたりする、という考え方を何というか。',
        correct: '中立説',
        wrong: ['用不用説', '自然選択説', '隔離説', '定向進化説'],
        explanation: 'これは中立説で、木村資生が提唱した。中立な変異は自然選択を受けず、ほぼ一定の速さで蓄積するので、分子時計の考え方の根拠になっている。',
      };
    },
  },
  {
    id: 'a11-rate-order',
    stage: 'a11',
    level: 2,
    kind: 'term',
    make(rng) {
      const slow = rng.chance(0.5);
      return {
        text: slow
          ? '次のタンパク質のうち、アミノ酸の置換が最もゆっくり進む（分子進化の速度が最も小さい）ものはどれか。'
          : '次のタンパク質のうち、アミノ酸の置換が最も速く進む（分子進化の速度が最も大きい）ものはどれか。',
        correct: slow ? 'ヒストン（DNAが巻きつくタンパク質）' : 'フィブリノペプチド（血液凝固で切り離される部分）',
        wrong: ['ヒストン（DNAが巻きつくタンパク質）', 'フィブリノペプチド（血液凝固で切り離される部分）', 'ヘモグロビン', 'シトクロム c'],
        ordered: true,
        explanation: slow
          ? 'ヒストンはDNAと結合して染色体の構造をつくる重要なタンパク質で、アミノ酸が変わるとはたらきを失いやすい。そのため変異の多くが自然選択で取り除かれ、置換が最もゆっくり進むのである。'
          : 'フィブリノペプチドは血液凝固のときに切り離されて捨てられる部分で、アミノ酸が変わってもはたらきにほとんど影響しない。そのため変異が自然選択で取り除かれにくく、置換が最も速く進むのである。',
      };
    },
  },
  {
    id: 'a11-terms',
    stage: 'a11',
    level: 1,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: 'DNAの塩基配列やタンパク質のアミノ酸配列の違いをもとに作成した系統樹を何というか。',
          correct: '分子系統樹',
          wrong: ['系統分類', '生命表', '遺伝子地図', '分子時計'],
          explanation: 'これを分子系統樹という。形態の比較だけではわかりにくい類縁関係も、配列の違いの数を比べることで推定できるので、現在の分類の重要な根拠になっている。',
        };
      }
      return {
        text: 'アミノ酸や塩基の置換が、時間にほぼ比例して一定の速さで蓄積することを利用して、生物が分岐した年代を推定する考え方を何というか。',
        correct: '分子時計',
        wrong: ['分子系統樹', '中立説', '放射年代測定', '生物時計'],
        explanation: 'これを分子時計という。化石などで分岐年代がわかっている組を基準にすると、違いの数の比から他の組の分岐年代を推定できるので、化石の少ない生物の進化の研究に役立つ。',
      };
    },
  },
  {
    id: 'a11-saturation',
    stage: 'a11',
    level: 3,
    kind: 'term',
    make() {
      return {
        text: '分岐年代が非常に古い生物どうしでは、アミノ酸の違いの数が、分岐年代に比例する直線から予想される値より少なくなることがある。その理由として最も適当なものはどれか。',
        correct: '同じ場所で置換がくり返し起こったり、もとのアミノ酸にもどったりしても、違いとしては1か所にしか数えられないから',
        wrong: ['古い時代には突然変異がまったく起こらなかったから', '分岐年代が古いほど、置換の速さが大きくなるから', '違いの数はつねに分岐年代に正確に比例するから'],
        explanation: '長い時間がたつと、すでに置換が起こった場所で再び置換が起こることがある。その場合も配列を比べると1か所の違いとしか数えられないので、違いの数は実際に起こった置換の数より少なくなるからである。',
      };
    },
  },
];
