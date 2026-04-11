"""
Bomberman - pygame clone of the offline Phaser 3 version.

Controls (Player 1 = blue):
  W/A/S/D  - move
  F        - place bomb

AI (Player 2 = red) is fully autonomous.

Press R to restart after game over.
Press ESC to quit.

PPO demo flags:
  --ppo   PATH   man2 uses this PPO checkpoint (man1 = rule-based AI)
  --ppo1  PATH   man1 uses this PPO checkpoint
  --ppo2  PATH   man2 uses this PPO checkpoint
  (--ppo1 and --ppo2 can be combined for PPO vs PPO)
"""

from __future__ import annotations

import argparse
import sys
import numpy as np
import pygame

from config import (
    TILE_WIDTH,
    TILE_X_NUM,
    TILE_Y_NUM,
    FPS,
    BACKGROUND_COLOR,
    WALL_COLOR,
    BRICK_COLOR,
    BOMB_COLOR,
    FIRE_COLOR,
    MAN1_COLOR,
    MAN2_COLOR,
    ITEM_SPEED_COLOR,
    ITEM_BOMB_COLOR,
    ITEM_FIRE_COLOR,
    WINDOW_W,
    WINDOW_H,
)
from map_data import ALL_MAPS
from game.obj_manager import ObjManager
from game.objects.brick import BrickObj
from game.objects.bomb import BombObj
from game.objects.item import ItemObj
from game.objects.man import ManObj
from ai.ai_controller import AIController

# ---------------------------------------------------------------------------
# Colours / rendering helpers
# ---------------------------------------------------------------------------

ITEM_COLORS = {
    "speed": ITEM_SPEED_COLOR,
    "moreBomb": ITEM_BOMB_COLOR,
    "fire": ITEM_FIRE_COLOR,
}

MAN_COLORS = {
    "man1": MAN1_COLOR,
    "man2": MAN2_COLOR,
}


def draw_tile_rect(surface: pygame.Surface, color, ix: int, iy: int, inset: int = 0):
    pygame.draw.rect(
        surface,
        color,
        (
            ix * TILE_WIDTH + inset,
            iy * TILE_WIDTH + inset,
            TILE_WIDTH - inset * 2,
            TILE_WIDTH - inset * 2,
        ),
    )


# ---------------------------------------------------------------------------
# Game state
# ---------------------------------------------------------------------------


def _load_ppo(path: str | None):
    """Load a SB3 PPO model from a .zip checkpoint, or return None."""
    if path is None:
        return None
    # Deferred import: gymnasium/stable_baselines3 corrupt sys.modules['pygame']
    # when imported at module level, so we import them only when actually needed.
    from stable_baselines3 import PPO
    model = PPO.load(path, device="cpu")
    model.policy.set_training_mode(False)
    print(f"Loaded PPO model: {path}")
    return model


def _ppo_input(model, om, self_key: str, opp_key: str) -> dict:
    """Run a PPO model and return {dir, place_bomb}."""
    from env.bomberman_env import ACTIONS, build_obs
    obs = build_obs(om, self_key, opp_key)
    action, _ = model.predict(obs[np.newaxis], deterministic=True)
    direction, place_bomb = ACTIONS[int(action[0])]
    return {"dir": direction, "place_bomb": place_bomb}


class Game:
    def __init__(self, ppo1=None, ppo2=None):
        self.map_matrix = ALL_MAPS[0]["matrix"]
        self.ppo1 = ppo1
        self.ppo2 = ppo2
        self.reset()

    def reset(self):
        self.obj_manager = ObjManager([row[:] for row in self.map_matrix])
        self.ai1 = None if self.ppo1 else AIController(self.obj_manager, ai_key="man1", target_key="man2")
        self.ai2 = None if self.ppo2 else AIController(self.obj_manager, ai_key="man2", target_key="man1")
        self.game_over = False
        self.winner = None  # "man1" | "man2" | None (draw)

    # ------------------------------------------------------------------ update

    def update(self, delta_ms: float, keys):
        if self.game_over:
            return

        obj_manager = self.obj_manager
        p1 = next((p for p in obj_manager.players if p.man_key == "man1"), None)
        p2 = next((p for p in obj_manager.players if p.man_key == "man2"), None)

        # --- AI1 input (man1) ---
        if self.ppo1:
            ai1_input = _ppo_input(self.ppo1, obj_manager, "man1", "man2")
        else:
            ai1_input = self.ai1.get_input()
        if p1 and p1.is_alive and not p1.is_dying:
            if ai1_input["dir"]:
                obj_manager.handle_move(p1, ai1_input["dir"])
            else:
                obj_manager.stop_move(p1)
            if ai1_input["place_bomb"]:
                obj_manager.handle_place_bomb(p1)

        # --- AI2 input (man2) ---
        if self.ppo2:
            ai2_input = _ppo_input(self.ppo2, obj_manager, "man2", "man1")
        else:
            ai2_input = self.ai2.get_input()
        if p2 and p2.is_alive and not p2.is_dying:
            if ai2_input["dir"]:
                obj_manager.handle_move(p2, ai2_input["dir"])
            else:
                obj_manager.stop_move(p2)
            if ai2_input["place_bomb"]:
                obj_manager.handle_place_bomb(p2)

        # --- Tick ---
        obj_manager.handle_countdown(delta_ms)
        obj_manager.check_player_die()
        obj_manager.check_player_eat_item()

        # --- Check game over ---
        alive = obj_manager.get_alive_players()
        if len(alive) < 2:
            self.game_over = True
            self.winner = alive[0].man_key if alive else None

    # ------------------------------------------------------------------ render

    def draw(self, surface: pygame.Surface, font: pygame.font.Font):
        surface.fill(BACKGROUND_COLOR)
        obj_manager = self.obj_manager

        # Draw map tiles
        for iy in range(TILE_Y_NUM):
            for ix in range(TILE_X_NUM):
                tile = obj_manager.map_manager.get_tile(ix, iy)
                if tile == "wall":
                    draw_tile_rect(surface, WALL_COLOR, ix, iy)
                elif isinstance(tile, BrickObj):
                    alpha = 255
                    if tile.is_ruining:
                        ratio = tile.ruin_timer_ms / 500
                        alpha = int(255 * max(0, ratio))
                    color = (*BRICK_COLOR, alpha)
                    s = pygame.Surface((TILE_WIDTH, TILE_WIDTH), pygame.SRCALPHA)
                    s.fill(color)
                    surface.blit(s, (ix * TILE_WIDTH, iy * TILE_WIDTH))
                elif isinstance(tile, BombObj):
                    # Pulsing size
                    frac = tile.remaining_ms / 3000
                    inset = int(4 + (1 - frac) * 6)
                    draw_tile_rect(surface, BOMB_COLOR, ix, iy, inset)
                elif isinstance(tile, ItemObj):
                    col = ITEM_COLORS.get(tile.item_type, (200, 200, 200))
                    draw_tile_rect(surface, col, ix, iy, 8)

        # Draw fires
        for fire in obj_manager.fires:
            for fx, fy in fire.tiles:
                if 0 <= fx < TILE_X_NUM and 0 <= fy < TILE_Y_NUM:
                    alpha = int(255 * max(0, fire.remaining_ms / 500))
                    s = pygame.Surface((TILE_WIDTH, TILE_WIDTH), pygame.SRCALPHA)
                    s.fill((*FIRE_COLOR, alpha))
                    surface.blit(s, (fx * TILE_WIDTH, fy * TILE_WIDTH))

        # Draw players
        for player in obj_manager.players:
            color = MAN_COLORS.get(player.man_key, (200, 200, 200))
            if player.is_dying:
                alpha = int(255 * max(0, player.die_timer_ms / player.DIE_ANIM_MS))
                s = pygame.Surface((TILE_WIDTH, TILE_WIDTH), pygame.SRCALPHA)
                s.fill((*color, alpha))
                surface.blit(s, (player.pos_x, player.pos_y))
            else:
                pygame.draw.rect(
                    surface,
                    color,
                    (
                        player.pos_x + 4,
                        player.pos_y + 4,
                        TILE_WIDTH - 8,
                        TILE_WIDTH - 8,
                    ),
                )
                # Eyes to show direction
                self._draw_man_face(surface, player)

        # HUD
        self._draw_hud(surface, font, obj_manager)

        # Game over overlay
        if self.game_over:
            overlay = pygame.Surface((WINDOW_W, WINDOW_H), pygame.SRCALPHA)
            overlay.fill((0, 0, 0, 160))
            surface.blit(overlay, (0, 0))
            if self.winner:
                wname = "AI1" if self.winner == "man1" else "AI2"
                wcolor = MAN_COLORS[self.winner]
                msg = font.render(f"{wname} wins!", True, wcolor)
            else:
                msg = font.render("Draw!", True, (255, 255, 255))
            surface.blit(
                msg,
                (
                    WINDOW_W // 2 - msg.get_width() // 2,
                    WINDOW_H // 2 - msg.get_height() // 2 - 20,
                ),
            )
            sub = font.render("Press R to restart", True, (200, 200, 200))
            surface.blit(
                sub,
                (
                    WINDOW_W // 2 - sub.get_width() // 2,
                    WINDOW_H // 2 - sub.get_height() // 2 + 20,
                ),
            )

    def _draw_man_face(self, surface: pygame.Surface, player: ManObj):
        cx = player.pos_x + TILE_WIDTH // 2
        cy = player.pos_y + TILE_WIDTH // 2
        half = TILE_WIDTH // 2 - 6  # 三角形頂點距中心
        wing = 7  # 三角形底邊半寬
        triangles = {
            "up": [
                (cx, cy - half),
                (cx - wing, cy + wing // 2),
                (cx + wing, cy + wing // 2),
            ],
            "down": [
                (cx, cy + half),
                (cx - wing, cy - wing // 2),
                (cx + wing, cy - wing // 2),
            ],
            "left": [
                (cx - half, cy),
                (cx + wing // 2, cy - wing),
                (cx + wing // 2, cy + wing),
            ],
            "right": [
                (cx + half, cy),
                (cx - wing // 2, cy - wing),
                (cx - wing // 2, cy + wing),
            ],
        }
        pts = triangles.get(player.dir)
        if pts:
            pygame.draw.polygon(surface, (255, 255, 255), pts)

    def _draw_hud(
        self, surface: pygame.Surface, font: pygame.font.Font, obj_manager: ObjManager
    ):
        p1 = next((p for p in obj_manager.players if p.man_key == "man1"), None)
        ai = next((p for p in obj_manager.players if p.man_key == "man2"), None)

        lines = []
        if p1:
            tag1 = "PPO" if self.ppo1 else f"rule({self.ai1.state})"
            lines.append(
                f"AI1[{tag1}] spd:{p1.speed}  bomb:{p1.bomb_num - p1.used_bomb_num}/{p1.bomb_num}  pwr:{p1.bomb_power}"
            )
        if ai:
            tag2 = "PPO" if self.ppo2 else f"rule({self.ai2.state})"
            lines.append(
                f"AI2[{tag2}] spd:{ai.speed}  bomb:{ai.bomb_num - ai.used_bomb_num}/{ai.bomb_num}  pwr:{ai.bomb_power}"
            )

        for i, line in enumerate(lines):
            txt = font.render(line, True, (255, 255, 255))
            surface.blit(txt, (4, 4 + i * 16))


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(description="Bomberman pygame demo")
    parser.add_argument("--ppo",  default=None, help="PPO checkpoint for man2 (man1 = rule-based)")
    parser.add_argument("--ppo1", default=None, help="PPO checkpoint for man1")
    parser.add_argument("--ppo2", default=None, help="PPO checkpoint for man2")
    args = parser.parse_args()

    pygame.init()
    screen = pygame.display.set_mode((WINDOW_W, WINDOW_H))
    pygame.display.set_caption("Bomberman (pygame)")
    clock = pygame.time.Clock()
    font = pygame.font.SysFont("monospace", 13)

    # Load PPO models AFTER pygame.init() — importing stable_baselines3 /
    # gymnasium before pygame.init() corrupts sys.modules['pygame'].
    ppo2_path = args.ppo2 or args.ppo
    ppo1 = _load_ppo(args.ppo1)
    ppo2 = _load_ppo(ppo2_path)

    game = Game(ppo1=ppo1, ppo2=ppo2)

    while True:
        delta_ms = clock.tick(FPS)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    pygame.quit()
                    sys.exit()
                if event.key == pygame.K_r:
                    game.reset()

        keys = pygame.key.get_pressed()
        game.update(delta_ms, keys)
        game.draw(screen, font)
        pygame.display.flip()


if __name__ == "__main__":
    main()
