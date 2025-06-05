import React from "react";

interface GameOverProps {
  winnerName: string | null;
}

const GameOver: React.FC<GameOverProps> = ({ winnerName }) => {
  return (
    <div>
      <h1>Game Over</h1>
      <p>Winner: {winnerName}</p>
    </div>
  );
};

export default GameOver;
