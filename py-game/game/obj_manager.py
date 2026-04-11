import random
from config import TILE_WIDTH
from game.map_manager import MapManager
from game.objects.man import ManObj
from game.objects.bomb import BombObj
from game.objects.brick import BrickObj
from game.objects.fire import FireObj
from game.objects.item import ItemObj


ITEM_TYPES = ["speed", "moreBomb", "fire"]


class ObjManager:
    def __init__(self, map_matrix: list[list]):
        self.players: list[ManObj] = []
        self.map_manager = MapManager(map_matrix, self.players)
        self.bombs: list[BombObj] = []
        self.fires: list[FireObj] = []
        self.ruining_bricks: list[BrickObj] = []
        self.items: list[ItemObj] = []

    # ------------------------------------------------------------------ tick

    def handle_countdown(self, delta_ms: float):
        """Called every frame with elapsed milliseconds."""
        self._tick_fires(delta_ms)
        self._tick_ruining_bricks(delta_ms)
        explode_data = self._collect_explode_data(delta_ms)
        self._apply_explode(explode_data)
        self._tick_dying_players(delta_ms)

    # ------------------------------------------------------------------ movement

    def handle_move(self, man: ManObj, direction: str):
        """
        Try to move `man` in `direction`.  Applies snapping / alignment so
        the player can slide around corners (same logic as the TS version).
        """
        if not man.is_alive or man.is_dying:
            return

        speed = man.speed
        px, py = man.pos_x, man.pos_y
        tx, ty = px, py

        if direction == "up":    ty -= speed
        elif direction == "down":  ty += speed
        elif direction == "left":  tx -= speed
        elif direction == "right": tx += speed

        can_move = self.map_manager.can_man_move(tx, ty, man)
        fx, fy = tx, ty

        if not can_move:
            threshold = speed
            if direction in ("left", "right"):
                offset = py % TILE_WIDTH
                if offset != 0:
                    if offset <= threshold:
                        fy = py - offset
                    elif TILE_WIDTH - offset <= threshold:
                        fy = py + (TILE_WIDTH - offset)
                    can_move = self.map_manager.can_man_move(tx, fy, man)
                    fx = tx
            else:  # up / down
                offset = px % TILE_WIDTH
                if offset != 0:
                    if offset <= threshold:
                        fx = px - offset
                    elif TILE_WIDTH - offset <= threshold:
                        fx = px + (TILE_WIDTH - offset)
                    can_move = self.map_manager.can_man_move(fx, ty, man)
                    fy = ty

            if not can_move:
                if direction == "up":    fy = -(-ty // TILE_WIDTH) * TILE_WIDTH
                elif direction == "down":  fy = (ty // TILE_WIDTH) * TILE_WIDTH
                elif direction == "left":  fx = -(-tx // TILE_WIDTH) * TILE_WIDTH
                elif direction == "right": fx = (tx // TILE_WIDTH) * TILE_WIDTH
                can_move = self.map_manager.can_man_move(fx, fy, man)

        self._update_can_pass_bomb(man, fx, fy)

        if can_move:
            man.pos_x = fx
            man.pos_y = fy
        man.set_dir(direction)
        man.set_moving(can_move)

    def stop_move(self, man: ManObj):
        man.set_moving(False)

    # ------------------------------------------------------------------ bomb placement

    def handle_place_bomb(self, man: ManObj) -> bool:
        if not man.is_alive or man.is_dying:
            return False
        if man.used_bomb_num >= man.bomb_num:
            return False
        ix, iy = man.get_center_map_index()
        tile_type = self.map_manager.get_tile_type(ix, iy)
        if tile_type in ("bomb", "brick", "wall"):
            return False
        if tile_type == "item":
            item = self.map_manager.get_tile(ix, iy)
            self.map_manager.clear_tile(ix, iy)
            if item in self.items:
                self.items.remove(item)

        bomb = BombObj(ix, iy, man.bomb_power, man.man_key)
        self.map_manager.set_tile(ix, iy, bomb)
        self.bombs.append(bomb)
        man.can_pass_bomb_pos_list.append((bomb.pos_x, bomb.pos_y))
        man.used_bomb_num += 1
        return True

    # ------------------------------------------------------------------ player checks

    def check_player_die(self):
        for player in list(self.players):
            if not player.is_alive or player.is_dying:
                continue
            px, py = player.get_center_map_index()
            in_fire = any((px, py) in fire.tiles for fire in self.fires)
            if in_fire:
                player.is_alive = False
                player.is_dying = True
                player.die_timer_ms = player.DIE_ANIM_MS

    def check_player_eat_item(self):
        for player in self.players:
            if not player.is_alive or player.is_dying:
                continue
            ix, iy = player.get_center_map_index()
            tile = self.map_manager.get_tile(ix, iy)
            if isinstance(tile, ItemObj):
                self.map_manager.clear_tile(ix, iy)
                if tile in self.items:
                    self.items.remove(tile)
                player.eat_item(tile.item_type)

    def get_alive_players(self) -> list[ManObj]:
        return [p for p in self.players if p.is_alive and not p.is_dying]

    # ------------------------------------------------------------------ private helpers

    def _tick_fires(self, delta_ms: float):
        alive = []
        for fire in self.fires:
            fire.remaining_ms -= delta_ms
            if fire.remaining_ms > 0:
                alive.append(fire)
        self.fires = alive

    def _tick_ruining_bricks(self, delta_ms: float):
        still_ruining = []
        for brick in self.ruining_bricks:
            brick.ruin_timer_ms -= delta_ms
            if brick.ruin_timer_ms <= 0:
                # Brick fully destroyed — maybe drop an item
                ix, iy = brick.get_map_index()
                self._maybe_spawn_item(ix, iy)
            else:
                still_ruining.append(brick)
        self.ruining_bricks = still_ruining

    def _tick_dying_players(self, delta_ms: float):
        alive = []
        for p in self.players:
            if p.is_dying:
                p.die_timer_ms -= delta_ms
                if p.die_timer_ms > 0:
                    alive.append(p)
                # else: drop them from the list entirely
            else:
                alive.append(p)
        self.players = alive

    def _collect_explode_data(self, delta_ms: float):
        explode_bombs: list[BombObj] = []
        remaining: list[BombObj] = []

        for b in self.bombs:
            b.remaining_ms -= delta_ms
            if b.remaining_ms <= 0:
                explode_bombs.append(b)
            else:
                remaining.append(b)
        self.bombs = remaining

        # Chain explosions
        processed = set()
        to_process = list(explode_bombs)
        ruin_bricks: list[BrickObj] = []
        destroy_items: list[ItemObj] = []
        fire_configs: list[dict] = []

        while to_process:
            bomb = to_process.pop(0)
            if id(bomb) in processed:
                continue
            processed.add(id(bomb))

            ix, iy = bomb.get_map_index()
            power = bomb.power

            # Refund bomb slot to owner
            owner = next((p for p in self.players if p.man_key == bomb.man_key), None)
            if owner:
                owner.used_bomb_num = max(0, owner.used_bomb_num - 1)

            up = down = left = right = 0

            for dx, dy, dir_name in [(0,-1,"up"),(0,1,"down"),(-1,0,"left"),(1,0,"right")]:
                for i in range(1, power + 1):
                    nx, ny = ix + dx * i, iy + dy * i
                    if nx < 0 or ny < 0 or nx >= 10 or ny >= 10:
                        break
                    tile_type = self.map_manager.get_tile_type(nx, ny)

                    if tile_type == "wall":
                        break

                    if tile_type == "brick":
                        tile = self.map_manager.get_tile(nx, ny)
                        if not tile.is_ruining and tile not in ruin_bricks:
                            ruin_bricks.append(tile)
                        if dir_name == "up":    up    = max(up, i)
                        elif dir_name == "down":  down  = max(down, i)
                        elif dir_name == "left":  left  = max(left, i)
                        else:                     right = max(right, i)
                        break

                    if tile_type == "item":
                        tile = self.map_manager.get_tile(nx, ny)
                        if tile not in destroy_items:
                            destroy_items.append(tile)
                        if dir_name == "up":    up    = max(up, i)
                        elif dir_name == "down":  down  = max(down, i)
                        elif dir_name == "left":  left  = max(left, i)
                        else:                     right = max(right, i)
                        break

                    if tile_type == "bomb":
                        chain = self.map_manager.get_tile(nx, ny)
                        if id(chain) not in processed and chain not in to_process:
                            explode_bombs.append(chain)
                            to_process.append(chain)
                            self.bombs = [b2 for b2 in self.bombs if b2 is not chain]
                        if dir_name == "up":    up    = max(up, i)
                        elif dir_name == "down":  down  = max(down, i)
                        elif dir_name == "left":  left  = max(left, i)
                        else:                     right = max(right, i)
                        break

                    # empty — fire continues
                    if dir_name == "up":    up    = max(up, i)
                    elif dir_name == "down":  down  = max(down, i)
                    elif dir_name == "left":  left  = max(left, i)
                    else:                     right = max(right, i)

            fire_configs.append({
                "center_x": ix, "center_y": iy,
                "vertical_start": up, "vertical_end": down,
                "horizontal_start": left, "horizontal_end": right,
            })

        return {
            "explode_bombs": explode_bombs,
            "ruin_bricks": ruin_bricks,
            "destroy_items": destroy_items,
            "fire_configs": fire_configs,
        }

    def _apply_explode(self, data: dict):
        for fire_cfg in data["fire_configs"]:
            fire = FireObj(**fire_cfg)
            self.fires.append(fire)

        for bomb in data["explode_bombs"]:
            ix, iy = bomb.get_map_index()
            self.map_manager.clear_tile(ix, iy)

        for brick in data["ruin_bricks"]:
            ix, iy = brick.get_map_index()
            self.map_manager.clear_tile(ix, iy)  # remove from map immediately
            brick.trigger_ruin()
            self.ruining_bricks.append(brick)

        for item in data["destroy_items"]:
            ix, iy = item.get_map_index()
            self.map_manager.clear_tile(ix, iy)
            if item in self.items:
                self.items.remove(item)

    def _maybe_spawn_item(self, ix: int, iy: int):
        if random.randint(0, 4) <= 2:
            item_type = random.choice(ITEM_TYPES)
            item = ItemObj(ix, iy, item_type)
            self.map_manager.set_tile(ix, iy, item)
            self.items.append(item)

    def _update_can_pass_bomb(self, man: ManObj, fx: int, fy: int):
        man.can_pass_bomb_pos_list = [
            (bx, by) for bx, by in man.can_pass_bomb_pos_list
            if abs(bx - fx) < TILE_WIDTH and abs(by - fy) < TILE_WIDTH
        ]
