// A16 動物の行動 の問題
import { distinctNumbers } from './common.js';
import { danceAngle, foodAzimuth, azName, SUN_SPEED } from '../models/behavior.js';

const AZ = [0, 45, 90, 135, 180, 225, 270, 315];
const angleText = (a) => (a === 0 ? '真上' : Math.abs(a) === 180 ? '真下' : `真上から${a > 0 ? '右' : '左'}に${Math.abs(a)}°`);

export const A16 = [
  {
    id: 'a16-dance-angle',
    stage: 'a16',
    level: 2,
    kind: 'calc',
    make(rng) {
      const sun = rng.pick([90, 135, 180, 225, 270]);
      const food = rng.pick(AZ);
      const a = danceAngle(sun, food);
      const correct = angleText(a);
      const cands = [-180, -135, -90, -45, 0, 45, 90, 135].map(angleText);
      return {
        text: `太陽が${azName(sun)}にあるとき、巣から${azName(food)}の方向にあるえさ場（巣から 1 km）を見つけたミツバチが、巣の中の垂直な巣板の上で8の字ダンスを踊った。尻を振りながら直進する向きはどれか。`,
        correct,
        wrong: [angleText(-a === 0 ? 180 : -a), ...cands],
        explanation: `えさ場は太陽の方向から時計回りに ${((food - sun) % 360 + 360) % 360}° の方向にある。巣板の上では真上を太陽の方向とみなすので、真上から同じ角度だけ回した向き（${correct}）に直進するからである。`,
      };
    },
  },
  {
    id: 'a16-food-from-dance',
    stage: 'a16',
    level: 3,
    kind: 'calc',
    make(rng) {
      const sun = rng.pick([90, 135, 180, 225, 270]);
      const dance = rng.pick([-135, -90, -45, 45, 90, 135, 180]);
      const food = foodAzimuth(sun, dance);
      return {
        text: `太陽が${azName(sun)}にあるとき、8の字ダンスの直進方向が${angleText(dance)}であった。えさ場は巣から見てどの方位にあるか。`,
        correct: azName(food),
        wrong: AZ.map(azName),
        explanation: `真上が太陽の方向（${azName(sun)}）にあたるので、えさ場は${azName(sun)}から${dance > 0 ? '時計回り' : '反時計回り'}に ${Math.abs(dance)}° 回した方位、つまり${azName(food)}にある。ダンスの角度は、太陽の方向とえさ場の方向のなす角を、重力の方向を基準にして表しているからである。`,
      };
    },
  },
  {
    id: 'a16-time-shift',
    stage: 'a16',
    level: 3,
    kind: 'calc',
    make(rng) {
      const hours = rng.pick([1, 2, 3, 4]);
      const ans = hours * SUN_SPEED;
      const d = distinctNumbers(ans, [hours * 30, hours * 10, 15, hours * 360 / 24 * 2, 90], '°', 0);
      return {
        text: `同じえさ場に通っているミツバチの8の字ダンスを ${hours} 時間後に観察すると、直進方向の角度が変わっていた。太陽の方位が1時間に約${SUN_SPEED}°移動するとすると、ダンスの角度はおよそ何度変わったか。`,
        correct: d.correct,
        wrong: d.wrong,
        explanation: `太陽は ${hours} 時間で約 ${SUN_SPEED} × ${hours} ＝ ${ans}° 移動するので、ダンスの角度もおよそ ${ans}° 変わる。ダンスはえさ場の方向を太陽の方向を基準に表すので、えさ場が同じでも太陽が動けば角度が変わるからである。`,
      };
    },
  },
  {
    id: 'a16-round',
    stage: 'a16',
    level: 1,
    kind: 'term',
    make() {
      return {
        text: 'ミツバチのダンスについて正しいものはどれか。',
        correct: 'えさ場が近いときは円形ダンス、遠いときは8の字ダンスを踊る',
        wrong: ['えさ場が近いときは8の字ダンス、遠いときは円形ダンスを踊る', 'えさ場が遠いほど、一定時間あたりの8の字ダンスの回数は多くなる', '8の字ダンスの直進方向は、えさ場の方位をそのまま（北を真上として）表す'],
        explanation: 'えさ場が近いときは円形ダンス、遠いときは8の字ダンスを踊り、8の字ダンスは方向と距離を伝える。えさ場が遠いほどダンスはゆっくりになり、一定時間あたりの回数が少なくなるので、仲間は回数から距離を知ることができる。',
      };
    },
  },
  {
    id: 'a16-innate',
    stage: 'a16',
    level: 1,
    kind: 'term',
    make(rng) {
      const which = rng.pick(['imprint', 'taxis', 'sign', 'habit']);
      const Q = {
        imprint: { text: 'カモやガンのひなが、ふ化後の限られた時期に見た動くものを親と認識し、あとを追うようになる学習を何というか。', correct: '刷込み', explanation: 'これは刷込みである。なお、刷込みは生後の限られた時期（臨界期）にだけ成立する学習なので、その時期を過ぎると同じ経験をしても成立しにくい。' },
        taxis: { text: 'ミドリムシが光の方へ移動するように、刺激に対して一定の方向へ移動する生得的行動を何というか。', correct: '走性', explanation: 'これは走性で、刺激源へ近づくものを正、遠ざかるものを負という。なお、ミドリムシは光の方へ移動するので正の光走性であり、光合成に有利な場所へ移動できる。' },
        sign: { text: 'イトヨの雄が、腹の赤い模型に対して攻撃行動を示すように、特定の行動を引き起こす刺激を何というか。', correct: 'かぎ刺激（信号刺激）', explanation: 'これはかぎ刺激（信号刺激）である。なお、イトヨの雄は形が似ていなくても腹が赤い模型を攻撃するので、行動を引き起こしているのは「腹の赤色」という特定の刺激だとわかる。' },
        habit: { text: 'アメフラシの水管に弱い刺激をくり返し与えると、えらを引っこめる反応がしだいに起こらなくなる。このような単純な学習を何というか。', correct: '慣れ', explanation: 'これは慣れである。なお、くり返し刺激を受けると感覚ニューロンから放出される神経伝達物質の量が減るので、運動ニューロンが興奮しにくくなり、反応が弱まる。' },
      }[which];
      return { text: Q.text, correct: Q.correct, wrong: ['刷込み', '走性', 'かぎ刺激（信号刺激）', '慣れ', '条件づけ', '鋭敏化'], explanation: Q.explanation };
    },
  },
  {
    id: 'a16-sun-compass',
    stage: 'a16',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '渡り鳥やミツバチが、時刻とともに位置が変わる太陽を基準にしても、正しい方向を知ることができる理由として最も適当なものはどれか。',
        correct: '体内時計によって時刻を知り、太陽の方位の変化を補正しているから',
        wrong: ['太陽の位置は1日中変わらないから', '地磁気だけを使い、太陽はまったく使っていないから', '方向を知るのは夜だけで、昼は移動しないから'],
        explanation: '太陽の方位は時刻とともに変わるので、太陽だけでは方向は決まらない。動物は体内時計で時刻を知り、太陽の方位の変化を補正しているので、太陽を基準に方向を知ることができる（太陽コンパス）。',
      };
    },
  },
  {
    id: 'a16-dance-graph',
    stage: 'a16',
    level: 2,
    kind: 'graph',
    make(rng) {
      const near = rng.chance(0.5);
      const pts = [];
      for (let d = 100; d <= 4000; d += 50) pts.push([d, 10 / (1 + d / 500)]);
      return {
        text: '図は、巣からえさ場までの距離と、15秒あたりの8の字ダンスの回数の関係を表した模式図である。この図から考えられることとして正しいものはどれか。',
        chart: {
          x: { min: 0, max: 4000, label: 'えさ場までの距離（m）', step: 1000 },
          y: { min: 0, max: 10, label: '15秒あたりの回数', step: 2 },
          series: [{ points: pts, color: 'c1', width: 3 }],
          alt: '距離とダンスの回数',
        },
        correct: near ? 'ダンスの回数が多いほど、えさ場は近い' : 'えさ場が遠いほど、ダンスの回数は少ない',
        wrong: ['ダンスの回数が多いほど、えさ場は遠い', 'えさ場が遠いほど、ダンスの回数は多い', 'ダンスの回数は、えさ場までの距離に関係しない', 'ダンスの回数は、えさ場の方向を表している'],
        explanation: '図では距離が大きいほど15秒あたりの回数が少なくなっている。ダンスの回数（速さ）でえさ場までの距離が伝わるので、仲間のミツバチは回数から距離を知ることができるからである。',
      };
    },
  },
  {
    id: 'a16-learning',
    stage: 'a16',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '生得的行動と学習による行動の説明として正しいものはどれか。',
        correct: '生得的行動は経験がなくても生まれつき行うことができ、学習は経験によって行動が変化することである',
        wrong: ['生得的行動は経験によって獲得され、学習は生まれつき備わっている', '生得的行動はヒトだけに見られ、学習は他の動物だけに見られる', '刷込みは生得的行動であり、学習ではない'],
        explanation: '走性やかぎ刺激による行動は、経験がなくても生まれつき行うことができる生得的行動である。慣れ・刷込み・条件づけなどは経験によって行動が変化するので学習である。',
      };
    },
  },
];
