"""グラフ：軌跡・速度の時系列・転向角のヒストグラム・滞在ヒートマップ・MSD。

* 背景はすべて白。
* 個体は色だけでなく線種（実線・破線・点線…）でも区別するので、白黒印刷でも読める。
  :func:`set_print_mode` で ``bw=True`` にすると線を黒一色にする。
* 日本語を使うので、先に :func:`kodo.fonts.setup_japanese_font` を実行しておく。
"""
from __future__ import annotations

import warnings
from pathlib import Path
from typing import Optional, Sequence

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Circle, Rectangle

from . import metrics as M
from .data import Tracks

__all__ = [
    "apply_style",
    "set_print_mode",
    "track_style",
    "plot_trajectories",
    "plot_speed",
    "plot_turning_hist",
    "plot_heatmap",
    "plot_msd",
    "show_image",
    "save_figure",
    "save_all_figures",
]

# 色覚の多様性に配慮して検証された 8 色（順番どおりに使う）
COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"]
# 白黒印刷でも区別できる線種（破線のパターンを個体ごとに変える）
LINESTYLES = [
    "-",
    (0, (6, 3)),
    (0, (1.5, 2)),
    (0, (7, 2, 1.5, 2)),
    (0, (12, 3, 3, 3)),
    (0, (3, 1.5, 1, 1.5, 1, 1.5)),
    (0, (1, 4)),
    (0, (10, 2, 1.5, 2, 1.5, 2)),
]
MARKERS = ["o", "s", "^", "D", "v", "P", "X", "*"]
INK = "#0b0b0b"
INK2 = "#52514e"
GRID = "#d9d8d4"

_MODE = {"bw": False}


def set_print_mode(bw: bool = True):
    """bw=True にすると、個体の線をすべて黒にして線種だけで区別する（白黒印刷向け）。"""
    _MODE["bw"] = bool(bw)


def track_style(i: int) -> dict:
    """i 番目の個体の線の書式（色・線種・目印）。個体の順番が同じなら図をまたいで同じ書式。"""
    color = INK if _MODE["bw"] else COLORS[i % len(COLORS)]
    return {"color": color, "linestyle": LINESTYLES[i % len(LINESTYLES)], "marker": MARKERS[i % len(MARKERS)]}


def apply_style():
    """白背景・黒文字・控えめな目盛り線の書式を matplotlib 全体に設定する。"""
    plt.rcParams.update({
        "figure.facecolor": "white",
        "axes.facecolor": "white",
        "savefig.facecolor": "white",
        "savefig.edgecolor": "white",
        "axes.edgecolor": INK2,
        "axes.labelcolor": INK,
        "text.color": INK,
        "xtick.color": INK2,
        "ytick.color": INK2,
        "axes.grid": True,
        "grid.color": GRID,
        "grid.linewidth": 0.6,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.titlesize": 12,
        "axes.labelsize": 11,
        "legend.frameon": False,
        "figure.dpi": 100,
        "axes.unicode_minus": False,
    })


def _u(tracks: Tracks) -> str:
    return tracks.units


def _new_ax(ax, figsize):
    if ax is None:
        fig, ax = plt.subplots(figsize=figsize)
        return fig, ax
    return ax.figure, ax


def _draw_rois(ax, rois):
    for roi in rois or ():
        if isinstance(roi, M.CircleROI):
            patch = Circle((roi.cx, roi.cy), roi.r, fill=False, ec=INK2, lw=1.2, ls=(0, (4, 2)))
            lx, ly = roi.cx, roi.cy - roi.r
        else:
            patch = Rectangle((roi.x0, roi.y0), roi.x1 - roi.x0, roi.y1 - roi.y0, fill=False,
                              ec=INK2, lw=1.2, ls=(0, (4, 2)))
            lx, ly = (roi.x0 + roi.x1) / 2, roi.y0
        ax.add_patch(patch)
        ax.annotate(roi.name, (lx, ly), xytext=(0, 3), textcoords="offset points",
                    ha="center", va="bottom", fontsize=9, color=INK2)


def _set_image_axes(ax, tracks: Tracks):
    ax.set_aspect("equal", adjustable="datalim")
    if tracks.y_down:
        ax.invert_yaxis()  # 動画と同じ向き（y は下向き）
    ax.set_xlabel(f"x [{_u(tracks)}]")
    ax.set_ylabel(f"y [{_u(tracks)}]")


# ---------------------------------------------------------------------------
def plot_trajectories(tracks: Tracks, node=None, ax=None, rois: Sequence = (),
                      title: Optional[str] = "軌跡", show_start_end: bool = True):
    """全個体の軌跡を 1 枚に描く。● が始点、■ が終点。y 軸は動画と同じく下向き。"""
    apply_style()
    fig, ax = _new_ax(ax, (6.4, 5.0))
    p = tracks.points(node)
    for i in range(tracks.n_tracks):
        st = track_style(i)
        ax.plot(p[i, :, 0], p[i, :, 1], color=st["color"], linestyle=st["linestyle"], lw=1.3,
                label=tracks.track_names[i])
        if show_start_end:
            idx = np.flatnonzero(np.all(np.isfinite(p[i]), axis=1))
            if len(idx):
                ax.plot(*p[i, idx[0]], marker="o", ms=8, color=st["color"], mec="white", mew=1.5, ls="none")
                ax.plot(*p[i, idx[-1]], marker="s", ms=8, color=st["color"], mec="white", mew=1.5, ls="none")
    _draw_rois(ax, rois)
    _set_image_axes(ax, tracks)
    ax.plot([], [], marker="o", color=INK2, ls="none", label="始点")
    ax.plot([], [], marker="s", color=INK2, ls="none", label="終点")
    ax.legend(loc="upper left", bbox_to_anchor=(1.01, 1.0), handlelength=3.2)
    if title:
        ax.set_title(title)
    fig.tight_layout()
    return fig, ax


def plot_speed(tracks: Tracks, node=None, threshold: Optional[float] = None, axes=None,
               title: Optional[str] = "速度の時系列"):
    """個体ごとに速さの時系列を縦に並べて描く（同じ縦軸の範囲で比べられる）。

    threshold を与えると、移動／静止を分けるしきい値を水平の破線で示す。
    """
    apply_style()
    v = M.speed(tracks, node)
    t = tracks.time[:-1] + 0.5 * tracks.dt  # ステップの中点の時刻
    n = tracks.n_tracks
    if axes is None:
        fig, axes = plt.subplots(n, 1, figsize=(8.0, 1.9 * n + 0.8), sharex=True, sharey=True, squeeze=False)
        axes = axes[:, 0]
    else:
        axes = np.atleast_1d(axes)
        fig = axes[0].figure
    for i, ax in enumerate(axes):
        st = track_style(i)
        ax.plot(t, v[i], color=st["color"], linestyle=st["linestyle"], lw=1.0)
        if threshold is not None:
            ax.axhline(threshold, color=INK, lw=1.0, ls=(0, (2, 2)))
        ax.set_ylabel(f"速さ\n[{_u(tracks)}/s]")
        ax.text(0.995, 0.95, tracks.track_names[i], transform=ax.transAxes, ha="right", va="top",
                fontsize=10, color=INK, bbox=dict(fc="white", ec="none", alpha=0.8, pad=1))
        ax.set_ylim(bottom=0)
    axes[-1].set_xlabel("時間 [s]")
    if threshold is not None:
        axes[0].plot([], [], color=INK, lw=1.0, ls=(0, (2, 2)), label=f"しきい値 {threshold:g} {_u(tracks)}/s")
        axes[0].legend(loc="upper left", fontsize=9)
    if title:
        axes[0].set_title(title)
    fig.tight_layout()
    return fig, axes


def plot_turning_hist(tracks: Tracks, node=None, min_step: Optional[float] = None, bin_deg: float = 15.0,
                      ax=None, title: Optional[str] = "転向角の分布"):
    """転向角（−180°〜180°、正 = 左）のヒストグラム。個体ごとに線種を変えた階段状の線で重ねる。

    縦軸は割合（各個体の角度の数で割る）なので、記録の長さが違う個体どうしでも比べられる。
    min_step（転向角を測る最小の移動距離、体長の 1/4 程度）は必ず指定する。
    0 にすると検出のぶれで角度がでたらめになる。
    """
    if min_step is None:
        raise ValueError("min_step（転向角を測る最小の移動距離。体長の 1/4 程度）を指定してください")
    apply_style()
    fig, ax = _new_ax(ax, (6.4, 4.2))
    edges = np.arange(-180, 180 + bin_deg, bin_deg)
    p = tracks.points(node)
    for i in range(tracks.n_tracks):
        th = np.degrees(M.turning_angles(p[i], min_step=min_step, y_down=tracks.y_down))
        if len(th) == 0:
            continue
        h, _ = np.histogram(th, bins=edges)
        h = h / len(th)
        st = track_style(i)
        ax.stairs(h, edges, color=st["color"], linestyle=st["linestyle"], lw=1.6,
                  label=f"{tracks.track_names[i]}（n={len(th)}）")
    ax.set_xlim(-180, 180)
    ax.set_xticks(np.arange(-180, 181, 45))
    ax.set_xlabel("転向角 [°]（右 ← 0 → 左）")
    ax.set_ylabel("割合")
    ax.set_ylim(bottom=0)
    ax.legend(loc="upper left", bbox_to_anchor=(1.01, 1.0), handlelength=3.2)
    if title:
        ax.set_title(f"{title}（min_step = {min_step:g} {_u(tracks)}）")
    fig.tight_layout()
    return fig, ax


def plot_heatmap(tracks: Tracks, bin_size: float, node=None, per_track: bool = True,
                 rois: Sequence = (), bounds=None, title: Optional[str] = "滞在ヒートマップ"):
    """滞在ヒートマップ（白 = 0 秒 → 黒 = 長く滞在）。

    per_track=True なら個体ごとに並べ（範囲と色の目盛りは共通）、False なら全個体の合計。
    灰色の濃さだけで表すので白黒印刷でもそのまま読める。
    """
    apply_style()
    if bounds is None:
        q = tracks.points(node).reshape(-1, 2)
        q = q[np.all(np.isfinite(q), axis=1)]
        bounds = (*q.min(axis=0), *q.max(axis=0))
    targets = list(range(tracks.n_tracks)) if per_track else [None]
    maps = [M.occupancy_heatmap(tracks, bin_size, node=node, track=t, bounds=bounds) for t in targets]
    vmax = max(float(H.max()) for H, _, _ in maps) or 1.0
    n = len(maps)
    ncol = min(n, 3)
    nrow = int(np.ceil(n / ncol))
    w = bounds[2] - bounds[0]
    h = bounds[3] - bounds[1]
    panel_w = 4.2
    panel_h = max(panel_w * h / max(w, 1e-9), 1.5) + 0.6
    fig, axes = plt.subplots(nrow, ncol, figsize=(panel_w * ncol + 1.2, panel_h * nrow), squeeze=False)
    mesh = None
    for k, (H, xe, ye) in enumerate(maps):
        ax = axes.flat[k]
        mesh = ax.pcolormesh(xe, ye, H.T, cmap="Greys", vmin=0, vmax=vmax, shading="flat")
        _draw_rois(ax, rois)
        ax.set_aspect("equal")
        if tracks.y_down:
            ax.invert_yaxis()
        ax.grid(False)
        ax.set_xlabel(f"x [{_u(tracks)}]")
        ax.set_ylabel(f"y [{_u(tracks)}]")
        ax.set_title(tracks.track_names[targets[k]] if targets[k] is not None else "全個体", fontsize=11)
    for ax in list(axes.flat)[n:]:
        ax.set_visible(False)
    cb = fig.colorbar(mesh, ax=axes.ravel().tolist(), shrink=0.85)
    cb.set_label(f"滞在時間 [s]（区画 {bin_size:g}×{bin_size:g} {_u(tracks)}）")
    if title:
        fig.suptitle(title)
    return fig, axes


def plot_msd(tracks: Tracks, node=None, max_lag: Optional[int] = None, ax=None,
             title: Optional[str] = "平均二乗変位（MSD）"):
    """MSD を両対数グラフで描く。傾き 1（拡散的）と 2（直進的）の目安線つき。"""
    apply_style()
    fig, ax = _new_ax(ax, (6.0, 4.4))
    p = tracks.points(node)
    lo, hi, ref_y = np.inf, 0.0, None
    for i in range(tracks.n_tracks):
        lags, val, _ = M.msd(p[i], max_lag=max_lag)
        tau = lags * tracks.dt
        ok = np.isfinite(val) & (val > 0)
        if not ok.any():
            continue
        st = track_style(i)
        ax.plot(tau[ok], val[ok], color=st["color"], linestyle=st["linestyle"], lw=1.6,
                label=tracks.track_names[i])
        lo, hi = min(lo, tau[ok][0]), max(hi, tau[ok][-1])
        if ref_y is None:
            ref_y, ref_x = val[ok][0], tau[ok][0]
    if np.isfinite(lo):
        tt = np.array([lo, hi])
        ax.plot(tt, ref_y * (tt / ref_x), color=INK2, lw=0.9, ls=(0, (1, 2)), label="傾き 1（拡散）")
        ax.plot(tt, ref_y * (tt / ref_x) ** 2, color=INK2, lw=0.9, ls=(0, (5, 2)), label="傾き 2（直進）")
    ax.set_xscale("log")
    ax.set_yscale("log")
    ax.set_xlabel("時間差 τ [s]")
    ax.set_ylabel(f"MSD [{_u(tracks)}²]")
    ax.legend(loc="upper left", bbox_to_anchor=(1.01, 1.0), handlelength=3.2)
    if title:
        ax.set_title(title)
    fig.tight_layout()
    return fig, ax


def show_image(path, grid_step: int = 50, crop=None, ax=None, points: Sequence = ()):
    """画像を画素の目盛りつきで表示する（定規の目盛りや領域の座標を読み取るため）。

    crop=(x0, y0, x1, y1) で一部を拡大。points=[(x, y), ...] を与えると × 印を描く
    （読み取った座標が目盛りに合っているか確かめるのに使う）。
    """
    from PIL import Image

    apply_style()
    img = np.asarray(Image.open(path).convert("RGB"))
    H, W = img.shape[:2]
    x0, y0, x1, y1 = crop if crop is not None else (0, 0, W, H)
    fig, ax = _new_ax(ax, (min(12, max(5, (x1 - x0) / 60)), min(10, max(4, (y1 - y0) / 60))))
    ax.imshow(img, extent=(-0.5, W - 0.5, H - 0.5, -0.5), interpolation="nearest")
    ax.set_xlim(x0, x1)
    ax.set_ylim(y1, y0)
    ax.set_xticks(np.arange((x0 // grid_step) * grid_step, x1 + 1, grid_step))
    ax.set_yticks(np.arange((y0 // grid_step) * grid_step, y1 + 1, grid_step))
    ax.grid(True, color="#2a78d6", alpha=0.35, lw=0.6)
    for (px, py) in points:
        ax.plot(px, py, marker="x", ms=12, mew=2, color="#e34948")
        ax.annotate(f"({px:g}, {py:g})", (px, py), xytext=(6, -14), textcoords="offset points",
                    color="#e34948", fontsize=9)
    ax.set_xlabel("x [px]")
    ax.set_ylabel("y [px]")
    ax.set_title(Path(path).name)
    fig.tight_layout()
    return fig, ax


def _nice_number(x: float) -> float:
    """x 以下でいちばん近い 1, 2, 5 × 10^k の数（ヒートマップの区画の大きさを読みやすくする）。"""
    if not np.isfinite(x) or x <= 0:
        return 1.0
    k = np.floor(np.log10(x))
    for m in (5, 2, 1):
        if m * 10 ** k <= x:
            return float(m * 10 ** k)
    return float(10 ** k)


def save_figure(fig, path, dpi: int = 200) -> Path:
    """白背景の PNG として保存する。"""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=dpi, facecolor="white", bbox_inches="tight")
    return path


def save_all_figures(tracks: Tracks, outdir, node=None, speed_threshold: Optional[float] = None,
                     min_step: Optional[float] = None, bin_size: Optional[float] = None, rois: Sequence = (),
                     prefix: str = "", close: bool = True) -> dict:
    """軌跡・速度・転向角・ヒートマップ・MSD の 5 枚を outdir に保存し、パスの辞書を返す。"""
    outdir = Path(outdir)
    if bin_size is None:
        q = tracks.points(node).reshape(-1, 2)
        q = q[np.all(np.isfinite(q), axis=1)]
        bin_size = _nice_number(max(np.ptp(q[:, 0]), np.ptp(q[:, 1])) / 30)
    figs = {
        "trajectory": plot_trajectories(tracks, node=node, rois=rois)[0],
        "speed": plot_speed(tracks, node=node, threshold=speed_threshold)[0],
    }
    if min_step is None:
        warnings.warn("min_step が指定されていないので、転向角のヒストグラムは保存しませんでした。")
    else:
        figs["turning_hist"] = plot_turning_hist(tracks, node=node, min_step=min_step)[0]
    figs["heatmap"] = plot_heatmap(tracks, bin_size=bin_size, node=node, rois=rois)[0]
    figs["msd"] = plot_msd(tracks, node=node)[0]
    names = {"trajectory": "軌跡", "speed": "速度", "turning_hist": "転向角", "heatmap": "ヒートマップ", "msd": "MSD"}
    paths = {}
    for k, fig in figs.items():
        paths[k] = save_figure(fig, outdir / f"{prefix}{names[k]}.png")
        if close:
            plt.close(fig)
    return paths
