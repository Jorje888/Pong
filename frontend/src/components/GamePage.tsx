import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
import { phaserConfig } from "../phaser/game"; // Assumes phaserConfig properly registers MainGameScene

type GamePageProps = {
  roomId: string;
  playerSide: "left" | "right";
  opponentName: string | null;
};

const GamePage: React.FC<GamePageProps> = ({
  roomId,
  playerSide,
  opponentName,
}) => {
  // Use a ref to store the Phaser game instance so it persists across renders
  const gameRef = useRef<Phaser.Game | null>(null);

  // Effect for initializing and destroying the Phaser game
  // This should only run when the room or player side changes (indicating a new game session)
  useEffect(() => {
    // Only create a new game if one doesn't exist for this room/playerSide
    if (
      gameRef.current &&
      gameRef.current.isBooted &&
      gameRef.current.registry.get("roomId") === roomId
    ) {
      // Game is already running for this room, do nothing
      return;
    }

    const game = new Phaser.Game({
      ...phaserConfig,
      // If phaserConfig does not explicitly set the `parent` property, you can set it here:
      parent: "phaser-game-container",
      // You don't need a custom 'create' function here if MainGameScene is already in phaserConfig.scene array.
      // Phaser will automatically start the first scene in the 'scene' array if no specific scene is passed.
      // However, if you explicitly want to start 'MainGameScene' with data, you can do it like this:
      scene: {
        create: function () {
          // This ensures initial data is passed when the game starts
          this.scene.start("MainGameScene", {
            roomId,
            playerSide,
            opponentName,
          });
        },
      },
    });

    gameRef.current = game; // Store the game instance in the ref

    // It's good practice to set some initial values in the game's registry here too,
    // so the scene can read them and also be updated later.
    // Ensure the game is ready before setting registry, or listen to 'ready' event.
    game.events.on("ready", () => {
      if (game.registry) {
        game.registry.set("roomId", roomId);
        game.registry.set("playerSide", playerSide);
        game.registry.set("opponentName", opponentName); // Initial value
      }
    });

    // Cleanup function: destroy the game when the component unmounts
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [roomId, playerSide]); // Dependencies: only roomId and playerSide, NOT opponentName

  // Effect for updating opponentName in the *running* Phaser game
  // This runs whenever opponentName changes, and updates the *existing* game instance
  useEffect(() => {
    if (gameRef.current && gameRef.current.isBooted) {
      // Update the opponentName in Phaser's global registry
      // MainGameScene should be listening for changes to this registry key.
      gameRef.current.registry.set("opponentName", opponentName);
    }
  }, [opponentName]); // Dependency: only opponentName

  return (
    <div>
      {/* This div is where Phaser will render its canvas */}
      <div
        id="phaser-game-container"
        style={{
          position: "relative",
          width: phaserConfig.width,
          height: phaserConfig.height,
        }}
      />

      {/* React UI elements rendered outside/overlaying the Phaser canvas */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          color: "#fff",
          padding: "10px",
          background: "rgba(0,0,0,0.5)",
        }}
      >
        <p>Room: {roomId}</p>
        <p>Opponent: {opponentName || "Waiting..."}</p>
      </div>
    </div>
  );
};

export default GamePage;
