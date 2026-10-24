"""行動の指標。

記号
----
* p_t = (x_t, y_t) : サンプル t の位置（tracks と同じ単位。mm 換算後なら mm）
* Δt = frame_step / fps : サンプル間隔 [s]
* 「有効な点」: 座標が欠損（NaN）でない点

多くの関数は 1 個体ぶんの座標 ``p``（形 (n_frames, 2)）を受け取る。
``Tracks`` 全体から個体ごとに計算するには :func:`kodo.report.summarize` を使う。
"""
from __future__ import annotations

import warnings
from dataclasses import dataclass
from typing import Optional, Sequence

import numpy as np
import pandas as pd

from .data import Tracks
from .preprocess import valid_runs

__all__ = [
    "step_lengths",
    "speed",
    "path_length",
    "net_displacement",
    "straightness",
    "mean_speed",
    "turning_angles",
    "turn_summary",
    "turn_events",
    "alternation_index",
    "moving_fraction",
    "occupancy_heatmap",
    "CircleROI",
    "RectROI",
    "roi_stats",
    "nearest_neighbor_distance",
    "msd",
    "fit_msd",
    "msd_noise_offset",
    "detect_id_swaps",
    "swap_tracks",
]


def _valid(p: np.ndarray) -> np.ndarray:
    return np.all(np.isfinite(p), axis=-1)


# ---------------------------------------------------------------------------
# 速度・距離
# ---------------------------------------------------------------------------
def step_lengths(p: np.ndarray) -> np.ndarray:
    """隣り合うサンプル間の移動距離 s_t = |p_{t+1} - p_t|（長さ n_frames - 1）。

    どちらかが欠損なら NaN。
    """
    d = np.diff(p, axis=-2)
    return np.hypot(d[..., 0], d[..., 1])


def speed(tracks: Tracks, node=None) -> np.ndarray:
    """瞬間の速さ v_t = |p_{t+1} - p_t| / Δt  [単位/s]。形は (n_tracks, n_frames - 1)。

    v_t はサンプル t から t+1 までの平均の速さで、時刻は (t + 0.5)Δt に対応する。
    欠損をまたぐステップは NaN。
    検出の揺れ（静止していても数 px ぶれる）があると、静止中も速さが 0 にならない。
    平滑化（:mod:`kodo.preprocess`）をしてから計算すること。
    """
    return step_lengths(tracks.points(node)) / tracks.dt


def _valid_points(p: np.ndarray):
    idx = np.flatnonzero(_valid(p))
    return idx, p[idx]


def path_length(p: np.ndarray) -> float:
    """経路長（総移動距離） L = Σ_k |q_{k+1} - q_k|。

    q_k は有効な点を時間順に並べたもの。欠損の区間は前後の有効な点を
    直線で結んだとみなす（欠損中の実際の経路は分からないので、L はその分
    短めの見積もりになる）。有効な点が 2 つ未満なら NaN。
    """
    _, q = _valid_points(p)
    if len(q) < 2:
        return float("nan")
    return float(np.sum(step_lengths(q)))


def net_displacement(p: np.ndarray) -> float:
    """始点から終点までの直線距離 D = |q_last - q_first|（最初と最後の有効な点）。"""
    _, q = _valid_points(p)
    if len(q) < 2:
        return float("nan")
    return float(np.hypot(*(q[-1] - q[0])))


def straightness(p: np.ndarray) -> float:
    """直進性（straightness index） S = D / L。

    D は始点と終点の直線距離、L は経路長（:func:`path_length`）。
    0 < S ≤ 1。まっすぐ進めば 1、うろうろするほど 0 に近づく。
    三角不等式より D ≤ L なので、欠損を直線で結ぶ定義でも 1 を超えない。
    静止していて L = 0 のときは定義できないので NaN。
    注意: 記録時間が長いほど S は小さくなる（同じ時間の記録どうしで比べる）。
    """
    L = path_length(p)
    if not np.isfinite(L) or L <= 0:
        return float("nan")
    return net_displacement(p) / L


def mean_speed(p: np.ndarray, dt: float) -> float:
    """平均の速さ = L / T。

    L は経路長、T は最初の有効な点から最後の有効な点までの時間 [s]。
    静止していた時間も含めた平均なので「移動中だけの速さ」ではない。
    """
    idx, _ = _valid_points(p)
    if len(idx) < 2:
        return float("nan")
    return path_length(p) / ((idx[-1] - idx[0]) * dt)


# ---------------------------------------------------------------------------
# 転向角
# ---------------------------------------------------------------------------
def _thin_by_distance(q: np.ndarray, min_step: float):
    """直前に残した点から min_step 以上離れた点だけを残す（最初の点は残す）。

    min_step = 0 のときは、直前と同じ位置の点（長さ 0 の移動）だけを除く。
    """
    if min_step <= 0:
        moved = np.any(np.diff(q, axis=0) != 0, axis=1)
        return np.concatenate([[0], np.flatnonzero(moved) + 1])
    keep = [0]
    lx, ly = float(q[0, 0]), float(q[0, 1])
    for k, (x, y) in enumerate(q.tolist()):
        if k and (x - lx) ** 2 + (y - ly) ** 2 >= min_step ** 2:
            keep.append(k)
            lx, ly = x, y
    return np.asarray(keep)


def turning_angles(p: np.ndarray, min_step: float = 0.0, y_down: bool = True,
                   return_index: bool = False):
    """転向角 θ（ラジアン、-π < θ ≤ π）。正 = 左（画面上で反時計回り）。

    定義::

        有効な点を時間順に並べ、直前に残した点から min_step 以上離れた点だけを
        残して q_0, q_1, ... とする（静止中の揺れで向きが決まらないのを防ぐ）。
        u_k = q_{k+1} - q_k                       （k 番目の移動ベクトル）
        θ_k = atan2(u_k × u_{k+1}, u_k · u_{k+1})  （× は外積の z 成分 ux1·uy2 − uy1·ux2）

    y 軸が下向きの画像座標（y_down=True）では、数学の座標と回る向きが逆になるので
    符号を反転し、画面上で左に曲がったときに正になるようにする。
    まっすぐ進めば 0、Uターンで ±π（180°）。

    min_step を 0 にすると、ほぼ全フレームの角度が出るが、高フレームレートでは
    1 フレームの移動が検出の揺れと同じくらいになり、角度がでたらめになる。
    目安として体長の 1/4〜1/2 程度（mm 換算後なら mm）を指定する。

    return_index=True のとき、各角度の頂点（曲がった点）のサンプル番号も返す。
    """
    idx, q = _valid_points(p)
    empty = (np.array([]), np.array([], dtype=int)) if return_index else np.array([])
    if len(q) < 3:
        return empty
    keep = _thin_by_distance(q, max(min_step, 0.0))
    if len(keep) < 3:
        return empty
    q, idx = q[keep], idx[keep]
    u = np.diff(q, axis=0)
    cross = u[:-1, 0] * u[1:, 1] - u[:-1, 1] * u[1:, 0]
    dot = np.sum(u[:-1] * u[1:], axis=1)
    theta = np.arctan2(cross, dot)
    if y_down:
        theta = -theta
    theta = np.where(theta <= -np.pi, np.pi, theta)
    if return_index:
        return theta, idx[1:-1]
    return theta


def turn_summary(theta: np.ndarray) -> dict:
    """転向角の要約。

    * mean_abs_turn_deg : |θ| の平均 [°]（どれだけ曲がるか）
    * left_turn_fraction : θ > 0 の割合（0 < |θ| < π の角度のうち。0.5 なら左右に偏りなし）。
      ちょうど 180° の U ターンは左右が決まらないので数えない。
    * turn_mean_resultant : 平均合成ベクトル長 R = |mean(e^{iθ})|。
      0〜1。1 に近いほど毎回同じ角度で曲がる（まっすぐ進み続ける場合も 1 に近い）。
    """
    theta = np.asarray(theta, dtype=float)
    theta = theta[np.isfinite(theta)]
    if len(theta) == 0:
        return {"n_turns": 0, "mean_abs_turn_deg": np.nan, "left_turn_fraction": np.nan,
                "turn_mean_resultant": np.nan}
    nz = theta[(theta != 0) & (np.abs(theta) < np.pi)]
    return {
        "n_turns": int(len(theta)),
        "mean_abs_turn_deg": float(np.degrees(np.mean(np.abs(theta)))),
        "left_turn_fraction": float(np.mean(nz > 0)) if len(nz) else np.nan,
        "turn_mean_resultant": float(np.abs(np.mean(np.exp(1j * theta)))),
    }


def turn_events(theta: np.ndarray, turn_deg: float = 45.0, min_deg: float = 5.0,
                max_straight: int = 3) -> np.ndarray:
    """細かい転向角の並びから「曲がり」を取り出し、その向き（+1=左, -1=右）を返す。

    定義::

        |θ_k| ≥ min_deg の角度を「曲がる角度」、それ未満を「直進」とよぶ。
        曲がる角度の符号が変わるか、直進が max_straight 個以上続くまでを 1 つの区間とし、
        区間内の角度（間にはさまる直進の小さな角度も含む）を合計して Θ とする。
        |Θ| ≥ turn_deg の区間を 1 回の「曲がり」とし、その符号を返す。

    1 回の曲がり（例えば 90°）が何サンプルかに分かれて記録されても、途中にほぼ直進の
    角度が少しはさまっても 1 回と数える。turning_angles の min_step で間引いた角度に使うと、
    max_straight × min_step 以上まっすぐ進んだら曲がりの区切りとみなすことになる。
    """
    theta = np.asarray(theta, dtype=float)
    theta = theta[np.isfinite(theta)]
    big = np.abs(theta) >= np.radians(min_deg)
    events = []
    cur_sign, total, n_straight = 0, 0.0, 0

    def close():
        if cur_sign != 0 and abs(total) >= np.radians(turn_deg):
            events.append(int(np.sign(total)))

    for th, is_big in zip(theta, big):
        if not is_big:
            n_straight += 1
            if cur_sign != 0:
                if n_straight >= max_straight:
                    close()
                    cur_sign, total = 0, 0.0
                else:
                    total += th
            continue
        sgn = 1 if th > 0 else -1
        if sgn != cur_sign:  # 向きが変わった（または新しい区間の始まり）
            close()
            cur_sign, total = sgn, 0.0
        total += th
        n_straight = 0
    close()
    return np.asarray(events, dtype=int)


def alternation_index(theta: np.ndarray, turn_deg: float = 45.0, min_deg: float = 5.0,
                      max_straight: int = 3) -> float:
    """交替性転向の指数 A = （左右が入れ替わった回数）/（連続する曲がりの組の数）。

    曲がりの向きの列 e_1, e_2, ..., e_n（:func:`turn_events`）について::

        A = #{ k : e_k ≠ e_{k+1} } / (n - 1)

    左右をでたらめに選ぶなら A ≈ 0.5、必ず交互（右→左→右…）なら 1、
    いつも同じ向きなら 0。曲がりが 2 回未満なら NaN。
    ダンゴムシの交替性転向（強制的に曲がらされた後、次は逆に曲がる）を調べるのに使う。
    検出のぶれで角度がでたらめにならないよう、turning_angles の min_step を必ず設定すること。
    """
    e = turn_events(theta, turn_deg=turn_deg, min_deg=min_deg, max_straight=max_straight)
    if len(e) < 2:
        return float("nan")
    return float(np.mean(e[1:] != e[:-1]))


# ---------------------------------------------------------------------------
# 移動と静止
# ---------------------------------------------------------------------------
def moving_fraction(v: np.ndarray, threshold: float) -> float:
    """移動の割合 = #{t : v_t ≥ threshold} / #{t : v_t が欠損でない}。

    静止の割合は 1 − 移動の割合。threshold は速さのしきい値 [単位/s]。
    静止中でも検出の揺れで速さは 0 にならないので、静止している区間の
    速さの分布（ノイズの大きさ）より大きく、ゆっくり歩く速さより小さい値にする。
    """
    v = np.asarray(v, dtype=float)
    v = v[np.isfinite(v)]
    if len(v) == 0:
        return float("nan")
    return float(np.mean(v >= threshold))


# ---------------------------------------------------------------------------
# 滞在ヒートマップ
# ---------------------------------------------------------------------------
def occupancy_heatmap(tracks: Tracks, bin_size: float, node=None, track=None,
                      bounds: Optional[Sequence[float]] = None, density: bool = False):
    """滞在ヒートマップ：区画（ビン）ごとの滞在時間 [s]。

    定義::

        H[a, b] = Δt × #{ t : p_t が区画 (a, b) に入る }

    区画は一辺 bin_size（tracks の単位）の正方形。track=None なら全個体の合計。
    density=True なら合計が 1 になるよう割合にする。

    Parameters
    ----------
    bounds : (x_min, y_min, x_max, y_max), optional
        ヒートマップの範囲。省略すると全個体の座標の範囲（個体どうしで比べられるよう
        track を指定しても全個体の範囲を使う）。

    Returns
    -------
    H : ndarray, shape (nx, ny)   H[a, b] は x 方向 a 番目・y 方向 b 番目の区画
    xedges, yedges : ndarray       区画の境界
    """
    if bin_size <= 0:
        raise ValueError("bin_size は正の数にしてください")
    p_all = tracks.points(node)
    if bounds is None:
        flat = p_all.reshape(-1, 2)
        flat = flat[_valid(flat)]
        if len(flat) == 0:
            raise ValueError("有効な座標がありません")
        x0, y0 = flat.min(axis=0)
        x1, y1 = flat.max(axis=0)
    else:
        x0, y0, x1, y1 = bounds
    nx = max(int(np.ceil((x1 - x0) / bin_size)), 1)
    ny = max(int(np.ceil((y1 - y0) / bin_size)), 1)
    xedges = x0 + np.arange(nx + 1) * bin_size
    yedges = y0 + np.arange(ny + 1) * bin_size
    sel = p_all if track is None else p_all[[tracks.track_index(track)]]
    flat = sel.reshape(-1, 2)
    flat = flat[_valid(flat)]
    H, _, _ = np.histogram2d(flat[:, 0], flat[:, 1], bins=[xedges, yedges])
    H = H * tracks.dt
    if density and H.sum() > 0:
        H = H / H.sum()
    return H, xedges, yedges


# ---------------------------------------------------------------------------
# 領域（ROI）
# ---------------------------------------------------------------------------
@dataclass
class CircleROI:
    """円形の領域。中心 (cx, cy)、半径 r。境界上（距離 = r）は内側に含める。"""

    cx: float
    cy: float
    r: float
    name: str = "circle"

    def contains(self, p: np.ndarray) -> np.ndarray:
        p = np.asarray(p, dtype=float)
        return (p[..., 0] - self.cx) ** 2 + (p[..., 1] - self.cy) ** 2 <= self.r ** 2

    def scaled(self, factor: float) -> "CircleROI":
        """座標を factor 倍した領域（px で決めた領域を mm に直すときは factor = mm_per_px）。"""
        return CircleROI(self.cx * factor, self.cy * factor, self.r * factor, self.name)


@dataclass
class RectROI:
    """長方形の領域（軸にそろった長方形）。x0 ≤ x ≤ x1 かつ y0 ≤ y ≤ y1。"""

    x0: float
    y0: float
    x1: float
    y1: float
    name: str = "rect"

    def __post_init__(self):
        self.x0, self.x1 = sorted((self.x0, self.x1))
        self.y0, self.y1 = sorted((self.y0, self.y1))

    def contains(self, p: np.ndarray) -> np.ndarray:
        p = np.asarray(p, dtype=float)
        return (p[..., 0] >= self.x0) & (p[..., 0] <= self.x1) & (p[..., 1] >= self.y0) & (p[..., 1] <= self.y1)

    def scaled(self, factor: float) -> "RectROI":
        return RectROI(self.x0 * factor, self.y0 * factor, self.x1 * factor, self.y1 * factor, self.name)


def roi_stats(p: np.ndarray, roi, dt: float, min_samples: int = 1, count_initial: bool = False,
              t0: float = 0.0) -> dict:
    """領域の滞在時間・進入回数・最初に入った時刻。

    定義（有効な点だけを時間順に並べ、領域内なら s_k = 1、外なら 0）::

        滞在時間   T_in = Δt × #{ k : s_k = 1 }
        滞在割合   T_in / (Δt × 有効な点の数)
        進入回数   N = #{ k ≥ 1 : s'_{k-1} = 0 かつ s'_k = 1 }
        初進入時刻 最初に s'_k = 1 となるサンプルの時刻 [s]（入らなければ NaN）

    s' は s のぶれを取り除いたもの（min_samples ≥ 2 のとき）:
      1. 領域内の区間にはさまれた、min_samples より短い「外」の区間を「内」とみなす
         （境界の上で一瞬はみ出しただけの出入りを数えない）
      2. そのうえで min_samples より短い「内」の区間を「外」とみなす
         （境界に一瞬触れただけの進入を数えない）
    min_samples = 1 なら s' = s。滞在時間・滞在割合は s そのもので数える。

    * 欠損の間は「直前と同じ状態だった」とみなして、欠損の前後で外→内と
      変わっていれば 1 回の進入と数える。
    * 記録の最初から領域内にいた場合、count_initial=False なら進入に数えない
      （初進入時刻は最初のサンプルの時刻になる）。
    * 時刻は t0 + （サンプル番号）× Δt。Tracks から計算するときは
      t0 = frame_start / fps（動画の 0 フレーム目を 0 秒）を渡す。
    """
    idx, q = _valid_points(p)
    nan = float("nan")
    if len(q) == 0:
        return {"time_s": nan, "fraction": nan, "entries": nan, "first_entry_s": nan,
                "first_entry_sample": nan}
    s = roi.contains(q)
    s_ent = s.copy()
    if min_samples > 1:
        for a, b in valid_runs(~s_ent):
            if 0 < a and b < len(s_ent) and b - a < min_samples:
                s_ent[a:b] = True
        for a, b in valid_runs(s_ent):
            if b - a < min_samples:
                s_ent[a:b] = False
    entries = int(np.sum(~s_ent[:-1] & s_ent[1:]))
    if count_initial and s_ent[0]:
        entries += 1
    first_sample = int(idx[np.argmax(s_ent)]) if s_ent.any() else None
    return {
        "time_s": float(s.sum() * dt),
        "fraction": float(s.mean()),
        "entries": entries,
        "first_entry_s": t0 + first_sample * dt if first_sample is not None else nan,
        "first_entry_sample": first_sample if first_sample is not None else nan,
    }


# ---------------------------------------------------------------------------
# 複数個体
# ---------------------------------------------------------------------------
def nearest_neighbor_distance(tracks: Tracks, node=None) -> np.ndarray:
    """最近接個体距離 d_i(t) = min_{j ≠ i} |p_i(t) - p_j(t)|。形は (n_tracks, n_frames)。

    同じフレームに座標がある他の個体だけを比べる。自分が欠損、または
    他の個体が全員欠損のフレームは NaN。個体が 1 匹なら全部 NaN。
    """
    p = tracks.points(node)  # (n, F, 2)
    n = p.shape[0]
    if n < 2:
        return np.full(p.shape[:2], np.nan)
    d = np.hypot(p[:, None, :, 0] - p[None, :, :, 0], p[:, None, :, 1] - p[None, :, :, 1])  # (n, n, F)
    d[np.arange(n), np.arange(n), :] = np.inf
    d = np.where(np.isnan(d), np.inf, d)
    m = d.min(axis=1)
    m[np.isinf(m)] = np.nan
    return m


# ---------------------------------------------------------------------------
# 平均二乗変位
# ---------------------------------------------------------------------------
def msd(p: np.ndarray, max_lag: Optional[int] = None):
    """平均二乗変位（時間平均 MSD）。

    定義::

        MSD(τ) = < |p_{t+τ} - p_t|^2 >_t     （τ = 1, 2, ..., max_lag サンプル）

    < >_t は、t と t+τ の両方が有効なすべての t についての平均。
    2 次元のブラウン運動（拡散係数 D）では MSD(τ) = 4 D τΔt、
    等速直線運動（速さ v）では MSD(τ) = (v τΔt)^2。

    Parameters
    ----------
    max_lag : int, optional
        最大のずらし幅（サンプル数）。省略すると n_frames // 4。
        大きな τ ほど平均に使える組が減って値が不安定になる。

    Returns
    -------
    lags : ndarray (int)   τ（サンプル数）。秒にするには × Δt
    values : ndarray       MSD(τ)
    counts : ndarray       平均に使った組の数
    """
    p = np.asarray(p, dtype=float)
    n = len(p)
    if max_lag is None:
        max_lag = max(n // 4, 1)
    max_lag = int(min(max_lag, n - 1))
    lags = np.arange(1, max_lag + 1)
    values = np.full(len(lags), np.nan)
    counts = np.zeros(len(lags), dtype=int)
    for i, tau in enumerate(lags):
        d = p[tau:] - p[:-tau]
        sq = d[:, 0] ** 2 + d[:, 1] ** 2
        ok = np.isfinite(sq)
        counts[i] = int(ok.sum())
        if counts[i]:
            values[i] = float(sq[ok].mean())
    return lags, values, counts


def msd_noise_offset(lag_s: np.ndarray, values: np.ndarray) -> float:
    """MSD に上乗せされた検出のぶれの分 c = max(0, 2·MSD(Δt) − MSD(2Δt))。

    位置の誤差（各軸の標準偏差 σ、時間的に独立）があると、どんな動きでも
    MSD(τ) は 4σ² だけ大きくなる。MSD が τ=0 付近で直線的なら、τ = Δt, 2Δt の
    2 点を結ぶ直線を τ = 0 まで伸ばした値がちょうど 4σ² になる。
    直進的な動き（MSD ∝ τ²）では 2v²Δt² だけ小さめに出るので、負なら 0 とする。
    """
    lag_s = np.asarray(lag_s, dtype=float)
    values = np.asarray(values, dtype=float)
    if len(values) < 2 or not np.isfinite(values[:2]).all() or not np.isclose(lag_s[1], 2 * lag_s[0]):
        return 0.0
    return float(max(0.0, 2 * values[0] - values[1]))


def fit_msd(lag_s: np.ndarray, values: np.ndarray, fit_max_s: Optional[float] = None,
            fit_min_s: float = 0.0) -> dict:
    """MSD の直線と両対数の当てはめ。

    * 直線: MSD = a + b τ を最小二乗で当てはめ、拡散係数 D = b / 4（2 次元）。
      切片 a は検出のぶれの大きさを表す（位置の誤差の標準偏差が各軸 σ なら a ≈ 4σ²）。
      D はランダムウォーク（α ≈ 1）のときだけ意味がある。
    * 両対数: log(MSD − c) = log K + α log τ の傾き α（MSD 指数）。
      c は検出のぶれの分（:func:`msd_noise_offset`）。c を引かないと、短い τ で
      MSD が底上げされて α が小さく出る（ランダムウォークなのに「閉じこもり」に見える）。
      α ≈ 1 なら拡散的（ランダムウォーク）、α ≈ 2 なら直進的（弾道的）、
      α < 1 なら狭い範囲に閉じこもる動き。

    Parameters
    ----------
    lag_s : τ [s]（Δt, 2Δt, 3Δt, … の順。:func:`msd` の lags × Δt）
    fit_max_s, fit_min_s : 当てはめに使う τ の範囲 [s]。省略時は全範囲。
        τ が大きいほど平均に使える組が減って MSD がばらつくので、
        記録時間の 1 割程度までにするのがよい。

    Returns
    -------
    dict : slope (b), intercept (a), D, alpha, noise_offset (c), r2（直線当てはめの決定係数）
    """
    lag_s = np.asarray(lag_s, dtype=float)
    values = np.asarray(values, dtype=float)
    c = msd_noise_offset(lag_s, values)
    m = np.isfinite(values) & (lag_s > fit_min_s)
    if fit_max_s is not None:
        m &= lag_s <= fit_max_s
    if m.sum() < 2:
        return {"slope": np.nan, "intercept": np.nan, "D": np.nan, "alpha": np.nan,
                "noise_offset": c, "r2": np.nan}
    x, y = lag_s[m], values[m]
    b, a = np.polyfit(x, y, 1)
    resid = y - (a + b * x)
    ss = np.sum((y - y.mean()) ** 2)
    r2 = float(1 - np.sum(resid ** 2) / ss) if ss > 0 else np.nan
    yc = y - c
    pos = yc > 0
    alpha = float(np.polyfit(np.log(x[pos]), np.log(yc[pos]), 1)[0]) if pos.sum() >= 2 else np.nan
    return {"slope": float(b), "intercept": float(a), "D": float(b / 4), "alpha": alpha,
            "noise_offset": c, "r2": r2}


# ---------------------------------------------------------------------------
# ID の入れ替わり
# ---------------------------------------------------------------------------
def detect_id_swaps(tracks: Tracks, node=None, ratio: float = 0.5,
                    min_jump: Optional[float] = None) -> pd.DataFrame:
    """2 個体の ID が入れ替わった疑いのあるフレームを探す。

    各フレーム t と個体の組 (i, j) について::

        そのまま   c_same = |p_i(t) - p_i(t-1)| + |p_j(t) - p_j(t-1)|
        入れ替え   c_swap = |p_i(t) - p_j(t-1)| + |p_j(t) - p_i(t-1)|

    c_swap < ratio × c_same かつ c_same > min_jump なら「入れ替わりの疑い」とする。
    （入れ替えたと考えたほうが移動がずっと小さくて済む = ID が入れ替わった可能性が高い。）
    min_jump を省略すると、全個体の 1 サンプルの移動距離の中央値の 10 倍
    （静止中の揺れで誤検出しないため）。
    """
    p = tracks.points(node)
    n = p.shape[0]
    cols = ["frame", "sample", "track_a", "track_b", "cost_same", "cost_swap"]
    if n < 2 or p.shape[1] < 2:
        return pd.DataFrame(columns=cols)
    if min_jump is None:
        s = step_lengths(p).ravel()
        s = s[np.isfinite(s) & (s > 0)]
        min_jump = 10 * float(np.median(s)) if len(s) else 0.0
    rows = []
    for i in range(n):
        for j in range(i + 1, n):
            a0, a1 = p[i, :-1], p[i, 1:]
            b0, b1 = p[j, :-1], p[j, 1:]
            same = np.hypot(*(a1 - a0).T) + np.hypot(*(b1 - b0).T)
            swap = np.hypot(*(a1 - b0).T) + np.hypot(*(b1 - a0).T)
            with np.errstate(invalid="ignore"):
                hit = (swap < ratio * same) & (same > min_jump)
            for t in np.flatnonzero(hit):
                rows.append([int(tracks.frames[t + 1]), int(t + 1), tracks.track_names[i],
                             tracks.track_names[j], float(same[t]), float(swap[t])])
    return pd.DataFrame(rows, columns=cols)


def swap_tracks(tracks: Tracks, a, b, from_sample: int, to_sample: Optional[int] = None) -> Tracks:
    """サンプル from_sample から to_sample の手前まで、個体 a と b の座標を入れ替える。

    :func:`detect_id_swaps` で見つけた入れ替わりを直すのに使う
    （入れ替わったまま最後まで続くなら to_sample は省略）。
    """
    out = tracks.copy()
    i, j = out.track_index(a), out.track_index(b)
    sl = slice(from_sample, to_sample)
    out.xy[[i, j], sl] = out.xy[[j, i], sl]
    if out.scores is not None:
        out.scores[[i, j], sl] = out.scores[[j, i], sl]
    out.history.append(f"swap_tracks({out.track_names[i]}, {out.track_names[j]}, {from_sample}, {to_sample})")
    return out


def _quiet_nanmean(a) -> float:
    a = np.asarray(a, dtype=float)
    if not np.isfinite(a).any():
        return float("nan")
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        return float(np.nanmean(a))
