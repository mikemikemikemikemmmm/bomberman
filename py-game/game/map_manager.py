from config import TILE_WIDTH, TILE_X_NUM, TILE_Y_NUM
from game.objects.man import ManObj
from game.objects.brick import BrickObj


class MapManager:
    """
    Manages the 2-D tile grid.
    Each cell is one of:
      None        -> empty
      "wall"      -> indestructible wall (string sentinel)
      BaseObj     -> any game object (brick, bomb, item)

    Players never occupy a map cell — their position is pixel-based.
    """

    def __init__(self, matrix: list[list], player_list: list[ManObj]):
        self.map: list[list] = []
        self._init_by_matrix(matrix, player_list)

    # ------------------------------------------------------------------ queries

    def is_tile_empty(self, ix: int, iy: int) -> bool:
        return self.map[iy][ix] is None

    def get_tile(self, ix: int, iy: int):
        return self.map[iy][ix]

    def get_tile_type(self, ix: int, iy: int) -> str:
        tile = self.map[iy][ix]
        if tile is None:
            return "empty"
        if tile == "wall":
            return "wall"
        return tile.get_obj_type()

    # ------------------------------------------------------------------ mutations

    def set_tile(self, ix: int, iy: int, obj):
        self.map[iy][ix] = obj

    def clear_tile(self, ix: int, iy: int):
        self.map[iy][ix] = None

    # ------------------------------------------------------------------ collision

    def can_man_move(self, pos_x: int, pos_y: int, man_obj: ManObj) -> bool:
        """
        Check all four corners of the man's tile-sized bounding box.
        Returns True if the move is legal.
        """
        corners = [
            (pos_x,                  pos_y),
            (pos_x + TILE_WIDTH - 1, pos_y),
            (pos_x,                  pos_y + TILE_WIDTH - 1),
            (pos_x + TILE_WIDTH - 1, pos_y + TILE_WIDTH - 1),
        ]
        for cx, cy in corners:
            ix = cx // TILE_WIDTH
            iy = cy // TILE_WIDTH
            tile_type = self.get_tile_type(ix, iy)

            if tile_type == "bomb":
                # Allow walking through a bomb if we were standing on it when placed
                can_pass = any(
                    bx <= cx < bx + TILE_WIDTH and by <= cy < by + TILE_WIDTH
                    for bx, by in man_obj.can_pass_bomb_pos_list
                )
                if not can_pass:
                    return False
            elif tile_type in ("brick", "wall"):
                return False

        return True

    # ------------------------------------------------------------------ init

    def _init_by_matrix(self, matrix: list[list], player_list: list[ManObj]):
        h = len(matrix)
        w = len(matrix[0])
        self.map = [[None] * w for _ in range(h)]

        for iy in range(h):
            for ix in range(w):
                cell = matrix[iy][ix]
                if cell == "wall":
                    self.map[iy][ix] = "wall"
                elif cell == "brick":
                    brick = BrickObj(ix, iy)
                    self.map[iy][ix] = brick
                elif cell in ("man1", "man2"):
                    man = ManObj(ix, iy, cell)
                    player_list.append(man)
                    self.map[iy][ix] = None   # players don't block tiles
