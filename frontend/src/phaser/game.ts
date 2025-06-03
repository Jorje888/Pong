import Phaser from "phaser";
import { gameConstants } from "../shared/types";
import { MainGameScene } from "./scenes/MainGameScene";

export const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: gameConstants.GAME_WIDTH,
  height: gameConstants.GAME_HEIGHT,
  parent: "phaser-game-container", // ID of the div where the canvas will be injected
  physics: {
    default: "arcade",
    arcade: {
      // debug: true, // useful for seeing physics bodies
    },
  },
  scene: [MainGameScene],
};

export const launchGame = (containerId: string) =>
  new Phaser.Game({ ...phaserConfig, parent: containerId });
