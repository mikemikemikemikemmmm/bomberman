from config import TILE_WIDTH, HALF_TILE_WIDTH


class BaseObj:
    def __init__(self, index_x: int, index_y: int, obj_type: str):
        self.pos_x = index_x * TILE_WIDTH   # pixel X (top-left corner)
        self.pos_y = index_y * TILE_WIDTH   # pixel Y (top-left corner)
        self.obj_type = obj_type

    def get_obj_type(self) -> str:
        return self.obj_type

    def get_map_index(self):
        """Return (index_x, index_y) based on top-left pixel position."""
        return (self.pos_x // TILE_WIDTH, self.pos_y // TILE_WIDTH)

    def get_center_map_index(self):
        """Return (index_x, index_y) based on sprite center."""
        cx = self.pos_x + HALF_TILE_WIDTH
        cy = self.pos_y + HALF_TILE_WIDTH
        return (cx // TILE_WIDTH, cy // TILE_WIDTH)

    def get_position(self):
        return (self.pos_x, self.pos_y)
