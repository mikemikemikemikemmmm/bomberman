"""
Gymnasium environment for Bomberman self-play RL training.

Observation (OBS_SIZE = 708 float32 values):
  Grid channels [0..699], flattened from shape (7, 10, 10)
  — index formula: obs[c * 100 + y * 10 + x]
    ch 0  wall             (0 or 1)
    ch 1  brick            (0 or 1)
    ch 2  bomb timer       (remaining_ms / 3000, range 0..1)
    ch 3  fire             (0 or 1)
    ch 4  item             (0 or 1)
    ch 5  self position    (0 or 1)
    ch 6  opponent position(0 or 1)
  Scalar features [700..707]:
    [700] self.speed / 12
    [701] self.availableBombs / 6    (bomb_num - used_bomb_num)
    [702] self.bombPower / 6
    [703] self.isDying               (0 or 1)
    [704] opp.speed / 12
    [705] opp.availableBombs / 6
    [706] opp.bombPower / 6
    [707] opp.isDying                (0 or 1)

Action space (Discrete 10):
  0  noop
  1  up          2  down       3  left       4  right
  5  bomb only
  6  bomb + up   7  bomb+down  8  bomb+left  9  bomb+right
"""

from __future__ import annotations

import numpy as np
import gymnasium as gym
from gymnasium import spaces

from config import TILE_X_NUM, TILE_Y_NUM
from map_data import ALL_MAPS
from game.obj_manager import ObjManager

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SUBSTEP_MS = 33           # ms per physics sub-step  (~30 FPS)
SUBSTEPS_PER_ACTION = 3   # physics ticks per agent decision (~10 actions/sec)
MAX_STEPS = 2000          # max episode length  (~200 s of simulated game time)

# (direction, place_bomb) for each discrete action index
ACTIONS: list[tuple[str | None, bool]] = [
    (None,    False),  # 0: noop
    ("up",    False),  # 1: up
    ("down",  False),  # 2: down
    ("left",  False),  # 3: left
    ("right", False),  # 4: right
    (None,    True),   # 5: bomb only
    ("up",    True),   # 6: bomb + up
    ("down",  True),   # 7: bomb + down
    ("left",  True),   # 8: bomb + left
    ("right", True),   # 9: bomb + right
]

OBS_CHANNELS = 7
OBS_GRID_SIZE = OBS_CHANNELS * TILE_Y_NUM * TILE_X_NUM  # 700
OBS_SCALARS = 8
OBS_SIZE = OBS_GRID_SIZE + OBS_SCALARS  # 708


# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

class BombermanEnv(gym.Env):
    """
    Single-agent Bomberman env.

    The agent always controls `self_key`.  The opponent (`opp_key`) is driven by:
      - Rule-based AIController when `opponent_fn` is None.
      - A callable  obs_1d (np.float32, shape=(OBS_SIZE,)) -> int  otherwise.

    Call `set_opponent_fn(fn)` at any time to hot-swap the opponent policy
    (used by the self-play callback without recreating the env).
    """

    metadata = {"render_modes": []}

    def __init__(
        self,
        self_key: str = "man1",
        opp_key: str = "man2",
        opponent_fn=None,
    ):
        super().__init__()
        self.self_key = self_key
        self.opp_key = opp_key
        self.opponent_fn = opponent_fn  # None → rule-based

        self.action_space = spaces.Discrete(len(ACTIONS))
        self.observation_space = spaces.Box(
            low=0.0, high=1.0, shape=(OBS_SIZE,), dtype=np.float32
        )

        self.om: ObjManager | None = None
        self._rule_ai = None
        self._step_count = 0

    # ------------------------------------------------------------------ API

    def set_opponent_fn(self, fn):
        """Hot-swap opponent policy for self-play."""
        self.opponent_fn = fn

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        map_matrix = [row[:] for row in ALL_MAPS[0]["matrix"]]
        self.om = ObjManager(map_matrix)

        if self.opponent_fn is None:
            from ai.ai_controller import AIController
            self._rule_ai = AIController(self.om, self.opp_key, self.self_key)
        else:
            self._rule_ai = None

        self._step_count = 0
        return self._get_obs(self.self_key, self.opp_key), {}

    def step(self, action: int):
        om = self.om

        # Snapshot brick count for shaped reward
        prev_bricks = self._count_bricks()

        # Compute inputs once before sub-steps
        self_dir, self_bomb = ACTIONS[action]

        opp_inp = self._compute_opp_input()

        terminated = False
        reward = 0.0

        for sub in range(SUBSTEPS_PER_ACTION):
            self_man = self._get_player(self.self_key)
            opp_man = self._get_player(self.opp_key)

            # --- agent ---
            if self_man and self_man.is_alive and not self_man.is_dying:
                if self_dir:
                    om.handle_move(self_man, self_dir)
                else:
                    om.stop_move(self_man)
                if sub == 0 and self_bomb:
                    om.handle_place_bomb(self_man)

            # --- opponent ---
            if opp_man and opp_man.is_alive and not opp_man.is_dying:
                if opp_inp["dir"]:
                    om.handle_move(opp_man, opp_inp["dir"])
                else:
                    om.stop_move(opp_man)
                if sub == 0 and opp_inp["place_bomb"]:
                    om.handle_place_bomb(opp_man)

            om.handle_countdown(SUBSTEP_MS)
            om.check_player_die()
            om.check_player_eat_item()

            # Check for death after each sub-step
            self_dead = self._is_dead(self.self_key)
            opp_dead = self._is_dead(self.opp_key)
            if self_dead or opp_dead:
                if self_dead and opp_dead:
                    reward = -0.5   # draw
                elif opp_dead:
                    reward = 1.0    # win
                else:
                    reward = -1.0   # loss
                terminated = True
                break

        self._step_count += 1
        truncated = not terminated and self._step_count >= MAX_STEPS

        if not terminated:
            # Brick-destruction bonus (incentivises exploring/bombing)
            curr_bricks = self._count_bricks()
            reward += (prev_bricks - curr_bricks) * 0.005
            # Small per-step penalty to encourage faster wins
            reward -= 0.001

        obs = self._get_obs(self.self_key, self.opp_key)
        return obs, float(reward), terminated, truncated, {}

    def render(self):
        pass

    def close(self):
        pass

    # ------------------------------------------------------------------ helpers

    def _compute_opp_input(self) -> dict:
        """Return {dir, place_bomb} for the opponent."""
        if self._rule_ai is not None:
            return self._rule_ai.get_input()

        if self.opponent_fn is not None:
            opp_man = self._get_player(self.opp_key)
            if opp_man and opp_man.is_alive and not opp_man.is_dying:
                opp_obs = self._get_obs(self.opp_key, self.self_key)
                opp_action = int(self.opponent_fn(opp_obs))
                d, b = ACTIONS[opp_action]
                return {"dir": d, "place_bomb": b}

        return {"dir": None, "place_bomb": False}

    def _get_player(self, key: str):
        if self.om is None:
            return None
        return next((p for p in self.om.players if p.man_key == key), None)

    def _is_dead(self, key: str) -> bool:
        p = self._get_player(key)
        return p is None or not p.is_alive

    def _count_bricks(self) -> int:
        return sum(
            1
            for iy in range(TILE_Y_NUM)
            for ix in range(TILE_X_NUM)
            if self.om.map_manager.get_tile_type(ix, iy) == "brick"
        )

    def _get_obs(self, self_key: str, opp_key: str) -> np.ndarray:
        return build_obs(self.om, self_key, opp_key)


# ---------------------------------------------------------------------------
# Standalone observation builder (importable for demo / inference)
# ---------------------------------------------------------------------------

def build_obs(om, self_key: str, opp_key: str) -> np.ndarray:
    """Build a flat float32 observation vector from a live ObjManager.

    Can be imported by main.py or any other inference script so the
    observation format stays in sync with training.
    """
    grid = np.zeros((OBS_CHANNELS, TILE_Y_NUM, TILE_X_NUM), dtype=np.float32)

    for iy in range(TILE_Y_NUM):
        for ix in range(TILE_X_NUM):
            t = om.map_manager.get_tile_type(ix, iy)
            if t == "wall":
                grid[0, iy, ix] = 1.0
            elif t == "brick":
                grid[1, iy, ix] = 1.0
            elif t == "bomb":
                bomb = om.map_manager.get_tile(ix, iy)
                grid[2, iy, ix] = max(0.0, bomb.remaining_ms / 3000.0)
            elif t == "item":
                grid[4, iy, ix] = 1.0

    for fire in om.fires:
        for fx, fy in fire.tiles:
            if 0 <= fx < TILE_X_NUM and 0 <= fy < TILE_Y_NUM:
                grid[3, fy, fx] = 1.0

    def get_player(key):
        return next((p for p in om.players if p.man_key == key), None)

    self_man = get_player(self_key)
    opp_man = get_player(opp_key)

    if self_man and self_man.is_alive:
        sx, sy = self_man.get_center_map_index()
        if 0 <= sx < TILE_X_NUM and 0 <= sy < TILE_Y_NUM:
            grid[5, sy, sx] = 1.0

    if opp_man and opp_man.is_alive:
        ox, oy = opp_man.get_center_map_index()
        if 0 <= ox < TILE_X_NUM and 0 <= oy < TILE_Y_NUM:
            grid[6, oy, ox] = 1.0

    def scalars(p):
        if p is None or not p.is_alive:
            return np.zeros(4, dtype=np.float32)
        return np.array(
            [
                p.speed / 12.0,
                (p.bomb_num - p.used_bomb_num) / 6.0,
                p.bomb_power / 6.0,
                float(p.is_dying),
            ],
            dtype=np.float32,
        )

    return np.concatenate([grid.flatten(), scalars(self_man), scalars(opp_man)])
