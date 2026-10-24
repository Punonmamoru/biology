// 4択問題ジェネレーターの登録表
import { B1 } from './b1.js';
import { B2 } from './b2.js';
import { B3 } from './b3.js';
import { B4 } from './b4.js';
import { B5 } from './b5.js';
import { generate } from './common.js';

export const GENERATORS = [...B1, ...B2, ...B3, ...B4, ...B5];

export function generatorById(id) {
  return GENERATORS.find((g) => g.id === id) || null;
}

export function questionFrom(id, seed) {
  const g = generatorById(id);
  return g ? generate(g, seed) : null;
}
