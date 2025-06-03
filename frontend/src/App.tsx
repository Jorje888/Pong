import React, { useEffect } from "react";
import logo from "./logo.svg";
import "./App.css";
import WelcomeScreen from "./components/WelcomeScreen";
import socket from "./socket";

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

  const handleJoinRoom = (roomNumber: string, playerName: string) => {
    socket.emit("joinRoom", { roomNumber, playerName });
    setRoomFullError(null);
  };

  useEffect(() => {
    socket.connect();
    socket.on("roomJoined", (data: any) => {
      console.log("roomJoined event:", data);
      setCurrentRoomId(data.roomId);
      setPlayerSide(data.playerSide);
      setOpponentName(data.opponentName);
      setRoomFullError(null);
      setCurrentPage("game");
    });
    socket.on("roomFull", () => {
      console.log("roomFull event");
      setRoomFullError("Room is full, please try another room.");
    });
    socket.on("opponentJoined", (data: any) => {
      console.log("opponentJoined event:", data);
      setOpponentName(data.opponentName);
    });
    return () => {
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
        {/* {currentPage === "game" && (
          <div>
            Game Page - Room: {currentRoomId} - Side: {playerSide} - Opponent:{" "}
            {opponentName || "Waiting..."}
          </div>
        )} */}
      </header>
    </div>
  );
}

export default App;
