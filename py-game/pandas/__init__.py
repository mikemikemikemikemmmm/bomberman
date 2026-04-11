"""
Minimal pandas stub.

stable-baselines3 imports pandas at module level, but only uses it in
log-reading utilities (load_results, read_csv, read_json) that are never
called during training.  This stub lets SB3 import cleanly on environments
where the real pandas wheel has a DLL/ABI issue (Python 3.14 on Windows).

Actual training is unaffected; only post-hoc log reading requires real pandas.
"""

from __future__ import annotations


class DataFrame:
    """Minimal DataFrame stub — enough for SB3 to reference the type."""

    def __init__(self, data=None, columns=None):
        self._data = data or []
        self._columns = columns or []
        self.empty = not bool(self._data)

    def __getitem__(self, key):
        return self

    def __setitem__(self, key, value):
        pass

    def __bool__(self):
        return not self.empty

    def reset_index(self, inplace=False):
        return self

    def sort_values(self, by, inplace=False):
        return self

    def __iadd__(self, other):
        return self

    def __sub__(self, other):
        return self


def read_csv(filepath_or_buffer, index_col=None, comment=None):
    raise NotImplementedError("pandas stub: real pandas required for read_csv")


def concat(objs, **kwargs):
    raise NotImplementedError("pandas stub: real pandas required for concat")
