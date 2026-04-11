from config import COUNTDOWN_FIRE_MS, TILE_WIDTH


class FireObj:
    """
    A fire explosion instance.
    Stores tile indices for the center and each arm segment.
    """
    def __init__(self, center_x: int, center_y: int,
                 vertical_start: int, vertical_end: int,
                 horizontal_start: int, horizontal_end: int):
        self.obj_type = "fire"
        self.remaining_ms = COUNTDOWN_FIRE_MS

        # All tile positions this fire occupies: list of (ix, iy)
        self.tiles: list[tuple[int, int]] = []
        self.tiles.append((center_x, center_y))

        for i in range(1, vertical_start + 1):
            self.tiles.append((center_x, center_y - i))
        for i in range(1, vertical_end + 1):
            self.tiles.append((center_x, center_y + i))
        for i in range(1, horizontal_start + 1):
            self.tiles.append((center_x - i, center_y))
        for i in range(1, horizontal_end + 1):
            self.tiles.append((center_x + i, center_y))
