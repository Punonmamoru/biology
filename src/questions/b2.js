// B2 血糖値の調節 の問題
import { KATA, assignmentQuestion, distinctNumbers } from './common.js';
import { fmt } from '../lib/format.js';
import { PRESETS, simulate, summarize, hormoneRef } from '../models/glucose.js';
import { thin } from '../lib/series.js';

const runCache = new Map();
function run(prm) {
  const key = JSON.stringify(prm);
  if (!runCache.has(key)) runCache.set(key, simulate(prm, 300, 1));
  return runCache.get(key);
}

const norm = (arr) => {
  const lo = Math.min(...arr);
  const hi = Math.max(...arr);
  return arr.map((v) => (hi - lo < 1e-9 ? 0.5 : (v - lo) / (hi - lo)));
};

export const B2 = [
  {
    id: 'b2-hormone-cell',
    stage: 'b2',
    level: 1,
    kind: 'term',
    make(rng) {
      const Q = [
        { h: 'インスリン', a: 'すい臓のランゲルハンス島のB細胞', why: 'B細胞は血糖値の上昇を感知してインスリンを分泌し、血糖値を下げるからである' },
        { h: 'グルカゴン', a: 'すい臓のランゲルハンス島のA細胞', why: 'A細胞は血糖値の低下を感知してグルカゴンを分泌し、血糖値を上げるからである' },
        { h: 'アドレナリン', a: '副腎髄質', why: '血糖値が下がると視床下部から交感神経を通じて副腎髄質が刺激され、アドレナリンが分泌されるからである' },
        { h: '糖質コルチコイド', a: '副腎皮質', why: '脳下垂体前葉からの副腎皮質刺激ホルモンによって副腎皮質が刺激され、糖質コルチコイドが分泌されるからである' },
      ];
      const q = rng.pick(Q);
      return {
        text: `${q.h}を分泌する内分泌腺（細胞）はどれか。`,
        correct: q.a,
        wrong: Q.map((x) => x.a).concat(['脳下垂体後葉', '甲状腺']),
        explanation: `${q.h}は${q.a}から分泌される。${q.why}。`,
      };
    },
  },
  {
    id: 'b2-hormone-function',
    stage: 'b2',
    level: 1,
    kind: 'term',
    make(rng) {
      const F = {
        インスリン: '細胞へのグルコースの取り込みや肝臓でのグリコーゲンの合成を促進し、血糖値を下げる',
        グルカゴン: '肝臓でのグリコーゲンの分解を促進し、血糖値を上げる',
      };
      const h = rng.pick(Object.keys(F));
      return {
        text: `${h}のはたらきとして正しいものはどれか。`,
        correct: F[h],
        wrong: [...Object.values(F), '腎臓の集合管での水の再吸収を促進し、尿量を減らす', '血液中のカルシウムイオン濃度を上げる', '体温を下げるように代謝を抑制する'],
        explanation: `${h}は${F[h]}。血糖値は、下げるインスリンと上げるグルカゴンなどが互いに反対のはたらきをすることで、一定の範囲に保たれているからである。`,
      };
    },
  },
  {
    id: 'b2-raise-lower',
    stage: 'b2',
    level: 1,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.6)) {
        const a = rng.pick(['グルカゴン', 'アドレナリン', '糖質コルチコイド']);
        return {
          text: '次のうち、血糖値を上げるはたらきをもつホルモンはどれか。',
          correct: a,
          wrong: ['インスリン', 'バソプレシン', 'パラトルモン'],
          explanation: `${a}は血糖値を上げるホルモンである。血糖値が下がると、グルカゴン・アドレナリン・糖質コルチコイドなど複数のホルモンで血糖値を上げるしくみがはたらくからである。`,
        };
      }
      return {
        text: '次のうち、血糖値を下げるはたらきをもつホルモンはどれか。',
        correct: 'インスリン',
        wrong: ['グルカゴン', 'アドレナリン', '糖質コルチコイド'],
        explanation: '血糖値を下げるホルモンはインスリンである。インスリンは細胞へのグルコースの取り込みや、肝臓でのグリコーゲンの合成を促進するから、血糖値が下がる。',
      };
    },
  },
  {
    id: 'b2-feedback',
    stage: 'b2',
    level: 2,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: '血糖値が上がるとインスリンの分泌が増え、インスリンのはたらきで血糖値が下がるとインスリンの分泌が減る。このように、結果が原因にもどって作用をおさえるしくみを何というか。',
          correct: '負のフィードバック',
          wrong: ['正のフィードバック', '拮抗作用', '自律神経による二重支配'],
          explanation: 'これは負のフィードバックである。ホルモンのはたらきの結果が分泌をおさえる向きにはたらくから、血糖値は一定の範囲に保たれる。',
        };
      }
      return {
        text: '食後にインスリンが分泌され、血糖値が空腹時の値まで下がった。このあとインスリンの分泌量はどうなるか。',
        correct: '減少する',
        wrong: ['さらに増加する', '変化しない', '食後と同じ量のまま続く'],
        explanation: 'インスリンの分泌は減少する。血糖値が下がるとB細胞への刺激が弱まり、負のフィードバックによって分泌がおさえられるからである。',
      };
    },
  },
  {
    id: 'b2-graph-identify',
    stage: 'b2',
    level: 2,
    kind: 'graph',
    make(rng) {
      const meal = rng.pick([0.8, 1, 1.2, 1.5]);
      const r = run({ ...PRESETS.healthy, meal });
      const t = r.map((x) => x.t / 60);
      const keys = ['血糖値', 'インスリン', 'グルカゴン'];
      const data = { 血糖値: norm(r.map((x) => x.G)), インスリン: norm(r.map((x) => x.I)), グルカゴン: norm(r.map((x) => x.N)) };
      const order = rng.shuffle(keys);
      const labels = KATA.slice(0, 3);
      const styles = [{ color: 'c1', dash: 'solid' }, { color: 'c2', dash: 'dash' }, { color: 'c4', dash: 'dot' }];
      const series = order.map((k, i) => ({
        points: thin(t.map((tt, j) => [tt, 0.1 + 0.9 * data[k][j]]), 160),
        ...styles[i],
        width: 3,
        label: labels[i],
        labelAt: [0.9, 2.3, 3.6][i],
      }));
      const aq = assignmentQuestion(labels, order);
      return {
        text: '図は、健康な人が食事をしたあとの血糖値、インスリン濃度、グルカゴン濃度の変化を、それぞれ最大と最小の幅をそろえて表したものである。ア〜ウの組合せとして正しいものはどれか（食事は時刻0）。',
        chart: {
          x: { min: 0, max: 5, label: '食事からの時間（時間）', step: 1 },
          y: { min: 0, max: 1.15, label: '相対値', ticks: [] },
          series,
          alt: '3本の曲線ア・イ・ウ',
        },
        correct: aq.correct,
        wrong: aq.wrong,
        explanation: '食後にまず血糖値が上がり、それを感知したB細胞からインスリンが少し遅れて分泌されるので、インスリンの山は血糖値の山より後になる。グルカゴンは血糖値が高い間は分泌が減り、血糖値が下がると増えるからである。',
      };
    },
  },
  {
    id: 'b2-diabetes-graph',
    stage: 'b2',
    level: 2,
    kind: 'graph',
    make(rng) {
      const kind = rng.pick(['healthy', 'type1', 'type2']);
      const r = run({ ...PRESETS[kind], meal: 1 });
      const ref = hormoneRef();
      const ANS = {
        healthy: '健康な人',
        type1: '1型糖尿病（インスリンがほとんど分泌されない）',
        type2: '2型糖尿病（インスリンは分泌されるが、血糖値が下がりにくい）',
      };
      const WHY = {
        healthy: '空腹時の血糖値が約100で、食後に上がった血糖値がインスリンの増加によって2時間ほどで元に戻っているからである',
        type1: 'インスリンがほとんど増えず、血糖値が高いまま下がらないからである',
        type2: 'インスリンは増えているのに血糖値が高いまま下がりにくく、インスリンが効きにくいか分泌が不十分だからである',
      };
      return {
        text: '図は、ある人が食事をしたあとの血糖値とインスリン濃度の変化である（インスリンは健康な人の空腹時を1とした相対値）。この人の状態として最も適当なものはどれか。',
        chart: {
          x: { min: 0, max: 5, label: '食事からの時間（時間）', step: 1 },
          y: { min: 0, max: 300, label: '血糖値（mg/100mL）', step: 50 },
          y2: { min: 0, max: 8, label: 'インスリン（相対値）', step: 2 },
          hlines: [{ y: 100, color: 'muted', dash: 'dot' }],
          series: [
            { points: thin(r.map((x) => [x.t / 60, x.G]), 160), color: 'c2', width: 3, label: '血糖値' },
            { points: thin(r.map((x) => [x.t / 60, x.I / ref.I]), 160), color: 'c1', dash: 'dash', width: 3, axis: 'y2', label: 'インスリン' },
          ],
          alt: '血糖値とインスリンのグラフ',
        },
        correct: ANS[kind],
        wrong: [...Object.values(ANS), 'インスリンが過剰に分泌され、血糖値が下がりすぎる人'],
        explanation: `この人は${ANS[kind]}と考えられる。${WHY[kind]}。`,
      };
    },
  },
  {
    id: 'b2-type-desc',
    stage: 'b2',
    level: 1,
    kind: 'term',
    make(rng) {
      const D = {
        '1型': 'すい臓のB細胞が自己免疫などで破壊され、インスリンがほとんど分泌されない',
        '2型': 'インスリンの分泌量が減ったり、標的細胞がインスリンに反応しにくくなったりする',
      };
      const k = rng.pick(Object.keys(D));
      return {
        text: `${k}糖尿病の説明として最も適当なものはどれか。`,
        correct: D[k],
        wrong: [...Object.values(D), 'グルカゴンが分泌されなくなり、血糖値が下がりすぎる', '腎臓でグルコースがまったくろ過されなくなる'],
        explanation: `${k}糖尿病は、${D[k]}ものである。どちらの場合もインスリンによって血糖値を下げるしくみが十分にはたらかないから、血糖値が高い状態が続く。`,
      };
    },
  },
  {
    id: 'b2-fasting-value',
    stage: 'b2',
    level: 1,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: '健康な人の空腹時の血糖値（血液中のグルコース濃度）はおよそいくらか。',
          correct: '約100 mg/100mL',
          wrong: ['約1 mg/100mL', '約10 mg/100mL', '約1000 mg/100mL', '約10000 mg/100mL'],
          explanation: '健康な人の空腹時の血糖値は約100 mg/100mL（約0.1%）である。インスリンやグルカゴンなどのはたらきで調節されているから、食事をしても一定の範囲に戻る。',
        };
      }
      return {
        text: '健康な人の空腹時の血糖値は、質量パーセント濃度でおよそ何%か。',
        correct: '約0.1%',
        wrong: ['約0.001%', '約0.01%', '約1%', '約10%'],
        explanation: '空腹時の血糖値は約100 mg/100mL で、これは約0.1%にあたる。100 mL の血液（約100 g）に約0.1 g のグルコースがふくまれるからである。',
      };
    },
  },
  {
    id: 'b2-low-path',
    stage: 'b2',
    level: 2,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: '血糖値が低下したとき、アドレナリンの分泌が増えるまでの経路として正しいものはどれか。',
          correct: '間脳の視床下部 → 交感神経 → 副腎髄質',
          wrong: ['間脳の視床下部 → 副交感神経 → 副腎髄質', '脳下垂体後葉 → 交感神経 → 副腎皮質', '延髄 → 副交感神経 → すい臓のB細胞', '間脳の視床下部 → 交感神経 → すい臓のB細胞'],
          explanation: '血糖値の低下を視床下部が感知すると、交感神経を通じて副腎髄質が刺激され、アドレナリンが分泌される。アドレナリンは肝臓のグリコーゲンの分解を促すから、血糖値が上がる。',
        };
      }
      return {
        text: '血糖値が低下したとき、糖質コルチコイドの分泌が増えるまでの経路として正しいものはどれか。',
        correct: '視床下部 → 脳下垂体前葉（副腎皮質刺激ホルモン） → 副腎皮質',
        wrong: ['視床下部 → 脳下垂体後葉（バソプレシン） → 副腎皮質', '視床下部 → 交感神経 → 副腎髄質', '視床下部 → 脳下垂体前葉（甲状腺刺激ホルモン） → 甲状腺'],
        explanation: '視床下部からの放出ホルモンで脳下垂体前葉が副腎皮質刺激ホルモンを分泌し、それが副腎皮質から糖質コルチコイドを分泌させる。糖質コルチコイドはタンパク質からグルコースをつくる反応を促すから、血糖値が上がる。',
      };
    },
  },
  {
    id: 'b2-urine',
    stage: 'b2',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '糖尿病で血糖値が非常に高い状態が続くと、尿中にグルコースが排出されることがある。その理由として最も適当なものはどれか。',
        correct: '原尿中のグルコースが多すぎて、細尿管（腎細管）で再吸収しきれないから',
        wrong: ['糸球体でグルコースがろ過されなくなるから', 'インスリンが腎臓にはたらき、グルコースを尿中に排出させるから', 'グルカゴンが腎臓でグルコースを合成するから'],
        explanation: 'グルコースは糸球体でろ過されたあと、ふつうは細尿管でほぼすべて再吸収される。血糖値が高すぎると原尿中のグルコースが再吸収できる量を超えるから、尿中に出てくる。',
      };
    },
  },
  {
    id: 'b2-graph-peak',
    stage: 'b2',
    level: 2,
    kind: 'graph',
    make(rng) {
      const meal = rng.pick([0.8, 1, 1.2, 1.5, 2]);
      const r = run({ ...PRESETS.healthy, meal });
      const sm = summarize(r);
      const ans = Math.round(sm.peakT / 30) * 30;
      const opts = [0, 30, 60, 90, 120, 180, 240].filter((m) => Math.abs(m - ans) >= 30);
      const lab = (m) => (m === 0 ? '食事の直後（0分）' : `食後 約${m}分`);
      return {
        text: '図は、健康な人が食事をしたあとの血糖値の変化である（横軸の目盛りは30分ごと）。血糖値が最も高くなるのは食後およそ何分か。',
        chart: {
          x: { min: 0, max: 240, label: '食事からの時間（分）', step: 30 },
          y: { min: 0, max: 200, label: '血糖値（mg/100mL）', step: 50 },
          series: [{ points: thin(r.filter((x) => x.t <= 240).map((x) => [x.t, x.G]), 160), color: 'c2', width: 3 }],
          alt: '食後の血糖値の変化',
        },
        correct: lab(ans),
        wrong: opts.map(lab),
        explanation: `グラフの山の位置から、血糖値は食後約${ans}分で最大になる。そのあとはインスリンのはたらきで細胞へのグルコースの取り込みが進むから、2時間ほどで空腹時の値近くまで戻る。`,
      };
    },
  },
  {
    id: 'b2-glucose-amount',
    stage: 'b2',
    level: 2,
    kind: 'calc',
    make(rng) {
      const L = rng.pick([4, 4.5, 5, 5.5, 6]);
      const g0 = rng.pick([90, 95, 100]);
      const g1 = g0 + rng.pick([20, 30, 40, 50, 60]);
      const dL = L * 10; // 100 mL 単位の数
      const ans = ((g1 - g0) * dL) / 1000; // g
      const d = distinctNumbers(ans, [(g1 * dL) / 1000, ans * 10, ans / 10, ((g1 - g0) * L) / 1000, (g0 * dL) / 1000], ' g', 3);
      return {
        text: `ある人の血糖値が、空腹時の ${g0} mg/100mL から食後に ${g1} mg/100mL に上がった。この人の血液の量を ${fmt(L, 1)} L とすると、血液中のグルコースは何 g 増えたか。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `${fmt(L, 1)} L は 100 mL の ${fmt(dL, 0)} 倍なので、増えた量は (${g1} − ${g0}) × ${fmt(dL, 0)} ＝ ${fmt((g1 - g0) * dL, 0)} mg ＝ ${fmt(ans, 3)} g となる。血糖値は 100 mL あたりの量で表されているから、血液全体の量に換算する必要がある。`,
      };
    },
  },
];
