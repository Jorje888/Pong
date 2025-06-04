import Phaser from "phaser";
import { gameConstants, GamePhase, PlayerState } from "../../shared/types";
import socket from "../../socket"; // Assuming socket.ts provides the socket instance

export class MainGameScene extends Phaser.Scene {
  private opponentNameText: Phaser.GameObjects.Text | null = null;
  private readyButton: Phaser.GameObjects.Text | null = null;
  // Internal state for the scene, updated from registry
  private playerStates: { [socketId: string]: PlayerState } = {};
  private gamePhase: GamePhase = GamePhase.WAITING_FOR_OPPONENT;
  private ownSocketId: string | null = null;
  private roomId: string | null = null;
  private playerSide: "left" | "right" | null = null;
  private opponentName: string | null = null;

  constructor() {
    super({ key: "MainGameScene" });
  }

  // init is called before preload and create, and receives data from scene.start()
  init() {
    // Set up listeners for registry changes
    // This makes the scene reactive to updates from the React component
    this.registry.events.on("changedata-roomId", this.updateRoomId, this);
    this.registry.events.on(
      "changedata-playerSide",
      this.updatePlayerSide,
      this
    );
    this.registry.events.on(
      "changedata-opponentName",
      this.updateOpponentDisplay,
      this
    );
    this.registry.events.on(
      "changedata-playerStates",
      this.updatePlayerStates,
      this
    );
    this.registry.events.on("changedata-gamePhase", this.updateGamePhase, this);
    this.registry.events.on(
      "changedata-ownSocketId",
      this.updateOwnSocketId,
      this
    );
  }

  preload() {
    // empty for now
  }

  create() {
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

    // Initialize text objects
    this.opponentNameText = this.add.text(
      50,
      50,
      "", // Will be updated by updateOpponentDisplay
      { fontSize: "24px", color: "#fff" }
    );

    // Get initial data from registry and update display
    this.updateRoomId(null, this.registry.get("roomId"));
    this.updatePlayerSide(null, this.registry.get("playerSide"));
    this.updateOpponentDisplay(null, this.registry.get("opponentName"));
    this.updatePlayerStates(null, this.registry.get("playerStates"));
    this.updateGamePhase(null, this.registry.get("gamePhase"));
    this.updateOwnSocketId(null, this.registry.get("ownSocketId"));

    // Initial draw of the ready button based on initial state
    this.drawReadyButton();
  }

  // Update methods for registry listeners
  private updateRoomId(_key: string | null, value: string) {
    this.roomId = value;
    // You might want to update some display element with the room ID here
  }

  private updatePlayerSide(_key: string | null, value: "left" | "right") {
    this.playerSide = value;
    // Update display based on player side if needed
  }

  private updateOpponentDisplay(_key: string | null, value: string | null) {
    this.opponentName = value;
    if (this.opponentNameText) {
      this.opponentNameText.setText(
        `Opponent: ${this.opponentName || "Waiting..."} Room: ${
          this.roomId || "..."
        }`
      );
      // Hide if game is not waiting for opponent
      if (this.gamePhase !== GamePhase.WAITING_FOR_OPPONENT) {
        this.opponentNameText.setVisible(false);
      } else {
        this.opponentNameText.setVisible(true);
      }
    }
  }

  private updatePlayerStates(
    _key: string | null,
    value: { [socketId: string]: PlayerState }
  ) {
    this.playerStates = value;
    this.drawReadyButton(); // Redraw button if player states change (e.g., isReady)
  }

  private updateGamePhase(_key: string | null, value: GamePhase) {
    this.gamePhase = value;
    this.drawReadyButton(); // Redraw button if game phase changes
    this.updateOpponentDisplay(null, this.opponentName); // Re-evaluate opponent text visibility
  }

  private updateOwnSocketId(_key: string | null, value: string) {
    this.ownSocketId = value;
    this.drawReadyButton(); // Redraw button if own socket ID becomes available
  }

  private drawReadyButton() {
    if (this.readyButton) {
      this.readyButton.destroy();
    }

    // Only draw the button if in relevant phases
    if (
      this.gamePhase === GamePhase.READY_CHECK ||
      this.gamePhase === GamePhase.ACTIVE_GAME ||
      this.gamePhase === GamePhase.PAUSED
    ) {
      if (
        this.ownSocketId &&
        this.playerStates &&
        this.playerStates[this.ownSocketId]
      ) {
        const me = this.playerStates[this.ownSocketId];
        let buttonColor = "#FF0000"; // Default red
        let buttonText = "READY";

        if (this.gamePhase === GamePhase.READY_CHECK) {
          buttonColor = me.isReady ? "#FFFF00" : "#FF0000"; // Yellow if ready, red if not
          buttonText = me.isReady ? "UNREADY" : "READY";
        } else if (this.gamePhase === GamePhase.ACTIVE_GAME) {
          buttonColor = "#00FF00"; // Green
          buttonText = "PAUSE";
        } else if (this.gamePhase === GamePhase.PAUSED) {
          buttonColor = me.isReady ? "#00FF00" : "#FFFF00"; // Green if ready to resume, yellow if paused
          buttonText = me.isReady ? "RESUME" : "PAUSED";
        }

        this.readyButton = this.add
          .text(
            gameConstants.GAME_WIDTH / 2,
            gameConstants.GAME_HEIGHT - 50,
            buttonText,
            {
              fontSize: "32px",
              color: buttonColor,
              backgroundColor: "#333",
              padding: { x: 10, y: 5 },
            }
          )
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", () => {
            socket.emit("toggleReady");
          });
      }
    }
  }

  update() {
    // empty for now
  }

  shutdown() {
    this.registry.events.off("changedata-roomId", this.updateRoomId, this);
    this.registry.events.off(
      "changedata-playerSide",
      this.updatePlayerSide,
      this
    );
    this.registry.events.off(
      "changedata-opponentName",
      this.updateOpponentDisplay,
      this
    );
    this.registry.events.off(
      "changedata-playerStates",
      this.updatePlayerStates,
      this
    );
    this.registry.events.off(
      "changedata-gamePhase",
      this.updateGamePhase,
      this
    );
    this.registry.events.off(
      "changedata-ownSocketId",
      this.updateOwnSocketId,
      this
    );
  }
}
