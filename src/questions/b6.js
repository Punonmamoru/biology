// B6 酸素解離曲線 の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers } from './common.js';
import { saturation, LUNG } from '../models/oxygen.js';
import { sample } from '../lib/series.js';

function curves(co2s, labels, styles = [{ color: 'c1', dash: 'solid' }, { color: 'c2', dash: 'dash' }]) {
  return co2s.map((c, i) => ({ points: sample((p) => saturation(p, c), 0, 100, 200), ...styles[i], width: 3, label: labels[i], labelAt: i === 0 ? 22 : 66 }));
}

const releaseText = (sL, sT) => `（${sL} − ${sT}）÷ ${sL} × 100`;

export const B6 = [
  {
    id: 'b6-release-calc',
    stage: 'b6',
    level: 2,
    kind: 'calc',
    make(rng) {
      const sL = rng.int(90, 95);
      const sT = rng.pick([20, 25, 30, 35, 40, 45, 50]);
      const ans = ((sL - sT) / sL) * 100;
      const d = distinctNumbers(ans, [sL - sT, (sT / sL) * 100, ans + 10, ans - 10, 100 - sT].filter((v) => v < 100 && Math.abs(v - ans) >= 2), '%', 0);
      return {
        text: `肺胞では酸素ヘモグロビンの割合が ${sL}%、ある組織では ${sT}% であった。肺で酸素と結合していたヘモグロビンのうち、この組織で酸素を放出したものは何%か（小数第1位を四捨五入）。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `放出した割合 ＝ ${releaseText(sL, sT)} ≒ ${fmt(ans, 0)}% となる。組織で酸素を離したのは ${sL}% のうち ${sL - sT}% 分で、問われているのは「肺で結合していたもの」に対する割合だから、肺での割合 ${sL}% でわる。`,
      };
    },
  },
  {
    id: 'b6-graph-release',
    stage: 'b6',
    level: 3,
    kind: 'graph',
    make(rng) {
      const tisO2 = rng.pick([20, 25, 30, 35, 40]);
      const tisCO2 = 70;
      const sL = Math.round(saturation(LUNG.pO2, LUNG.pCO2));
      const sT = Math.round(saturation(tisO2, tisCO2));
      const ans = ((sL - sT) / sL) * 100;
      const sWrongCurve = Math.round(saturation(tisO2, LUNG.pCO2));
      const d = distinctNumbers(ans, [((sL - sWrongCurve) / sL) * 100, sL - sT, (sT / sL) * 100, 100 - ans + 10], '%', 0);
      return {
        text: `図は、CO₂分圧が ${LUNG.pCO2} と ${tisCO2} のときの酸素解離曲線である（分圧はいずれも相対値）。肺胞（O₂分圧 ${LUNG.pO2}、CO₂分圧 ${LUNG.pCO2}）で酸素と結合していたヘモグロビンのうち、組織（O₂分圧 ${tisO2}、CO₂分圧 ${tisCO2}）で酸素を放出したものはおよそ何%か。図中の横線の値を使って求めよ。`,
        chart: {
          x: { min: 0, max: 100, label: 'O₂分圧（相対値）', step: 10 },
          y: { min: 0, max: 100, label: '酸素ヘモグロビン（%）', step: 20 },
          series: curves([LUNG.pCO2, tisCO2], [`CO₂ ${LUNG.pCO2}`, `CO₂ ${tisCO2}`]),
          hlines: [
            { y: sL, color: 'c1', dash: 'dot', width: 1, label: `${sL}%` },
            { y: sT, color: 'c2', dash: 'dot', width: 1, label: `${sT}%`, align: 'right' },
            { y: sWrongCurve, color: 'muted', dash: 'dot', width: 1, label: `${sWrongCurve}%`, align: 'right' },
          ],
          vlines: [{ x: tisO2, color: 'muted', dash: 'dot' }],
          alt: 'CO₂分圧の異なる2本の酸素解離曲線',
        },
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `肺胞はCO₂ ${LUNG.pCO2} の曲線から ${sL}%、組織はCO₂ ${tisCO2} の曲線から ${sT}% と読むので、${releaseText(sL, sT)} ≒ ${fmt(ans, 0)}% となる。組織ではCO₂分圧が高いから、CO₂ ${tisCO2} の曲線（右側の曲線）を読まなければならない。`,
      };
    },
  },
  {
    id: 'b6-read-curve',
    stage: 'b6',
    level: 1,
    kind: 'graph',
    make(rng) {
      const p = rng.pick([20, 30, 40, 50, 60]);
      const v = saturation(p, LUNG.pCO2);
      const r = Math.round(v / 5) * 5;
      const opts = [r - 40, r - 25, r + 25, r - 15, r + 15].filter((x) => x >= 5 && x <= 100);
      const d = distinctNumbers(r, opts, '%', 0);
      return {
        text: `図はCO₂分圧 ${LUNG.pCO2}（相対値）のときの酸素解離曲線である。O₂分圧（相対値）が ${p} のとき、酸素ヘモグロビンの割合はおよそ何%か。`,
        chart: {
          x: { min: 0, max: 100, label: 'O₂分圧（相対値）', step: 10 },
          y: { min: 0, max: 100, label: '酸素ヘモグロビン（%）', step: 10 },
          series: curves([LUNG.pCO2], [`CO₂ ${LUNG.pCO2}`]),
          vlines: [{ x: p, color: 'muted', dash: 'dot', label: `${p}` }],
          alt: '酸素解離曲線',
        },
        correct: '約' + d.correct,
        wrong: d.wrong.slice(0, 4).map((s) => '約' + s),
        explanation: `O₂分圧 ${p} の縦線と曲線の交点を横に読むと、約 ${r}% である。酸素解離曲線は、各O₂分圧でヘモグロビンのうち何%が酸素と結合しているかを表したグラフだから、交点の縦軸の値を読めばよい。`,
      };
    },
  },
  {
    id: 'b6-which-tissue',
    stage: 'b6',
    level: 2,
    kind: 'graph',
    make(rng) {
      const order = rng.shuffle([LUNG.pCO2, 70]);
      const highIdx = order.indexOf(70);
      const lab = KATA.slice(0, 2);
      return {
        text: '図のア・イは、CO₂分圧だけを変えて測定した酸素解離曲線である。CO₂分圧が高い（組織に近い）条件の曲線はどちらか。理由とともに選べ。',
        chart: {
          x: { min: 0, max: 100, label: 'O₂分圧（相対値）', step: 10 },
          y: { min: 0, max: 100, label: '酸素ヘモグロビン（%）', step: 20 },
          series: order.map((c, i) => ({ points: sample((p) => saturation(p, c), 0, 100, 200), color: i ? 'c2' : 'c1', dash: i ? 'dash' : 'solid', width: 3, label: lab[i], labelAt: c === 70 ? 60 : 28 })),
          alt: '2本の酸素解離曲線ア・イ',
        },
        correct: `${lab[highIdx]}：同じO₂分圧で酸素ヘモグロビンの割合が小さい（右にある）から`,
        wrong: [
          `${lab[1 - highIdx]}：同じO₂分圧で酸素ヘモグロビンの割合が大きい（左にある）から`,
          `${lab[1 - highIdx]}：同じO₂分圧で酸素ヘモグロビンの割合が小さい（右にある）から`,
          `${lab[highIdx]}：同じO₂分圧で酸素ヘモグロビンの割合が大きい（左にある）から`,
        ],
        explanation: `CO₂分圧が高い条件の曲線は${lab[highIdx]}である。CO₂分圧が高いとヘモグロビンは酸素を離しやすくなるため、同じO₂分圧でも酸素ヘモグロビンの割合が小さくなり、曲線は右にずれる。`,
      };
    },
  },
  {
    id: 'b6-shift-term',
    stage: 'b6',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: 'CO₂分圧が高いときの酸素解離曲線の変化と、その意味として正しいものはどれか。',
        correct: '曲線が右にずれ、CO₂を多く出す組織で酸素を離しやすくなる',
        wrong: ['曲線が左にずれ、CO₂を多く出す組織で酸素を離しやすくなる', '曲線が右にずれ、CO₂を多く出す組織で酸素と結合しやすくなる', '曲線は変わらず、O₂分圧だけで酸素ヘモグロビンの割合が決まる'],
        explanation: 'CO₂分圧が高いと曲線は右にずれ、同じO₂分圧でも酸素ヘモグロビンの割合が小さくなる。さかんに呼吸してCO₂を多く出している組織ほど、ヘモグロビンが酸素を離しやすいので、多くの酸素を受け取れる。',
      };
    },
  },
  {
    id: 'b6-s-shape',
    stage: 'b6',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '酸素解離曲線がS字形であることの利点として最も適当なものはどれか。',
        correct: '組織程度の低いO₂分圧の範囲で、わずかな分圧の低下によって多くの酸素を放出できる',
        wrong: ['O₂分圧が低いほど、ヘモグロビンが酸素と強く結合できる', 'O₂分圧が0になるまで、ヘモグロビンが酸素をまったく離さない', '肺胞のO₂分圧が少し下がるだけで、肺で酸素と結合できなくなる'],
        explanation: 'S字形の曲線は、組織のO₂分圧にあたる範囲で傾きが大きい。そのため組織のO₂分圧がわずかに下がるだけで酸素ヘモグロビンの割合が大きく下がり、多くの酸素を放出できる一方、肺胞付近の高い分圧の範囲は平らなので、肺ではほぼ飽和まで酸素と結合できる。',
      };
    },
  },
  {
    id: 'b6-volume-calc',
    stage: 'b6',
    level: 3,
    kind: 'calc',
    make(rng) {
      const full = 20;
      const sL = rng.pick([95, 96, 98]);
      const sT = rng.pick([20, 30, 40, 50, 60]);
      const ans = (full * (sL - sT)) / 100;
      const d = distinctNumbers(ans, [(full * sL) / 100, (full * sT) / 100, ((sL - sT) / sL) * full, (full * (100 - sT)) / 100, ans * 2], ' mL', 1);
      return {
        text: `血液100 mL中のヘモグロビンがすべて酸素ヘモグロビンになると、酸素を ${full} mL 運べるとする。肺胞での酸素ヘモグロビンの割合が ${sL}%、組織では ${sT}% のとき、血液100 mL が組織で放出する酸素は何 mL か。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `組織で酸素を離したのは全ヘモグロビンの（${sL} − ${sT}）＝ ${sL - sT}% なので、${full} × ${sL - sT}／100 ＝ ${fmt(ans, 1)} mL となる。ここでは血液に含まれる全ヘモグロビンに対する量を求めるから、肺での割合でわる必要はない。`,
      };
    },
  },
  {
    id: 'b6-hb-term',
    stage: 'b6',
    level: 1,
    kind: 'term',
    make(rng) {
      const qs = [
        { text: 'ヘモグロビンを含み、酸素の運搬を行う血液の成分はどれか。', correct: '赤血球', wrong: ['白血球', '血小板', '血しょう'], explanation: '酸素を運ぶのは赤血球である。赤血球には鉄を含むタンパク質であるヘモグロビンが多量に含まれ、ヘモグロビンが酸素と結合するからである。' },
        { text: '酸素分圧の高い肺胞で、ヘモグロビンが酸素と結合したものを何というか。', correct: '酸素ヘモグロビン', wrong: ['ミオグロビン', 'フィブリン', 'グリコーゲン'], explanation: 'ヘモグロビンが酸素と結合したものを酸素ヘモグロビンという。酸素分圧の高い肺胞ではヘモグロビンが酸素と結合し、酸素分圧の低い組織では酸素を離すから、酸素を肺から組織へ運べる。' },
        { text: '肺胞と組織の酸素分圧の関係として正しいものはどれか。', correct: '肺胞のほうが高いので、肺胞で酸素と結合し組織で離す', wrong: ['組織のほうが高いので、組織で酸素と結合し肺胞で離す', '同じなので、酸素ヘモグロビンの割合は変わらない', '肺胞のほうが高いが、組織では酸素を離さない'], explanation: '肺胞は外気に近いため酸素分圧が高く、組織は呼吸で酸素を消費するので酸素分圧が低い。この差によって、ヘモグロビンは肺胞で酸素と結合し、組織で酸素を離す。' },
      ];
      return rng.pick(qs);
    },
  },
  {
    id: 'b6-exercise',
    stage: 'b6',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '激しい運動をしている筋肉では、安静時に比べてヘモグロビンからの酸素の放出がどうなるか。理由とともに最も適当なものを選べ。',
        correct: '増える。筋肉のO₂分圧が下がり、CO₂分圧が上がるから',
        wrong: ['減る。筋肉のO₂分圧が上がり、CO₂分圧が下がるから', '増える。筋肉のO₂分圧が上がるから', '変わらない。酸素の放出は肺胞のO₂分圧だけで決まるから'],
        explanation: '運動中の筋肉は呼吸で酸素を多く使い、CO₂を多く出す。O₂分圧が下がるうえに、CO₂分圧が上がって曲線が右にずれるので、酸素ヘモグロビンの割合がさらに下がり、多くの酸素が放出される。',
      };
    },
  },
  {
    id: 'b6-fetal',
    stage: 'b6',
    level: 3,
    kind: 'graph',
    make(rng) {
      const fetalFirst = rng.chance(0.5);
      const lab = KATA.slice(0, 2);
      const fetalIdx = fetalFirst ? 0 : 1;
      const curve = (shift) => (p) => saturation(p, LUNG.pCO2 + shift);
      const fns = fetalFirst ? [curve(-22), curve(0)] : [curve(0), curve(-22)];
      return {
        text: '【発展】図のア・イは、同じ条件で測定した母親（おとな）のヘモグロビンと胎児のヘモグロビンの酸素解離曲線である。胎盤で母親の血液から胎児の血液へ酸素が渡されることから考えて、胎児のヘモグロビンの曲線はどちらか。',
        chart: {
          x: { min: 0, max: 100, label: 'O₂分圧（相対値）', step: 10 },
          y: { min: 0, max: 100, label: '酸素ヘモグロビン（%）', step: 20 },
          series: fns.map((f, i) => ({ points: sample(f, 0, 100, 200), color: i ? 'c2' : 'c1', dash: i ? 'dash' : 'solid', width: 3, label: lab[i], labelAt: i === fetalIdx ? 14 : 42 })),
          alt: '2本の酸素解離曲線ア・イ',
        },
        correct: `${lab[fetalIdx]}：同じO₂分圧で酸素と結合しやすい（左にある）から`,
        wrong: [`${lab[1 - fetalIdx]}：同じO₂分圧で酸素を離しやすい（右にある）から`, `${lab[1 - fetalIdx]}：同じO₂分圧で酸素と結合しやすい（左にある）から`, `${lab[fetalIdx]}：同じO₂分圧で酸素を離しやすい（右にある）から`],
        explanation: `胎児のヘモグロビンは${lab[fetalIdx]}で、母親のヘモグロビンより左にある。胎盤の同じO₂分圧で、母親のヘモグロビンが離した酸素を胎児のヘモグロビンが受け取るには、胎児のほうが酸素と結合しやすくなければならないからである。`,
      };
    },
  },
];
