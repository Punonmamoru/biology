"""kodo（行動）: 高校生物部・SSH探究のための動物行動解析パイプライン。

使い方の流れ::

    import kodo
    tr = kodo.load("video.analysis.h5", fps=30)        # 読み込み → 共通形式 Tracks
    tr = kodo.remove_outliers(tr, threshold=20)         # 前処理
    tr = kodo.interpolate_gaps(tr, max_gap=5)
    tr = kodo.smooth_savgol(tr, window=7)
    tr = kodo.apply_scale(tr, kodo.mm_per_px_from_points((100, 200), (600, 200), 50))
    df = kodo.summarize(tr, speed_threshold=2.0)        # 個体ごとの指標の表
    kodo.save_all_figures(tr, "results")                # 図をまとめて保存
"""
from .data import Tracks
from .fonts import setup_japanese_font
from .io import (load, load_manual_csv, load_sleap_h5, load_trackmate_csv, tracks_to_dataframe,
                 write_manual_csv, write_sleap_h5, write_trackmate_csv)
from .metrics import (CircleROI, RectROI, alternation_index, detect_id_swaps, fit_msd, mean_speed,
                      moving_fraction, msd, nearest_neighbor_distance, net_displacement,
                      occupancy_heatmap, path_length, roi_stats, speed, step_lengths, straightness,
                      swap_tracks, turn_events, turn_summary, turning_angles)
from .plotting import (plot_heatmap, plot_msd, plot_speed, plot_trajectories, plot_turning_hist,
                       save_all_figures, save_figure, set_print_mode, show_image)
from .preprocess import (apply_scale, downsample, fps_from_video, interpolate_gaps, mask_low_scores,
                         mm_per_px_from_points, remove_jumps, remove_outliers, set_fps,
                         smooth_moving_average, smooth_savgol)
from .report import check_tracks, japanese_columns, save_summary_csv, save_timeseries_csv, summarize
from . import synthetic

__version__ = "0.1.0"
