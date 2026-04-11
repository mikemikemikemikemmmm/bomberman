from config import COUNTDOWN_BRICK_RUIN_MS
from game.objects.base import BaseObj


class BrickObj(BaseObj):
    def __init__(self, index_x: int, index_y: int):
        super().__init__(index_x, index_y, "brick")
        self.is_ruining = False
        self.ruin_timer_ms = 0

    def trigger_ruin(self):
        self.is_ruining = True
        self.ruin_timer_ms = COUNTDOWN_BRICK_RUIN_MS
