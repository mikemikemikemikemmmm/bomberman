from config import COUNTDOWN_BOMB_MS
from game.objects.base import BaseObj


class BombObj(BaseObj):
    def __init__(self, index_x: int, index_y: int, power: int, man_key: str):
        super().__init__(index_x, index_y, "bomb")
        self.power = power
        self.man_key = man_key
        self.remaining_ms = COUNTDOWN_BOMB_MS
