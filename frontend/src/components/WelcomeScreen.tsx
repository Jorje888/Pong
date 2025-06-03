import React, { useState } from "react";

const WelcomeScreen: React.FC = () => {
  const [roomNumber, setRoomNumber] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");
  const [roomFullError, setRoomFullError] = useState<string | null>(null);

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h1>Pongue</h1>
      <input
        type="text"
        placeholder="Room Number"
        value={roomNumber}
        onChange={(e) => setRoomNumber(e.target.value)}
        style={{ display: "block", margin: "10px auto" }}
      />
      <input
        type="text"
        placeholder="Your Name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        style={{ display: "block", margin: "10px auto" }}
      />
      <button
        onClick={() => {
          // Logic for joining room will go here
        }}
        style={{ display: "block", margin: "10px auto" }}
      >
        Join Room
      </button>
      {roomFullError && <p style={{ color: "red" }}>{roomFullError}</p>}
    </div>
  );
};

export default WelcomeScreen;
