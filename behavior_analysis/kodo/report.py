"""個体ごとの指標の表を作り、CSV に保存する。"""
from __future__ import annotations

import warnings
from pathlib import Path
from typing import Optional, Sequence

import numpy as np
import pandas as pd

from . import metrics as M
from .data import Tracks
from .io import tracks_to_dataframe

__all__ = ["summarize", "check_tracks", "japanese_columns", "save_summary_csv", "save_timeseries_csv"]


def summarize(tracks: Tracks, node=None, speed_threshold: Optional[float] = None,
              rois: Sequence = (), min_step: Optional[float] = None, turn_deg: float = 45.0,
              turn_min_deg: float = 5.0, turn_max_straight: int = 3,
              msd_max_lag: Optional[int] = None, msd_fit_max_s: Optional[float] = None,
              msd_alpha_range=(0.7, 1.3), roi_min_samples: int = 1) -> pd.DataFrame:
    """個体ごとの指標を 1 行ずつ並べた表（DataFrame）を返す。

    列（単位 u は tracks.units。mm 換算していれば mm）

    ==================  ===========================================================
    track               個体の名前
    units               座標の単位（mm / px）
    n_samples           サンプル数
    valid_fraction      座標がある（欠損でない）サンプルの割合
    duration_s          解析区間の長さ [s]
    total_distance      総移動距離 L [u]（:func:`kodo.metrics.path_length`）
    net_displacement    始点と終点の直線距離 D [u]
    straightness        直進性 S = D / L
    mean_speed          平均の速さ L / T [u/s]（静止時間も含む）
    median_speed        瞬間の速さ v_t の中央値 [u/s]
    max_speed           瞬間の速さ v_t の最大値 [u/s]（外れ値に敏感）
    moving_fraction     v_t ≥ speed_threshold の割合（speed_threshold を与えたとき）
    stationary_fraction 1 − moving_fraction
    n_turns             転向角の数（min_step を与えたとき。以下 3 つも同じ）
    mean_abs_turn_deg   |θ| の平均 [°]
    left_turn_fraction  左に曲がった割合
    alternation_index   交替性指数（:func:`kodo.metrics.alternation_index`）
    mean_nnd            最近接個体距離の平均 [u]（1 個体なら NaN）
    msd_alpha           MSD 指数 α（検出のぶれの分を引いた両対数の傾き）
    msd_D               拡散係数 D = 傾き / 4 [u²/s]。α が msd_alpha_range の外なら
                        ランダムウォークとみなせないので NaN
    roi_<名前>_time_s   領域の滞在時間 [s]
    roi_<名前>_fraction 領域の滞在割合
    roi_<名前>_entries  領域への進入回数
    roi_<名前>_first_s  最初に領域に入った時刻 [s]（動画の 0 フレーム目 = 0 秒）
    roi_<名前>_first_frame  そのときの動画のフレーム番号
    ==================  ===========================================================

    Parameters
    ----------
    min_step : float
        転向角を測る最小の移動距離（tracks の単位）。体長の 1/4 程度。
        省略すると、検出のぶれで角度がでたらめになるのを避けるため転向角の列を出さない。
    msd_max_lag, msd_fit_max_s :
        MSD を計算する最大のずらし幅（サンプル数）と当てはめる τ の上限 [s]。
        省略時はどちらも記録の 1 割（τ が大きいほど MSD がばらつくため）。
    """
    dt = tracks.dt
    t0 = tracks.time[0] if tracks.n_frames else 0.0
    p_all = tracks.points(node)
    v_all = M.speed(tracks, node)
    nnd = M.nearest_neighbor_distance(tracks, node)
    if min_step is None:
        warnings.warn("min_step が指定されていないので、転向角の指標は計算しませんでした。"
                      "体長の 1/4 程度（例: min_step=1.5 [mm]）を指定してください。")
    if msd_max_lag is None:
        msd_max_lag = max(tracks.n_frames // 10, 2)
    if msd_fit_max_s is None:
        msd_fit_max_s = msd_max_lag * dt
    rows = []
    for i in range(tracks.n_tracks):
        p, v = p_all[i], v_all[i]
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            row = {
                "track": tracks.track_names[i],
                "units": tracks.units,
                "n_samples": tracks.n_frames,
                "valid_fraction": float(np.mean(np.all(np.isfinite(p), axis=1))),
                "duration_s": tracks.duration,
                "total_distance": M.path_length(p),
                "net_displacement": M.net_displacement(p),
                "straightness": M.straightness(p),
                "mean_speed": M.mean_speed(p, dt),
                "median_speed": float(np.nanmedian(v)) if np.isfinite(v).any() else np.nan,
                "max_speed": float(np.nanmax(v)) if np.isfinite(v).any() else np.nan,
            }
        if speed_threshold is not None:
            mf = M.moving_fraction(v, speed_threshold)
            row["moving_fraction"] = mf
            row["stationary_fraction"] = 1 - mf if np.isfinite(mf) else np.nan
        if min_step is not None:
            theta = M.turning_angles(p, min_step=min_step, y_down=tracks.y_down)
            ts = M.turn_summary(theta)
            row["n_turns"] = ts["n_turns"]
            row["mean_abs_turn_deg"] = ts["mean_abs_turn_deg"]
            row["left_turn_fraction"] = ts["left_turn_fraction"]
            row["alternation_index"] = M.alternation_index(theta, turn_deg=turn_deg, min_deg=turn_min_deg,
                                                           max_straight=turn_max_straight)
        row["mean_nnd"] = M._quiet_nanmean(nnd[i])
        lags, val, _ = M.msd(p, max_lag=msd_max_lag)
        fit = M.fit_msd(lags * dt, val, fit_max_s=msd_fit_max_s)
        row["msd_alpha"] = fit["alpha"]
        lo, hi = msd_alpha_range
        row["msd_D"] = fit["D"] if np.isfinite(fit["alpha"]) and lo <= fit["alpha"] <= hi else np.nan
        for roi in rois:
            st = M.roi_stats(p, roi, dt, min_samples=roi_min_samples, t0=t0)
            row[f"roi_{roi.name}_time_s"] = st["time_s"]
            row[f"roi_{roi.name}_fraction"] = st["fraction"]
            row[f"roi_{roi.name}_entries"] = st["entries"]
            row[f"roi_{roi.name}_first_s"] = st["first_entry_s"]
            fs = st["first_entry_sample"]
            row[f"roi_{roi.name}_first_frame"] = (tracks.frame_start + fs * tracks.frame_step
                                                  if np.isfinite(fs) else np.nan)
        rows.append(row)
    df = pd.DataFrame(rows)
    df.attrs["units"] = tracks.units
    return df


def japanese_columns(df: pd.DataFrame, units: Optional[str] = None) -> pd.DataFrame:
    """列名を、単位つきの日本語に置きかえた表を返す（Excel で読む人向け）。"""
    if units is None and "units" in df.columns and df["units"].nunique() == 1:
        units = str(df["units"].iloc[0])
    u = units or df.attrs.get("units", "px")
    base = {
        "track": "個体",
        "units": "単位",
        "n_samples": "サンプル数",
        "valid_fraction": "有効データの割合",
        "duration_s": "解析時間[s]",
        "total_distance": f"総移動距離[{u}]",
        "net_displacement": f"始点終点の直線距離[{u}]",
        "straightness": "直進性",
        "mean_speed": f"平均の速さ[{u}/s]",
        "median_speed": f"速さの中央値[{u}/s]",
        "max_speed": f"最大の速さ[{u}/s]",
        "moving_fraction": "移動の割合",
        "stationary_fraction": "静止の割合",
        "n_turns": "転向角の数",
        "mean_abs_turn_deg": "転向角の絶対値の平均[°]",
        "left_turn_fraction": "左に曲がった割合",
        "alternation_index": "交替性指数",
        "mean_nnd": f"最近接個体距離の平均[{u}]",
        "msd_D": f"拡散係数D[{u}²/s]",
        "msd_alpha": "MSD指数α",
    }
    names = {}
    for c in df.columns:
        if c in base:
            names[c] = base[c]
        elif c.startswith("roi_"):
            for suffix, label in (("_time_s", "滞在時間[s]"), ("_fraction", "滞在割合"), ("_entries", "進入回数"),
                                  ("_first_s", "初進入時刻[s]"), ("_first_frame", "初進入フレーム")):
                if c.endswith(suffix):
                    names[c] = f"領域{c[4:-len(suffix)]}_{label}"
                    break
    return df.rename(columns=names)


def save_summary_csv(df: pd.DataFrame, path, japanese: bool = True) -> Path:
    """指標の表を CSV で保存する。

    Excel でそのまま開いても日本語が化けないよう、BOM つき UTF-8（utf-8-sig）で書く。
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    out = japanese_columns(df) if japanese else df
    out.to_csv(path, index=False, encoding="utf-8-sig", float_format="%.6g")
    return path


def save_timeseries_csv(tracks: Tracks, path, node=None) -> Path:
    """フレームごとの座標・速さの表（track, frame, time_s, x, y, speed）を保存する。

    speed は、そのサンプルから次のサンプルまでの速さ（最後のサンプルは空欄）。
    """
    df = tracks_to_dataframe(tracks, node=node)
    v = M.speed(tracks, node)
    v = np.concatenate([v, np.full((tracks.n_tracks, 1), np.nan)], axis=1)
    df[f"speed_{tracks.units}_per_s"] = v.ravel()
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False, encoding="utf-8-sig", float_format="%.6g")
    return path


def check_tracks(tracks: Tracks, node=None, verbose: bool = True) -> list:
    """よくある失敗がないかを確かめ、注意のメッセージの一覧を返す（verbose なら表示もする）。

    * fps が未設定、または 1〜1000 の範囲外
    * 座標が px のまま（スケール未設定）
    * 欠損が多い（20% 以上）
    * ID の入れ替わりの疑い（:func:`kodo.metrics.detect_id_swaps`）
    """
    msgs = []
    if tracks.fps is None:
        msgs.append("⚠ fps が未設定です。tracks.fps = 30 のように動画のフレームレートを設定してください。")
    elif not (1 <= tracks.fps <= 1000):
        msgs.append(f"⚠ fps = {tracks.fps:g} は不自然です。動画のフレームレートを確かめてください。")
    if tracks.units == "px":
        msgs.append("⚠ 座標が px のままです。定規の画像からスケールを設定すると mm で比べられます。")
    vf = tracks.valid_fraction(node)
    for name, f in zip(tracks.track_names, vf):
        if f < 0.8:
            msgs.append(f"⚠ {name}: 座標のあるフレームが {f:.0%} しかありません（見失いが多い）。")
    if tracks.n_tracks > 1:
        sw = M.detect_id_swaps(tracks, node=node)
        if len(sw):
            frames = ", ".join(str(f) for f in sw["frame"].head(5))
            msgs.append(f"⚠ ID の入れ替わりの疑いが {len(sw)} か所あります（フレーム {frames} …）。"
                        "動画で確かめ、必要なら swap_tracks で直してください。")
    if verbose:
        print("\n".join(msgs) if msgs else "✓ 問題は見つかりませんでした。")
    return msgs
