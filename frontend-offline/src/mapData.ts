import { ManSpriteKey } from "./game/sprite_animations/sprite"
import { OriginMapMatrix } from "./game/types"

export const ALL_MAP: {
    id: number,
    matrix: OriginMapMatrix
}[] = [
        {
            id: 1,
            matrix: [
                ["wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall"],
                ["wall", ManSpriteKey.Man1, null, "brick", "brick", "brick", "brick", "brick", "brick", "wall"],
                ["wall", null, "wall", "brick", "brick", "brick", "brick", "wall", "brick", "wall"],
                ["wall", "brick", "brick", "brick", "brick", "brick", "brick", "brick", "brick", "wall"],
                ["wall", "brick", "brick", "brick", "brick", "brick", "brick", "brick", "brick", "wall"],
                ["wall", "brick", "brick", "brick", "brick", "brick", "brick", "brick", "brick", "wall"],
                ["wall", "brick", "brick", "brick", "brick", "brick", "brick", "brick", "brick", "wall"],
                ["wall", "brick", "wall", "brick", "brick", "brick", "brick", "wall", null, "wall"],
                ["wall", "brick", "brick", "brick", "brick", "brick", "brick", null, ManSpriteKey.Man2, "wall"],
                ["wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall"]
            ]
        }, {
            id: 2,
            matrix: [
                ["wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall"],
                ["wall", ManSpriteKey.Man1, null, "brick", "brick", "brick", "brick", "brick", "brick", "wall"],
                ["wall", null, null, "brick", "brick", "brick", "brick", "brick", "brick", "wall"],
                ["wall", "brick", "brick", "brick", "brick", "brick", "brick", "brick", "brick", "wall"],
                ["wall", "brick", "brick", "brick", "brick", "brick", "brick", "brick", "brick", "wall"],
                ["wall", "brick", "brick", "brick", "brick", "brick", "brick", "brick", "brick", "wall"],
                ["wall", "brick", "brick", "brick", "brick", "brick", "brick", "brick", "brick", "wall"],
                ["wall", "brick", "brick", "brick", "brick", "brick", "brick", null, null, "wall"],
                ["wall", "brick", "brick", "brick", "brick", "brick", "brick", null, ManSpriteKey.Man2, "wall"],
                ["wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall"]
            ]
        }
    ]