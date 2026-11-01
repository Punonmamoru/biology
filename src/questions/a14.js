// A14 シナプスと興奮の統合 の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers, assignmentQuestion } from './common.js';
import { potential, buildInputs, REST, THRESHOLD } from '../models/synapse.js';
import { sample } from '../lib/series.js';

const mv = (v) => String(v).replace('-', '−');

export const A14 = [
  {
    id: 'a14-one-way',
    stage: 'a14',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: 'シナプスでは、興奮はシナプス前細胞からシナプス後細胞への一方向にしか伝わらない。この理由として最も適当なものはどれか。',
        correct: '神経伝達物質はシナプス前細胞の末端からだけ放出され、その受容体はシナプス後細胞の膜にあるから',
        wrong: ['シナプス後細胞の末端からも神経伝達物質が放出されるから', '軸索では興奮が一方向にしか伝導しないから', 'シナプス間隙では活動電位がそのまま伝わるから'],
        explanation: '神経伝達物質を含むシナプス小胞は軸索の末端（シナプス前細胞）にあり、受容体はシナプス後細胞の膜にある。そのため伝達物質はシナプス前細胞からシナプス後細胞へしか作用しないので、興奮の伝達は一方向になる。',
      };
    },
  },
  {
    id: 'a14-epsp-ipsp',
    stage: 'a14',
    level: 2,
    kind: 'term',
    make(rng) {
      const e = rng.chance(0.5);
      return e
        ? {
          text: '興奮性シナプスで、シナプス後細胞に興奮性シナプス後電位（EPSP）が生じるしくみとして正しいものはどれか。',
          correct: '神経伝達物質が受容体に結合し、Na⁺ などの陽イオンが流入して脱分極する',
          wrong: ['神経伝達物質が受容体に結合し、Cl⁻ が流入して過分極する', '神経伝達物質がシナプス後細胞の中に入り、ATPをつくる', 'シナプス前細胞の活動電位が、そのままシナプス後細胞に流れ込む'],
          explanation: '神経伝達物質が受容体（イオンチャネル）に結合すると、Na⁺ などの陽イオンが流入して膜電位が上がる（EPSP）。EPSPが加重して閾値に達すると、シナプス後細胞に活動電位が生じるからである。',
        }
        : {
          text: '抑制性シナプスで、シナプス後細胞に抑制性シナプス後電位（IPSP）が生じるしくみとして正しいものはどれか。',
          correct: '神経伝達物質が受容体に結合し、Cl⁻ が流入するなどして過分極する',
          wrong: ['神経伝達物質が受容体に結合し、Na⁺ が流入して脱分極する', '神経伝達物質がシナプス前細胞にもどり、放出が止まる', 'シナプス後細胞のナトリウムポンプが止まり、静止電位がなくなる'],
          explanation: '抑制性の神経伝達物質（GABA など）が受容体に結合すると、Cl⁻ が流入するなどして膜電位が下がる（IPSP）。膜電位が閾値から遠ざかるので、シナプス後細胞は興奮しにくくなる。',
        };
    },
  },
  {
    id: 'a14-sum-calc',
    stage: 'a14',
    level: 2,
    kind: 'calc',
    make(rng) {
      const e = rng.pick([4, 5, 6, 8]);
      const need = THRESHOLD - REST;
      const ans = Math.ceil(need / e);
      const d = distinctNumbers(ans, [Math.floor(need / e), ans + 1, need, Math.round(70 / e), ans * 2], ' 個', 0);
      return {
        text: `あるシナプス後細胞の静止電位は ${mv(REST)} mV、閾値は ${mv(THRESHOLD)} mV である。1つのシナプスからの EPSP が ${e} mV の脱分極を起こすとき、閾値に達するには、同時にいくつのシナプスから EPSP が生じる必要があるか（EPSP は単純に足し合わされるものとする）。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `閾値までに必要な脱分極は ${mv(THRESHOLD)} − (${mv(REST)}) ＝ ${need} mV で、${need} ÷ ${e} ＝ ${fmt(need / e, 2)} だから、${ans} 個以上必要である。複数のシナプスから同時に入力があると EPSP が足し合わされる（空間的加重）ので、1つでは閾値に届かなくても興奮が起こるのである。`,
      };
    },
  },
  {
    id: 'a14-ei-calc',
    stage: 'a14',
    level: 3,
    kind: 'calc',
    make(rng) {
      const e = rng.pick([6, 8]);
      const i = rng.pick([4, 5]);
      const nE = rng.pick([2, 3, 4]);
      const nI = rng.pick([1, 2]);
      const v = REST + nE * e - nI * i;
      const fire = v >= THRESHOLD;
      return {
        text: `静止電位 ${mv(REST)} mV、閾値 ${mv(THRESHOLD)} mV のシナプス後細胞に、${e} mV の EPSP を起こすシナプス ${nE} つと、${i} mV の IPSP を起こすシナプス ${nI} つから同時に入力があった。膜電位は何 mV になり、活動電位は生じるか（電位の変化は単純に足し合わされるものとする）。`,
        correct: `${mv(v)} mV で、活動電位は${fire ? '生じる' : '生じない'}`,
        wrong: [`${mv(v)} mV で、活動電位は${fire ? '生じない' : '生じる'}`, `${mv(REST + nE * e)} mV で、活動電位は生じる`, `${mv(REST + nE * e + nI * i)} mV で、活動電位は生じる`, `${mv(REST - nE * e + nI * i)} mV で、活動電位は生じない`],
        explanation: `${mv(REST)} ＋ ${e} × ${nE} − ${i} × ${nI} ＝ ${mv(v)} mV となり、閾値 ${mv(THRESHOLD)} mV ${fire ? '以上なので活動電位が生じる' : 'に達しないので活動電位は生じない'}。EPSP は膜電位を上げ、IPSP は下げるので、両方の和で興奮するかどうかが決まるからである。`,
      };
    },
  },
  {
    id: 'a14-summation-graph',
    stage: 'a14',
    level: 2,
    kind: 'graph',
    make(rng) {
      const kind = rng.pick(['temporal', 'spatial']);
      const inputs = kind === 'temporal' ? buildInputs({ nA: 2, interval: 2 }) : buildInputs({ nA: 1, useB: true });
      return {
        text: `図は、シナプス後細胞の膜電位の変化を表している。${kind === 'temporal' ? '1つのシナプス前細胞から、短い間隔で2回続けて入力があった' : '2つのシナプス前細胞から、同時に1回ずつ入力があった'}ときの変化である（活動電位は描いていない）。このような EPSP の足し合わせを何というか。`,
        chart: {
          x: { min: 0, max: 40, label: '時間（ミリ秒）', step: 10 },
          y: { min: -75, max: -50, label: '膜電位（mV）', step: 5 },
          series: [{ points: sample((t) => potential(t, inputs), 0, 40, 400), color: 'c1', width: 3 }],
          hlines: [{ y: THRESHOLD, color: 'c2', dash: 'dash', label: '閾値', align: 'right' }],
          alt: 'EPSP の加重',
        },
        correct: kind === 'temporal' ? '時間的加重' : '空間的加重',
        wrong: ['時間的加重', '空間的加重', '全か無かの法則', '跳躍伝導'],
        explanation: kind === 'temporal'
          ? '1つのシナプスで短い間隔で入力がくり返されると、前の EPSP が消えないうちに次の EPSP が重なる。これを時間的加重といい、1回では届かない閾値に達することがあるからである。'
          : '複数のシナプスから同時に入力があると、それぞれの EPSP が足し合わされる。これを空間的加重といい、1つのシナプスだけでは届かない閾値に達することがあるからである。',
      };
    },
  },
  {
    id: 'a14-transmitter',
    stage: 'a14',
    level: 1,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        const q = assignmentQuestion(['運動神経と骨格筋の接合部', '交感神経の末端（多くの器官）', '抑制性シナプスの例'], ['アセチルコリン', 'ノルアドレナリン', 'GABA（γ-アミノ酪酸）']);
        return {
          text: '神経伝達物質と、それがはたらく場所の組合せとして正しいものはどれか。',
          correct: q.correct,
          wrong: q.wrong,
          explanation: '運動神経の末端からはアセチルコリン、交感神経の末端からは主にノルアドレナリンが放出される。GABA は抑制性の神経伝達物質で、Cl⁻ を通すチャネルを開いてシナプス後細胞を興奮しにくくするからである。',
        };
      }
      return {
        text: 'シナプス前細胞の末端に興奮が伝わったとき、神経伝達物質の放出のきっかけとなるイオンの流入はどれか。',
        correct: 'Ca²⁺ の流入',
        wrong: ['Cl⁻ の流入', 'K⁺ の流入', 'Na⁺ の流出'],
        explanation: '興奮が末端に達すると、電位依存性のカルシウムチャネルが開いて Ca²⁺ が流入する。これがきっかけとなってシナプス小胞が細胞膜と融合し、神経伝達物質がシナプス間隙に放出されるからである。',
      };
    },
  },
  {
    id: 'a14-delay-calc',
    stage: 'a14',
    level: 3,
    kind: 'calc',
    make(rng) {
      const v = rng.pick([20, 40, 50]); // m/s ＝ mm/ms
      const d1 = rng.pick([20, 40, 60]);
      const d2 = rng.pick([40, 60, 80]);
      const delay = rng.pick([0.5, 1, 1.5, 2]);
      const total = d1 / v + delay + d2 / v;
      if (Math.abs(total * 100 - Math.round(total * 100)) > 1e-6) return this.make(rng);
      const d = distinctNumbers(delay, [total - d1 / v, total - d2 / v, total, (d1 + d2) / v, delay * 2, delay + 0.5, delay / 2], ' ミリ秒', 2);
      return {
        text: `2つのニューロンがシナプスでつながっている。1つ目のニューロンの軸索上で、シナプスまで ${d1} mm の点を刺激したところ、${total} ミリ秒後に、シナプスから ${d2} mm 先の2つ目のニューロンの軸索上で活動電位が記録された。どちらの軸索も伝導速度は ${v} m/s である。シナプスでの伝達にかかった時間は何ミリ秒か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `伝導にかかる時間は (${d1} ＋ ${d2}) mm ÷ ${v} mm/ms ＝ ${fmt((d1 + d2) / v, 2)} ミリ秒なので、伝達の時間は ${total} − ${fmt((d1 + d2) / v, 2)} ＝ ${fmt(delay, 2)} ミリ秒である。シナプスでは神経伝達物質の放出・拡散・受容体への結合が起こるので、伝導に比べて時間がかかる（シナプス遅延）からである。`,
      };
    },
  },
  {
    id: 'a14-ipsp-graph',
    stage: 'a14',
    level: 2,
    kind: 'graph',
    make(rng) {
      const order = rng.shuffle(['e', 'i']);
      const tr = { e: buildInputs({ nA: 1 }), i: [{ t: 5, amp: -5 }] };
      return {
        text: '図のア・イは、あるシナプス後細胞に生じた膜電位の変化である。抑制性シナプスからの入力によるものはどちらか。',
        chart: {
          x: { min: 0, max: 40, label: '時間（ミリ秒）', step: 10 },
          y: { min: -80, max: -55, label: '膜電位（mV）', step: 5 },
          series: order.map((k, idx) => ({ points: sample((t) => potential(t, tr[k]), 0, 40, 300), color: idx ? 'c2' : 'c1', dash: idx ? 'dash' : 'solid', width: 3, label: KATA[idx], labelAt: 9 })),
          hlines: [{ y: REST, color: 'muted', dash: 'dot', label: '静止電位', align: 'right' }],
          alt: '膜電位の変化ア・イ',
        },
        correct: `${KATA[order.indexOf('i')]}：膜電位が静止電位より下がっている（過分極）から`,
        wrong: [`${KATA[order.indexOf('e')]}：膜電位が静止電位より上がっている（脱分極）から`, `${KATA[order.indexOf('e')]}：膜電位が静止電位より下がっている（過分極）から`, `${KATA[order.indexOf('i')]}：膜電位が静止電位より上がっている（脱分極）から`],
        explanation: `抑制性シナプスからの入力は${KATA[order.indexOf('i')]}である。抑制性シナプスでは Cl⁻ の流入などで膜電位が下がり（IPSP）、閾値から遠ざかるので、シナプス後細胞は興奮しにくくなるからである。`,
      };
    },
  },
];
