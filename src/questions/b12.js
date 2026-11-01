// B12 ホルモンと負のフィードバック の問題
import { KATA, assignmentQuestion, distinctNumbers } from './common.js';
import { simulate, T_END } from '../models/thyroid.js';
import { fmt } from '../lib/format.js';

const UP = '増加する';
const DOWN = '減少する';
const choice = (h, s, t) => `TRH：${h}　TSH：${s}　チロキシン：${t}`;
const ALL = [];
for (const a of [UP, DOWN]) for (const b of [UP, DOWN]) for (const c of [UP, DOWN]) ALL.push(choice(a, b, c));

export const B12 = [
  {
    id: 'b12-manip',
    stage: 'b12',
    level: 2,
    kind: 'term',
    make(rng) {
      const k = rng.pick(['thyroidectomy', 'injection', 'pituitary']);
      const Q = {
        thyroidectomy: { text: 'ある動物の甲状腺を除去した。しばらくたったあとの、TRH・TSH・チロキシンの分泌量（血中濃度）の変化として正しいものはどれか（正常なときと比べる）。', ans: choice(UP, UP, DOWN), ex: '甲状腺がないのでチロキシンが減る。チロキシンによる負のフィードバックがはたらかなくなるので、視床下部からの TRH と脳下垂体前葉からの TSH の分泌が増える。' },
        injection: { text: 'ある動物にチロキシンを注射し続けた。しばらくたったあとの、TRH・TSH・チロキシンの分泌量（血中濃度）の変化として正しいものはどれか（正常なときと比べる。チロキシンは注射した分も含めた血中濃度）。', ans: choice(DOWN, DOWN, UP), ex: '注射でチロキシンが多くなるので、負のフィードバックによって視床下部と脳下垂体前葉のはたらきがおさえられる。そのため TRH と TSH の分泌が減る。' },
        pituitary: { text: 'ある動物の脳下垂体（前葉）を除去した。しばらくたったあとの、TRH・TSH・チロキシンの分泌量（血中濃度）の変化として正しいものはどれか（正常なときと比べる。TSH は除去後に検出されなくなった）。', ans: choice(UP, DOWN, DOWN), ex: '脳下垂体前葉がないので TSH が分泌されず、甲状腺が刺激されないのでチロキシンが減る。チロキシンが減ると負のフィードバックによる抑制が弱まるので、視床下部からの TRH の分泌は増える。' },
      }[k];
      return { text: Q.text, correct: Q.ans, wrong: ALL, explanation: Q.ex };
    },
  },
  {
    id: 'b12-feedback',
    stage: 'b12',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: '血液中のチロキシンが多くなると、視床下部と脳下垂体前葉からのホルモンの分泌がおさえられ、チロキシンの分泌が減る。このように、結果が原因にもどってはたらきをおさえるしくみを何というか。',
        correct: '負のフィードバック',
        wrong: ['正のフィードバック', '拮抗作用', '神経分泌', '恒常性の破綻'],
        explanation: 'これは負のフィードバックである。結果（チロキシンの量）が原因（TRH・TSH の分泌）をおさえる向きにはたらくので、チロキシンの量がほぼ一定の範囲に保たれる。',
      };
    },
  },
  {
    id: 'b12-path',
    stage: 'b12',
    level: 1,
    kind: 'term',
    make() {
      const q = assignmentQuestion(['ア', 'イ', 'ウ'], ['視床下部', '脳下垂体前葉', '甲状腺']);
      return {
        text: 'チロキシンの分泌の調節について、次のア〜ウにあてはまる器官の組合せとして正しいものはどれか。　（ア）から放出ホルモン（TRH）が分泌される → （イ）から甲状腺刺激ホルモン（TSH）が分泌される → （ウ）からチロキシンが分泌される。',
        correct: q.correct,
        wrong: q.wrong,
        explanation: 'アは視床下部、イは脳下垂体前葉、ウは甲状腺である。視床下部の神経分泌細胞がつくる放出ホルモンが脳下垂体前葉にはたらき、そこから分泌された刺激ホルモンが甲状腺にはたらくので、段階的に調節される。',
      };
    },
  },
  {
    id: 'b12-graph',
    stage: 'b12',
    level: 2,
    kind: 'graph',
    make(rng) {
      const k = rng.pick(['thyroidectomy', 'injection']);
      const run = simulate(k);
      const order = rng.shuffle(['S', 'T']);
      const lab = { [order[0]]: KATA[0], [order[1]]: KATA[1] };
      return {
        text: `図のア・イは、ある動物に${k === 'thyroidectomy' ? '甲状腺を除去する' : 'チロキシンを注射し続ける'}処置を5日目に行ったときの、血液中の TSH とチロキシンの量（正常＝100%）の変化を表している。TSH を表すのはどちらか。`,
        chart: {
          x: { min: 0, max: T_END, label: '日数', step: 10 },
          y: { min: 0, max: k === 'thyroidectomy' ? 450 : 250, label: '量（正常＝100%）', step: 50 },
          series: order.map((key, i) => ({ points: run.map((q) => [q.t, q[key] * 100]), color: i ? 'c2' : 'c1', dash: i ? 'dash' : 'solid', width: 3, label: KATA[i], labelAt: 30 })),
          alt: 'ホルモンの量の変化ア・イ',
        },
        correct: lab.S,
        wrong: [KATA[0], KATA[1], 'どちらともいえない', 'ア・イの両方'],
        explanation: k === 'thyroidectomy'
          ? `甲状腺を除去するとチロキシンが減り、負のフィードバックによる抑制がなくなって TSH が増えるので、増加している${lab.S}が TSH である。もう一方はチロキシンで、甲状腺がないのでつくられず、減少しているからである。`
          : `チロキシンを注射すると、負のフィードバックによって TSH の分泌がおさえられるので、減少している${lab.S}が TSH である。もう一方はチロキシンで、注射した分が加わるので増加しているからである。`,
      };
    },
  },
  {
    id: 'b12-goiter',
    stage: 'b12',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '食物中のヨウ素が不足すると、甲状腺が大きくはれることがある。この理由として最も適当なものはどれか。',
        correct: 'チロキシンが不足して負のフィードバックがはたらかず、TSH が多く分泌されて甲状腺が刺激され続けるから',
        wrong: ['チロキシンが多くなりすぎて、甲状腺が刺激され続けるから', 'TSH の分泌が止まり、甲状腺がはたらかなくなるから', 'ヨウ素が甲状腺にたまりすぎるから'],
        explanation: 'ヨウ素はチロキシンの材料なので、不足するとチロキシンを十分につくれない。チロキシンが少ないと負のフィードバックによる抑制が弱まり、TSH が多く分泌されて甲状腺が刺激され続けるので、甲状腺が大きくなる。',
      };
    },
  },
  {
    id: 'b12-target',
    stage: 'b12',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: 'ホルモンが、特定の器官（標的器官）にだけはたらく理由として最も適当なものはどれか。',
        correct: '標的器官の細胞（標的細胞）に、そのホルモンと特異的に結合する受容体があるから',
        wrong: ['ホルモンは神経を通って標的器官にだけ運ばれるから', 'ホルモンは標的器官の中でだけつくられるから', '血液は標的器官にだけ流れているから'],
        explanation: 'ホルモンは血液によって全身に運ばれるが、そのホルモンと結合する受容体をもつ標的細胞にだけ作用する。受容体とホルモンは特異的に結合するので、特定の器官にだけはたらくのである。',
      };
    },
  },
  {
    id: 'b12-level-calc',
    stage: 'b12',
    level: 2,
    kind: 'calc',
    make(rng) {
      const k = rng.pick(['thyroidectomy', 'pituitary', 'iodine']);
      const run = simulate(k);
      const end = run[run.length - 1];
      const key = k === 'pituitary' ? 'H' : 'S';
      const name = key === 'H' ? 'TRH' : 'TSH';
      const v = Math.round(end[key] * 100);
      const before = 100;
      const ans = v / before;
      const d = distinctNumbers(ans, [before / v, (v - before) / before, ans * 2, ans / 2, v - before], ' 倍', 1);
      const label = { thyroidectomy: '甲状腺を除去した', pituitary: '脳下垂体前葉を除去した', iodine: '材料のヨウ素が不足した' }[k];
      return {
        text: `ある動物で${label}ところ、しばらくして血液中の ${name} の量が、正常なときの ${before} から ${v}（相対値）になった。${name} の量は正常なときの何倍になったか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `${v} ÷ ${before} ＝ ${fmt(v / before, 2)} ≒ ${fmt(ans, 1)} 倍である。チロキシンが減って負のフィードバックによる抑制が弱まったので、${name} の分泌が増えたからである。`,
      };
    },
  },
  {
    id: 'b12-function',
    stage: 'b12',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: 'チロキシンのはたらきとして最も適当なものはどれか。',
        correct: '多くの細胞で代謝（化学反応）を促進する',
        wrong: ['血糖値を下げる', '腎臓での水の再吸収を促進する', '血液中のカルシウムイオン濃度を下げる'],
        explanation: 'チロキシンは甲状腺から分泌され、全身の多くの細胞で代謝を促進するので、体温の維持や成長にかかわる。血糖値を下げるのはインスリン、水の再吸収を促進するのはバソプレシンである。',
      };
    },
  },
];
