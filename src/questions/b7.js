// B7 腎臓のはたらき の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers } from './common.js';
import { SUBSTANCES, substanceById } from '../models/kidney.js';

const RATIO_SUBS = ['urea', 'uric', 'creatinine', 'k', 'na'];

export const B7 = [
  {
    id: 'b7-ratio-calc',
    stage: 'b7',
    level: 1,
    kind: 'calc',
    make(rng) {
      const s = substanceById(rng.pick(RATIO_SUBS));
      const ratio = s.urine / s.plasma;
      const d = distinctNumbers(ratio, [ratio * 10, ratio / 10, ratio * 2, ratio / 2, ratio + (ratio < 10 ? 1 : 10)], '', ratio < 10 ? 2 : 1);
      return {
        text: `ある人の血しょう中の${s.name}の濃度は ${s.plasma}%、尿中の濃度は ${s.urine}% であった。${s.name}の濃縮率はいくらか。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `濃縮率 ＝ 尿中の濃度 ÷ 血しょう中の濃度 ＝ ${s.urine} ÷ ${s.plasma} ＝ ${fmt(ratio, ratio < 10 ? 2 : 1)} となる。濃縮率は、尿中で血しょう中の何倍に濃くなったかを表す値だからである。`,
      };
    },
  },
  {
    id: 'b7-filtrate-calc',
    stage: 'b7',
    level: 2,
    kind: 'calc',
    make(rng) {
      const perMin = rng.chance(0.5);
      const cP = 0.1;
      const ratio = rng.pick([100, 110, 120, 125, 130, 140]);
      const cU = (cP * ratio).toFixed(1).replace(/\.0$/, '');
      if (perMin) {
        const U = rng.pick([0.8, 1, 1.2, 1.5]);
        const F = U * ratio;
        const d = distinctNumbers(F, [F * 1.5, F / 1.5, F / 10, F + ratio, F * 10], ' mL', 1);
        return {
          text: `イヌリンを静脈に注射したところ、血しょう中のイヌリン濃度は ${cP}%、尿中の濃度は ${cU}% になった。1分間の尿量が ${U} mL のとき、1分間につくられる原尿の量は何 mL か。ただし、イヌリンはろ過されるが再吸収も分泌もされない。`,
          correct: d.correct,
          wrong: d.wrong,
          ordered: true,
          explanation: `イヌリンの濃縮率は ${cU} ÷ ${cP} ＝ ${ratio} なので、原尿量 ＝ 尿量 × 濃縮率 ＝ ${U} × ${ratio} ＝ ${fmt(F, 1)} mL となる。イヌリンは再吸収されないから、原尿中のイヌリンはすべて尿に出ており、水が再吸収されて体積が 1／${ratio} になった分だけ濃縮されている。`,
        };
      }
      const U = rng.pick([1, 1.2, 1.5, 1.8, 2]);
      const F = U * ratio;
      const d = distinctNumbers(F, [F * 1.5, F / 10, F / 1.5, U + ratio, F * 10], ' L', 1);
      return {
        text: `ある人の血しょう中のイヌリン濃度は ${cP}%、尿中の濃度は ${cU}% であった。1日の尿量が ${U} L のとき、1日につくられる原尿の量は何 L か。ただし、イヌリンはろ過されるが再吸収も分泌もされない。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `イヌリンの濃縮率は ${cU} ÷ ${cP} ＝ ${ratio} なので、原尿量 ＝ 尿量 × 濃縮率 ＝ ${U} × ${ratio} ＝ ${fmt(F, 1)} L となる。イヌリンは再吸収も分泌もされないから、尿中のイヌリンの量は原尿中の量と等しい。`,
      };
    },
  },
  {
    id: 'b7-water-reabs',
    stage: 'b7',
    level: 2,
    kind: 'calc',
    make(rng) {
      const U = rng.pick([1, 1.5, 2]);
      const ratio = rng.pick([100, 120, 125, 150]);
      const F = U * ratio;
      const r = ((F - U) / F) * 100;
      const d = distinctNumbers(r, [(U / F) * 100, 90, 95, 99.9, r - 1, ((F - U) / (F + U)) * 100, 100 - ratio / 10], '%', 1);
      return {
        text: `1日の原尿量が ${fmt(F, 1)} L、尿量が ${U} L であった。原尿中の水のうち、再吸収された水の割合は何%か（小数第2位を四捨五入）。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `再吸収された水は ${fmt(F, 1)} − ${U} ＝ ${fmt(F - U, 1)} L なので、再吸収率は ${fmt(F - U, 1)} ÷ ${fmt(F, 1)} × 100 ≒ ${fmt(r, 1)}% となる。原尿中の水の大部分は細尿管と集合管で血液にもどるから、尿として出る量はごくわずかである。`,
      };
    },
  },
  {
    id: 'b7-reabs-calc',
    stage: 'b7',
    level: 3,
    kind: 'calc',
    make(rng) {
      const s = substanceById(rng.pick(['urea', 'na', 'k', 'uric']));
      const ratioIn = rng.pick([100, 120, 125, 150]);
      const U = rng.pick([1, 1.5, 2]);
      const F = U * ratioIn;
      const filtered = (F * 1000 * s.filtrate) / 100;
      const excreted = (U * 1000 * s.urine) / 100;
      const askRate = rng.chance(0.5);
      const rate = ((filtered - excreted) / filtered) * 100;
      const cInU = (0.1 * ratioIn).toFixed(1).replace(/\.0$/, '');
      const head = `血しょう中のイヌリン濃度は 0.1%、尿中のイヌリン濃度は ${cInU}%、1日の尿量は ${U} L である。${s.name}の濃度は原尿中で ${s.filtrate}%、尿中で ${s.urine}% であった（1 mL を 1 g とする）。`;
      if (askRate) {
        const d = distinctNumbers(rate, [(excreted / filtered) * 100, 100 - (s.urine / s.filtrate), (1 - s.filtrate / s.urine) * 100, rate / 2], '%', 1);
        return {
          text: `${head}${s.name}の再吸収率は何%か（小数第2位を四捨五入）。`,
          correct: d.correct,
          wrong: d.wrong,
          ordered: true,
          explanation: `原尿量は ${U} × ${ratioIn} ＝ ${fmt(F, 1)} L なので、原尿中の${s.name}は ${fmt(F * 1000, 0)} × ${s.filtrate}／100 ＝ ${fmt(filtered, 2)} g、尿中は ${fmt(U * 1000, 0)} × ${s.urine}／100 ＝ ${fmt(excreted, 2)} g となる。再吸収率 ＝ （${fmt(filtered, 2)} − ${fmt(excreted, 2)}）÷ ${fmt(filtered, 2)} × 100 ≒ ${fmt(rate, 1)}% と求められるのは、原尿中にあって尿中に出なかった分が再吸収された量だからである。`,
        };
      }
      const re = filtered - excreted;
      const d = distinctNumbers(re, [filtered, excreted, filtered + excreted, re * 10, re / 10], ' g', 2);
      return {
        text: `${head}1日に再吸収された${s.name}は何 g か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `原尿量は ${U} × ${ratioIn} ＝ ${fmt(F, 1)} L なので、原尿中の${s.name}は ${fmt(filtered, 2)} g、尿中は ${fmt(excreted, 2)} g である。再吸収量 ＝ 原尿中の量 − 尿中の量 ＝ ${fmt(re, 2)} g となるのは、原尿中にあって尿として出なかった分が血液にもどったからである。`,
      };
    },
  },
  {
    id: 'b7-glucose-protein',
    stage: 'b7',
    level: 1,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: '健康な人では、グルコースは原尿中に含まれるが尿中にはほとんど含まれない。その理由として正しいものはどれか。',
          correct: '糸球体でろ過されたあと、細尿管ですべて再吸収されるから',
          wrong: ['分子が大きく、糸球体でろ過されないから', '集合管で尿中から分泌されないから', 'ぼうこうで分解されるから'],
          explanation: 'グルコースは糸球体からボーマンのうへろ過されるので原尿中に含まれる。しかし体に必要な物質なので、細尿管ですべて再吸収されるから、健康な人の尿には出てこない。',
        };
      }
      return {
        text: 'タンパク質が血しょう中には含まれるが、原尿中には含まれない理由として正しいものはどれか。',
        correct: '分子が大きく、糸球体からボーマンのうへろ過されないから',
        wrong: ['ろ過されたあと、細尿管ですべて再吸収されるから', 'ろ過されたあと、集合管ですべて分解されるから', '肝臓ですべて尿素に変えられるから'],
        explanation: '糸球体ではタンパク質や血球のような大きなものはろ過されない。そのためタンパク質は、再吸収されるのではなく、はじめからろ過されないので原尿に含まれない。',
      };
    },
  },
  {
    id: 'b7-inulin-why',
    stage: 'b7',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '原尿量を求めるときにイヌリンを用いる理由として最も適当なものはどれか。',
        correct: 'ろ過されるが、再吸収も分泌もされないから',
        wrong: ['ろ過されず、すべて血液中に残るから', 'ろ過されたあと、すべて再吸収されるから', '体内でつくられ、尿中にだけ含まれるから'],
        explanation: 'イヌリンは糸球体でろ過されるが、細尿管や集合管で再吸収も分泌もされない。そのため原尿中のイヌリンはすべて尿中に出るので、原尿量 ＝ 尿量 × イヌリンの濃縮率 で求められる。',
      };
    },
  },
  {
    id: 'b7-structure',
    stage: 'b7',
    level: 1,
    kind: 'term',
    make(rng) {
      const qs = [
        { text: '血液がろ過されて原尿がつくられるのは、腎臓のどこからどこへか。', correct: '糸球体からボーマンのうへ', wrong: ['ボーマンのうから糸球体へ', '細尿管から集合管へ', '集合管から腎う（腎盂）へ'], explanation: '血液は糸球体でろ過され、ボーマンのうへ出たものが原尿である。糸球体は毛細血管が集まった球状の構造で、血圧によって血しょうの成分がこし出されるからである。' },
        { text: '糸球体とボーマンのうをあわせた構造を何というか。', correct: '腎小体', wrong: ['ネフロン', '集合管', '腎う（腎盂）'], explanation: '糸球体とボーマンのうをあわせて腎小体（マルピーギ小体）という。腎小体と細尿管をあわせた単位をネフロン（腎単位）とよび、尿をつくる基本単位なので区別して覚える。' },
        { text: '原尿から水や必要な物質が再吸収される場所の組合せとして正しいものはどれか。', correct: '細尿管（腎細管）と集合管', wrong: ['糸球体とボーマンのう', '輸尿管とぼうこう', '腎小体と輸尿管'], explanation: '原尿中の水・グルコース・無機塩類などは、細尿管と集合管を流れる間に周りの毛細血管へ再吸収される。糸球体とボーマンのうはろ過を行う場所なので、再吸収の場所ではない。' },
      ];
      return rng.pick(qs);
    },
  },
  {
    id: 'b7-hormone',
    stage: 'b7',
    level: 2,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: '体内の水が不足して体液の濃度が上がったときのしくみとして正しいものはどれか。',
          correct: '脳下垂体後葉からバソプレシンの分泌が増え、集合管での水の再吸収が促進されて尿量が減る',
          wrong: ['脳下垂体後葉からバソプレシンの分泌が減り、集合管での水の再吸収が促進されて尿量が減る', '脳下垂体前葉からバソプレシンの分泌が増え、尿量が増える', '副腎皮質から鉱質コルチコイドの分泌が減り、水の再吸収が促進される'],
          explanation: '体液の濃度が上がると、脳下垂体後葉からバソプレシンが多く分泌される。バソプレシンは集合管での水の再吸収を促進するので、尿量が減って体液の濃度が下がる（負のフィードバック）。',
        };
      }
      return {
        text: '腎臓の細尿管でのナトリウムイオンの再吸収を促進するホルモンはどれか。',
        correct: '鉱質コルチコイド（副腎皮質）',
        wrong: ['バソプレシン（脳下垂体後葉）', 'インスリン（すい臓）', 'チロキシン（甲状腺）'],
        explanation: '副腎皮質から分泌される鉱質コルチコイドは、細尿管でのナトリウムイオンの再吸収を促進する。これによって体液中の無機塩類の濃度が調節されるので、体内環境が一定に保たれる。',
      };
    },
  },
  {
    id: 'b7-ratio-graph',
    stage: 'b7',
    level: 2,
    kind: 'graph',
    make(rng) {
      const ids = rng.shuffle(['glucose', 'na', 'urea', 'inulin']);
      const subs = ids.map(substanceById);
      const ratios = subs.map((s) => s.urine / s.plasma);
      const ask = rng.pick(['glucose', 'urea', 'na', 'inulin']);
      const idx = ids.indexOf(ask);
      const why = {
        glucose: '濃縮率が0なので、ろ過されたあとすべて再吸収されたグルコース',
        na: '濃縮率が1に近いので、水と同じくらいの割合で再吸収されたナトリウムイオン',
        urea: '濃縮率が大きいが、再吸収されないイヌリンよりは小さいので、一部が再吸収された尿素',
        inulin: '濃縮率が最も大きいので、まったく再吸収されないイヌリン',
      };
      return {
        text: `図は、グルコース・ナトリウムイオン・尿素・イヌリンのいずれかである物質ア〜エの濃縮率（尿中の濃度 ÷ 血しょう中の濃度）を表したものである。${substanceById(ask).name}はどれか。`,
        chart: {
          x: { min: 0, max: 1 },
          y: { min: 0, max: 140, label: '濃縮率', step: 20 },
          bars: { categories: KATA.slice(0, 4), groups: [{ label: '濃縮率', values: ratios, color: 'c1' }] },
          texts: ratios.map((r, i) => ({ x: (i + 0.5) / 4, y: Math.min(r + 8, 132), text: fmt(r, r < 10 ? 1 : 0) })),
          alt: '物質ア〜エの濃縮率の棒グラフ',
        },
        correct: KATA[idx],
        wrong: KATA.slice(0, 4).filter((k, i) => i !== idx),
        explanation: `${KATA[idx]}は${why[ask]}である。再吸収される割合が大きい物質ほど尿中で濃縮されにくいから、濃縮率の大小から再吸収の程度がわかる。`,
      };
    },
  },
];
