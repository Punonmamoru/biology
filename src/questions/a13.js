// A13 生態系の物質生産 の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers } from './common.js';
import { forest } from '../models/production.js';
import { sample } from '../lib/series.js';

export const A13 = [
  {
    id: 'a13-net',
    stage: 'a13',
    level: 1,
    kind: 'calc',
    make(rng) {
      const gross = rng.pick([800, 1000, 1200, 1500, 2000]);
      const resp = gross * rng.pick([0.4, 0.5, 0.55, 0.6]);
      const ans = gross - resp;
      const d = distinctNumbers(ans, [gross + resp, resp, gross, ans / 2, gross - resp / 2], '', 0);
      return {
        text: `ある森林の生産者の総生産量は ${gross}、呼吸量は ${fmt(resp, 0)} であった（単位はいずれも g/(m²・年)）。純生産量はいくらか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `純生産量 ＝ 総生産量 − 呼吸量 ＝ ${gross} − ${fmt(resp, 0)} ＝ ${fmt(ans, 0)} である。光合成でつくった有機物（総生産量）の一部は、生産者自身の呼吸で使われてしまうからである。`,
      };
    },
  },
  {
    id: 'a13-growth',
    stage: 'a13',
    level: 2,
    kind: 'calc',
    make(rng) {
      const net = rng.pick([400, 500, 600, 800]);
      const grazed = net * rng.pick([0.05, 0.1, 0.15, 0.2]);
      const dead = net * rng.pick([0.3, 0.4, 0.5]);
      const ans = net - grazed - dead;
      const d = distinctNumbers(ans, [net - grazed, net - dead, net + grazed + dead, grazed + dead, net - grazed + dead], '', 0);
      return {
        text: `ある生産者の純生産量は ${net}、被食量は ${fmt(grazed, 0)}、枯死量は ${fmt(dead, 0)} であった（相対値）。成長量はいくらか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `成長量 ＝ 純生産量 −（被食量 ＋ 枯死量）＝ ${net} − (${fmt(grazed, 0)} ＋ ${fmt(dead, 0)}) ＝ ${fmt(ans, 0)} である。純生産量のうち、動物に食べられた分と枯れ落ちた分を除いた残りが、生産者の体として増えた分になるからである。`,
      };
    },
  },
  {
    id: 'a13-consumer',
    stage: 'a13',
    level: 2,
    kind: 'calc',
    make(rng) {
      const intake = rng.pick([100, 150, 200, 250]);
      const undig = intake * rng.pick([0.2, 0.3, 0.4]);
      const resp = Math.round((intake - undig) * rng.pick([0.5, 0.6, 0.7]));
      const ask = rng.pick(['assim', 'prod']);
      const assim = intake - undig;
      const ans = ask === 'assim' ? assim : assim - resp;
      const d = distinctNumbers(ans, [intake - resp, intake - undig - resp, intake - undig, intake + undig, assim + resp, undig + resp], '', 0);
      return {
        text: `ある一次消費者の摂食量は ${intake}、不消化排出量は ${fmt(undig, 0)}、呼吸量は ${fmt(resp, 0)} であった（相対値）。この一次消費者の${ask === 'assim' ? '同化量' : '生産量'}はいくらか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: ask === 'assim'
          ? `同化量 ＝ 摂食量 − 不消化排出量 ＝ ${intake} − ${fmt(undig, 0)} ＝ ${fmt(ans, 0)} である。食べた物のうち、消化・吸収されずにふんとして出た分は、体に取り込まれていないからである。`
          : `同化量 ＝ ${intake} − ${fmt(undig, 0)} ＝ ${fmt(assim, 0)}、生産量 ＝ 同化量 − 呼吸量 ＝ ${fmt(assim, 0)} − ${fmt(resp, 0)} ＝ ${fmt(ans, 0)} である。生産者の純生産量と同じように、取り込んだ分から自分の呼吸で使った分を差し引くからである。`,
      };
    },
  },
  {
    id: 'a13-efficiency',
    stage: 'a13',
    level: 2,
    kind: 'calc',
    make(rng) {
      const g = rng.pick([1000, 2000, 5000]);
      const a1 = g * rng.pick([0.05, 0.08, 0.1, 0.12, 0.15]);
      const a2 = a1 * rng.pick([0.1, 0.15, 0.2]);
      const ask = rng.pick(['c1', 'c2']);
      const ans = ask === 'c1' ? (a1 / g) * 100 : (a2 / a1) * 100;
      const d = distinctNumbers(ans, [(a2 / g) * 100, ask === 'c1' ? (a2 / a1) * 100 : (a1 / g) * 100, ans * 2, ans / 2, ans * 10], ' %', 1);
      return {
        text: `ある生態系で、生産者の総生産量は ${g}、一次消費者の同化量は ${fmt(a1, 0)}、二次消費者の同化量は ${fmt(a2, 1)} であった（相対値）。${ask === 'c1' ? '一次消費者' : '二次消費者'}のエネルギー効率は何%か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: ask === 'c1'
          ? `一次消費者のエネルギー効率 ＝ 一次消費者の同化量 ÷ 生産者の総生産量 × 100 ＝ ${fmt(a1, 0)} ÷ ${g} × 100 ＝ ${fmt(ans, 1)}% である。エネルギー効率は、1つ前の栄養段階の同化量（生産者では総生産量）のうち、どれだけが次の段階に同化されたかを表すからである。`
          : `二次消費者のエネルギー効率 ＝ 二次消費者の同化量 ÷ 一次消費者の同化量 × 100 ＝ ${fmt(a2, 1)} ÷ ${fmt(a1, 0)} × 100 ＝ ${fmt(ans, 1)}% である。エネルギー効率は1つ前の栄養段階の同化量を基準にするので、生産者の総生産量で割ってはいけないからである。`,
      };
    },
  },
  {
    id: 'a13-producer-eff',
    stage: 'a13',
    level: 3,
    kind: 'calc',
    make(rng) {
      const light = rng.pick([500000, 600000, 800000, 1000000]);
      const gross = light * rng.pick([0.005, 0.008, 0.01, 0.012, 0.02]);
      const ans = (gross / light) * 100;
      const d = distinctNumbers(ans, [ans * 10, ans / 10, ans * 100, (light / gross) / 100, ans * 2], ' %', 2);
      return {
        text: `ある草原に1年間に入射した光エネルギーは ${light.toLocaleString('ja-JP')} kJ/m²、生産者の総生産量はエネルギーにして ${gross.toLocaleString('ja-JP')} kJ/m² であった。生産者のエネルギー効率は何%か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `生産者のエネルギー効率 ＝ 総生産量 ÷ 入射した光エネルギー × 100 ＝ ${gross.toLocaleString('ja-JP')} ÷ ${light.toLocaleString('ja-JP')} × 100 ＝ ${fmt(ans, 2)}% である。入射した光の多くは反射されたり、光合成に使われずに熱になったりするので、生産者のエネルギー効率はふつう数%以下と小さいからである。`,
      };
    },
  },
  {
    id: 'a13-forest-graph',
    stage: 'a13',
    level: 2,
    kind: 'graph',
    make(rng) {
      const order = rng.shuffle(['gross', 'resp', 'net']);
      const ask = rng.pick(['net', 'resp']);
      const idx = order.indexOf(ask);
      const styles = [['c1', 'solid'], ['c2', 'dash'], ['c3', 'dot']];
      const name = { gross: '総生産量', resp: '呼吸量', net: '純生産量' };
      return {
        text: `図のア〜ウは、森林の林齢と、生産者の総生産量・呼吸量・純生産量の関係を表した模式図である。${name[ask]}を表すのはどれか。`,
        chart: {
          x: { min: 0, max: 150, label: '林齢（年）', step: 25 },
          y: { min: 0, max: 120, label: '量（相対値）', step: 20 },
          series: order.map((k, i) => ({ points: sample((t) => forest(t)[k], 0, 150, 300), color: styles[i][0], dash: styles[i][1], width: 3, label: KATA[i], labelAt: k === 'net' ? 130 : 145 })),
          alt: '林齢と物質生産の3本の曲線ア〜ウ',
        },
        correct: KATA[idx],
        wrong: KATA.slice(0, 3).concat(['ア〜ウのどれでもない']),
        explanation: ask === 'net'
          ? `純生産量は${KATA[idx]}で、若い森林で大きく、林齢が進むと小さくなる。総生産量はやがてほぼ一定になるのに、幹や枝など光合成をしない部分の呼吸量が増え続けるからである。`
          : `呼吸量は${KATA[idx]}で、林齢とともに増え続ける。幹や枝・根などの光合成をしない部分（非同化器官）が増え続け、その呼吸が増えるからである。`,
      };
    },
  },
  {
    id: 'a13-bars',
    stage: 'a13',
    level: 2,
    kind: 'graph',
    make(rng) {
      const g = 1000;
      const a1 = rng.pick([60, 80, 100, 120, 150]);
      const a2 = rng.pick([6, 8, 10, 12, 15, 20]);
      const ans = (a2 / a1) * 100;
      const d = distinctNumbers(ans, [(a2 / g) * 100, (a1 / g) * 100, ans * 2, ans / 2, (a1 / a2)], ' %', 1);
      return {
        text: '図は、ある生態系の各栄養段階の同化量（生産者は総生産量）を表している。二次消費者のエネルギー効率は何%か。',
        chart: {
          x: { min: 0, max: 1 },
          y: { min: 0, max: 1100, label: '同化量（相対値）', step: 200 },
          bars: { categories: ['生産者', '一次消費者', '二次消費者'], groups: [{ values: [g, a1, a2], color: 'c1', label: '同化量' }] },
          texts: [{ x: 0.5, y: a1 + 120, text: String(a1) }, { x: 0.833, y: a2 + 120, text: String(a2) }, { x: 0.167, y: g + 50, text: String(g) }],
          alt: `生産者 ${g}、一次消費者 ${a1}、二次消費者 ${a2}`,
        },
        correct: d.correct,
        wrong: d.wrong,
        explanation: `二次消費者のエネルギー効率 ＝ ${a2} ÷ ${a1} × 100 ＝ ${fmt(ans, 1)}% である。1つ前の栄養段階（一次消費者）の同化量を基準にするので、生産者の総生産量で割らないようにしなければならないからである。`,
      };
    },
  },
  {
    id: 'a13-flow-term',
    stage: 'a13',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: '生態系での物質とエネルギーの移動について正しいものはどれか。',
        correct: '炭素などの物質は生態系の中を循環するが、エネルギーは循環せず、最終的に熱として生態系の外へ出ていく',
        wrong: ['物質もエネルギーも生態系の中を循環する', 'エネルギーは生態系の中を循環するが、物質は循環しない', '上の栄養段階ほど、利用できるエネルギーは多くなる'],
        explanation: '光エネルギーは光合成で化学エネルギーとして有機物にたくわえられ、食物連鎖を通じて移動するが、各段階の呼吸などで熱として失われる。熱エネルギーは生産者が再び利用できないので、エネルギーは循環せず、太陽から供給され続ける必要がある。',
      };
    },
  },
  {
    id: 'a13-terms',
    stage: 'a13',
    level: 1,
    kind: 'term',
    make(rng) {
      const which = rng.pick(['undig', 'net', 'dead']);
      const Q = {
        undig: { text: '消費者が食べた有機物のうち、消化・吸収されずにふんとして体外に出たものを何というか。', correct: '不消化排出量' },
        net: { text: '生産者が光合成でつくった有機物の総量から、生産者自身の呼吸で消費した量を差し引いたものを何というか。', correct: '純生産量' },
        dead: { text: '生産者の純生産量のうち、落葉・落枝などとして失われた量を何というか。', correct: '枯死量' },
      }[which];
      return {
        text: Q.text,
        correct: Q.correct,
        wrong: ['不消化排出量', '純生産量', '枯死量', '総生産量', '同化量', '成長量'],
        explanation: `これを${Q.correct}という。なお、生産者では 純生産量 ＝ 成長量 ＋ 被食量 ＋ 枯死量、消費者では 同化量 ＝ 摂食量 − 不消化排出量 の関係があるので、どの量がどこに含まれるかを区別して計算する。`,
      };
    },
  },
];
