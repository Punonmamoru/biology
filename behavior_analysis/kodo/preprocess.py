"""前処理：外れ値の除去・欠損の補間・平滑化・スケール換算・間引き。

おすすめの順番は

    1. mask_low_scores（SLEAP のみ。信頼度の低い点を欠損にする）
    2. remove_outliers / remove_jumps（あり得ない位置を欠損にする）
    3. interpolate_gaps（短い欠損だけを直線で埋める）
    4. smooth_savgol または smooth_moving_average（細かい揺れをならす）
    5. apply_scale（px → mm）

外れ値を先に欠損にしてから補間するのは、外れ値を残したまま補間・平滑化すると
その誤差が前後のフレームに広がってしまうから。
どの関数も元の Tracks は書き換えず、新しい Tracks を返す。
"""
from __future__ import annotations

import warnings
from typing import Tuple

import numpy as np
from scipy.signal import savgol_filter

from .data import Tracks

__all__ = [
    "mask_low_scores",
    "remove_outliers",
    "remove_jumps",
    "interpolate_gaps",
    "smooth_moving_average",
    "smooth_savgol",
    "mm_per_px_from_points",
    "apply_scale",
    "set_fps",
    "fps_from_video",
    "downsample",
    "valid_runs",
]


def valid_runs(valid: np.ndarray):
    """真偽値の 1 次元配列から、True が続く区間 [start, end) の一覧を返す。"""
    v = np.concatenate([[False], np.asarray(valid, dtype=bool), [False]])
    d = np.diff(v.astype(int))
    return list(zip(np.flatnonzero(d == 1), np.flatnonzero(d == -1)))


def _series(tracks: Tracks):
    """(個体, 部位) ごとの (n_frames, 2) の座標配列を順に返す（ビュー）。"""
    for i in range(tracks.n_tracks):
        for k in range(tracks.n_nodes):
            yield i, k, tracks.xy[i, :, k, :]


# ---------------------------------------------------------------------------
# 外れ値
# ---------------------------------------------------------------------------
def mask_low_scores(tracks: Tracks, min_score: float) -> Tracks:
    """SLEAP の点の信頼度スコアが ``min_score`` 未満の点を欠損（NaN）にする。"""
    out = tracks.copy()
    if out.scores is None:
        warnings.warn("信頼度スコアがないので mask_low_scores は何もしませんでした。")
        return out
    low = ~(out.scores >= min_score)  # NaN のスコアも低いとみなす
    n = int(np.sum(low & np.all(np.isfinite(out.xy), axis=-1)))
    out.xy[low] = np.nan
    out.history.append(f"mask_low_scores(min_score={min_score}): {n} 点を欠損に")
    return out


def _rolling_nanmedian(a: np.ndarray, window: int) -> np.ndarray:
    """欠損を無視した移動中央値（中心窓）。端では窓からはみ出た部分を無視する。"""
    h = window // 2
    pad = np.concatenate([np.full(h, np.nan), a, np.full(h, np.nan)])
    win = np.lib.stride_tricks.sliding_window_view(pad, window)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        return np.nanmedian(win, axis=-1)


def remove_outliers(tracks: Tracks, threshold: float, window: int = 7, k_step: float = 3.0) -> Tracks:
    """移動中央値からの距離で外れ値を除く（ハンペル型フィルタ）。

    定義（h = window // 2。窓は前後それぞれ h サンプル）::

        m_t = ( median(x_{t-h..t+h}), median(y_{t-h..t+h}) )
        s_t = 窓の中の 1 サンプルの移動距離 |p_{u+1} - p_u| の中央値
        d_t = | p_t - m_t |
        d_t > max(threshold, k_step × s_t) なら p_t を欠損にする

    中央値は外れ値に引きずられにくいので、h サンプル以下しか続かない誤検出
    （別の物体に一瞬飛ぶなど）を取り除ける。等速直線運動では m_t = p_t になる。

    x と y を別々に中央値にとるので、軌跡が曲がると本物の点でも m_t から離れる
    （U ターンの頂点で 1 サンプルの移動距離の約 2 倍）。速く曲がる動物の本物の点を
    消さないよう、許す距離を「その付近の 1 サンプルの移動距離の k_step 倍」以上にする。
    そのため、速く動いている最中の小さな飛びは残ることがある（:func:`remove_jumps` で除ける）。

    Parameters
    ----------
    threshold : float
        許す距離の最小値（tracks と同じ単位。px なら px）。目安は体長の半分程度。
    window : int
        窓の幅（奇数のサンプル数）。
    k_step : float
        1 サンプルの移動距離の何倍までを本物の動きとみなすか。
    """
    if window < 3 or window % 2 == 0:
        raise ValueError("window は 3 以上の奇数にしてください")
    out = tracks.copy()
    n_removed = 0
    for _, _, p in _series(out):
        mx = _rolling_nanmedian(p[:, 0], window)
        my = _rolling_nanmedian(p[:, 1], window)
        d = np.hypot(p[:, 0] - mx, p[:, 1] - my)
        steps = np.hypot(*np.diff(p, axis=0).T)
        # サンプル t の窓に入るステップ（t-h → t+h の間の 2h 本）の中央値
        s_med = _rolling_nanmedian(np.append(steps, np.nan), window)
        limit = np.fmax(threshold, k_step * s_med)
        with np.errstate(invalid="ignore"):
            bad = d > limit
        n_removed += int(bad.sum())
        p[bad] = np.nan
    out.history.append(f"remove_outliers(threshold={threshold}, window={window}, k_step={k_step}): "
                       f"{n_removed} 点を除去")
    return out


def remove_jumps(tracks: Tracks, max_speed: float, max_iter: int = 10) -> Tracks:
    """前後どちらへの移動もあり得ない速さになる 1 点だけの「飛び」を除く。

    定義（有効な点だけを順に並べ、i-1, i, i+1 を隣どうしとする）::

        v_in  = |p_i - p_{i-1}| / (t_i - t_{i-1})
        v_out = |p_{i+1} - p_i| / (t_{i+1} - t_i)
        v_in > max_speed かつ v_out > max_speed なら p_i を欠損にする
        （端の点は、隣が 1 つだけなのでその速さだけで判定する）

    除いたあとに新しく隣どうしになった点も調べるため、変化がなくなるまで繰り返す。
    ID の入れ替わりのように「飛んだまま戻らない」ものは除けない（:func:`kodo.metrics.detect_id_swaps` を使う）。

    Parameters
    ----------
    max_speed : float
        その動物があり得ない速さ（単位/s）。tracks に fps が必要。
    """
    out = tracks.copy()
    dt = out.dt
    n_removed = 0
    for _, _, p in _series(out):
        for _ in range(max_iter):
            idx = np.flatnonzero(np.all(np.isfinite(p), axis=1))
            if len(idx) < 2:
                break
            q = p[idx]
            v = np.hypot(*(np.diff(q, axis=0).T)) / (np.diff(idx) * dt)
            fast = v > max_speed
            bad = np.zeros(len(idx), dtype=bool)
            bad[1:-1] = fast[:-1] & fast[1:]
            bad[0] = fast[0] and (len(idx) == 2 or not fast[1])
            bad[-1] = fast[-1] and (len(idx) == 2 or not fast[-2])
            if len(idx) == 2:
                bad[:] = False  # 2 点だけではどちらが誤りか決められない
            if not bad.any():
                break
            p[idx[bad]] = np.nan
            n_removed += int(bad.sum())
    out.history.append(f"remove_jumps(max_speed={max_speed}): {n_removed} 点を除去")
    return out


# ---------------------------------------------------------------------------
# 補間
# ---------------------------------------------------------------------------
def interpolate_gaps(tracks: Tracks, max_gap: int = 5, method: str = "linear") -> Tracks:
    """長さ ``max_gap`` サンプル以下の欠損だけを補間する。

    前後の両方に有効な点がある欠損（内側の欠損）だけを埋め、
    記録の最初や最後の欠損は埋めない（外挿はしない）。
    長い欠損を埋めると、実際には見ていない動きを「作る」ことになるので上限をつける。

    method
        "linear" : 欠損の直前の点 a と直後の点 b を直線で結ぶ。
                   p_{a+j} = p_a + (j / (b - a)) (p_b - p_a)
        "pchip"  : 有効な点全体を通る区分 3 次エルミート補間（行き過ぎが起きにくい）。
    """
    if max_gap < 1:
        return tracks.copy()
    if method not in ("linear", "pchip"):
        raise ValueError('method は "linear" か "pchip" にしてください')
    out = tracks.copy()
    n_filled = 0
    for _, _, p in _series(out):
        valid = np.all(np.isfinite(p), axis=1)
        idx = np.flatnonzero(valid)
        if len(idx) < 2:
            continue
        gaps = np.diff(idx) - 1
        fill = np.zeros(len(p), dtype=bool)
        for a, g in zip(idx[:-1], gaps):
            if 0 < g <= max_gap:
                fill[a + 1:a + 1 + g] = True
        if not fill.any():
            continue
        t_fill = np.flatnonzero(fill)
        if method == "linear":
            for c in range(2):
                p[t_fill, c] = np.interp(t_fill, idx, p[idx, c])
        else:
            from scipy.interpolate import PchipInterpolator

            for c in range(2):
                p[t_fill, c] = PchipInterpolator(idx, p[idx, c])(t_fill)
        n_filled += len(t_fill)
    out.history.append(f"interpolate_gaps(max_gap={max_gap}, method={method}): {n_filled} 点を補間")
    return out


# ---------------------------------------------------------------------------
# 平滑化
# ---------------------------------------------------------------------------
def _check_window(window: int):
    if window < 3 or window % 2 == 0:
        raise ValueError("window は 3 以上の奇数にしてください")


def smooth_moving_average(tracks: Tracks, window: int = 5) -> Tracks:
    """中心移動平均で平滑化する。

    定義（h = window // 2）::

        p'_t = (1 / (2h_t + 1)) Σ_{j=-h_t}^{h_t} p_{t+j}
        h_t = min(h, 区間の始まりからの距離, 区間の終わりまでの距離)

    欠損で区切られた連続区間ごとに計算し、欠損をまたいで平均しない。
    区間の端では窓を左右対称に縮めるので、等速直線運動は変化しない
    （端で片側だけ平均すると位置が内側にずれるのを防ぐ）。
    欠損は欠損のまま残す。
    """
    _check_window(window)
    h = window // 2
    out = tracks.copy()
    for _, _, p in _series(out):
        valid = np.all(np.isfinite(p), axis=1)
        for s, e in valid_runs(valid):
            seg = p[s:e]
            n = e - s
            cs = np.vstack([np.zeros((1, 2)), np.cumsum(seg, axis=0)])
            i = np.arange(n)
            hh = np.minimum(h, np.minimum(i, n - 1 - i))
            seg[:] = (cs[i + hh + 1] - cs[i - hh]) / (2 * hh + 1)[:, None]
    out.history.append(f"smooth_moving_average(window={window})")
    return out


def smooth_savgol(tracks: Tracks, window: int = 7, polyorder: int = 2) -> Tracks:
    """Savitzky-Golay フィルタで平滑化する。

    各点のまわり ``window`` 点に ``polyorder`` 次の多項式を最小二乗で当てはめ、
    その多項式の中心での値を新しい座標とする。移動平均より山や曲がり角が
    なまりにくい。``polyorder`` 次までの多項式の動き（polyorder=2 なら等加速度運動）は
    そのまま保たれる。

    欠損で区切られた連続区間ごとに計算する（scipy の savgol_filter, mode="interp"）。
    区間が window より短いときは、polyorder より長い範囲で窓を縮めて計算し、
    それも無理なら（polyorder + 1 点以下）その区間はそのまま残す。
    """
    _check_window(window)
    if polyorder >= window:
        raise ValueError("polyorder は window より小さくしてください")
    out = tracks.copy()
    for _, _, p in _series(out):
        valid = np.all(np.isfinite(p), axis=1)
        for s, e in valid_runs(valid):
            n = e - s
            w = window if n >= window else (n if n % 2 == 1 else n - 1)
            if w <= polyorder:
                continue
            p[s:e] = savgol_filter(p[s:e], w, polyorder, axis=0, mode="interp")
    out.history.append(f"smooth_savgol(window={window}, polyorder={polyorder})")
    return out


# ---------------------------------------------------------------------------
# スケール・時間
# ---------------------------------------------------------------------------
def mm_per_px_from_points(p1: Tuple[float, float], p2: Tuple[float, float], length_mm: float) -> float:
    """定規を写した画像の 2 点から、1 px が何 mm かを求める。

    定義::

        mm_per_px = length_mm / sqrt((x2 - x1)^2 + (y2 - y1)^2)

    例: 定規の 0 mm の目盛りが (100, 200)、50 mm の目盛りが (600, 200) なら
    500 px が 50 mm なので 0.1 mm/px。
    2 点はできるだけ離す（目盛りを読む誤差 ±1 px の影響が小さくなる）。
    定規は動物が歩く面と同じ高さに置いて撮る（高さが違うと倍率が変わる）。
    """
    d = float(np.hypot(p2[0] - p1[0], p2[1] - p1[1]))
    if d <= 0:
        raise ValueError("2 点が同じ位置です。定規の離れた 2 つの目盛りを選んでください。")
    if length_mm <= 0:
        raise ValueError("length_mm は正の数にしてください")
    return float(length_mm) / d


def apply_scale(tracks: Tracks, mm_per_px: float) -> Tracks:
    """座標を px から mm に換算する（x_mm = x_px × mm_per_px）。"""
    if tracks.units == "mm":
        raise ValueError("この Tracks はすでに mm 単位です（2 回換算しようとしていませんか？）")
    if not (mm_per_px > 0):
        raise ValueError("mm_per_px は正の数にしてください")
    out = tracks.copy()
    out.xy = out.xy * mm_per_px
    out.units = "mm"
    out.mm_per_px = float(mm_per_px)
    out.history.append(f"apply_scale(mm_per_px={mm_per_px:.6g})")
    return out


def set_fps(tracks: Tracks, fps: float) -> Tracks:
    """フレームレートを設定した新しい Tracks を返す。"""
    out = tracks.copy()
    out.fps = float(fps)
    out.__post_init__()
    out.history.append(f"set_fps({fps})")
    return out


def fps_from_video(path) -> float:
    """動画ファイルからフレームレートを読む（OpenCV が必要。Colab には入っている）。

    スマートフォンのスロー撮影（120/240 fps）は、再生用に 30 fps と記録されている
    ことがある。撮影時の設定と食い違っていないか必ず確認すること。
    """
    import cv2

    cap = cv2.VideoCapture(str(path))
    fps = cap.get(cv2.CAP_PROP_FPS)
    cap.release()
    if not fps or not np.isfinite(fps) or fps <= 0:
        raise ValueError(f"{path} からフレームレートを読めませんでした")
    return float(fps)


def downsample(tracks: Tracks, factor: int) -> Tracks:
    """``factor`` サンプルごとに 1 つを残して間引く（frame_step が factor 倍になる）。

    高いフレームレートでは 1 フレームの移動が検出の揺れと同じくらい小さくなり、
    速度や転向角が揺れで水増しされる。間引く前に平滑化しておくとよい。
    """
    factor = int(factor)
    if factor < 1:
        raise ValueError("factor は 1 以上の整数にしてください")
    out = tracks.select(frames=slice(None, None, factor))
    out.history.append(f"downsample(factor={factor})")
    return out
