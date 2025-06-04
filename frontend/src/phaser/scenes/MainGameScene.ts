import Phaser from "phaser";
import {
  gameConstants,
  GamePhase,
  PlayerState,
  BallState,
} from "../../shared/types";
import socket from "../../socket";

export class MainGameScene extends Phaser.Scene {
  // Existing properties
  private opponentNameText: Phaser.GameObjects.Text | null = null;
  private readyButton: Phaser.GameObjects.Text | null = null;
  private playerStates: { [socketId: string]: PlayerState } = {};
  private gamePhase: GamePhase = GamePhase.WAITING_FOR_OPPONENT;
  private ownSocketId: string | null = null;
  private roomId: string | null = null;
  private playerSide: "left" | "right" | null = null;
  private opponentName: string | null = null;

  // NEW: Game Objects for rendering
  private ball: Phaser.GameObjects.Arc | null = null;
  private leftPaddle: Phaser.GameObjects.Rectangle | null = null;
  private rightPaddle: Phaser.GameObjects.Rectangle | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private ballState: BallState | null = null; // To hold the ball state from registry

  constructor() {
    super({ key: "MainGameScene" });
  }

  // init is called before preload and create, and receives data from scene.start()
  init() {
    // Set up listeners for registry changes
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
    this.registry.events.on(
      "changedata-ballState",
      this.handleGameUpdates,
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

    // NEW: Initialize Ball, Paddles, and Score Text (initially invisible)
    this.ball = this.add.circle(
      gameConstants.GAME_WIDTH / 2,
      gameConstants.GAME_HEIGHT / 2,
      gameConstants.BALL_RADIUS,
      0xffffff
    );
    this.ball.setVisible(false); // Hide until game starts

    this.leftPaddle = this.add.rectangle(
      gameConstants.PADDLE_WIDTH / 2, // Centered X position
      gameConstants.GAME_HEIGHT / 2, // Centered Y position
      gameConstants.PADDLE_WIDTH,
      gameConstants.PADDLE_HEIGHT,
      0xffffff
    );
    this.leftPaddle.setOrigin(0.5); // Set origin to center
    this.leftPaddle.setVisible(false); // Hide until game starts

    this.rightPaddle = this.add.rectangle(
      gameConstants.GAME_WIDTH - gameConstants.PADDLE_WIDTH / 2, // Centered X position
      gameConstants.GAME_HEIGHT / 2, // Centered Y position
      gameConstants.PADDLE_WIDTH,
      gameConstants.PADDLE_HEIGHT,
      0xffffff
    );
    this.rightPaddle.setOrigin(0.5); // Set origin to center
    this.rightPaddle.setVisible(false); // Hide until game starts

    this.scoreText = this.add.text(
      gameConstants.GAME_WIDTH / 2,
      gameConstants.GAME_HEIGHT / 2 - 100, // Position above center
      "0 - 0",
      { fontSize: "48px", color: "#fff" }
    );
    this.scoreText.setOrigin(0.5); // Center the text
    this.scoreText.setVisible(false); // Hide until game starts

    // Get initial data from registry and update display
    this.updateRoomId(null, this.registry.get("roomId"));
    this.updatePlayerSide(null, this.registry.get("playerSide"));
    this.updateOpponentDisplay(null, this.registry.get("opponentName"));
    this.updatePlayerStates(null, this.registry.get("playerStates"));
    this.updateBallState(null, this.registry.get("ballState")); // NEW: Call for initial ball state
    this.updateGamePhase(null, this.registry.get("gamePhase"));
    this.updateOwnSocketId(null, this.registry.get("ownSocketId"));

    // Initial call to handleGameUpdates to set initial visibility/positions based on initial data
    this.handleGameUpdates();
    // Initial draw of the ready button based on initial state
    this.drawReadyButton();
  }

  // Update methods for registry listeners
  private updateRoomId(_key: string | null, value: string) {
    this.roomId = value;
    // The opponentNameText will display the room ID, which is handled in updateOpponentDisplay
    this.updateOpponentDisplay(null, this.opponentName); // Re-evaluate opponent display for room ID
  }

  private updatePlayerSide(_key: string | null, value: "left" | "right") {
    this.playerSide = value;
    // No direct visual update needed here, as paddles are handled by playerStates
  }

  private updateOpponentDisplay(_key: string | null, value: string | null) {
    this.opponentName = value;
    if (this.opponentNameText) {
      this.opponentNameText.setText(
        `Opponent: ${this.opponentName || "Waiting..."} Room: ${
          this.roomId || "..."
        }`
      );
      // Opponent name text visibility logic is now integrated into handleGameUpdates
      // but we call it here to update the text content immediately.
      // Visibility is now handled by handleGameUpdates based on gamePhase.
      // We'll remove this redundant visibility logic from here.
    }
  }

  private updatePlayerStates(
    _key: string | null,
    value: { [socketId: string]: PlayerState }
  ) {
    this.playerStates = value;
    this.drawReadyButton(); // Redraw button if player states change (e.g., isReady)
    this.handleGameUpdates(); // Trigger main game display update
  }

  private updateGamePhase(_key: string | null, value: GamePhase) {
    this.gamePhase = value;
    this.drawReadyButton(); // Redraw button if game phase changes
    this.updateOpponentDisplay(null, this.opponentName); // Re-evaluate opponent text content and visibility
    this.handleGameUpdates(); // Trigger main game display update
  }

  private updateBallState(_key: string | null, value: BallState | null) {
    this.ballState = value;
    this.handleGameUpdates(); // Trigger main game display update
  }

  private updateOwnSocketId(_key: string | null, value: string) {
    this.ownSocketId = value;
    this.drawReadyButton(); // Redraw button if own socket ID becomes available
  }

  // NEW: Central method to update game objects' positions and visibility
  private handleGameUpdates() {
    // Ensure game objects are initialized before trying to update them
    if (
      !this.ball ||
      !this.leftPaddle ||
      !this.rightPaddle ||
      !this.scoreText ||
      !this.opponentNameText
    ) {
      console.warn("Game objects not initialized yet in handleGameUpdates.");
      return;
    }

    // Logic for active game phase
    if (
      this.gamePhase === GamePhase.ACTIVE_GAME &&
      this.playerStates &&
      this.ballState
    ) {
      // Make game objects visible if they aren't
      this.ball.setVisible(true);
      this.leftPaddle.setVisible(true);
      this.rightPaddle.setVisible(true);
      this.scoreText.setVisible(true);
      this.opponentNameText.setVisible(false); // Hide opponent text when game is active

      // Update ball position
      this.ball.setPosition(this.ballState.x, this.ballState.y);

      // Update paddle positions
      Object.values(this.playerStates).forEach((player: PlayerState) => {
        if (player.side === "left" && this.leftPaddle) {
          // X position is fixed. Y position is player.paddleY + half paddle height
          this.leftPaddle.setPosition(
            gameConstants.PADDLE_WIDTH / 2,
            player.paddleY + gameConstants.PADDLE_HEIGHT / 2
          );
        } else if (player.side === "right" && this.rightPaddle) {
          // X position is fixed. Y position is player.paddleY + half paddle height
          this.rightPaddle.setPosition(
            gameConstants.GAME_WIDTH - gameConstants.PADDLE_WIDTH / 2,
            player.paddleY + gameConstants.PADDLE_HEIGHT / 2
          );
        }
      });

      // Update score text
      const p1 = Object.values(this.playerStates).find(
        (p) => p.side === "left"
      );
      const p2 = Object.values(this.playerStates).find(
        (p) => p.side === "right"
      );
      this.scoreText.setText(`${p1 ? p1.score : 0} - ${p2 ? p2.score : 0}`);
    } else {
      // If game is not ACTIVE_GAME, hide ball, paddles, and score
      this.ball.setVisible(false);
      this.leftPaddle.setVisible(false);
      this.rightPaddle.setVisible(false);
      this.scoreText.setVisible(false);

      // Show opponent name text only when waiting for opponent
      if (this.gamePhase === GamePhase.WAITING_FOR_OPPONENT) {
        this.opponentNameText.setVisible(true);
      } else {
        this.opponentNameText.setVisible(false); // Hide in other non-active phases like READY_CHECK or PAUSED
      }

      // Optionally, reset paddle positions to a default if they should appear during non-active phases
      // e.g., if you want them visible during READY_CHECK at a default Y.
      // For now, they'll remain hidden.
    }
  }

  private drawReadyButton() {
    if (this.readyButton) {
      this.readyButton.destroy();
      this.readyButton = null; // Clear reference after destroying
    }

    // Only draw the button if in relevant phases
    if (
      this.gamePhase === GamePhase.READY_CHECK ||
      this.gamePhase === GamePhase.ACTIVE_GAME || // Show pause button in active game
      this.gamePhase === GamePhase.PAUSED // Show resume/paused button
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
    // This method runs every frame. We are now handling updates via registry events,
    // so continuous updates here are not strictly necessary for game state driven by server.
    // However, if you add client-side predictions or animations, they would go here.
  }

  shutdown() {
    // Remove all registry event listeners to prevent memory leaks
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
    this.registry.events.off(
      "changedata-ballState",
      this.updateBallState,
      this
    );

    // Destroy any specific game objects if necessary (though Phaser scene destruction usually handles this)
    if (this.ball) this.ball.destroy();
    if (this.leftPaddle) this.leftPaddle.destroy();
    if (this.rightPaddle) this.rightPaddle.destroy();
    if (this.scoreText) this.scoreText.destroy();
    if (this.opponentNameText) this.opponentNameText.destroy();
    if (this.readyButton) this.readyButton.destroy();
  }
}
