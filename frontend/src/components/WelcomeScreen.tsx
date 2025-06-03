import React, { useState } from "react";

interface WelcomeScreenProps {
  handleJoinRoom: (roomNumber: string, playerName: string) => void;
  roomFullError: string | null;
  setRoomFullError: React.Dispatch<React.SetStateAction<string | null>>;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  handleJoinRoom,
  roomFullError,
  setRoomFullError,
}) => {
  const [roomNumber, setRoomNumber] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");

  const handleRoomNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomNumber(e.target.value);
    if (roomFullError) setRoomFullError(null);
  };

  const handlePlayerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayerName(e.target.value);
    if (roomFullError) setRoomFullError(null);
  };

  const handleJoinButtonClick = () => {
    handleJoinRoom(roomNumber, playerName);
    if (roomFullError) setRoomFullError(null);
  };

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h1>Pongue</h1>
      <input
        type="text"
        placeholder="Room Number"
        value={roomNumber}
        onChange={handleRoomNumberChange}
        style={{ display: "block", margin: "10px auto" }}
      />
      <input
        type="text"
        placeholder="Your Name"
        value={playerName}
        onChange={handlePlayerNameChange}
        style={{ display: "block", margin: "10px auto" }}
      />
      <button
        onClick={handleJoinButtonClick}
        style={{ display: "block", margin: "10px auto" }}
      >
        Join Room
      </button>
      {roomFullError && <p style={{ color: "red" }}>{roomFullError}</p>}
    </div>
  );
};

export default WelcomeScreen;
