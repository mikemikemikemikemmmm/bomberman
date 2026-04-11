from config import TILE_X_NUM, TILE_Y_NUM
from game.obj_manager import ObjManager


def compute_danger_map(obj_manager: ObjManager) -> list[list[bool]]:
    """
    Returns a TILE_Y_NUM × TILE_X_NUM boolean grid.
    True  → tile is currently on fire OR within blast range of an active bomb.
    """
    danger = [[False] * TILE_X_NUM for _ in range(TILE_Y_NUM)]

    # Tiles currently on fire
    for fire in obj_manager.fires:
        for ix, iy in fire.tiles:
            if 0 <= iy < TILE_Y_NUM and 0 <= ix < TILE_X_NUM:
                danger[iy][ix] = True

    # Blast radius of active bombs
    dirs = [(0, -1), (0, 1), (-1, 0), (1, 0)]
    for bomb in obj_manager.bombs:
        ix, iy = bomb.get_map_index()
        danger[iy][ix] = True

        for dx, dy in dirs:
            for i in range(1, bomb.power + 1):
                nx, ny = ix + dx * i, iy + dy * i
                if nx < 0 or nx >= TILE_X_NUM or ny < 0 or ny >= TILE_Y_NUM:
                    break
                tile_type = obj_manager.map_manager.get_tile_type(nx, ny)
                if tile_type == "wall":
                    break
                danger[ny][nx] = True
                if tile_type in ("brick", "bomb"):
                    break

    return danger
