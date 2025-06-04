import React, { useEffect } from "react";
import "./App.css";
import WelcomeScreen from "./components/WelcomeScreen";
import socket from "./socket";
import GamePage from "./components/GamePage";
import { GamePhase, PlayerState, BallState } from "./shared/types";

function App() {
  const [currentPage, setCurrentPage] = React.useState<
    "welcome" | "game" | "endgame"
  >("welcome");
  const [currentRoomId, setCurrentRoomId] = React.useState<string | null>(null);
  const [playerSide, setPlayerSide] = React.useState<"left" | "right" | null>(
    null
  );
  const [opponentName, setOpponentName] = React.useState<string | null>(
    "Waiting..."
  );
  const [roomFullError, setRoomFullError] = React.useState<string | null>(null);

  const [playerStates, setPlayerStates] = React.useState<{
    [socketId: string]: PlayerState;
  } | null>(null);

  const [ballState, setBallState] = React.useState<BallState | null>(null);
  const [gamePhase, setGamePhase] = React.useState<GamePhase | null>(
    GamePhase.WAITING_FOR_OPPONENT
  );
  const [ownSocketId, setOwnSocketId] = React.useState<string | null>(null);

  const handleJoinRoom = (roomNumber: string, playerName: string) => {
    socket.emit("joinRoom", { roomNumber, playerName });
    setRoomFullError(null);
  };

  useEffect(() => {
    socket.on("connect", () => {
      setOwnSocketId(socket.id);
    });
    return () => {
      socket.off("connect");
    };
  }, []);

  // Main effect for all other socket event listeners
  useEffect(() => {
    socket.connect();
    socket.on("roomJoined", (data: any) => {
      console.log("roomJoined event:", data);
      setCurrentRoomId(data.roomId);
      setPlayerSide(data.playerSide);
      setOpponentName(data.opponentName);
      setRoomFullError(null);
      setPlayerStates(data.initialGameState.players);
      setBallState(data.initialGameState.ball);
      setGamePhase(data.initialGameState.phase);
      setCurrentPage("game");
    });

    socket.on("roomFull", () => {
      console.log("roomFull event");
      setRoomFullError("Room is full, please try another room.");
    });

    socket.on(
      "opponentJoined",
      (data: {
        opponentName: string;
        updatedGameState: {
          players: { [socketId: string]: PlayerState };
          phase: GamePhase;
        };
      }) => {
        console.log("opponentJoined event:", data);
        setOpponentName(data.opponentName);
        setPlayerStates(data.updatedGameState.players);
        setGamePhase(data.updatedGameState.phase);
      }
    );

    socket.on(
      "playerReadyStateUpdate",
      (data: { playerId: string; isReady: boolean }) => {
        setPlayerStates((prevPlayerStates) => {
          if (!prevPlayerStates) {
            console.error(
              "playerStates is null when playerReadyStateUpdate received. This indicates a potential race condition or initialization error."
            );
            return {};
          }
          const updatedPlayerStates = { ...prevPlayerStates };
          if (updatedPlayerStates[data.playerId]) {
            updatedPlayerStates[data.playerId].isReady = data.isReady;
          } else {
            console.warn(
              `Player with ID ${data.playerId} not found in playerStates for ready state update.`
            );
          }
          return updatedPlayerStates;
        });
      }
    );

    socket.on(
      "gameStarted",
      (data: {
        initialBallState: BallState;
        initialPlayersState: { [socketId: string]: PlayerState };
        phase: GamePhase;
        servingPlayerId: string;
      }) => {
        console.log("gameStarted event:", data);
        setBallState(data.initialBallState);
        setPlayerStates(data.initialPlayersState);
        setGamePhase(data.phase);
        console.log(`Game Started! Serving player: ${data.servingPlayerId}`);
        setCurrentPage("game");
      }
    );

    socket.on(
      "gameStateUpdate",
      (data: {
        ball: BallState;
        paddles: { id: string; y: number; side: "left" | "right" }[];
        phase: GamePhase;
        scores: { player1: number; player2: number };
      }) => {
        console.log("gameStateUpdate event:", data);
        setBallState(data.ball);
        setPlayerStates((prevPlayerStates) => {
          if (!prevPlayerStates) return null;
          const newPlayerStates = { ...prevPlayerStates };
          data.paddles.forEach((paddleUpdate) => {
            if (newPlayerStates[paddleUpdate.id]) {
              newPlayerStates[paddleUpdate.id] = {
                ...newPlayerStates[paddleUpdate.id],
                paddleY: paddleUpdate.y,
              };
            }
          });
          Object.values(newPlayerStates).forEach((player) => {
            if (player.side === "left") player.score = data.scores.player1;
            if (player.side === "right") player.score = data.scores.player2;
          });
          return newPlayerStates;
        });
        setGamePhase(data.phase);
      }
    );
    return () => {
      socket.off("roomJoined");
      socket.off("roomFull");
      socket.off("opponentJoined");
      socket.off("playerReadyStateUpdate");
      socket.off("gameStarted");
      socket.off("gameStateUpdate");
      socket.disconnect();
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {currentPage === "welcome" && (
          <WelcomeScreen
            handleJoinRoom={handleJoinRoom}
            roomFullError={roomFullError}
            setRoomFullError={setRoomFullError}
          />
        )}
        {currentPage === "game" && (
          <GamePage
            roomId={currentRoomId!}
            playerSide={playerSide!}
            opponentName={opponentName}
            playerStates={playerStates!}
            gamePhase={gamePhase!}
            ownSocketId={ownSocketId}
            ballState={ballState!}
          />
        )}
      </header>
    </div>
  );
}

export default App;
