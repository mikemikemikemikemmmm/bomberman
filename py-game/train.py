"""
Bomberman PPO self-play trainer.

Training phases
---------------
1. Warm-up  (steps 0 → selfplay_start):
   Each env plays against the original rule-based AIController.
   This gives the agent a meaningful signal before it has learned anything.

2. Self-play (steps selfplay_start → total_steps):
   The opponent is a frozen snapshot of the current model, refreshed every
   `--update-freq` steps.  The agent learns to beat progressively stronger
   versions of itself.

Outputs
-------
  checkpoints/bomberman_ppo_<step>_steps.zip   — periodic snapshots
  checkpoints/bomberman_final.zip              — final model
  logs/                                        — TensorBoard logs + episode stats

Usage
-----
  uv run python train.py
  uv run python train.py --steps 5000000 --selfplay-start 500000 --n-envs 8
  uv run python train.py --resume checkpoints/bomberman_final.zip
"""

from __future__ import annotations

import argparse
import io
import os

import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import BaseCallback, CheckpointCallback
from stable_baselines3.common.vec_env import DummyVecEnv, VecMonitor

from env.bomberman_env import BombermanEnv, OBS_SIZE


CHECKPOINT_DIR = "checkpoints"
LOG_DIR = "logs"


# ---------------------------------------------------------------------------
# Shared opponent holder
# ---------------------------------------------------------------------------

class OpponentHolder:
    """
    Shared mutable container for the opponent model.

    All BombermanEnv instances reference the same holder.  When the self-play
    callback updates the holder, every env immediately starts playing against
    the new opponent — no env recreation needed.
    """

    def __init__(self):
        self._model: PPO | None = None

    def set_model(self, model: PPO) -> None:
        buf = io.BytesIO()
        model.save(buf)
        buf.seek(0)
        new_model = PPO.load(buf, device="cpu")
        new_model.policy.set_training_mode(False)
        self._model = new_model

    def predict(self, obs: np.ndarray) -> int:
        """obs: float32 array of shape (OBS_SIZE,)  — no batch dim."""
        if self._model is None:
            return 0  # noop (env falls back to rule-based when fn is None)
        action, _ = self._model.predict(
            obs[np.newaxis], deterministic=False
        )
        return int(action[0])


# ---------------------------------------------------------------------------
# Self-play callback
# ---------------------------------------------------------------------------

class SelfPlayCallback(BaseCallback):
    """
    Manages the two training phases:

    Phase 1  — rule-based warm-up:
        `opponent_fn` on every env is None → AIController is used.

    Phase 2  — self-play:
        At `selfplay_start` steps: holder is populated with current weights
        and every env's `opponent_fn` is set to `holder.predict`.
        Every `update_freq` steps thereafter: holder is refreshed.
    """

    def __init__(
        self,
        holder: OpponentHolder,
        envs: list[BombermanEnv],
        selfplay_start: int,
        update_freq: int = 100_000,
        verbose: int = 1,
    ):
        super().__init__(verbose)
        self.holder = holder
        self.envs = envs
        self.selfplay_start = selfplay_start
        self.update_freq = update_freq
        self._last_update = 0
        self._selfplay_active = False

    def _on_step(self) -> bool:
        t = self.num_timesteps

        # --- switch to self-play ---
        if not self._selfplay_active and t >= self.selfplay_start:
            self._selfplay_active = True
            self._last_update = t
            self.holder.set_model(self.model)
            for env in self.envs:
                env.set_opponent_fn(self.holder.predict)
            if self.verbose:
                print(f"\n[SelfPlay] Phase 2 started at step {t:,}\n")

        # --- periodic opponent refresh ---
        if self._selfplay_active and t - self._last_update >= self.update_freq:
            self._last_update = t
            self.holder.set_model(self.model)
            if self.verbose:
                print(f"[SelfPlay] Opponent updated at step {t:,}")

        return True


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def train(
    total_steps: int,
    selfplay_start: int,
    n_envs: int,
    update_freq: int,
    resume: str | None,
) -> None:
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    os.makedirs(LOG_DIR, exist_ok=True)

    holder = OpponentHolder()

    # Keep raw env references so the callback can call set_opponent_fn()
    raw_envs = [
        BombermanEnv(self_key="man1", opp_key="man2", opponent_fn=None)
        for _ in range(n_envs)
    ]
    vec_env = DummyVecEnv([lambda e=e: e for e in raw_envs])
    vec_env = VecMonitor(vec_env, LOG_DIR)

    if resume and os.path.exists(resume):
        print(f"Resuming from {resume} …")
        model = PPO.load(resume, env=vec_env, device="auto")
    else:
        model = PPO(
            "MlpPolicy",
            vec_env,
            # --- network ---
            policy_kwargs=dict(net_arch=[256, 256]),
            # --- PPO hyper-params ---
            n_steps=2048,
            batch_size=256,
            n_epochs=4,
            learning_rate=3e-4,
            gamma=0.99,
            gae_lambda=0.95,
            clip_range=0.2,
            ent_coef=0.01,
            vf_coef=0.5,
            max_grad_norm=0.5,
            # --- misc ---
            verbose=1,
            tensorboard_log=LOG_DIR,
            device="auto",
        )

    callbacks = [
        SelfPlayCallback(
            holder,
            raw_envs,
            selfplay_start=selfplay_start,
            update_freq=update_freq,
        ),
        CheckpointCallback(
            save_freq=max(200_000 // n_envs, 1),
            save_path=CHECKPOINT_DIR,
            name_prefix="bomberman_ppo",
        ),
    ]

    model.learn(
        total_timesteps=total_steps,
        callback=callbacks,
        reset_num_timesteps=(resume is None),
    )

    final_path = os.path.join(CHECKPOINT_DIR, "bomberman_final")
    model.save(final_path)
    print(f"\nTraining complete — model saved to {final_path}.zip")
    print(f"Export to ONNX:  uv run python export_onnx.py --model {final_path}.zip")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train Bomberman PPO agent with self-play"
    )
    parser.add_argument(
        "--steps", type=int, default=3_000_000, help="Total training timesteps"
    )
    parser.add_argument(
        "--selfplay-start",
        type=int,
        default=500_000,
        help="Step at which to switch from rule-based warm-up to self-play",
    )
    parser.add_argument(
        "--update-freq",
        type=int,
        default=100_000,
        help="How often (in steps) to refresh the opponent with current weights",
    )
    parser.add_argument(
        "--n-envs",
        type=int,
        default=8,
        help="Number of parallel environments (DummyVecEnv)",
    )
    parser.add_argument(
        "--resume",
        type=str,
        default=None,
        help="Path to a .zip checkpoint to resume training from",
    )
    args = parser.parse_args()
    train(
        args.steps,
        args.selfplay_start,
        args.n_envs,
        args.update_freq,
        args.resume,
    )


if __name__ == "__main__":
    main()
