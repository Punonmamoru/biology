// A23 カルビン回路 の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers } from './common.js';
import { at, label, T_CHANGE, T_END, glucoseFromCO2, o2FromGlucose } from '../models/calvin.js';
import { sample } from '../lib/series.js';

const COND = {
  dark: { text: '光を消した', L: 0, C: 1, rubp: '減る', pga: '増える' },
  noco2: { text: '光を当てたまま CO₂ をなくした', L: 1, C: 0, rubp: '増える', pga: '減る' },
};

export const A23 = [
  {
    id: 'a23-change-graph',
    stage: 'a23',
    level: 2,
    kind: 'graph',
    make(rng) {
      const key = rng.pick(['dark', 'noco2']);
      const c = COND[key];
      const rubpIsA = rng.chance(0.5);
      const lab = rubpIsA ? { rubp: KATA[0], pga: KATA[1] } : { rubp: KATA[1], pga: KATA[0] };
      const line = (f, isA) => ({ points: sample(f, 0, T_END, 240), color: isA ? 'c1' : 'c2', dash: isA ? 'solid' : 'dash', width: 3 });
      const fR = (t) => at(t, c.L, c.C).rubp;
      const fP = (t) => at(t, c.L, c.C).pga;
      const reason = key === 'dark' ? 'ATP と NADPH がつくられなくなり、PGA から RuBP をつくる反応が止まる' : 'RuBP に CO₂ を結合させて PGA をつくる反応が止まる';
      return {
        text: `光も CO₂ も十分な条件で光合成をしている緑藻で、図の時刻 ${T_CHANGE} に${c.text}。図のア（実線）・イ（破線）は、RuBP と PGA のいずれかの量の変化である。RuBP はどちらか。理由とともに選べ。`,
        chart: {
          x: { min: 0, max: T_END, label: '時間', ticks: [{ v: T_CHANGE, text: '操作' }] },
          y: { min: 0, max: 10, label: '物質の量（相対値）', ticks: [] },
          series: rubpIsA ? [line(fR, true), line(fP, false)] : [line(fP, true), line(fR, false)],
          vlines: [{ x: T_CHANGE, color: 'muted', dash: 'dot' }],
          alt: `${c.text}あとの RuBP と PGA（ア：実線、イ：破線）`,
        },
        correct: `${lab.rubp}：${reason}から`,
        wrong: [
          `${lab.pga}：${reason}から`,
          `${lab.rubp}：光合成が止まると、すべての物質の量が減るから`,
          `${lab.pga}：光合成が止まると、すべての物質の量が減るから`,
        ],
        ordered: true,
        explanation: `${c.text}ので、${reason}。そのため${key === 'dark' ? 'RuBP が減って PGA が増える' : 'RuBP が増えて PGA が減る'}ので、RuBP は${lab.rubp}である。カルビン回路の2つの反応のうち、片方だけが止まると、その反応の材料がたまり、もう一方の材料が減るからである。`,
      };
    },
  },
  {
    id: 'a23-change-term',
    stage: 'a23',
    level: 2,
    kind: 'term',
    make(rng) {
      const key = rng.pick(['dark', 'noco2']);
      const c = COND[key];
      const opt = (r, p) => `RuBP は${r}、PGA は${p}`;
      const correct = opt(c.rubp, c.pga);
      const all = [opt('増える', '増える'), opt('減る', '減る'), opt('増える', '減る'), opt('減る', '増える'), opt('変わらず', '変わらない')];
      return {
        text: `光も CO₂ も十分な条件で光合成をしている植物で、${c.text}。その直後、葉緑体の中の RuBP と PGA の量はそれぞれどうなるか。`,
        correct,
        wrong: all.filter((x) => x !== correct),
        explanation: key === 'dark'
          ? '光を消すと、チラコイドで ATP と NADPH がつくられなくなるので、PGA を還元して RuBP にもどす反応が止まる。一方、RuBP に CO₂ を結合させて PGA をつくる反応はしばらく続くので、RuBP は減り、PGA は増える。'
          : 'CO₂ がなくなると、RuBP に CO₂ を結合させて PGA をつくる反応が止まる。一方、光があるので ATP と NADPH を使って PGA から RuBP をつくる反応は続くため、RuBP は増え、PGA は減る。',
      };
    },
  },
  {
    id: 'a23-pulse-graph',
    stage: 'a23',
    level: 2,
    kind: 'graph',
    make(rng) {
      const pgaIsA = rng.chance(0.5);
      const lab = pgaIsA ? { pga: KATA[0], sugar: KATA[1] } : { pga: KATA[1], sugar: KATA[0] };
      const line = (f, isA) => ({ points: sample(f, 0.3, 60, 240), color: isA ? 'c1' : 'c2', dash: isA ? 'solid' : 'dash', width: 3 });
      const fP = (t) => label(t).pga;
      const fS = (t) => label(t).sugar;
      return {
        text: '緑藻に ¹⁴C を含む CO₂ を与え、いろいろな時間で反応を止めて、取り込まれた ¹⁴C がどの物質にあるかを調べた。図のア（実線）・イ（破線）は、PGA と、PGA からつくられる糖などのいずれかに含まれる放射能の割合である。PGA はどちらか。理由とともに選べ。',
        chart: {
          x: { min: 0, max: 60, label: '¹⁴CO₂ を与えてからの時間（秒）', step: 10 },
          y: { min: 0, max: 100, label: '放射能の割合（%）', step: 20 },
          series: pgaIsA ? [line(fP, true), line(fS, false)] : [line(fS, true), line(fP, false)],
          alt: '放射能の割合（ア：実線、イ：破線）',
        },
        correct: `${lab.pga}：ごく短い時間では、ほとんどの ¹⁴C がこの物質にあるから`,
        wrong: [
          `${lab.sugar}：ごく短い時間では、ほとんどの ¹⁴C がこの物質にあるから`,
          `${lab.sugar}：時間がたつと、この物質の割合が大きくなるから`,
          `${lab.pga}：時間がたつと、この物質の割合が大きくなるから`,
        ],
        ordered: true,
        explanation: `PGA は${lab.pga}である。CO₂ はまず RuBP と結合して PGA になるので、¹⁴C は最初に PGA に現れ、そのあと PGA からつくられる糖などへ広がっていくからである。`,
      };
    },
  },
  {
    id: 'a23-first-term',
    stage: 'a23',
    level: 1,
    kind: 'term',
    make(rng) {
      const which = rng.pick(['first', 'rubisco']);
      if (which === 'first') {
        return {
          text: '緑藻に ¹⁴C を含む CO₂ を数秒間だけ与えて反応を止めると、¹⁴C が最初に検出される物質はどれか。',
          correct: 'PGA（ホスホグリセリン酸）',
          wrong: ['グルコース', 'RuBP（リブロースビスリン酸）', 'デンプン', 'ATP'],
          explanation: 'カルビン回路では、CO₂ がまず RuBP（C₅）と結合し、2分子の PGA（C₃）ができる。そのため ¹⁴C は最初に PGA に現れ、そのあと糖などに広がる。',
        };
      }
      return {
        text: 'カルビン回路で、RuBP に CO₂ を結合させる反応を触媒する酵素はどれか。',
        correct: 'ルビスコ（RuBisCO）',
        wrong: ['カタラーゼ', 'アミラーゼ', 'ATP 合成酵素', 'DNA ポリメラーゼ'],
        explanation: 'RuBP に CO₂ を結合させる酵素はルビスコで、葉緑体のストロマにある。CO₂ を有機物に取り込む最初の反応を触媒するので、光合成で炭素を固定するのに欠かせない酵素であり、葉に含まれるタンパク質の中で最も多いとされる。',
      };
    },
  },
  {
    id: 'a23-place-term',
    stage: 'a23',
    level: 1,
    kind: 'term',
    make(rng) {
      const which = rng.pick(['stroma', 'thylakoid']);
      if (which === 'stroma') {
        return {
          text: 'カルビン回路の反応が行われる場所はどこか。',
          correct: '葉緑体のストロマ',
          wrong: ['葉緑体のチラコイド膜', 'ミトコンドリアのマトリックス', '細胞質基質', 'ミトコンドリアの内膜'],
          explanation: 'カルビン回路は葉緑体のストロマで行われる。ストロマにはルビスコなどの酵素があり、チラコイドでつくられた ATP と NADPH を使って CO₂ から有機物をつくるからである。',
        };
      }
      return {
        text: 'カルビン回路で PGA を還元するのに使われる ATP と NADPH は、どこでつくられるか。',
        correct: '葉緑体のチラコイド膜（光エネルギーを使う反応）',
        wrong: ['葉緑体のストロマ（カルビン回路の中）', 'ミトコンドリアのマトリックス', '細胞膜'],
        explanation: 'ATP と NADPH は、チラコイド膜で光エネルギーを吸収して進む反応でつくられる。そのため光が当たらなくなると ATP と NADPH が不足し、カルビン回路も止まる。',
      };
    },
  },
  {
    id: 'a23-glucose-calc',
    stage: 'a23',
    level: 2,
    kind: 'calc',
    make(rng) {
      const co2 = rng.pick([66, 88, 132, 264, 396, 528]);
      const ans = glucoseFromCO2(co2);
      const d = distinctNumbers(ans, [(co2 * 180) / 44, (co2 * 44) / 180, co2 / 6, (co2 * 180) / (12 * 44), (co2 * 6 * 44) / 180], ' mg', 1);
      return {
        text: `ある植物が光合成で CO₂ を ${co2} mg 吸収した。これがすべてグルコースになったとすると、つくられたグルコースは何 mg か。光合成の反応式は 6CO₂ ＋ 12H₂O → C₆H₁₂O₆ ＋ 6O₂ ＋ 6H₂O、分子量は CO₂ ＝ 44、グルコース ＝ 180 とする。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `反応式から CO₂ 6分子（6 × 44 ＝ 264）からグルコース 1分子（180）ができるので、${co2} × 180 ÷ 264 ＝ ${fmt(ans, 1)} mg となる。分子の数の比が 6：1 なので、質量は分子量をかけて比べる必要があるからである。`,
      };
    },
  },
  {
    id: 'a23-o2-calc',
    stage: 'a23',
    level: 2,
    kind: 'calc',
    make(rng) {
      const glc = rng.pick([45, 90, 180, 270, 360]);
      const ans = o2FromGlucose(glc);
      const d = distinctNumbers(ans, [(glc * 32) / 180, (glc * 12 * 32) / 180, (glc * 180) / 192, glc, (glc * 6 * 44) / 180], ' mg', 1);
      return {
        text: `ある植物が光合成でグルコースを ${glc} mg つくった。このとき発生した O₂ は何 mg か。光合成の反応式は 6CO₂ ＋ 12H₂O → C₆H₁₂O₆ ＋ 6O₂ ＋ 6H₂O、分子量はグルコース ＝ 180、O₂ ＝ 32 とする。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `グルコース 1分子（180）ができるとき O₂ が 6分子（6 × 32 ＝ 192）発生するので、${glc} × 192 ÷ 180 ＝ ${fmt(ans, 1)} mg となる。反応式の係数の比が分子の数の比を表しているからである。`,
      };
    },
  },
  {
    id: 'a23-pga-calc',
    stage: 'a23',
    level: 1,
    kind: 'calc',
    make(rng) {
      const ask = rng.pick(['pga', 'co2']);
      if (ask === 'pga') {
        const n = rng.pick([3, 6, 12, 18, 30]);
        const d = distinctNumbers(2 * n, [n, 3 * n, n / 2, 5 * n, 6 * n], ' 分子', 0);
        return {
          text: `カルビン回路で、RuBP（炭素数5）が CO₂ を1分子ずつ取り込むと、PGA（炭素数3）ができる。CO₂ を ${n} 分子固定したとき、できる PGA は何分子か。`,
          correct: d.correct,
          wrong: d.wrong,
          explanation: `RuBP 1分子（C₅）と CO₂ 1分子（C₁）から、PGA 2分子（C₃ × 2 ＝ C₆）ができるので、${n} × 2 ＝ ${2 * n} 分子となる。反応の前後で炭素の数は 5 ＋ 1 ＝ 3 × 2 のように変わらないからである。`,
        };
      }
      const k = rng.pick([1, 2, 3, 5, 10]);
      const d = distinctNumbers(6 * k, [k, 3 * k, 12 * k, 2 * k, 18 * k], ' 分子', 0);
      return {
        text: `カルビン回路でグルコース（C₆H₁₂O₆）を ${k} 分子つくるのに、固定する必要がある CO₂ は何分子か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `グルコース 1分子は炭素を6個含み、CO₂ 1分子は炭素を1個含むので、${k} × 6 ＝ ${6 * k} 分子となる。グルコースの炭素はすべて、カルビン回路で固定された CO₂ に由来するからである。`,
      };
    },
  },
  {
    id: 'a23-light-calc',
    stage: 'a23',
    level: 3,
    kind: 'calc',
    make(rng) {
      // 見かけの光合成速度と呼吸速度から、光合成でつくられたグルコースを求める
      const app = rng.pick([22, 44, 66, 88]);
      const resp = rng.pick([11, 22]);
      const h = rng.pick([2, 3, 5, 10]);
      const co2 = (app + resp) * h;
      const ans = glucoseFromCO2(co2);
      const d = distinctNumbers(ans, [glucoseFromCO2(app * h), glucoseFromCO2((app - resp) * h), glucoseFromCO2(app + resp), (co2 * 180) / 44, glucoseFromCO2(resp * h), co2, glucoseFromCO2(co2) * 6], ' mg', 1);
      return {
        text: `ある植物の葉で、光を当てたときの CO₂ 吸収速度（見かけの光合成速度）が 1時間あたり ${app} mg、暗所での CO₂ 放出速度（呼吸速度）が 1時間あたり ${resp} mg であった。同じ光を ${h} 時間当てたとき、光合成でつくられたグルコースは何 mg か（分子量 CO₂ ＝ 44、グルコース ＝ 180）。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `光合成で固定した CO₂ は（見かけの光合成速度 ＋ 呼吸速度）× 時間 ＝ (${app} ＋ ${resp}) × ${h} ＝ ${co2} mg なので、グルコースは ${co2} × 180 ÷ 264 ＝ ${fmt(ans, 1)} mg となる。光を当てている間も呼吸は続いており、見かけの吸収量には呼吸で出た CO₂ の分が差し引かれているからである。`,
      };
    },
  },
];
