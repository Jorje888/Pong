import Phaser from "phaser";
import { gameConstants } from "../../shared/types";
export class MainGameScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainGameScene" });
  }

  preload() {
    // empty for now
  }

  private opponentNameText: Phaser.GameObjects.Text | null = null;

  create(data: { roomId: string; opponentName: string | null }) {
    this.cameras.main.setBackgroundColor("#000033");

    // Draw a center dashed line
    const centerLine = this.add.graphics();
    centerLine.lineStyle(2, 0xffffff, 1);
    centerLine.beginPath();
    for (let y = 0; y < gameConstants.GAME_HEIGHT; y += 10) {
      centerLine.moveTo(gameConstants.GAME_WIDTH / 2, y);
      centerLine.lineTo(gameConstants.GAME_WIDTH / 2, y + 5);
    }
    centerLine.stroke();

    // Draw top and bottom boundary lines
    const topLine = this.add.graphics();
    topLine.lineStyle(2, 0xffffff, 1);
    topLine.beginPath();
    topLine.moveTo(0, 0);
    topLine.lineTo(gameConstants.GAME_WIDTH, 0);
    topLine.stroke();

    const bottomLine = this.add.graphics();
    bottomLine.lineStyle(2, 0xffffff, 1);
    bottomLine.beginPath();
    bottomLine.moveTo(0, gameConstants.GAME_HEIGHT);
    bottomLine.lineTo(gameConstants.GAME_WIDTH, gameConstants.GAME_HEIGHT);
    bottomLine.stroke();

    // Placeholder text
    this.updateOpponentDisplay(data.opponentName);
  }

  private updateOpponentDisplay(name: string | null) {
    if (this.opponentNameText) {
      this.opponentNameText.destroy();
    }
    this.opponentNameText = this.add.text(
      50,
      50,
      `Waiting for opponent...  Room: ${name || "..."}`,
      { fontSize: "24px", color: "#fff" }
    );
  }

  update() {
    // empty for now
  }
}
