// エントリーポイント：画面の切替（ハッシュルーター）
import { h, clear, toast } from './lib/dom.js';
import { initTheme, cycleTheme } from './lib/theme.js';
import { renderHome } from './ui/home.js';
import { renderDojo } from './ui/dojo.js';
import { renderRush } from './ui/rush.js';
import { renderMiss } from './ui/miss.js';
import { renderGlossary } from './ui/glossary.js';
import { stageById } from './stages.js';

const app = document.getElementById('app');
const backBtn = document.getElementById('btn-back');
let cleanup = null;

function notFound() {
  app.append(h('div', { class: 'panel' }, h('p', null, 'ページが見つかりません。'), h('a', { class: 'btn', href: '#/home' }, 'ホームへ')));
}

const ROUTES = {
  home: () => renderHome(app),
  dojo: (id) => (stageById(id) ? renderDojo(app, id) : notFound()),
  rush: (id) => renderRush(app, id || ''),
  miss: () => renderMiss(app),
  glossary: (id) => renderGlossary(app, id),
};

function route() {
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  clear(app);
  const parts = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
  const [name, ...args] = parts;
  const fn = ROUTES[name];
  backBtn.hidden = name === 'home' || !fn;
  if (!fn) notFound();
  else cleanup = fn(...args.map(decodeURIComponent));
  window.scrollTo(0, 0);
  app.focus({ preventScroll: true });
}

backBtn.addEventListener('click', () => {
  if (history.length > 1 && sessionStorageSafe()) history.back();
  else location.hash = '#/home';
});

function sessionStorageSafe() {
  // アプリ内で一度でも画面遷移していれば戻る、そうでなければホームへ
  return route.navigated === true;
}

document.getElementById('btn-theme').addEventListener('click', () => {
  toast('表示：' + cycleTheme());
});

window.addEventListener('hashchange', () => {
  route.navigated = true;
  route();
});

initTheme();
route();
