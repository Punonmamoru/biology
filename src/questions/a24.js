// A24 種間競争と生態的地位 の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers } from './common.js';
import { run, DAYS } from '../models/competition.js';

export const A24 = [
  {
    id: 'a24-mixed-graph',
    stage: 'a24',
    level: 2,
    kind: 'graph',
    make(rng) {
      const r = run('aurelia', 1, true);
      const caudIsA = rng.chance(0.5);
      const lab = caudIsA ? { caud: KATA[0], aur: KATA[1] } : { caud: KATA[1], aur: KATA[0] };
      const line = (key, isA) => ({ points: r.map((q) => [q.t, q[key]]), color: isA ? 'c1' : 'c2', dash: isA ? 'solid' : 'dash', width: 3 });
      return {
        text: 'ゾウリムシとヒメゾウリムシを別々に飼育すると、どちらも一定の数まで増えた。図は、この2種を同じ容器で飼育（混合飼育）したときの個体数の変化で、ア（実線）・イ（破線）はいずれかの種である。図から読み取れることとして最も適当なものはどれか。',
        chart: {
          x: { min: 0, max: DAYS, label: '日数', step: 4 },
          y: { min: 0, max: 180, label: '個体数（相対値）', step: 40 },
          series: caudIsA ? [line('n1', true), line('n2', false)] : [line('n2', true), line('n1', false)],
          alt: '混合飼育（ア：実線、イ：破線）',
        },
        correct: `${lab.caud}は種間競争に負けて排除された（競争的排除）`,
        wrong: [
          `${lab.aur}は種間競争に負けて排除された（競争的排除）`,
          '2種は生態的地位が異なるので共存している',
          `${lab.caud}は${lab.aur}に捕食されて減った`,
          `${lab.aur}は${lab.caud}と相利共生をしているので増えた`,
        ],
        explanation: `${lab.caud}は、はじめ増えたあと減り続けて、ほとんどいなくなった。ゾウリムシとヒメゾウリムシは食物や生活場所などの生態的地位がよく似ているので、同じ容器では資源を奪い合い、競争に弱いほうが排除されるからである。`,
      };
    },
  },
  {
    id: 'a24-exclusion-term',
    stage: 'a24',
    level: 1,
    kind: 'term',
    make(rng) {
      const which = rng.pick(['exclusion', 'niche']);
      if (which === 'exclusion') {
        return {
          text: '生態的地位が大きく重なる2種が同じ場所で生活すると、資源をめぐる種間競争の結果、一方の種が排除されることがある。これを何というか。',
          correct: '競争的排除',
          wrong: ['すみわけ', '食いわけ', '相利共生', '間接効果'],
          explanation: 'これは競争的排除で、ガウゼがゾウリムシとヒメゾウリムシを混合飼育する実験で示した。必要とする資源がほぼ同じだと、わずかに競争に強い種が資源を多く使い、弱い種が減っていくからである。',
        };
      }
      return {
        text: '生物が生態系の中で占める位置（食物・生活場所・活動する時間など、どのような資源をどのように利用するか）を何というか。',
        correct: '生態的地位（ニッチ）',
        wrong: ['栄養段階', '環境収容力', 'キーストーン種', '個体群密度'],
        explanation: 'これは生態的地位（ニッチ）である。生態的地位が重なる種どうしは同じ資源を奪い合うので、種間競争が強くはたらく。',
      };
    },
  },
  {
    id: 'a24-coexist-term',
    stage: 'a24',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: 'ゾウリムシとミドリゾウリムシを同じ容器で飼育すると、2種は共存した。その理由として最も適当なものはどれか。',
        correct: '2種は容器の中で主に生活する場所や食物が異なり、生態的地位の重なりが小さいから',
        wrong: ['2種は生態的地位が同じなので、資源を同じように分け合えるから', 'ミドリゾウリムシがゾウリムシを捕食して、数を調節しているから', '2種の間には種間競争がまったくはたらかず、単独飼育と同じ数まで増えるから'],
        explanation: '2種は容器の中で主に生活する場所や食物が異なるので、生態的地位の重なりが小さく、資源の奪い合いが弱い。そのため競争的排除が起こらず共存できるが、それぞれの数は単独飼育のときより少なくなることが多い。',
      };
    },
  },
  {
    id: 'a24-share-calc',
    stage: 'a24',
    level: 1,
    kind: 'calc',
    make(rng) {
      const single = rng.pick([80, 100, 120, 150, 200]);
      const pct = rng.pick([40, 50, 60, 75, 80]);
      const mixed = (single * pct) / 100;
      const d = distinctNumbers(pct, [100 - pct, (single / mixed) * 100, pct / 2, Math.min(99, pct + 10)], ' %', 0);
      return {
        text: `ある種の生物を単独飼育すると、個体数は最大 ${single} で一定になった。生態的地位が一部重なる別の種と混合飼育すると、最大 ${fmt(mixed, 0)} で一定になり、2種は共存した。混合飼育での最大の個体数は、単独飼育のときの何 % か。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `${fmt(mixed, 0)} ÷ ${single} × 100 ＝ ${pct} % となる。共存していても、重なる部分の資源をもう一方の種と分け合うので、単独飼育のときより少ない数で一定になるからである。`,
      };
    },
  },
  {
    id: 'a24-day-graph',
    stage: 'a24',
    level: 2,
    kind: 'graph',
    make(rng) {
      const r = run('aurelia', 1, true);
      // ゾウリムシの数が最大になる日
      let best = r[0];
      for (const q of r) if (q.n1 > best.n1) best = q;
      const peak = Math.round(best.t);
      const d = distinctNumbers(peak, [2, 6, 10, 14, 18, 22].filter((v) => Math.abs(v - peak) >= 3), ' 日目ごろ', 0);
      return {
        text: '図は、ゾウリムシとヒメゾウリムシを混合飼育したときの、ゾウリムシの個体数の変化である。ゾウリムシの個体数が最も多くなったのは何日目ごろか。',
        chart: {
          x: { min: 0, max: DAYS, label: '日数', step: 2 },
          y: { min: 0, max: 70, label: 'ゾウリムシの個体数（相対値）', step: 10 },
          series: [{ points: r.map((q) => [q.t, q.n1]), color: 'c1', width: 3 }],
          alt: 'ゾウリムシの個体数の変化',
        },
        correct: d.correct,
        wrong: d.wrong,
        explanation: `グラフの山の頂点は ${peak} 日目ごろである。はじめは資源に余裕があるので両種とも増えるが、ヒメゾウリムシが増えると資源を奪われ、ゾウリムシは減っていくからである。`,
      };
    },
  },
  {
    id: 'a24-relation-term',
    stage: 'a24',
    level: 2,
    kind: 'term',
    make(rng) {
      const Q = rng.pick([
        { text: '2種がともに同じ資源を利用し、互いに不利益を受ける関係', correct: '種間競争' },
        { text: '一方が他方を食べ、食べる側は利益を、食べられる側は不利益を受ける関係', correct: '被食者－捕食者の関係' },
        { text: 'アリとアブラムシのように、2種がともに利益を受ける関係', correct: '相利共生' },
        { text: 'カクレウオとナマコのように、一方だけが利益を受け、他方は利益も不利益も受けない関係', correct: '片利共生' },
      ]);
      const all = ['種間競争', '被食者－捕食者の関係', '相利共生', '片利共生', '寄生'];
      return {
        text: `異なる種の生物の間の関係のうち、「${Q.text}」を何というか。`,
        correct: Q.correct,
        wrong: all.filter((x) => x !== Q.correct),
        explanation: `これは${Q.correct}である。種間の関係は、それぞれの種が利益を受けるか、不利益を受けるか、どちらでもないかの組合せで区別されるからである。`,
      };
    },
  },
  {
    id: 'a24-partition-term',
    stage: 'a24',
    level: 2,
    kind: 'term',
    make(rng) {
      const which = rng.pick(['sumiwake', 'kuiwake']);
      if (which === 'sumiwake') {
        return {
          text: '川の上流と下流のように、生態的地位が似た2種が生活する場所を分け合うことで共存していることを何というか。',
          correct: 'すみわけ',
          wrong: ['食いわけ', '競争的排除', '縄張り', '順位制'],
          explanation: 'これはすみわけで、イワナとヤマメの例が知られる。生活する場所を分けると、生態的地位の重なりが小さくなり、種間競争が弱まるので共存できる。',
        };
      }
      return {
        text: '同じ場所にすむ似た種が、異なる食物を食べることで共存していることを何というか。',
        correct: '食いわけ',
        wrong: ['すみわけ', '競争的排除', '相利共生', '寄生'],
        explanation: 'これは食いわけである。食物を分けると生態的地位の重なりが小さくなり、同じ資源を奪い合う種間競争が弱まるので、似た種が共存できる。',
      };
    },
  },
  {
    id: 'a24-intra-term',
    stage: 'a24',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: 'ゾウリムシを1種だけで飼育すると、個体数はある数まで増えたあと、それ以上増えなくなった。その主な理由として最も適当なものはどれか。',
        correct: '個体数が増えると、同じ種の個体どうしで食物や生活空間を奪い合うようになるから（種内競争）',
        wrong: ['他の種との種間競争が起こるから', '捕食者に食べられるから', 'ゾウリムシは一定の数になると分裂する能力を失うから'],
        explanation: '1種だけの飼育でも、個体数が増えると食物や生活空間が不足し、同じ種の個体どうしで奪い合う種内競争が起こる。そのため増え方がしだいに小さくなり、環境収容力の付近で一定になる。',
      };
    },
  },
  {
    id: 'a24-displacement-term',
    stage: 'a24',
    level: 3,
    kind: 'term',
    make() {
      return {
        text: '【発展】ガラパゴス諸島で、2種のフィンチが同じ島にすむ場合には、別々の島にすむ場合よりも、くちばしの大きさの差が大きくなっていた。この現象の説明として最も適当なものはどれか。',
        correct: '同じ島では種間競争が起こり、食物（種子の大きさ）が重ならない方向へ形質が変化した（形質置換）',
        wrong: ['同じ島では2種が交雑して、くちばしの大きさが平均化した', '同じ島では食物が豊富なので、くちばしが大きくなった', 'くちばしの大きさは環境の影響を受けず、偶然に差ができた'],
        explanation: '同じ島にすむと、似た大きさの種子を食べる個体どうしで種間競争が起こる。そのため、相手と重ならない大きさの種子を食べられる個体が生き残りやすく、くちばしの大きさの差が広がった（形質置換）。',
      };
    },
  },
];
