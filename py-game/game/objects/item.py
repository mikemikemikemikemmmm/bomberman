from game.objects.base import BaseObj


class ItemObj(BaseObj):
    def __init__(self, index_x: int, index_y: int, item_type: str):
        super().__init__(index_x, index_y, "item")
        self.item_type = item_type   # "speed" | "moreBomb" | "fire"
