"""グラフの日本語が「□□□（豆腐）」に化けないようにするフォント設定。

matplotlib の既定のフォント（DejaVu Sans）には日本語の文字がない。
:func:`setup_japanese_font` は、パソコンに入っている日本語フォントを探して使う。
見つからないとき（Google Colab の初期状態など）は、Colab なら
``apt-get install fonts-noto-cjk`` で Noto Sans CJK JP を入れてから使う。
"""
from __future__ import annotations

import glob
import os
import shutil
import subprocess
import warnings
from typing import Optional

import matplotlib
from matplotlib import font_manager

__all__ = ["setup_japanese_font", "JP_FONT_CANDIDATES"]

#: 優先順に試す日本語フォント
JP_FONT_CANDIDATES = [
    "IPAexGothic",
    "IPAGothic",
    "IPAPGothic",
    "Noto Sans CJK JP",
    "Noto Sans JP",
    "Source Han Sans JP",
    "Hiragino Sans",
    "Hiragino Kaku Gothic ProN",
    "Yu Gothic",
    "YuGothic",
    "Meiryo",
    "MS Gothic",
    "TakaoGothic",
    "VL Gothic",
]

_FONT_GLOBS = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJKjp-Regular.otf",
    "/usr/share/fonts/**/NotoSansCJK*Regular*",
    "/usr/share/fonts/**/ipaexg*.ttf",
    "/usr/share/fonts/**/ipag*.ttf",
]


def _available() -> set:
    return {f.name for f in font_manager.fontManager.ttflist}


def _find() -> Optional[str]:
    names = _available()
    for c in JP_FONT_CANDIDATES:
        if c in names:
            return c
    return None


def _register_system_fonts():
    """インストール直後のフォントを matplotlib に登録する（キャッシュの作り直しは不要）。"""
    for pattern in _FONT_GLOBS:
        for path in glob.glob(pattern, recursive=True):
            try:
                font_manager.fontManager.addfont(path)
            except Exception:  # 読めないフォントは飛ばす
                pass


def _in_colab() -> bool:
    try:
        import google.colab  # noqa: F401

        return True
    except ImportError:
        return False


def _apt_install() -> bool:
    if shutil.which("apt-get") is None or os.geteuid() != 0:
        return False
    try:
        subprocess.run(["apt-get", "-qq", "install", "-y", "fonts-noto-cjk"], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=300)
        return True
    except Exception:
        try:
            subprocess.run(["apt-get", "-qq", "update"], check=True, stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL, timeout=300)
            subprocess.run(["apt-get", "-qq", "install", "-y", "fonts-noto-cjk"], check=True,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=300)
            return True
        except Exception:
            return False


def setup_japanese_font(install: Optional[bool] = None, verbose: bool = True) -> Optional[str]:
    """日本語フォントを探して matplotlib に設定し、そのフォント名を返す。

    Parameters
    ----------
    install : bool, optional
        見つからないときに apt-get でフォントを入れるか。省略すると Colab のときだけ入れる。

    Returns
    -------
    str or None : 設定したフォント名（見つからなければ None。そのとき日本語は化ける）
    """
    name = _find()
    if name is None:
        _register_system_fonts()
        name = _find()
    if name is None and (install if install is not None else _in_colab()):
        if verbose:
            print("日本語フォントをインストールしています（1 分ほどかかります）…")
        if _apt_install():
            _register_system_fonts()
            name = _find()
    if name is None:
        warnings.warn("日本語フォントが見つかりませんでした。グラフの日本語が □ に化けます。"
                      "Colab なら setup_japanese_font(install=True) を実行してください。")
        return None
    matplotlib.rcParams["font.family"] = "sans-serif"
    fam = [name] + [f for f in matplotlib.rcParams["font.sans-serif"] if f != name]
    matplotlib.rcParams["font.sans-serif"] = fam
    matplotlib.rcParams["axes.unicode_minus"] = False  # マイナス記号の化けを防ぐ
    if verbose:
        print(f"日本語フォント: {name}")
    return name
