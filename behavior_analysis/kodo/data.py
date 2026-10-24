"""共通の内部形式 ``Tracks``。

SLEAP・TrackMate・手動追跡のどれを読み込んでも、最後はこの形にそろえる。

    xy[個体, サンプル, 部位, 座標]   形は (n_tracks, n_frames, n_nodes, 2)

* 座標は ``xy[..., 0] = x``, ``xy[..., 1] = y``。
* 欠損（見失ったフレーム）は ``NaN``。x と y の片方だけが欠けることはない
  （片方でも欠けていれば両方 NaN にそろえる）。
* 座標系は画像と同じ「x は右向き、y は下向き」（``y_down=True``）。
  転向角の左右（反時計回り＝左）はこの向きを考慮して計算する。
* サンプル k のフレーム番号は ``frame_start + k * frame_step``。
  ふつうは ``frame_step = 1``（全フレーム）。手動追跡で 10 フレームおきに
  クリックした場合などは ``frame_step = 10`` になる。
* 時刻 [s] は解析区間の最初のサンプルを 0 秒として
  ``t_k = k * frame_step / fps``。隣り合うサンプルの時間間隔は
  ``dt = frame_step / fps``。
"""
from __future__ import annotations

import copy as _copy
import warnings
from dataclasses import dataclass, field
from typing import Optional, Sequence

import numpy as np

__all__ = ["Tracks"]


@dataclass
class Tracks:
    """個体×サンプル×部位×xy の座標と、その解釈に必要な情報をまとめたもの。

    Attributes
    ----------
    xy : ndarray, shape (n_tracks, n_frames, n_nodes, 2)
        座標。欠損は NaN。
    node_names : list of str
        部位の名前（SLEAP の node。点追跡なら ``["point"]``）。
    track_names : list of str
        個体の名前。
    fps : float or None
        フレームレート [フレーム/秒]。None のままでは時間に関わる指標は計算できない。
    units : {"px", "mm"}
        座標の単位。スケール換算（:func:`kodo.preprocess.apply_scale`）で "mm" になる。
    frame_start, frame_step : int
        サンプル k のフレーム番号は ``frame_start + k * frame_step``。
    y_down : bool
        True なら y 軸は下向き（画像座標）。
    scores : ndarray or None, shape (n_tracks, n_frames, n_nodes)
        SLEAP の点の信頼度スコア（あれば）。
    mm_per_px : float or None
        スケール換算に使った値（記録用）。
    source : str
        読み込んだファイル名など。
    history : list of str
        行った前処理の記録。
    """

    xy: np.ndarray
    node_names: list = field(default_factory=lambda: ["point"])
    track_names: Optional[list] = None
    fps: Optional[float] = None
    units: str = "px"
    frame_start: int = 0
    frame_step: int = 1
    y_down: bool = True
    scores: Optional[np.ndarray] = None
    mm_per_px: Optional[float] = None
    source: str = ""
    history: list = field(default_factory=list)

    def __post_init__(self):
        xy = np.array(self.xy, dtype=float)  # 常にコピーする
        if xy.ndim == 3 and xy.shape[-1] == 2:  # (n_tracks, n_frames, 2) も受け付ける
            xy = xy[:, :, None, :]
        if xy.ndim != 4 or xy.shape[-1] != 2:
            raise ValueError(
                f"xy の形は (個体, フレーム, 部位, 2) である必要があります（受け取った形: {xy.shape}）"
            )
        bad = ~np.all(np.isfinite(xy), axis=-1)
        xy[bad] = np.nan
        self.xy = xy
        n_tracks, _, n_nodes, _ = xy.shape
        if self.node_names is None or len(self.node_names) != n_nodes:
            if self.node_names is not None and len(self.node_names) not in (0, n_nodes):
                raise ValueError(
                    f"部位の名前の数（{len(self.node_names)}）と xy の部位数（{n_nodes}）が一致しません"
                )
            self.node_names = ["point"] if n_nodes == 1 else [f"node{k}" for k in range(n_nodes)]
        self.node_names = [str(n) for n in self.node_names]
        if not self.track_names or len(self.track_names) != n_tracks:
            if self.track_names and len(self.track_names) != n_tracks:
                raise ValueError(
                    f"個体の名前の数（{len(self.track_names)}）と xy の個体数（{n_tracks}）が一致しません"
                )
            self.track_names = [f"track_{i}" for i in range(n_tracks)]
        self.track_names = [str(n) for n in self.track_names]
        if self.units not in ("px", "mm"):
            raise ValueError('units は "px" か "mm" にしてください')
        if self.fps is not None:
            self.fps = float(self.fps)
            if not np.isfinite(self.fps) or self.fps <= 0:
                raise ValueError(f"fps は正の数にしてください（受け取った値: {self.fps}）")
        self.frame_start = int(self.frame_start)
        self.frame_step = int(self.frame_step)
        if self.frame_step < 1:
            raise ValueError("frame_step は 1 以上の整数にしてください")
        if self.scores is not None:
            scores = np.array(self.scores, dtype=float)
            if scores.shape != xy.shape[:3]:
                raise ValueError("scores の形は (個体, フレーム, 部位) である必要があります")
            self.scores = scores

    # ------------------------------------------------------------------ 形
    @property
    def n_tracks(self) -> int:
        return self.xy.shape[0]

    @property
    def n_frames(self) -> int:
        """サンプル数（frame_step > 1 のときは動画のフレーム数ではない）。"""
        return self.xy.shape[1]

    @property
    def n_nodes(self) -> int:
        return self.xy.shape[2]

    @property
    def frames(self) -> np.ndarray:
        """各サンプルの動画上のフレーム番号。"""
        return self.frame_start + np.arange(self.n_frames) * self.frame_step

    # ------------------------------------------------------------------ 時間
    def require_fps(self) -> float:
        if self.fps is None:
            raise ValueError(
                "フレームレート（fps）が設定されていません。"
                "tracks.fps = 30 のように、撮影した動画の fps を設定してください。"
            )
        return self.fps

    @property
    def dt(self) -> float:
        """隣り合うサンプルの時間間隔 [s] = frame_step / fps。"""
        return self.frame_step / self.require_fps()

    @property
    def time(self) -> np.ndarray:
        """各サンプルの時刻 [s]（最初のサンプルが 0 秒）。"""
        return np.arange(self.n_frames) * self.dt

    @property
    def duration(self) -> float:
        """解析区間の長さ [s] = (サンプル数 - 1) × dt。"""
        return max(self.n_frames - 1, 0) * self.dt

    # ------------------------------------------------------------------ 取り出し
    def node_index(self, node) -> int:
        if isinstance(node, (int, np.integer)):
            if not 0 <= node < self.n_nodes:
                raise IndexError(f"部位番号 {node} はありません（0〜{self.n_nodes - 1}）")
            return int(node)
        if node not in self.node_names:
            raise KeyError(f"部位 '{node}' はありません。使える部位: {self.node_names}")
        return self.node_names.index(node)

    def track_index(self, track) -> int:
        if isinstance(track, (int, np.integer)):
            if not 0 <= track < self.n_tracks:
                raise IndexError(f"個体番号 {track} はありません（0〜{self.n_tracks - 1}）")
            return int(track)
        if track not in self.track_names:
            raise KeyError(f"個体 '{track}' はありません。いる個体: {self.track_names}")
        return self.track_names.index(track)

    def points(self, node=None) -> np.ndarray:
        """指標の計算に使う 1 点の座標を返す。形は (n_tracks, n_frames, 2)。

        node : str, int, "centroid" または None
            None のとき、部位が 1 つならその部位、複数なら "centroid"。
            "centroid" は各フレームで見えている部位の座標の平均（重心の近似）。
            部位がフレームによって見えたり消えたりすると重心がずれて
            見かけの動きが生じるので、胸部など安定して検出される部位を
            指定するほうが正確。
        """
        if node is None:
            node = 0 if self.n_nodes == 1 else "centroid"
        if isinstance(node, str) and node == "centroid":
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", RuntimeWarning)  # 全部位が欠損のフレーム
                return np.nanmean(self.xy, axis=2)
        return self.xy[:, :, self.node_index(node), :].copy()

    def copy(self) -> "Tracks":
        return _copy.deepcopy(self)

    def select(self, tracks: Optional[Sequence] = None, nodes: Optional[Sequence] = None,
               frames: Optional[slice] = None) -> "Tracks":
        """個体・部位・サンプル区間を絞り込んだ新しい Tracks を返す。

        frames はサンプル番号のスライス（例: ``slice(0, 900)`` で最初の 900 サンプル）。
        """
        out = self.copy()
        ti = list(range(self.n_tracks)) if tracks is None else [self.track_index(t) for t in tracks]
        ni = list(range(self.n_nodes)) if nodes is None else [self.node_index(n) for n in nodes]
        fs = slice(None) if frames is None else frames
        start, _, step = fs.indices(self.n_frames)
        out.xy = self.xy[ti][:, fs][:, :, ni]
        if self.scores is not None:
            out.scores = self.scores[ti][:, fs][:, :, ni]
        out.track_names = [self.track_names[i] for i in ti]
        out.node_names = [self.node_names[i] for i in ni]
        out.frame_start = self.frame_start + start * self.frame_step
        out.frame_step = self.frame_step * step
        return out

    def valid_fraction(self, node=None) -> np.ndarray:
        """個体ごとの、座標がある（NaN でない）サンプルの割合。"""
        p = self.points(node)
        return np.mean(np.all(np.isfinite(p), axis=-1), axis=1)

    def __repr__(self) -> str:
        fps = "未設定" if self.fps is None else f"{self.fps:g}"
        return (
            f"Tracks(個体={self.n_tracks} {self.track_names}, サンプル={self.n_frames}, "
            f"部位={self.n_nodes} {self.node_names}, 単位={self.units}, fps={fps}, "
            f"frame_step={self.frame_step}, 出典='{self.source}')"
        )
