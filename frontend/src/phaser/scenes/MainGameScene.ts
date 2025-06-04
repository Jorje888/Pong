import Phaser from "phaser";
import {
  gameConstants,
  GamePhase,
  PlayerState,
  BallState,
  PlayerInputPayload,
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
  private ball: Phaser.GameObjects.Arc | null = null;
  private leftPaddle: Phaser.GameObjects.Rectangle | null = null;
  private rightPaddle: Phaser.GameObjects.Rectangle | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private ballState: BallState | null = null;
  // Keyboard keys - these are declared as properties
  private keyW: Phaser.Input.Keyboard.Key | null = null;
  private keyS: Phaser.Input.Keyboard.Key | null = null;
  private keyUp: Phaser.Input.Keyboard.Key | null = null;
  private keyDown: Phaser.Input.Keyboard.Key | null = null;

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
      this.updateBallState, // IMPORTANT: Use updateBallState here, which then calls handleGameUpdates
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

    this.keyW =
      this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.W) || null;
    this.keyS =
      this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S) || null;
    this.keyUp =
      this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.UP) || null;
    this.keyDown =
      this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN) || null;

    const handleKeyDown = (direction: "up" | "down") => {
      if (this.gamePhase === GamePhase.ACTIVE_GAME) {
        socket.emit("playerInput", { direction });
      }
    };
    const handleKeyUp = (
      pressedDirection: "up" | "down",
      otherDirectionKey: Phaser.Input.Keyboard.Key | null
    ) => {
      // Only send 'stop' if the other movement key for that player isn't also down
      if (
        this.gamePhase === GamePhase.ACTIVE_GAME &&
        (!otherDirectionKey || !otherDirectionKey.isDown)
      ) {
        socket.emit("playerInput", { direction: "stop" });
      }
    };

    // Attach listeners to the initialized keys
    // It's important to check if the keys exist (are not null)
    // before attaching listeners.
    if (this.playerSide === "left") {
      this.keyW?.on("down", () => handleKeyDown("up"));
      this.keyS?.on("down", () => handleKeyDown("down"));
      this.keyW?.on("up", () => handleKeyUp("up", this.keyS));
      this.keyS?.on("up", () => handleKeyUp("down", this.keyW));
    } else if (this.playerSide === "right") {
      this.keyUp?.on("down", () => handleKeyDown("up"));
      this.keyDown?.on("down", () => handleKeyDown("down"));
      this.keyUp?.on("up", () => handleKeyUp("up", this.keyDown));
      this.keyDown?.on("up", () => handleKeyUp("down", this.keyUp));
    }
  }

  // Update methods for registry listeners
  private updateRoomId(_key: string | null, value: string) {
    this.roomId = value;
    this.updateOpponentDisplay(null, this.opponentName);
  }

  private updatePlayerSide(_key: string | null, value: "left" | "right") {
    this.playerSide = value;
    // IMPORTANT: If playerSide changes AFTER create, you need to re-attach key listeners.
    // However, `playerSide` is likely set once at the beginning, so this is okay.
    // If it could change dynamically, you'd need to re-run the key setup logic.
  }

  private updateOpponentDisplay(_key: string | null, value: string | null) {
    this.opponentName = value;
    if (this.opponentNameText) {
      this.opponentNameText.setText(
        `Opponent: ${this.opponentName || "Waiting..."} Room: ${
          this.roomId || "..."
        }`
      );
    }
  }

  private updatePlayerStates(
    _key: string | null,
    value: { [socketId: string]: PlayerState }
  ) {
    this.playerStates = value;
    this.drawReadyButton();
    this.handleGameUpdates();
  }

  private updateGamePhase(_key: string | null, value: GamePhase) {
    this.gamePhase = value;
    this.drawReadyButton();
    this.updateOpponentDisplay(null, this.opponentName);
    this.handleGameUpdates();
  }

  private updateBallState(_key: string | null, value: BallState | null) {
    this.ballState = value;
    this.handleGameUpdates(); // Trigger main game display update
  }

  private updateOwnSocketId(_key: string | null, value: string) {
    this.ownSocketId = value;
    this.drawReadyButton();
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
          this.leftPaddle.setPosition(
            gameConstants.PADDLE_WIDTH / 2,
            player.paddleY + gameConstants.PADDLE_HEIGHT / 2
          );
        } else if (player.side === "right" && this.rightPaddle) {
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
    }
  }

  private drawReadyButton() {
    if (this.readyButton) {
      this.readyButton.destroy();
      this.readyButton = null;
    }

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
        let buttonColor = "#FF0000";
        let buttonText = "READY";

        if (this.gamePhase === GamePhase.READY_CHECK) {
          buttonColor = me.isReady ? "#FFFF00" : "#FF0000";
          buttonText = me.isReady ? "UNREADY" : "READY";
        } else if (this.gamePhase === GamePhase.ACTIVE_GAME) {
          buttonColor = "#00FF00";
          buttonText = "PAUSE";
        } else if (this.gamePhase === GamePhase.PAUSED) {
          buttonColor = me.isReady ? "#00FF00" : "#FFFF00";
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

  update() {}

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
      this.updateBallState, // Listener was handleGameUpdates, changed back to updateBallState
      this
    );

    // Remove keyboard event listeners during shutdown
    this.keyW?.off("down");
    this.keyW?.off("up");
    this.keyS?.off("down");
    this.keyS?.off("up");
    this.keyUp?.off("down");
    this.keyUp?.off("up");
    this.keyDown?.off("down");
    this.keyDown?.off("up");

    // Destroy any specific game objects if necessary (though Phaser scene destruction usually handles this)
    if (this.ball) this.ball.destroy();
    if (this.leftPaddle) this.leftPaddle.destroy();
    if (this.rightPaddle) this.rightPaddle.destroy();
    if (this.scoreText) this.scoreText.destroy();
    if (this.opponentNameText) this.opponentNameText.destroy();
    if (this.readyButton) this.readyButton.destroy();
  }
}
