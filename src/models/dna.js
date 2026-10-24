// B9 DNAとタンパク質合成 / B10 DNAの塩基組成 で使う純粋関数
export const BASES = ['A', 'T', 'G', 'C'];
export const RNA_BASES = ['U', 'C', 'A', 'G'];
const DNA_PAIR = { A: 'T', T: 'A', G: 'C', C: 'G' };
const RNA_FROM_TEMPLATE = { A: 'U', T: 'A', G: 'C', C: 'G' };

export function complement(dna) {
  return [...dna].map((b) => DNA_PAIR[b]).join('');
}

// 鋳型鎖（DNA）から、相補的な塩基をもつ mRNA をつくる（転写）
export function transcribe(template) {
  return [...template].map((b) => RNA_FROM_TEMPLATE[b]).join('');
}

// 遺伝暗号表（標準）。終止コドンは null
const AA = {
  Phe: 'フェニルアラニン', Leu: 'ロイシン', Ile: 'イソロイシン', Met: 'メチオニン', Val: 'バリン',
  Ser: 'セリン', Pro: 'プロリン', Thr: 'トレオニン', Ala: 'アラニン', Tyr: 'チロシン',
  His: 'ヒスチジン', Gln: 'グルタミン', Asn: 'アスパラギン', Lys: 'リシン', Asp: 'アスパラギン酸',
  Glu: 'グルタミン酸', Cys: 'システイン', Trp: 'トリプトファン', Arg: 'アルギニン', Gly: 'グリシン',
};
export const AMINO = AA;
const TABLE_SRC = {
  Phe: 'UUU UUC', Leu: 'UUA UUG CUU CUC CUA CUG', Ile: 'AUU AUC AUA', Met: 'AUG', Val: 'GUU GUC GUA GUG',
  Ser: 'UCU UCC UCA UCG AGU AGC', Pro: 'CCU CCC CCA CCG', Thr: 'ACU ACC ACA ACG', Ala: 'GCU GCC GCA GCG',
  Tyr: 'UAU UAC', His: 'CAU CAC', Gln: 'CAA CAG', Asn: 'AAU AAC', Lys: 'AAA AAG', Asp: 'GAU GAC',
  Glu: 'GAA GAG', Cys: 'UGU UGC', Trp: 'UGG', Arg: 'CGU CGC CGA CGG AGA AGG', Gly: 'GGU GGC GGA GGG',
};
export const CODON_TABLE = {};
for (const [k, v] of Object.entries(TABLE_SRC)) for (const c of v.split(' ')) CODON_TABLE[c] = k;
for (const c of ['UAA', 'UAG', 'UGA']) CODON_TABLE[c] = null;
export const START = 'AUG';

export function aminoName(codon) {
  const k = CODON_TABLE[codon];
  return k === null ? '終止' : AA[k];
}

export function codonsOf(aaKey) {
  return Object.keys(CODON_TABLE).filter((c) => CODON_TABLE[c] === aaKey);
}

// mRNA を最初の AUG から3塩基ずつ読み、終止コドンで止める
// 返り値：{ start, codons: [{ codon, key, name, pos }], stopped }
export function translate(mrna, fromStart = true) {
  const start = fromStart ? mrna.indexOf(START) : 0;
  const out = { start, codons: [], stopped: false };
  if (start < 0) return out;
  for (let i = start; i + 3 <= mrna.length; i += 3) {
    const codon = mrna.slice(i, i + 3);
    const key = CODON_TABLE[codon];
    out.codons.push({ codon, key, name: key === null ? '終止' : AA[key], pos: i });
    if (key === null) {
      out.stopped = true;
      break;
    }
  }
  return out;
}

export function aminoSequence(mrna, fromStart = true) {
  return translate(mrna, fromStart).codons.filter((c) => c.key !== null).map((c) => c.key);
}

// 突然変異：置換・欠失・挿入（位置は0始まり）
export function substitute(seq, pos, base) {
  return seq.slice(0, pos) + base + seq.slice(pos + 1);
}
export function deleteAt(seq, pos) {
  return seq.slice(0, pos) + seq.slice(pos + 1);
}
export function insertAt(seq, pos, base) {
  return seq.slice(0, pos) + base + seq.slice(pos);
}

// 2つのアミノ酸配列を比べて、変異の影響を分類する
// kind：same（変わらない）／one（1つだけ変わる）／shorter（短くなる）／longer（長くなる）／many（2つ以上変わる）／nostart（翻訳が始まらない）
export function compareProteins(before, after) {
  if (before.length > 0 && after.length === 0) return { kind: 'nostart', first: 0 };
  const n = Math.min(before.length, after.length);
  let first = -1;
  for (let i = 0; i < n; i++) if (before[i] !== after[i]) { first = i; break; }
  if (first < 0 && before.length === after.length) return { kind: 'same', first: -1 };
  if (first < 0) return { kind: after.length < before.length ? 'shorter' : 'longer', first: n };
  let changed = 0;
  for (let i = 0; i < n; i++) if (before[i] !== after[i]) changed++;
  return { kind: changed === 1 && before.length === after.length ? 'one' : 'many', first, changed };
}

// ---- B10 塩基組成 ----
// 2本鎖DNAでは A＝T、G＝C（シャルガフの規則）。A の割合 a［%］から全塩基の割合を求める
export function compositionFromA(a) {
  const g = (100 - 2 * a) / 2;
  return { A: a, T: a, G: g, C: g };
}
export function compositionFromG(g) {
  const a = (100 - 2 * g) / 2;
  return { A: a, T: a, G: g, C: g };
}

// 1本鎖（鎖1）の組成から、相補鎖（鎖2）と2本鎖全体の組成を求める
export function strandComposition(s1) {
  const s2 = { A: s1.T, T: s1.A, G: s1.C, C: s1.G };
  const both = { A: (s1.A + s2.A) / 2, T: (s1.T + s2.T) / 2, G: (s1.G + s2.G) / 2, C: (s1.C + s2.C) / 2 };
  return { s1, s2, both };
}

// 10塩基対で約3.4 nm（1塩基対あたり 0.34 nm）。らせん1回転が10塩基対
export const NM_PER_BP = 0.34;
export const BP_PER_TURN = 10;
export function lengthNm(bp) {
  return bp * NM_PER_BP;
}

export const GENOMES = [
  { name: 'ヒト', bp: 3.0e9, genes: 20000 },
  { name: '大腸菌', bp: 4.6e6, genes: 4500 },
];
