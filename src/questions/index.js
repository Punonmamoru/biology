// 4択問題ジェネレーターの登録表
import { B1 } from './b1.js';
import { B2 } from './b2.js';
import { B3 } from './b3.js';
import { B4 } from './b4.js';
import { B5 } from './b5.js';
import { B6 } from './b6.js';
import { B7 } from './b7.js';
import { B8 } from './b8.js';
import { B9 } from './b9.js';
import { B10 } from './b10.js';
import { B11 } from './b11.js';
import { B12 } from './b12.js';
import { A1 } from './a1.js';
import { A2 } from './a2.js';
import { A3 } from './a3.js';
import { A4 } from './a4.js';
import { A5 } from './a5.js';
import { A6 } from './a6.js';
import { A7 } from './a7.js';
import { A8 } from './a8.js';
import { A9 } from './a9.js';
import { A10 } from './a10.js';
import { A11 } from './a11.js';
import { A12 } from './a12.js';
import { A13 } from './a13.js';
import { A14 } from './a14.js';
import { A15 } from './a15.js';
import { A16 } from './a16.js';
import { A17 } from './a17.js';
import { A18 } from './a18.js';
import { A19 } from './a19.js';
import { A20 } from './a20.js';
import { A21 } from './a21.js';
import { generate } from './common.js';

export const GENERATORS = [...B1, ...B2, ...B3, ...B4, ...B5, ...B6, ...B7, ...B8, ...B9, ...B10, ...B11, ...B12, ...A1, ...A2, ...A3, ...A4, ...A5, ...A6, ...A7, ...A8, ...A9, ...A10, ...A11, ...A12, ...A13, ...A14, ...A15, ...A16, ...A17, ...A18, ...A19, ...A20, ...A21];

export function generatorById(id) {
  return GENERATORS.find((g) => g.id === id) || null;
}

export function questionFrom(id, seed) {
  const g = generatorById(id);
  return g ? generate(g, seed) : null;
}
