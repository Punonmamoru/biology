"""3 種類の入力を共通形式 :class:`~kodo.data.Tracks` に変換する。

* SLEAP の解析ファイル（``.analysis.h5``）……… :func:`load_sleap_h5`
* Fiji/TrackMate のスポット表（CSV）………… :func:`load_trackmate_csv`
* 手動追跡の CSV（``frame, x, y``）……………… :func:`load_manual_csv`

:func:`load` は拡張子と列名を見て自動で振り分ける。

逆向きの書き出し（``write_*``）は、合成データを各形式で保存して
「読み込みの練習」や読み込み関数のテストに使う。
"""
from __future__ import annotations

import re
import warnings
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

from .data import Tracks

__all__ = [
    "load",
    "load_sleap_h5",
    "load_trackmate_csv",
    "load_manual_csv",
    "write_sleap_h5",
    "write_trackmate_csv",
    "write_manual_csv",
    "tracks_to_dataframe",
]


# ---------------------------------------------------------------------------
# 自動判別
# ---------------------------------------------------------------------------
def load(path, fps: Optional[float] = None, **kwargs) -> Tracks:
    """ファイルの種類を自動で判別して読み込む。

    * ``.h5`` / ``.hdf5`` → SLEAP
    * ``.csv`` で ``POSITION_X`` 列（TrackMate の列名）がある → TrackMate
    * それ以外の ``.csv`` / ``.tsv`` / ``.txt`` → 手動追跡
    """
    path = Path(path)
    ext = path.suffix.lower()
    if ext in (".h5", ".hdf5"):
        return load_sleap_h5(path, fps=fps, **kwargs)
    if ext in (".csv", ".tsv", ".txt"):
        head = _read_text_head(path)
        if re.search(r"POSITION_X", head, flags=re.IGNORECASE):
            return load_trackmate_csv(path, fps=fps, **kwargs)
        return load_manual_csv(path, fps=fps, **kwargs)
    raise ValueError(f"対応していないファイル形式です: {path.name}（.h5 か .csv を使ってください）")


def _read_text_head(path, n_bytes: int = 4096) -> str:
    raw = Path(path).read_bytes()[:n_bytes]
    for enc in ("utf-8-sig", "cp932", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return ""


def _read_csv_any_encoding(path, **kwargs) -> pd.DataFrame:
    """UTF-8（BOM あり/なし）→ Shift_JIS(cp932) → latin-1 の順に試して読む。

    Excel で保存した日本語 CSV は cp932 のことが多い。
    """
    last = None
    for enc in ("utf-8-sig", "cp932", "latin-1"):
        try:
            return pd.read_csv(path, encoding=enc, **kwargs)
        except UnicodeDecodeError as e:
            last = e
    raise last  # pragma: no cover


# ---------------------------------------------------------------------------
# SLEAP
# ---------------------------------------------------------------------------
def _decode_strings(arr) -> list:
    out = []
    for s in np.asarray(arr).ravel():
        if isinstance(s, bytes):
            s = s.decode("utf-8", errors="replace")
        out.append(str(s))
    return out


def load_sleap_h5(path, fps: Optional[float] = None, min_score: Optional[float] = None) -> Tracks:
    """SLEAP の解析ファイル（File → Export Analysis HDF5 で作る ``.analysis.h5``）を読む。

    SLEAP はこのファイルを MATLAB 向けに転置して保存するので、h5py で読んだ
    ``tracks`` の形は ``(個体, 2, 部位, フレーム)`` になっている。
    これを ``(個体, フレーム, 部位, 2)`` に並べ替える。
    （転置せずに保存されたファイル ``(フレーム, 部位, 2, 個体)`` も、
    部位数との一致を見て自動で判別する。）

    Parameters
    ----------
    fps : float, optional
        h5 ファイルにはフレームレートが入っていないので、ここで指定するか
        後で ``tracks.fps = 30`` のように設定する。
    min_score : float, optional
        指定すると、点の信頼度スコア（point_scores）がこの値未満の点を欠損にする。
    """
    import h5py

    path = Path(path)
    with h5py.File(path, "r") as f:
        if "tracks" not in f:
            raise ValueError(f"{path.name} に 'tracks' がありません。SLEAP の解析ファイル（.analysis.h5）ですか？")
        raw = f["tracks"][:]
        node_names = _decode_strings(f["node_names"][:]) if "node_names" in f else []
        track_names = _decode_strings(f["track_names"][:]) if "track_names" in f else []
        scores_raw = f["point_scores"][:] if "point_scores" in f else None

    n_nodes = len(node_names)
    if raw.ndim != 4:
        raise ValueError(f"'tracks' の次元が想定外です: {raw.shape}")
    if raw.shape[1] == 2 and (n_nodes == 0 or raw.shape[2] == n_nodes):
        xy = raw.transpose(0, 3, 2, 1)  # (T, 2, N, F) → (T, F, N, 2)
        scores = None if scores_raw is None else scores_raw.transpose(0, 2, 1)  # (T, N, F) → (T, F, N)
    elif raw.shape[2] == 2 and (n_nodes == 0 or raw.shape[1] == n_nodes):
        xy = raw.transpose(3, 0, 1, 2)  # (F, N, 2, T) → (T, F, N, 2)
        scores = None if scores_raw is None else scores_raw.transpose(2, 0, 1)  # (F, N, T) → (T, F, N)
    else:
        raise ValueError(f"'tracks' の形 {raw.shape} と部位数 {n_nodes} が対応しません")

    if scores is not None and scores.shape != xy.shape[:3]:
        scores = None
    if not track_names or len(track_names) != xy.shape[0]:
        track_names = [f"track_{i}" for i in range(xy.shape[0])]

    tracks = Tracks(
        xy=xy,
        node_names=node_names or None,
        track_names=track_names,
        fps=fps,
        units="px",
        scores=scores,
        source=path.name,
    )
    tracks.history.append(f"load_sleap_h5('{path.name}')")
    if min_score is not None:
        from .preprocess import mask_low_scores

        tracks = mask_low_scores(tracks, min_score)
    return tracks


def write_sleap_h5(tracks: Tracks, path) -> Path:
    """Tracks を SLEAP の解析ファイルと同じ構造で保存する（練習用・テスト用）。"""
    import h5py

    path = Path(path)
    xy = tracks.xy
    n_t, n_f, n_n, _ = xy.shape
    occupancy = np.any(np.all(np.isfinite(xy), axis=-1), axis=-1)  # (T, F)
    scores = tracks.scores if tracks.scores is not None else np.where(
        np.all(np.isfinite(xy), axis=-1), 1.0, np.nan
    )
    with h5py.File(path, "w") as f:
        f.create_dataset("tracks", data=xy.transpose(0, 3, 2, 1))  # (T, 2, N, F)
        f.create_dataset("track_occupancy", data=occupancy.T.astype(np.uint8))  # (F, T)
        f.create_dataset("point_scores", data=scores.transpose(0, 2, 1))  # (T, N, F)
        f.create_dataset("instance_scores", data=np.where(occupancy, 1.0, np.nan))  # (T, F)
        f.create_dataset("tracking_scores", data=np.where(occupancy, 1.0, np.nan))
        f.create_dataset("node_names", data=np.array([n.encode() for n in tracks.node_names], dtype="S"))
        f.create_dataset("track_names", data=np.array([n.encode() for n in tracks.track_names], dtype="S"))
        edges = [(i, i + 1) for i in range(n_n - 1)]
        f.create_dataset("edge_inds", data=np.array(edges, dtype=np.int64).reshape(-1, 2).T)
        f.create_dataset(
            "edge_names",
            data=np.array([[tracks.node_names[a].encode(), tracks.node_names[b].encode()] for a, b in edges],
                          dtype="S").reshape(-1, 2).T,
        )
        f.create_dataset("video_path", data=np.bytes_(b"synthetic.mp4"))
        f.create_dataset("labels_path", data=np.bytes_(b"synthetic.slp"))
        f.create_dataset("video_ind", data=0)
        f.create_dataset("provenance", data=np.bytes_(b"{}"))
    return path


# ---------------------------------------------------------------------------
# TrackMate
# ---------------------------------------------------------------------------
_TM_ALIASES = {
    "x": ["POSITION_X", "X"],
    "y": ["POSITION_Y", "Y"],
    "frame": ["FRAME"],
    "track": ["TRACK_ID", "TRACK ID", "TRACKID"],
}


def _find_col(columns, aliases) -> Optional[str]:
    norm = {str(c).strip().upper(): c for c in columns}
    for a in aliases:
        if a.upper() in norm:
            return norm[a.upper()]
    return None


def _detect_tm_units(text_rows: pd.Series) -> Optional[str]:
    """TrackMate の単位行（例: "(micron)", "(pixel)"）から単位を判定する。"""
    for v in text_rows.astype(str):
        s = v.strip().lower()
        if "pixel" in s:
            return "px"
        if "micron" in s or "µm" in s or "μm" in s or "um)" in s:
            return "um"
        if "mm" in s:
            return "mm"
    return None


def load_trackmate_csv(path, fps: Optional[float] = None, units: Optional[str] = None) -> Tracks:
    """Fiji/TrackMate のスポット表（Spots の CSV 書き出し）を読む。

    TrackMate 7 以降の CSV は、1 行目が列名（``POSITION_X`` など）、2〜4 行目が
    名前・略称・単位の説明行になっている。古い版や表からのコピーでは説明行がない。
    どちらにも対応し、``FRAME`` が数値でない行（説明行）は読み飛ばす。

    * 使う列: ``TRACK_ID``・``FRAME``・``POSITION_X``・``POSITION_Y``
      （``POSITION_T`` は使わず、時刻は FRAME と fps から計算する）
    * ``TRACK_ID`` が空・"None" のスポット（どのトラックにもつながらなかった点）は除く。
    * 同じトラック・同じフレームに複数のスポットがある（分岐）ときは平均する。

    Parameters
    ----------
    units : {"px", "mm", "um"}, optional
        座標の単位。省略すると単位行から判定し、判定できなければ "px" とみなす。
        TrackMate で画像に較正（Image → Properties）を設定していると座標は
        µm や mm になる。"um" は mm に換算して読み込む。
    """
    path = Path(path)
    df = _read_csv_any_encoding(path, dtype=str, keep_default_na=False)
    cx, cy = _find_col(df.columns, _TM_ALIASES["x"]), _find_col(df.columns, _TM_ALIASES["y"])
    cf, ct = _find_col(df.columns, _TM_ALIASES["frame"]), _find_col(df.columns, _TM_ALIASES["track"])
    missing = [n for n, c in (("POSITION_X", cx), ("POSITION_Y", cy), ("FRAME", cf)) if c is None]
    if missing:
        raise ValueError(f"TrackMate の CSV に必要な列がありません: {missing}（列: {list(df.columns)[:12]}…）")

    frame_num = pd.to_numeric(df[cf], errors="coerce")
    header_rows = df[frame_num.isna()]
    df = df[frame_num.notna()].copy()
    if units is None:
        units = _detect_tm_units(header_rows[cx]) if len(header_rows) else None
        if units is None:
            units = "px"
            warnings.warn("TrackMate の CSV から単位を判定できなかったので px とみなしました。"
                          "較正していた場合は units='mm' などを指定してください。")
    if units not in ("px", "mm", "um"):
        raise ValueError('units は "px", "mm", "um" のどれかにしてください')

    df["_frame"] = pd.to_numeric(df[cf], errors="coerce").astype(int)
    df["_x"] = pd.to_numeric(df[cx], errors="coerce")
    df["_y"] = pd.to_numeric(df[cy], errors="coerce")
    if ct is None:
        df["_track"] = "0"
    else:
        df["_track"] = df[ct].astype(str).str.strip()
        untracked = df["_track"].isin(["", "None", "none", "NaN", "nan"])
        if untracked.any():
            warnings.warn(f"TRACK_ID のないスポット {int(untracked.sum())} 個を除きました。")
            df = df[~untracked]
    if df.empty:
        raise ValueError("トラックに属するスポットが 1 つもありません。")

    scale = 0.001 if units == "um" else 1.0
    out_units = "mm" if units in ("mm", "um") else "px"
    tracks = _long_to_tracks(df, "_track", "_frame", "_x", "_y", fps=fps, units=out_units,
                             source=path.name, scale=scale, name_prefix="track_")
    tracks.history.append(f"load_trackmate_csv('{path.name}', units={units})")
    return tracks


def write_trackmate_csv(tracks: Tracks, path, node=None) -> Path:
    """Tracks を TrackMate 7 形式のスポット表 CSV（説明行つき）で保存する（練習用・テスト用）。"""
    path = Path(path)
    p = tracks.points(node)
    unit = "pixel" if tracks.units == "px" else "mm"
    cols = ["LABEL", "ID", "TRACK_ID", "QUALITY", "POSITION_X", "POSITION_Y", "POSITION_Z",
            "POSITION_T", "FRAME", "RADIUS"]
    names = ["Label", "Spot ID", "Track ID", "Quality", "X", "Y", "Z", "T", "Frame", "Radius"]
    units = ["", "", "", "(quality)", f"({unit})", f"({unit})", f"({unit})", "(sec)", "", f"({unit})"]
    rows, sid = [], 0
    fps = tracks.fps or 1.0
    for i in range(tracks.n_tracks):
        for k, fr in enumerate(tracks.frames):
            x, y = p[i, k]
            if not (np.isfinite(x) and np.isfinite(y)):
                continue
            rows.append([f"ID{sid}", sid, i, 1.0, x, y, 0.0, fr / fps, int(fr), 5.0])
            sid += 1
    with open(path, "w", encoding="utf-8", newline="") as fh:
        for line in (cols, names, names, units):
            fh.write(",".join(line) + "\n")
        for r in rows:
            fh.write(",".join(str(v) for v in r) + "\n")
    return path


# ---------------------------------------------------------------------------
# 手動追跡
# ---------------------------------------------------------------------------
_MANUAL_ALIASES = {
    "frame": ["frame", "frames", "フレーム", "フレーム番号", "slice", "slice n", "f"],
    "x": ["x", "x座標", "pos_x", "x_px", "x_mm"],
    "y": ["y", "y座標", "pos_y", "y_px", "y_mm"],
    "track": ["id", "track", "track_id", "individual", "animal", "個体", "個体番号", "track no.", "track n"],
}


def load_manual_csv(path, fps: Optional[float] = None, units: str = "px",
                    frame_col: Optional[str] = None, x_col: Optional[str] = None,
                    y_col: Optional[str] = None, track_col: Optional[str] = None) -> Tracks:
    """手動追跡の CSV（最低限 ``frame, x, y`` の 3 列）を読む。

    * 列名は大文字小文字を区別しない。日本語の列名（フレーム, 個体 など）も可。
      Fiji の Manual Tracking の書き出し（``Track n, Slice n, X, Y``）にも対応。
    * 個体を区別する列（``id`` / ``track`` / ``個体``）があれば複数個体として扱う。
    * 10 フレームおきにクリックした、のように一定間隔で記録したデータは、
      その間隔を ``frame_step`` として保持する（間を欠損にはしない）。
      間隔が一定でない場合は、間隔の最大公約数を frame_step にし、
      記録のないサンプルは欠損になる。
    """
    path = Path(path)
    sep = "\t" if path.suffix.lower() == ".tsv" else None
    df = _read_csv_any_encoding(path, sep=sep, engine="python")
    df.columns = [str(c).strip() for c in df.columns]
    cf = frame_col or _find_col_lower(df.columns, _MANUAL_ALIASES["frame"])
    cx = x_col or _find_col_lower(df.columns, _MANUAL_ALIASES["x"])
    cy = y_col or _find_col_lower(df.columns, _MANUAL_ALIASES["y"])
    ct = track_col or _find_col_lower(df.columns, _MANUAL_ALIASES["track"])
    missing = [n for n, c in (("frame", cf), ("x", cx), ("y", cy)) if c is None]
    if missing:
        raise ValueError(f"手動追跡の CSV に必要な列がありません: {missing}（列: {list(df.columns)}）。"
                         "1 行目を frame,x,y にしてください。")
    frames = pd.to_numeric(df[cf], errors="coerce")
    df = df[frames.notna()].copy()
    fr = pd.to_numeric(df[cf])
    if not np.allclose(fr, np.round(fr)):
        raise ValueError("frame 列が整数ではありません。時刻 [s] ではなくフレーム番号を入れてください。")
    df["_frame"] = np.round(fr).astype(int)
    df["_x"] = pd.to_numeric(df[cx], errors="coerce")
    df["_y"] = pd.to_numeric(df[cy], errors="coerce")
    df["_track"] = df[ct].astype(str).str.strip() if ct is not None else "0"
    prefix = "track_" if ct is None else ""
    tracks = _long_to_tracks(df, "_track", "_frame", "_x", "_y", fps=fps, units=units,
                             source=path.name, name_prefix=prefix)
    tracks.history.append(f"load_manual_csv('{path.name}')")
    return tracks


def _find_col_lower(columns, aliases) -> Optional[str]:
    norm = {str(c).strip().lower(): c for c in columns}
    for a in aliases:
        if a.lower() in norm:
            return norm[a.lower()]
    return None


def write_manual_csv(tracks: Tracks, path, node=None) -> Path:
    """Tracks を手動追跡形式（id, frame, x, y）の CSV で保存する。欠損の行は書かない。"""
    df = tracks_to_dataframe(tracks, node=node, include_time=False)
    df = df.dropna(subset=["x", "y"])[["track", "frame", "x", "y"]].rename(columns={"track": "id"})
    df.to_csv(path, index=False, encoding="utf-8-sig")
    return Path(path)


# ---------------------------------------------------------------------------
# 共通
# ---------------------------------------------------------------------------
def _natural_key(s: str):
    return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", str(s))]


def _long_to_tracks(df, track_col, frame_col, x_col, y_col, fps, units, source,
                    scale=1.0, name_prefix="") -> Tracks:
    """縦長の表（1 行 = 1 個体の 1 フレーム）を Tracks に変換する。"""
    dup = df.duplicated(subset=[track_col, frame_col], keep=False)
    if dup.any():
        warnings.warn(f"同じ個体・同じフレームの行が {int(dup.sum())} 行あったので平均しました。")
    g = df.groupby([track_col, frame_col], sort=False)[[x_col, y_col]].mean().reset_index()
    names = sorted(g[track_col].unique(), key=_natural_key)
    all_frames = np.sort(g[frame_col].unique())
    f0 = int(all_frames[0])
    step = int(np.gcd.reduce(np.diff(all_frames))) if len(all_frames) > 1 else 1
    step = max(step, 1)
    n_f = int((all_frames[-1] - f0) // step) + 1
    xy = np.full((len(names), n_f, 1, 2), np.nan)
    tindex = {n: i for i, n in enumerate(names)}
    ti = g[track_col].map(tindex).to_numpy()
    fi = ((g[frame_col].to_numpy() - f0) // step).astype(int)
    xy[ti, fi, 0, 0] = g[x_col].to_numpy() * scale
    xy[ti, fi, 0, 1] = g[y_col].to_numpy() * scale
    return Tracks(
        xy=xy,
        node_names=["point"],
        track_names=[f"{name_prefix}{n}" for n in names],
        fps=fps,
        units=units,
        frame_start=f0,
        frame_step=step,
        source=source,
    )


def tracks_to_dataframe(tracks: Tracks, node=None, include_time: bool = True) -> pd.DataFrame:
    """Tracks を縦長の表（track, frame, time_s, x, y）にする。時系列の CSV 保存用。"""
    p = tracks.points(node)
    n_t, n_f, _ = p.shape
    data = {
        "track": np.repeat(tracks.track_names, n_f),
        "frame": np.tile(tracks.frames, n_t),
    }
    if include_time and tracks.fps is not None:
        data["time_s"] = np.tile(tracks.time, n_t)
    data["x"] = p[:, :, 0].ravel()
    data["y"] = p[:, :, 1].ravel()
    return pd.DataFrame(data)
