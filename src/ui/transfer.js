// 引き継ぎコード・設定
import { h, toast } from '../lib/dom.js';
import { getProgress, replaceProgress, setFlag, emptyProgress } from '../progress.js';
import { encodeProgress, decodeProgress } from '../transfer.js';
import { checkBadges } from '../badges.js';
import { storageAvailable } from '../lib/storage.js';
import { currentTheme, setTheme, themeName } from '../lib/theme.js';
import { segmented } from '../dojo/common.js';

async function copyText(text, area) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    try {
      area.focus();
      area.select();
      return document.execCommand('copy');
    } catch (e2) {
      return false;
    }
  }
}

export function renderTransfer(app) {
  const outArea = h('textarea', { class: 'code', readonly: true, 'aria-label': 'あなたの引き継ぎコード', id: 'code-out' });
  const inArea = h('textarea', { class: 'code', 'aria-label': '読み込む引き継ぎコード', id: 'code-in', placeholder: 'BIO1- で始まるコードを貼り付ける' });
  const msg = h('div', { 'aria-live': 'polite', class: 'small' });
  const build = window.__BIOLOGY_BUILD__ || {};

  const theme = segmented({
    label: '表示テーマ',
    options: ['auto', 'light', 'dark'].map((t) => ({ value: t, label: themeName(t).replace('（端末の設定に合わせる）', '') })),
    value: currentTheme(),
    onChange: (v) => {
      setTheme(v);
      toast('表示：' + themeName(v));
    },
  });

  app.append(
    h('div', { class: 'hero' }, h('h1', null, '引き継ぎ・設定')),
    storageAvailable() ? null : h('div', { class: 'panel' }, h('b', null, 'この端末（ブラウザ）では学習記録を保存できません。'), h('p', { class: 'small' }, 'プライベートモードなどでは、画面を閉じると記録が消えます。引き継ぎコードを作ってメモしておくと、あとで続きから再開できます。')),
    h('section', { class: 'panel' },
      h('h2', null, '引き継ぎコードを作る'),
      h('p', { class: 'small muted' }, '進捗・やってみよう・バッジ・ミスサマリー（最新30問）をコードにする。コードは通信せず、この画面に表示するだけ。別の端末の「読み込む」に貼り付けると続きから使える。'),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn primary grow', onclick: () => {
          outArea.value = encodeProgress(getProgress());
          setFlag('transfer');
          checkBadges();
        } }, 'コードを作成'),
        h('button', { type: 'button', class: 'btn grow', onclick: async () => {
          if (!outArea.value) outArea.value = encodeProgress(getProgress());
          toast((await copyText(outArea.value, outArea)) ? 'コピーしました' : 'コピーできませんでした。手で選択してコピーしてください');
        } }, 'コピー'),
      ),
      h('div', { class: 'field' }, outArea),
    ),
    h('section', { class: 'panel' },
      h('h2', null, '引き継ぎコードを読み込む'),
      h('p', { class: 'small muted' }, '読み込むと、この端末の記録はコードの内容に置きかわる。'),
      h('div', { class: 'field' }, inArea),
      h('button', { type: 'button', class: 'btn primary block', onclick: () => {
        let p;
        try {
          p = decodeProgress(inArea.value);
        } catch (e) {
          msg.textContent = e.message;
          return;
        }
        if (!window.confirm('この端末の記録を、引き継ぎコードの内容に置きかえますか？')) return;
        p.flags.transfer = 1;
        replaceProgress(p);
        checkBadges();
        const ans = Object.values(p.stages).reduce((a, s) => a + s.answered, 0);
        msg.textContent = `読み込みました（解答 ${ans}問、バッジ ${Object.keys(p.badges).length}個）。`;
        inArea.value = '';
      } }, '読み込む'),
      msg,
    ),
    h('section', { class: 'panel' }, h('h2', null, '表示'), theme.el, h('p', { class: 'small muted' }, '右上の ◐ ボタンでも切り替えられる。')),
    h('section', { class: 'panel' },
      h('h2', null, '記録の消去'),
      h('button', { type: 'button', class: 'btn ghost block', onclick: () => {
        if (!window.confirm('この端末の学習記録（進捗・バッジ・ミスサマリー）をすべて消去しますか？\n元に戻せません。')) return;
        replaceProgress(emptyProgress());
        toast('記録を消去しました');
      } }, 'すべての記録を消去'),
    ),
    h('section', { class: 'panel small muted' },
      h('h2', null, 'このアプリについて'),
      h('p', null, `BIOLOGY 生物シミュレーター　バージョン ${build.version || '-'}（${build.date || '-'}）`),
      h('p', null, '完全オフラインで動作し、成績・氏名などをどこにも送信しない。学習記録はこの端末のブラウザ内（localStorage）にだけ保存される。グラフはすべてモデルによる模式図で、定性的な形を示すものである。'),
    ),
  );
  return null;
}
