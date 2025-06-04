import React, { useEffect, useRef } from "react";
import Phaser from "phaser";
// Assuming phaserConfig.ts properly registers MainGameScene
// and gameConstants are available in the same file or imported
import { phaserConfig } from "../phaser/game"; // Changed import path here
import { PlayerState, GamePhase } from "../shared/types";
import { MainGameScene } from "../phaser/scenes/MainGameScene";

// Dummy gameConstants for demonstration if not imported
const gameConstants = {
  GAME_WIDTH: 800,
  GAME_HEIGHT: 600,
};

type GamePageProps = {
  roomId: string;
  playerSide: "left" | "right";
  opponentName: string | null;
  playerStates: { [socketId: string]: PlayerState };
  gamePhase: GamePhase;
  ownSocketId: string | null;
};

const GamePage: React.FC<GamePageProps> = ({
  roomId,
  playerSide,
  opponentName,
  playerStates,
  gamePhase,
  ownSocketId,
}) => {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // Prevent re-creating the game if it already exists for the current room
    if (
      gameRef.current &&
      gameRef.current.isBooted &&
      gameRef.current.registry.get("roomId") === roomId
    ) {
      return; // Game is already running for this room, do nothing
    }

    // Initialize Phaser game
    const game = new Phaser.Game({
      ...phaserConfig,
      parent: "phaser-game-container", // Ensure this matches the div ID below
      // No need for an anonymous scene here, MainGameScene will be started directly
      // and receive data via its init method.
    });

    gameRef.current = game; // Store the game instance in the ref

    // Listen for the game to be ready before setting initial registry values
    game.events.on("ready", () => {
      if (game.registry) {
        // Set initial game state in the Phaser Registry
        game.registry.set("roomId", roomId);
        game.registry.set("playerSide", playerSide);
        game.registry.set("opponentName", opponentName);
        game.registry.set("playerStates", playerStates);
        game.registry.set("gamePhase", gamePhase);
        game.registry.set("ownSocketId", ownSocketId);

        // Explicitly start the MainGameScene after setting initial data.
        // The scene's init method will pick up this data.
        game.scene.start("MainGameScene");
      }
    });

    // Cleanup function: destroy the game when the component unmounts
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true); // true means also remove the canvas
        gameRef.current = null;
      }
    };
  }, [roomId, playerSide]); // Dependencies: only roomId and playerSide for game creation

  // Effect for updating game state in the *running* Phaser game via Registry
  // This useEffect will re-run whenever any of these props change,
  // and the MainGameScene will react to the registry updates.
  useEffect(() => {
    if (
      gameRef.current &&
      gameRef.current.isBooted &&
      gameRef.current.registry
    ) {
      gameRef.current.registry.set("opponentName", opponentName);
      gameRef.current.registry.set("playerStates", playerStates);
      gameRef.current.registry.set("gamePhase", gamePhase);
      gameRef.current.registry.set("ownSocketId", ownSocketId);
    }
  }, [opponentName, playerStates, gamePhase, ownSocketId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      {/* This div is where Phaser will render its canvas */}
      <div
        id="phaser-game-container"
        className="w-full max-w-screen-lg aspect-video bg-gray-800 rounded-lg shadow-xl overflow-hidden"
        style={{
          width: phaserConfig.width, // Use phaserConfig width
          height: phaserConfig.height, // Use phaserConfig height
          position: "relative", // Needed for absolute positioning of overlay
        }}
      />

      {/* React UI elements rendered outside/overlaying the Phaser canvas */}
      <div className="absolute top-0 left-0 text-white p-4 bg-gray-800 bg-opacity-75 rounded-br-lg">
        <p className="text-lg">
          Room: <span className="font-bold">{roomId}</span>
        </p>
        <p className="text-lg">
          Opponent:{" "}
          <span className="font-bold">{opponentName || "Waiting..."}</span>
        </p>
        <p className="text-lg">
          Phase: <span className="font-bold">{gamePhase}</span>
        </p>
        <p className="text-lg">
          My Socket ID:{" "}
          <span className="font-bold">{ownSocketId || "N/A"}</span>
        </p>
      </div>
    </div>
  );
};

export default GamePage;
