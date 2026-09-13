import { SLIME_SPLIT_CHANCE } from "./constants.js";
import { getLowerRarity } from "./rarity.js";

export function onSlimeDefeat(monster) {
  const lower = getLowerRarity(monster.rarity);

  if (lower && Math.random() < SLIME_SPLIT_CHANCE) {
    console.log("[slime] split", monster.rarity, "->", lower);
    return {
      split: [
        { rarity: lower, x: monster.x - 22, y: monster.y - 8 },
        { rarity: lower, x: monster.x + 22, y: monster.y + 8 }
      ]
    };
  }

  return {
    exp: monster.expReward,
    drop: "mucus"
  };
}
