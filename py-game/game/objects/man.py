from config import BASE_MAN_SPEED, MAX_SPEED, MAX_BOMB_NUM, MAX_BOMB_POWER
from game.objects.base import BaseObj


class ManObj(BaseObj):
    def __init__(self, index_x: int, index_y: int, man_key: str):
        super().__init__(index_x, index_y, "man")
        self.man_key = man_key          # "man1" or "man2"
        self.is_alive = True
        self.dir = "down"
        self.is_moving = False
        self.used_bomb_num = 0
        self.speed = BASE_MAN_SPEED
        self.bomb_num = 2
        self.bomb_power = 2
        self.can_pass_bomb_pos_list = []  # list of (pos_x, pos_y) of bombs we can walk through

        # Death animation state
        self.is_dying = False
        self.die_timer_ms = 0
        self.DIE_ANIM_MS = 600           # ms to show death before removing

    def set_dir(self, direction: str):
        if not self.is_alive:
            return
        self.dir = direction

    def set_moving(self, v: bool):
        if not self.is_alive:
            return
        self.is_moving = v

    def eat_item(self, item_type: str):
        if item_type == "speed":
            self.speed = min(MAX_SPEED, self.speed + 1)
        elif item_type == "moreBomb":
            self.bomb_num = min(MAX_BOMB_NUM, self.bomb_num + 1)
        elif item_type == "fire":
            self.bomb_power = min(MAX_BOMB_POWER, self.bomb_power + 1)
