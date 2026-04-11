from game.obj_manager import ObjManager
from ai.danger_map import compute_danger_map
from ai.pathfinder import bfs_next_dir, find_nearest_safe_tile


class AIController:
    """
    Replicates the TypeScript AIController logic:
      - HUNT state: chase the player; place a bomb when in line-of-sight.
      - ESCAPE state: flee to the nearest safe tile after placing a bomb or
        when the current position is dangerous.
    """

    def __init__(
        self,
        obj_manager: ObjManager,
        ai_key: str = "man2",
        target_key: str = "man1",
    ):
        self.obj_manager = obj_manager
        self.ai_key = ai_key
        self.target_key = target_key
        self.state = "HUNT"   # "HUNT" | "ESCAPE"

    def get_input(self) -> dict:
        """Returns {"dir": str|None, "place_bomb": bool}."""
        om = self.obj_manager

        ai_man = next((p for p in om.players if p.man_key == self.ai_key), None)
        if not ai_man or not ai_man.is_alive:
            return {"dir": None, "place_bomb": False}

        ai_pos = ai_man.get_center_map_index()   # (ix, iy)
        danger_map = compute_danger_map(om)
        in_danger = danger_map[ai_pos[1]][ai_pos[0]]

        if in_danger:
            self.state = "ESCAPE"

        # ---- ESCAPE ----
        if self.state == "ESCAPE":
            escape = find_nearest_safe_tile(ai_pos, om, danger_map)
            if not escape or escape["steps"] == 0:
                self.state = "HUNT"
                return {"dir": None, "place_bomb": False}
            return {"dir": escape["dir"], "place_bomb": False}

        # ---- HUNT ----
        target = next((p for p in om.players if p.man_key == self.target_key), None)
        if not target or not target.is_alive:
            return {"dir": None, "place_bomb": False}

        target_pos = target.get_center_map_index()

        # Place bomb if the blast would reach the target
        if ai_man.used_bomb_num < ai_man.bomb_num:
            if self._can_hit_target(ai_pos, target_pos, ai_man.bomb_power):
                self.state = "ESCAPE"
                return {"dir": None, "place_bomb": True}

        # Move toward the target (safe path first, then ignore danger)
        path = bfs_next_dir(ai_pos, target_pos, om, danger_map, avoid_danger=True)
        if path:
            return {"dir": path["dir"], "place_bomb": False}

        fallback = bfs_next_dir(ai_pos, target_pos, om, danger_map, avoid_danger=False)
        return {"dir": fallback["dir"] if fallback else None, "place_bomb": False}

    # ------------------------------------------------------------------ helpers

    def _can_hit_target(
        self,
        from_pos: tuple[int, int],
        target_pos: tuple[int, int],
        power: int,
    ) -> bool:
        """
        Returns True if a bomb placed at `from_pos` would reach `target_pos`
        along an unobstructed straight line within `power` tiles.
        """
        fx, fy = from_pos
        tx, ty = target_pos

        same_row = fy == ty
        same_col = fx == tx
        if not same_row and not same_col:
            return False

        dist = abs(fx - tx) if same_row else abs(fy - ty)
        if dist > power:
            return False

        dx = (0 if not same_row else (1 if tx > fx else -1))
        dy = (0 if not same_col else (1 if ty > fy else -1))
        for i in range(1, dist):
            tile_type = self.obj_manager.map_manager.get_tile_type(fx + dx * i, fy + dy * i)
            if tile_type in ("wall", "brick"):
                return False

        return True
