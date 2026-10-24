// B9 DNAとタンパク質合成 の図解道場
import { h } from '../lib/dom.js';
import { slider, segmented, explainBox, panel, modelNote } from './common.js';
import { transcribe, translate, aminoSequence, substitute, deleteAt, insertAt, compareProteins, CODON_TABLE, AMINO, RNA_BASES, BASES } from '../models/dna.js';

// もとの遺伝子の鋳型鎖。mRNA は UC｜AUG GCU UGG AAA GAC CUU UAC GGC UAA｜UUGAGUAA
// （開始コドンの前と終止コドンの後ろにも塩基を置き、読み枠がずれたときにも先に終止コドンが現れるようにした）
export const TEMPLATE = 'AGTACCGAACCTTTCTGGAAATGCCGATTAACTCATT';
const CORE_START = 2; // 開始コドンの位置（0始まり）
const CORE_END = 29; // 終止コドンの直後の位置
const COMP = { A: 'T', T: 'A', G: 'C', C: 'G' };
const other = (s) => [...s].map((b) => COMP[b]).join('');

function blocks(template, mutPos, mutType) {
  const mrna = transcribe(template);
  const tr = translate(mrna);
  const out = [];
  const start = tr.start < 0 ? mrna.length : tr.start;
  if (start > 0) out.push({ dna: template.slice(0, start), rna: mrna.slice(0, start), aa: '', lead: true, from: 0 });
  for (const c of tr.codons) out.push({ dna: template.slice(c.pos, c.pos + 3), rna: c.codon, aa: c.name, stop: c.key === null, from: c.pos });
  const end = tr.codons.length ? tr.codons[tr.codons.length - 1].pos + 3 : start;
  if (end < mrna.length) out.push({ dna: template.slice(end), rna: mrna.slice(end), aa: '', tail: true, open: tr.start >= 0 && !tr.stopped, from: end });
  return out.map((b) => ({ ...b, mark: mutType !== 'none' && mutPos >= b.from && mutPos < b.from + b.dna.length ? mutPos - b.from : -1 }));
}

function seqRow(title, bl, changed) {
  return h('div', { class: 'seq-row' },
    h('div', { class: 'seq-title small' }, title),
    h('div', { class: 'seq-blocks' }, ...bl.map((b, i) => {
      const letters = (s) => [...s].map((ch, k) => h('span', { class: k === b.mark ? 'mut' : null }, ch));
      return h('div', { class: 'codon' + (b.lead || b.tail ? ' outside' : i % 2 ? ' alt' : '') + (changed && changed.has(i) ? ' changed' : '') + (b.stop ? ' stop' : '') },
        h('div', { class: 'seq' }, ...letters(b.dna)),
        h('div', { class: 'seq rna' }, ...letters(b.rna)),
        h('div', { class: 'aa' }, b.lead ? '（翻訳されない）' : b.tail ? (b.open ? '（この先へ続く）' : '（終止後）') : b.aa + (changed && changed.has(i) ? ' ※' : '')),
      );
    })),
  );
}

export const dojo = {
  tasks: [
    { id: 'missense', text: '「置換」で、アミノ酸が1つだけ別のものに変わる突然変異をつくろう。', short: 'アミノ酸が1つ変わる置換' },
    { id: 'silent', text: '「置換」で、塩基は変わってもアミノ酸配列が変わらない突然変異を見つけよう。', short: 'アミノ酸が変わらない置換' },
    { id: 'nonsense', text: '「置換」で、途中に終止コドンができてタンパク質が短くなる突然変異をつくろう。', short: '終止コドンができる置換' },
    { id: 'frameshift', text: '「欠失」で、変異した位置より後ろのアミノ酸が次々に変わる（読み枠がずれる）ことを確かめよう。', short: '欠失でフレームシフト' },
  ],
  mount(root, ctx) {
    const st = { type: 'none', pos: 7, base: 'T' };

    const top = panel(null);
    root.append(top);
    top.append(h('h2', null, 'DNA → mRNA → アミノ酸 ', modelNote('模式的な短い遺伝子')));
    const view = h('div', { class: 'seq-view', 'aria-live': 'polite' });
    top.append(
      h('p', { class: 'small muted' }, '各ブロックの上段がDNAの鋳型鎖、中段がmRNA（転写）、下段がアミノ酸（翻訳）。鋳型鎖とmRNAは塩基どうしが向かい合うように並べている（「生物」で学ぶ向きでは、鋳型鎖は左が3′末端、mRNAは左が5′末端）。mRNAは最初のAUG（開始コドン）から3塩基ずつ読まれ、終止コドンで翻訳が終わる。突然変異（置換・欠失・挿入）は「生物」で詳しく学ぶ内容。'),
      view,
    );

    const segType = segmented({ label: '突然変異の種類', options: [{ value: 'none', label: 'なし' }, { value: 'sub', label: '置換' }, { value: 'del', label: '欠失' }, { value: 'ins', label: '挿入' }], value: st.type, onChange: (v) => { st.type = v; update(); } });
    const sPos = slider({ label: '鋳型鎖の何番目の塩基か', min: 1, max: TEMPLATE.length, step: 1, value: st.pos, format: (v) => `${v} 番目（もとの塩基 ${TEMPLATE[v - 1]}）`, onInput: (v) => { st.pos = v; update(); } });
    const segBase = segmented({ label: '置換後・挿入する塩基（鋳型鎖）', options: BASES.map((b) => ({ value: b, label: b })), value: st.base, onChange: (v) => { st.base = v; update(); } });
    const exp = explainBox();
    const tableBox = h('div', { class: 'table-scroll' });
    root.append(
      panel('操作', segType.el, sPos.el, segBase.el),
      panel('いま何が起きているか', exp.el),
      panel('遺伝暗号表（mRNAのコドン → アミノ酸）', h('p', { class: 'small muted' }, 'いまの（突然変異後の）mRNAで使われているコドンを太字で示す。'), tableBox),
    );

    function mutate() {
      const i = st.pos - 1;
      if (st.type === 'sub') return substitute(TEMPLATE, i, st.base);
      if (st.type === 'del') return deleteAt(TEMPLATE, i);
      if (st.type === 'ins') return insertAt(TEMPLATE, i, st.base);
      return TEMPLATE;
    }

    function update() {
      const mut = mutate();
      const before = aminoSequence(transcribe(TEMPLATE));
      const after = aminoSequence(transcribe(mut));
      const cmp = compareProteins(before, after);
      const blA = blocks(TEMPLATE, -1, 'none');
      const blB = blocks(mut, st.pos - 1, st.type);
      // 変わったアミノ酸のブロック番号
      const changed = new Set();
      let k = 0;
      blB.forEach((b, idx) => {
        if (b.lead || b.tail) return;
        if (b.stop) {
          if (k < before.length) changed.add(idx);
          return;
        }
        if (before[k] !== CODON_TABLE[b.rna]) changed.add(idx);
        k++;
      });
      view.replaceChildren(...[seqRow('もとの遺伝子', blA), st.type === 'none' ? null : seqRow('突然変異後', blB, changed)].filter(Boolean));
      sPos.setRange(1, TEMPLATE.length);

      const lines = [];
      const name = (key) => AMINO[key];
      lines.push(`もとのタンパク質：${before.map(name).join('－')}（アミノ酸 ${before.length} 個）。`);
      if (st.type === 'none') {
        lines.push('DNAの鋳型鎖の塩基に相補的な塩基をもつmRNAがつくられる（転写）。このとき、DNAのAに対してはmRNAのU（ウラシル）が対応する。mRNAの3つの塩基の並び（コドン）が1つのアミノ酸を指定し、その順にアミノ酸がつながってタンパク質ができる（翻訳）。');
        lines.push('上の「突然変異の種類」を選んで、塩基の置換・欠失・挿入がタンパク質にどう影響するか比べてみよう。');
      } else {
        lines.push(after.length ? `突然変異後：${after.map(name).join('－')}（アミノ酸 ${after.length} 個）。` : '突然変異後：アミノ酸 0 個（翻訳されない）。');
        const i0 = st.pos - 1;
        const indel = st.type !== 'sub';
        const what = st.type === 'sub' ? '置換' : st.type === 'del' ? '欠失' : '挿入';
        const shift = `${what}によって、それより後ろのコドンの区切り（読み枠）が1塩基ずれた（フレームシフト）。`;
        if (mut === TEMPLATE) lines.push('もとと同じ塩基を選んでいるので、変化はない。別の塩基を選ぼう。');
        else if (cmp.kind === 'nostart') lines.push(`開始コドン（AUG）が${what}でこわれたので、翻訳が始まらず、このタンパク質はつくられない。途中に終止コドンができる場合とは別の現象である。`);
        else if (cmp.kind === 'same') {
          if (i0 < CORE_START || (st.type === 'ins' && i0 === CORE_START)) lines.push('開始コドンより前（翻訳されない部分）の変化なので、タンパク質は変わらない。');
          else if (i0 >= CORE_END) lines.push('終止コドンより後ろ（翻訳されない部分）の変化なので、タンパク質は変わらない。');
          else if (i0 >= CORE_END - 3) lines.push('終止コドンの中の変化だが、別の終止コドン（終止コドンは UAA・UAG・UGA の3種類）になったので、タンパク質は変わらない。');
          else if (!indel) lines.push('塩基が置換されたが、アミノ酸は変わらなかった。1つのアミノ酸を指定するコドンが複数あるため（特に3番目の塩基の違い）、置換がタンパク質に影響しないことがある。');
          else lines.push(`${what}が起こったが、新しくできた開始コドンから読み始めたため、アミノ酸配列は変わらなかった。読み枠がずれても、いつもタンパク質が変わるとは限らない。`);
        } else if (!indel) {
          if (cmp.kind === 'one') lines.push('置換によってコドンが1つ変わり、アミノ酸が1つだけ別のものに変わった。置換では、ほかのコドンの読み方は変わらない。鎌状赤血球貧血症は、このような1塩基の置換でヘモグロビンのアミノ酸が1つ変わって起こる。');
          else if (cmp.kind === 'shorter') lines.push('置換によって途中に終止コドンができ、そこで翻訳が止まってタンパク質が短くなった。はたらきを失うことが多い。');
          else if (cmp.kind === 'longer') lines.push('終止コドンが置換によってアミノ酸を指定するコドンに変わったので、翻訳がその先まで続き、タンパク質が長くなった。');
          else lines.push('置換によってアミノ酸配列が変わった。');
        } else if (cmp.kind === 'shorter') {
          lines.push(`${shift}そのため変異した位置より後ろのアミノ酸が変わり、途中で終止コドンが現れてタンパク質が短くなった。1塩基の置換に比べて、タンパク質への影響が大きくなりやすい。`);
        } else if (cmp.kind === 'one') {
          lines.push(`${shift}ただしこの位置では、すぐあとが元の読み方とそろったため、アミノ酸が1つ変わっただけですんだ。`);
        } else {
          lines.push(`${shift}そのため変異した位置より後ろのアミノ酸が次々に変わった。1塩基の置換に比べて、タンパク質への影響が大きくなりやすい。`);
        }
        if (cmp.kind !== 'nostart' && !translate(transcribe(mut)).stopped && after.length) lines.push('終止コドンがなくなったので、この図の範囲を越えて翻訳が続く。');
      }
      exp.set(lines);

      // 遺伝暗号表
      const used = new Set(blocks(mut, -1, 'none').filter((b) => !b.lead && !b.tail).map((b) => b.rna));
      const cell = (c) => {
        const key = CODON_TABLE[c];
        return h('div', { class: used.has(c) ? 'used' : null }, `${c} ${key === null ? '終止' : AMINO[key]}${c === 'AUG' ? '（開始）' : ''}`);
      };
      tableBox.replaceChildren(h('table', { class: 'data codon-table' },
        h('thead', null, h('tr', null, h('th', null, '1番目＼2番目'), ...RNA_BASES.map((b) => h('th', null, b)))),
        h('tbody', null, ...RNA_BASES.map((b1) => h('tr', null, h('th', null, b1), ...RNA_BASES.map((b2) => h('td', null, ...RNA_BASES.map((b3) => cell(b1 + b2 + b3))))))),
      ));
      ctx.update({ ...st, changedTemplate: mut !== TEMPLATE, kind: cmp.kind, first: cmp.first, before: before.length, after: after.length });
    }
    update();
    return null;
  },
};

// 鋳型鎖ともう一方の鎖の関係を確認する（読み込み時の自己点検）
if (transcribe(TEMPLATE) !== other(TEMPLATE).replace(/T/g, 'U')) throw new Error('B9: TEMPLATE が不正です');

dojo.tasks[0].check = (s) => s.type === 'sub' && s.kind === 'one';
dojo.tasks[1].check = (s) => s.type === 'sub' && s.changedTemplate && s.kind === 'same' && s.pos - 1 >= CORE_START && s.pos - 1 < CORE_END - 3;
dojo.tasks[2].check = (s) => s.type === 'sub' && s.kind === 'shorter' && s.after > 0;
dojo.tasks[3].check = (s) => s.type === 'del' && (s.kind === 'many' || s.kind === 'shorter' || s.kind === 'longer') && s.first >= 0 && s.first < s.before - 1;
