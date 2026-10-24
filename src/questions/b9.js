// B9 DNAとタンパク質合成 の問題
import { fmt } from '../lib/format.js';
import { KATA, distinctNumbers } from './common.js';
import { transcribe, complement, translate, CODON_TABLE, AMINO, aminoSequence, substitute, deleteAt } from '../models/dna.js';

const SENSE = Object.keys(CODON_TABLE).filter((c) => CODON_TABLE[c] !== null && c !== 'AUG');
const STOPS = ['UAA', 'UAG', 'UGA'];
const toTemplate = (mrna) => [...mrna].map((b) => ({ A: 'T', U: 'A', G: 'C', C: 'G' })[b]).join('');
const aaNames = (keys) => keys.map((k) => AMINO[k]).join('－');

// 開始コドン＋n個のコドン＋終止コドンの mRNA（アミノ酸がすべて異なるもの）
function randomGene(rng, n) {
  for (let t = 0; t < 200; t++) {
    const cods = ['AUG'];
    for (let i = 0; i < n; i++) cods.push(rng.pick(SENSE));
    const keys = cods.map((c) => CODON_TABLE[c]);
    if (new Set(keys).size === keys.length) return { codons: [...cods, rng.pick(STOPS)], keys };
  }
  return null;
}

// 問題文に添える遺伝暗号表の抜粋
function tableExcerpt(rng, codons, extra = 3) {
  const set = new Set(codons);
  const others = rng.shuffle(Object.keys(CODON_TABLE).filter((c) => !set.has(c)));
  for (let i = 0; i < extra; i++) set.add(others[i]);
  return [...set].sort().map((c) => `${c}：${CODON_TABLE[c] === null ? '終止' : AMINO[CODON_TABLE[c]]}`).join('、');
}

export const B9 = [
  {
    id: 'b9-transcribe',
    stage: 'b9',
    level: 1,
    kind: 'calc',
    make(rng) {
      const len = 9;
      let tpl = '';
      for (let i = 0; i < len; i++) tpl += rng.pick(['A', 'T', 'G', 'C']);
      const mrna = transcribe(tpl);
      const wrongDNA = complement(tpl); // U ではなく T を使う誤り
      const same = tpl.replace(/T/g, 'U'); // 相補にしない誤り
      const swapAU = [...tpl].map((b) => ({ A: 'T', T: 'A', G: 'C', C: 'G' })[b]).join('').replace(/A/g, 'U').replace(/T/g, 'A');
      const r = (x) => `5′-${x}-3′`;
      return {
        text: `DNAの鋳型となる鎖の塩基配列が 3′-${tpl}-5′ であるとき、転写によってつくられるmRNAの塩基配列はどれか。ただし、mRNAは鋳型鎖と塩基どうしが向かい合うように、左からそろえて書くものとする。`,
        correct: r(mrna),
        wrong: [wrongDNA, same, swapAU, substitute(mrna, 4, mrna[4] === 'G' ? 'C' : 'G'), substitute(mrna, 1, mrna[1] === 'A' ? 'U' : 'A')].map(r),
        explanation: `鋳型鎖の A・T・G・C に対して、mRNAには U・A・C・G が対応するので ${mrna} となる。RNAはT（チミン）の代わりにU（ウラシル）をもつから、DNAのAに対応するのはUである。`,
      };
    },
  },
  {
    id: 'b9-translate',
    stage: 'b9',
    level: 2,
    kind: 'calc',
    make(rng) {
      const g = randomGene(rng, 3);
      if (!g) return this.make(rng);
      const mrna = g.codons.join('');
      const lead = rng.pick(['G', 'CU', 'GCA', 'UC']);
      const seq = lead + mrna;
      const correct = aaNames(g.keys);
      const shifted = aminoSequence(seq.slice(1), false).slice(0, 4);
      const wrong = [
        aaNames(g.keys.slice().reverse()),
        aaNames([...g.keys.slice(0, 3), g.keys[3] === 'Met' ? 'Gly' : 'Met']),
        aaNames(g.keys.slice(1)) + '－終止',
        shifted.length >= 3 ? aaNames(shifted) : aaNames(['Met', g.keys[1], g.keys[3], g.keys[2]]),
        aaNames(['Met', g.keys[2], g.keys[1], g.keys[3]]),
      ];
      return {
        text: `あるmRNAの塩基配列は ${seq} である。翻訳は最初のAUG（開始コドン）から始まり、終止コドンで終わる。必要な遺伝暗号は次のとおり（${tableExcerpt(rng, g.codons)}）。指定されるアミノ酸の配列はどれか。`,
        correct,
        wrong,
        explanation: `最初のAUGから3塩基ずつ区切ると ${g.codons.join('｜')} となり、${correct} のあと終止コドンで翻訳が終わる。mRNAの3つの塩基の並び（コドン）が1つのアミノ酸を指定し、終止コドンに対応するアミノ酸はないからである。`,
      };
    },
  },
  {
    id: 'b9-template-aa',
    stage: 'b9',
    level: 3,
    kind: 'calc',
    make(rng) {
      const g = randomGene(rng, 2);
      if (!g) return this.make(rng);
      const mrna = g.codons.join('');
      const tpl = toTemplate(mrna);
      const correct = aaNames(g.keys);
      // よくある誤り：鋳型鎖をそのまま（T→U）mRNAとして読む
      const asIs = tpl.replace(/T/g, 'U');
      const wrongRead = aminoSequence(asIs, false).slice(0, 3);
      const wrong = [
        wrongRead.length === 3 ? aaNames(wrongRead) : aaNames(['Met', g.keys[2], g.keys[1]]),
        aaNames(['Met', g.keys[2], g.keys[1]]),
        aaNames(g.keys.slice(1)),
        aaNames([g.keys[1], g.keys[2], 'Met']),
      ];
      return {
        text: `DNAの鋳型となる鎖の塩基配列が 3′-${tpl}-5′ である（左端から転写されるmRNAの塩基と向かい合う）。この部分から転写されたmRNAが翻訳されるとき、指定されるアミノ酸の配列はどれか。必要な遺伝暗号は次のとおり（${tableExcerpt(rng, [...g.codons, ...asIs.match(/.{3}/g)], 1)}）。`,
        correct,
        wrong,
        explanation: `鋳型鎖に相補的なmRNAは ${g.codons.join('｜')} で、これを開始コドンから読むと ${correct} となる。鋳型鎖の塩基配列をそのまま読むのではなく、相補的な塩基をもつmRNAに直してからコドンを読むからである。`,
      };
    },
  },
  {
    id: 'b9-count-calc',
    stage: 'b9',
    level: 2,
    kind: 'calc',
    make(rng) {
      const n = rng.pick([100, 150, 200, 250, 300, 400, 500]);
      const ask = rng.pick(['mrna', 'dna', 'aa']);
      if (ask === 'aa') {
        const bases = 3 * n;
        const d = distinctNumbers(n, [bases, bases / 2, bases / 6, n - 1, n * 2], ' 個', 0);
        return {
          text: `あるmRNAのうち、開始コドンから終止コドンの直前までの塩基数は ${bases} 個であった。このmRNAから翻訳されるタンパク質のアミノ酸の数は何個か。`,
          correct: d.correct,
          wrong: d.wrong,
          ordered: true,
          explanation: `3つの塩基で1つのアミノ酸が指定されるので、${bases} ÷ 3 ＝ ${n} 個となる。終止コドンはアミノ酸を指定しないから、終止コドンの直前までの塩基数を3でわればよい。`,
        };
      }
      if (ask === 'mrna') {
        const d = distinctNumbers(3 * n, [n, 2 * n, 6 * n, 4 * n, 3 * n + 3], ' 個', 0);
        return {
          text: `アミノ酸 ${n} 個からなるタンパク質を指定するmRNAの部分（終止コドンは含めない）は、少なくとも何個の塩基からなるか。`,
          correct: d.correct,
          wrong: d.wrong,
          ordered: true,
          explanation: `1つのアミノ酸はmRNAの3つの塩基（コドン）で指定されるので、${n} × 3 ＝ ${3 * n} 個となる。終止コドンを含めない場合は、アミノ酸の数の3倍だけの塩基が必要だからである。`,
        };
      }
      const d = distinctNumbers(6 * n, [3 * n, n, 2 * n, 12 * n, 6 * n + 6], ' 個', 0);
      return {
        text: `アミノ酸 ${n} 個からなるタンパク質を指定する2本鎖DNAの部分（終止コドンに対応する部分は含めない）には、塩基が全部で少なくとも何個あるか。`,
        correct: d.correct,
        wrong: d.wrong,
        ordered: true,
        explanation: `mRNAでは ${n} × 3 ＝ ${3 * n} 個の塩基が必要で、DNAは2本鎖なので塩基の数はその2倍の ${6 * n} 個となる。転写されるのは2本鎖のうちの1本（鋳型鎖）だが、相補的なもう1本の鎖にも同じ数の塩基があるからである。`,
      };
    },
  },
  {
    id: 'b9-triplet',
    stage: 'b9',
    level: 2,
    kind: 'term',
    make() {
      return {
        text: '遺伝暗号で、1つのアミノ酸が3つの塩基の並びで指定されている理由として最も適当なものはどれか。',
        correct: '2つの塩基の並びでは4²＝16通りで、20種類のアミノ酸を区別できないが、3つなら4³＝64通りあるから',
        wrong: ['3つの塩基でちょうど20通りの組合せになるから', 'DNAが3本の鎖からできているから', '2つの塩基の並びでは4×2＝8通りしかないから'],
        explanation: '塩基は4種類なので、2つの並びでは16通りしかなく20種類のアミノ酸に足りない。3つの並びなら64通りになり、20種類のアミノ酸と終止の指定に十分なので、1つのアミノ酸を複数のコドンが指定することもある。',
      };
    },
  },
  {
    id: 'b9-mutation-term',
    stage: 'b9',
    level: 2,
    kind: 'term',
    make(rng) {
      if (rng.chance(0.5)) {
        return {
          text: '【生物の内容】遺伝子の途中で1塩基が欠失したとき、つくられるタンパク質への影響として最も適当なものはどれか。',
          correct: 'それより後ろのコドンの読み枠がずれ、多くのアミノ酸が変わったり途中で翻訳が止まったりする',
          wrong: ['欠失した塩基を含むコドンのアミノ酸が1つだけ変わる', 'アミノ酸が1つだけ減り、ほかはすべて同じになる', 'タンパク質にはまったく影響しない'],
          explanation: '1塩基の欠失では、それより後ろのコドンの区切りが1つずつずれる（フレームシフト）。そのため後ろのアミノ酸が次々に変わったり、途中に終止コドンが現れたりするから、タンパク質のはたらきが失われやすい。',
        };
      }
      return {
        text: '【生物の内容】遺伝子の1塩基が別の塩基に置換されても、つくられるタンパク質のアミノ酸配列が変わらないことがある。その理由として最も適当なものはどれか。',
        correct: '1つのアミノ酸を指定するコドンが複数あり、置換後のコドンも同じアミノ酸を指定することがあるから',
        wrong: ['置換された塩基はすぐに元の塩基に戻されるから', 'mRNAは3つ目ごとの塩基しか読まれないから', '置換が起こるとその遺伝子は転写されなくなるから'],
        explanation: '遺伝暗号は64通りで、20種類のアミノ酸より多いので、1つのアミノ酸を複数のコドンが指定することが多い。置換によってコドンが変わっても、同じアミノ酸を指定するコドンになれば、アミノ酸配列は変わらないからである。',
      };
    },
  },
  {
    id: 'b9-mutation-calc',
    stage: 'b9',
    level: 3,
    kind: 'calc',
    make(rng) {
      const g = randomGene(rng, 3);
      if (!g) return this.make(rng);
      const mrna = g.codons.join('');
      const tpl = toTemplate(mrna);
      const del = rng.chance(0.5);
      const pos = rng.int(3, 8); // 2番目〜3番目のコドンの中（0始まり）
      const ci = Math.floor(pos / 3);
      const mut = del ? deleteAt(tpl, pos) : substitute(tpl, pos, rng.pick(['A', 'T', 'G', 'C'].filter((x) => x !== tpl[pos])));
      const after = transcribe(mut);
      // 開始コドンから4つ目のコドンまでを読む（終止コドンが先に来たらそこまで）
      const read4 = (m) => {
        const out = [];
        for (let i = 0; i + 3 <= m.length && out.length < 4; i += 3) {
          const k = CODON_TABLE[m.slice(i, i + 3)];
          if (k === null) return aaNames(out) + '（ここで終止）';
          out.push(k);
        }
        return aaNames(out);
      };
      const correct = read4(after);
      // よくある誤り：欠失なのに変異したコドンだけが変わると考える／置換なのに後ろがすべてずれると考える
      const inFrame = g.keys.slice(0, 4);
      const mutCodon = CODON_TABLE[after.slice(ci * 3, ci * 3 + 3)];
      const oneChanged = mutCodon == null ? aaNames(inFrame.slice(0, ci)) + '（ここで終止）' : aaNames(inFrame.map((k, i) => (i === ci ? mutCodon : k)));
      const shifted = read4(transcribe(deleteAt(tpl, pos)));
      const subst = read4(transcribe(substitute(tpl, pos, tpl[pos] === 'A' ? 'G' : 'A')));
      const swap = aaNames([inFrame[0], inFrame[2], inFrame[1], inFrame[3]]);
      const wrongs = [aaNames(inFrame), del ? oneChanged : shifted, del ? subst : oneChanged, swap, aaNames([inFrame[0], inFrame[1], inFrame[3], inFrame[2]]), aaNames(inFrame.slice().reverse())];
      const codonsAfter = after.slice(0, Math.min(12, Math.floor(after.length / 3) * 3)).match(/.{3}/g);
      return {
        text: `【生物の内容】DNAの鋳型鎖 3′-${tpl}-5′ から転写・翻訳されると ${aaNames(g.keys)} のアミノ酸配列ができる。この鋳型鎖の左から${pos + 1}番目の塩基が${del ? '欠失' : `${mut[pos]}に置換`}したとき、開始コドン（左端のAUG）から4つ目のコドンまでに指定されるアミノ酸の配列はどれか。必要な遺伝暗号は次のとおり（${tableExcerpt(rng, [...g.codons, ...codonsAfter], 0)}）。`,
        correct,
        wrong: wrongs.filter((w) => w !== correct),
        explanation: `変異後の鋳型鎖から転写されるmRNAは ${codonsAfter.join('｜')}… で、開始コドンから読むと ${correct} となる。${del ? '欠失では変異した位置より後ろの読み枠が1塩基ずれるので、後ろのアミノ酸が次々に変わりやすいからである。' : '置換では変異したコドンだけが変わり、ほかのコドンの読み方は変わらないからである。'}`,
      };
    },
  },
  {
    id: 'b9-rna-graph',
    stage: 'b9',
    level: 1,
    kind: 'graph',
    make(rng) {
      // ア〜ウ：2本鎖DNA・mRNA・どちらでもない（Tをもち、A≠Tの例として1本鎖DNA）のいずれか
      const a = rng.int(22, 32);
      const dsDNA = { A: a, T: a, G: 50 - a, C: 50 - a, U: 0 };
      const r1 = rng.int(20, 34), r2 = rng.int(16, 28), r3 = rng.int(18, 30);
      const rna = { A: r1, T: 0, G: r2, C: r3, U: 100 - r1 - r2 - r3 };
      const order = rng.shuffle(['dna', 'rna']);
      const data = { dna: dsDNA, rna };
      const ask = rng.pick(['dna', 'rna']);
      const idx = order.indexOf(ask);
      const cats = ['A', 'T', 'G', 'C', 'U'];
      return {
        text: `図のア・イは、ある生物から取り出した2本鎖DNAとmRNAのいずれかの塩基組成（%）である。${ask === 'rna' ? 'mRNA' : '2本鎖DNA'}はどちらか。理由とともに選べ。`,
        chart: {
          x: { min: 0, max: 1 },
          y: { min: 0, max: 50, label: '割合（%）', step: 10 },
          bars: { categories: cats, groups: order.map((k, i) => ({ label: KATA[i], values: cats.map((c) => data[k][c]), color: i ? 'c2' : 'c1' })) },
          alt: '2種類の核酸ア・イの塩基組成の棒グラフ',
        },
        correct: ask === 'rna' ? `${KATA[idx]}：Tの代わりにUを含むから` : `${KATA[idx]}：Tを含み、A＝T、G＝Cになっているから`,
        wrong: ask === 'rna'
          ? [`${KATA[1 - idx]}：Tの代わりにUを含むから`, `${KATA[1 - idx]}：A＝T、G＝Cになっているから`, `${KATA[idx]}：A＝T、G＝Cになっているから`]
          : [`${KATA[1 - idx]}：Tを含み、A＝T、G＝Cになっているから`, `${KATA[1 - idx]}：Uを含むから`, `${KATA[idx]}：Uを含むから`],
        explanation: `${ask === 'rna' ? 'mRNA' : '2本鎖DNA'}は${KATA[idx]}である。RNAは塩基にTではなくUをもち、2本鎖DNAではAとT、GとCが対をつくるのでA＝T、G＝Cになるから、塩基組成で区別できる。`,
      };
    },
  },
  {
    id: 'b9-central-term',
    stage: 'b9',
    level: 1,
    kind: 'term',
    make(rng) {
      const Q = [
        { text: 'DNAの塩基配列をもとにmRNAがつくられる過程を何というか。', correct: '転写', wrong: ['翻訳', '複製', '分化'], explanation: 'この過程を転写という。DNAの遺伝情報を、相補的な塩基をもつRNAに写しとる過程だからである。' },
        { text: 'mRNAの塩基配列をもとにタンパク質がつくられる過程を何というか。', correct: '翻訳', wrong: ['転写', '複製', '分化'], explanation: 'この過程を翻訳という。塩基の並びという情報を、アミノ酸の並びという別の情報に置きかえる過程だからである。' },
        { text: 'RNAについての説明として正しいものはどれか。', correct: '糖はリボースで、塩基はA・U・G・Cの4種類であり、ふつう1本鎖である', wrong: ['糖はデオキシリボースで、塩基はA・T・G・Cの4種類である', '糖はリボースで、塩基はA・T・G・C・Uの5種類である', 'ふつう2本鎖で、二重らせん構造をとる'], explanation: 'RNAの糖はリボースで、塩基はA・U・G・Cの4種類であり、ふつう1本鎖である。DNAとちがって塩基のTの代わりにUをもつので、DNAとは構成が異なる。' },
        { text: '真核生物の細胞で、転写と翻訳が行われる場所の組合せとして正しいものはどれか。', correct: '転写は核の中、翻訳は細胞質（リボソーム）', wrong: ['転写は細胞質、翻訳は核の中', 'どちらも核の中', 'どちらもミトコンドリアの中'], explanation: '転写は核の中、翻訳は細胞質のリボソームで行われる。DNAは核の中にあるので転写は核内で起こり、できたmRNAが核膜孔から細胞質へ出て翻訳されるからである。' },
      ];
      return rng.pick(Q);
    },
  },
];
