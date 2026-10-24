// 表示テーマ（自動 / ライト / ダーク）
import { loadJSON, saveJSON } from './storage.js';
import { redrawAllCharts } from './chart.js';

const ORDER = ['auto', 'light', 'dark'];
const NAMES = { auto: '自動（端末の設定に合わせる）', light: 'ライト', dark: 'ダーク' };

export function currentTheme() {
  const t = loadJSON('theme', 'auto');
  return ORDER.includes(t) ? t : 'auto';
}

export function applyTheme(t) {
  const root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
  redrawAllCharts();
}

export function setTheme(t) {
  saveJSON('theme', t);
  applyTheme(t);
}

export function cycleTheme() {
  const t = ORDER[(ORDER.indexOf(currentTheme()) + 1) % ORDER.length];
  setTheme(t);
  return NAMES[t];
}

export function themeName(t) {
  return NAMES[t];
}

export function initTheme() {
  applyTheme(currentTheme());
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => redrawAllCharts();
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  } catch (e) {
    /* 古いブラウザでは無視 */
  }
}
