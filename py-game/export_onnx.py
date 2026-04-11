"""
Export a trained SB3 PPO policy to ONNX for use in the web Bomberman game.

Usage
-----
  uv run python export_onnx.py
  uv run python export_onnx.py --model checkpoints/bomberman_final.zip --output model.onnx

Web integration (onnxruntime-web)
----------------------------------
  Input  : Float32Array, shape [1, 708]  — observation vector (see layout below)
  Output : Float32Array, shape [1, 10]   — action probabilities (sum to 1.0)

  Action index map:
    0  noop
    1  up       2  down      3  left      4  right
    5  bomb
    6  bomb+up  7  bomb+down 8  bomb+left 9  bomb+right

  Recommended: sample from the probability distribution, or take argmax for
  deterministic play.

Observation layout (708 float32 values)
-----------------------------------------
  Indices 0..699  — 7-channel 10×10 grid, channel-major order
                    obs[c * 100 + y * 10 + x]  where c=channel, x/y=tile coords

    ch 0  wall             (0 or 1)
    ch 1  brick            (0 or 1)
    ch 2  bomb timer       (remaining_ms / 3000, range 0..1)
    ch 3  fire             (0 or 1)
    ch 4  item             (0 or 1)
    ch 5  AI self position (0 or 1)   ← this AI's tile
    ch 6  opponent position(0 or 1)   ← human player's tile

  Indices 700..707 — scalar features
    700  AI speed / 12
    701  AI available bombs / 6       (bombNum - usedBombNum)
    702  AI bomb power / 6
    703  AI isDying                   (0 or 1)
    704  opponent speed / 12
    705  opponent available bombs / 6
    706  opponent bomb power / 6
    707  opponent isDying             (0 or 1)

  Note: "AI self" is always the AI player; "opponent" is always the human.
  Swap ch5/ch6 and scalar blocks [700..703]/[704..707] if you pass the
  observation from the human player's perspective.
"""

from __future__ import annotations

import argparse
import sys

import numpy as np
import torch
import torch.nn as nn
from stable_baselines3 import PPO

from env.bomberman_env import OBS_SIZE


# ---------------------------------------------------------------------------
# Actor-only export wrapper
# ---------------------------------------------------------------------------

class ActorExport(nn.Module):
    """
    Wraps the SB3 PPO actor path and outputs a softmax probability vector.

    SB3 policy graph (MlpPolicy):
      obs  →  features_extractor (Flatten)
           →  mlp_extractor.policy_net  (shared MLP trunk, actor branch)
           →  action_net                (linear head → logits)
           →  softmax                   (added here for web convenience)
    """

    def __init__(self, policy):
        super().__init__()
        self.features_extractor = policy.features_extractor
        self.mlp_extractor = policy.mlp_extractor
        self.action_net = policy.action_net

    def forward(self, obs: torch.Tensor) -> torch.Tensor:
        features = self.features_extractor(obs)
        latent_pi = self.mlp_extractor.forward_actor(features)
        logits = self.action_net(latent_pi)
        return torch.softmax(logits, dim=-1)


# ---------------------------------------------------------------------------
# Export + verify
# ---------------------------------------------------------------------------

def export(model_path: str, output_path: str, opset: int) -> None:
    print(f"Loading model from {model_path} …")
    model = PPO.load(model_path, device="cpu")
    model.policy.set_training_mode(False)

    actor = ActorExport(model.policy)
    actor.eval()

    dummy_obs = torch.zeros(1, OBS_SIZE, dtype=torch.float32)

    # Sanity-check the forward pass before exporting
    with torch.no_grad():
        probs = actor(dummy_obs)
    assert probs.shape == (1, 10), f"Unexpected output shape: {probs.shape}"
    assert abs(probs.sum().item() - 1.0) < 1e-4, "Probabilities do not sum to 1"
    print(f"Forward pass OK — output shape {list(probs.shape)}, sum={probs.sum().item():.4f}")

    torch.onnx.export(
        actor,
        dummy_obs,
        output_path,
        opset_version=opset,
        input_names=["obs"],
        output_names=["action_probs"],
        dynamic_axes={
            "obs":          {0: "batch"},
            "action_probs": {0: "batch"},
        },
        dynamo=False,  # use legacy TorchScript exporter (avoids onnxscript issues)
    )
    print(f"ONNX model saved → {output_path}")
    print(f"  Input  : float32[batch, {OBS_SIZE}]")
    print(f"  Output : float32[batch, 10]")

    _verify_onnx(output_path, dummy_obs.numpy())


def _verify_onnx(path: str, dummy: np.ndarray) -> None:
    try:
        import onnxruntime as ort
    except ImportError:
        print("(onnxruntime not installed — skipping runtime verification)")
        return

    sess = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
    out = sess.run(None, {"obs": dummy})
    probs = out[0]
    print(f"onnxruntime verification OK — sum={probs.sum():.4f}, argmax={probs.argmax()}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export trained Bomberman PPO policy to ONNX"
    )
    parser.add_argument(
        "--model",
        default="checkpoints/bomberman_final.zip",
        help="Path to the saved SB3 model (.zip)",
    )
    parser.add_argument(
        "--output",
        default="model.onnx",
        help="Output ONNX file path",
    )
    parser.add_argument(
        "--opset",
        type=int,
        default=17,
        help="ONNX opset version (default: 17)",
    )
    args = parser.parse_args()

    if not __import__("os").path.exists(args.model):
        print(f"Model not found: {args.model}")
        print("Train first:  uv run python train.py")
        sys.exit(1)

    export(args.model, args.output, args.opset)


if __name__ == "__main__":
    main()
