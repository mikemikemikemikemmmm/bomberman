from collections import deque
from config import TILE_X_NUM, TILE_Y_NUM
from game.obj_manager import ObjManager

DIRS = [
    (0, -1, "up"),
    (0,  1, "down"),
    (-1, 0, "left"),
    (1,  0, "right"),
]


def _out_of_bounds(x: int, y: int) -> bool:
    return x < 0 or x >= TILE_X_NUM or y < 0 or y >= TILE_Y_NUM


def bfs_next_dir(
    start: tuple[int, int],
    target: tuple[int, int],
    obj_manager: ObjManager,
    danger_map: list[list[bool]],
    avoid_danger: bool,
) -> dict | None:
    """
    BFS from `start` toward `target`.
    Returns {"dir": str, "steps": int} or None if no path found.
    """
    sx, sy = start
    tx, ty = target

    if sx == tx and sy == ty:
        return {"dir": None, "steps": 0}

    visited = [[False] * TILE_X_NUM for _ in range(TILE_Y_NUM)]
    visited[sy][sx] = True
    queue = deque()

    for dx, dy, d in DIRS:
        nx, ny = sx + dx, sy + dy
        if _out_of_bounds(nx, ny) or visited[ny][nx]:
            continue
        tile_type = obj_manager.map_manager.get_tile_type(nx, ny)
        if tile_type in ("wall", "brick", "bomb"):
            continue
        if avoid_danger and danger_map[ny][nx]:
            continue
        visited[ny][nx] = True
        queue.append({"pos": (nx, ny), "dir": d, "steps": 1})

    while queue:
        node = queue.popleft()
        nx, ny = node["pos"]
        if nx == tx and ny == ty:
            return {"dir": node["dir"], "steps": node["steps"]}

        for dx, dy, _ in DIRS:
            nnx, nny = nx + dx, ny + dy
            if _out_of_bounds(nnx, nny) or visited[nny][nnx]:
                continue
            tile_type = obj_manager.map_manager.get_tile_type(nnx, nny)
            if tile_type in ("wall", "brick", "bomb"):
                continue
            if avoid_danger and danger_map[nny][nnx]:
                continue
            visited[nny][nnx] = True
            queue.append({"pos": (nnx, nny), "dir": node["dir"], "steps": node["steps"] + 1})

    return None


def find_nearest_safe_tile(
    start: tuple[int, int],
    obj_manager: ObjManager,
    danger_map: list[list[bool]],
) -> dict | None:
    """
    BFS to find the nearest tile NOT in the danger map.
    The AI may walk through bomb tiles (its own bombs) during escape.
    Returns {"dir": str, "steps": int} or None.
    """
    sx, sy = start
    if not danger_map[sy][sx]:
        return {"dir": None, "steps": 0}

    visited = [[False] * TILE_X_NUM for _ in range(TILE_Y_NUM)]
    visited[sy][sx] = True
    queue = deque()

    for dx, dy, d in DIRS:
        nx, ny = sx + dx, sy + dy
        if _out_of_bounds(nx, ny) or visited[ny][nx]:
            continue
        tile_type = obj_manager.map_manager.get_tile_type(nx, ny)
        if tile_type in ("wall", "brick"):
            continue
        visited[ny][nx] = True
        queue.append({"pos": (nx, ny), "dir": d, "steps": 1})

    while queue:
        node = queue.popleft()
        nx, ny = node["pos"]
        if not danger_map[ny][nx]:
            return {"dir": node["dir"], "steps": node["steps"]}

        for dx, dy, _ in DIRS:
            nnx, nny = nx + dx, ny + dy
            if _out_of_bounds(nnx, nny) or visited[nny][nnx]:
                continue
            tile_type = obj_manager.map_manager.get_tile_type(nnx, nny)
            if tile_type in ("wall", "brick"):
                continue
            visited[nny][nnx] = True
            queue.append({"pos": (nnx, nny), "dir": node["dir"], "steps": node["steps"] + 1})

    return None
