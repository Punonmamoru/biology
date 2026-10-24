// 実績バッジ
import { getProgress, saveProgress } from './progress.js';
import { STAGES } from './stages.js';
import { DOJOS } from './dojo/index.js';
import { toast } from './lib/dom.js';

const sum = (p, k) => Object.values(p.stages).reduce((a, s) => a + s[k], 0);
const tasksDone = (p, ids) => ids.reduce((a, id) => a + Object.keys(p.stages[id].tasks).filter((t) => DOJOS[id] && DOJOS[id].tasks.some((x) => x.id === t)).length, 0);
const tasksTotal = (ids) => ids.reduce((a, id) => a + (DOJOS[id] ? DOJOS[id].tasks.length : 0), 0);
const ids = (course) => STAGES.filter((s) => !course || s.course === course).map((s) => s.id);

// progress(p) は [現在値, 目標値]
export const BADGES = [
  { id: 'first', icon: '🌱', name: 'はじめの一問', desc: '4択ラッシュで1問解答する', progress: (p) => [sum(p, 'answered'), 1] },
  { id: 'dojo-all', icon: '🧭', name: '道場めぐり', desc: `全${STAGES.length}ステージの図解道場をひらく`, progress: (p) => [STAGES.filter((s) => p.stages[s.id].visited > 0).length, STAGES.length] },
  { id: 'task-10', icon: '🔬', name: 'やってみよう10', desc: '「やってみよう」課題を10個達成する', progress: (p) => [tasksDone(p, ids()), 10] },
  { id: 'task-basic', icon: '🧪', name: '生物基礎の探究者', desc: `生物基礎（${ids('basic').length}ステージ）の「やってみよう」をすべて達成する`, progress: (p) => [tasksDone(p, ids('basic')), tasksTotal(ids('basic'))] },
  { id: 'task-adv', icon: '🧬', name: '生物の探究者', desc: `生物発展（${ids('advanced').length}ステージ）の「やってみよう」をすべて達成する`, progress: (p) => [tasksDone(p, ids('advanced')), tasksTotal(ids('advanced'))] },
  { id: 'all-stages', icon: '🗺️', name: '全ステージ挑戦', desc: `${STAGES.length}ステージすべての4択ラッシュで解答する`, progress: (p) => [STAGES.filter((s) => p.stages[s.id].answered > 0).length, STAGES.length] },
  { id: 'streak-10', icon: '🔥', name: '10連続正解', desc: '4択で10問連続正解する', progress: (p) => [p.bestStreak, 10] },
  { id: 'streak-30', icon: '⚡', name: '30連続正解', desc: '4択で30問連続正解する', progress: (p) => [p.bestStreak, 30] },
  { id: 'perfect', icon: '💯', name: 'パーフェクト', desc: '4択ラッシュの1ラウンドを全問正解する', progress: (p) => [p.perfect, 1] },
  { id: 'hard-10', icon: '⛰️', name: '発展の壁', desc: '★★★発展の問題に10問正解する', progress: (p) => [sum(p, 'hard'), 10] },
  { id: 'correct-100', icon: '📗', name: '正解100', desc: '4択で通算100問正解する', progress: (p) => [sum(p, 'correct'), 100] },
  { id: 'correct-500', icon: '📚', name: '正解500', desc: '4択で通算500問正解する', progress: (p) => [sum(p, 'correct'), 500] },
  {
    id: 'rate-80',
    icon: '🏅',
    name: '安定した理解',
    desc: `全${STAGES.length}ステージでそれぞれ10問以上解答し、どのステージも正答率80%以上にする`,
    progress: (p) => [STAGES.filter((s) => p.stages[s.id].answered >= 10 && p.stages[s.id].correct / p.stages[s.id].answered >= 0.8).length, STAGES.length],
  },
  { id: 'summary', icon: '📝', name: '提出の準備', desc: 'ミスサマリーを画像として保存する', progress: (p) => [p.flags.savedSummary ? 1 : 0, 1] },
  { id: 'transfer', icon: '🔑', name: '引き継ぎの鍵', desc: '引き継ぎコードを作成する、または読み込む', progress: (p) => [p.flags.transfer ? 1 : 0, 1] },
];

export function earned(p, b) {
  const [cur, goal] = b.progress(p);
  return goal > 0 && cur >= goal;
}

// 新しく獲得したバッジを記録して返す（DOM がない環境ではトーストを出さない）
export function evaluate(p, now = Date.now()) {
  const fresh = [];
  for (const b of BADGES) {
    if (!p.badges[b.id] && earned(p, b)) {
      p.badges[b.id] = now;
      fresh.push(b);
    }
  }
  return fresh;
}

export function checkBadges() {
  const p = getProgress();
  const fresh = evaluate(p);
  if (fresh.length) {
    saveProgress();
    toast('🏅 バッジ獲得：' + fresh.map((b) => b.name).join('、'), 3600);
  }
  return fresh;
}
