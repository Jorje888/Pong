// src/shared/types.ts

export interface GameConstants {
  GAME_WIDTH: number;
  GAME_HEIGHT: number;
  PADDLE_HEIGHT: number;
  PADDLE_WIDTH: number;
  BALL_RADIUS: number;
  MAX_SCORE: number;
}

export const gameConstants: GameConstants = {
  GAME_WIDTH: 800,
  GAME_HEIGHT: 600,
  PADDLE_HEIGHT: 100,
  PADDLE_WIDTH: 20,
  BALL_RADIUS: 10,
  MAX_SCORE: 5,
};

export interface PlayerState {
  id: string;
  name: string;
  isReady: boolean;
  paddleY: number;
  score: number;
  side: "left" | "right";
  socket: any;
}

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
}

export enum GamePhase {
  WAITING_FOR_OPPONENT,
  READY_CHECK,
  ACTIVE_GAME,
  PAUSED,
  GAME_OVER,
}

export interface RoomState {
  id: string;
  players: { [socketId: string]: PlayerState };
  ball: BallState;
  phase: GamePhase;
  lastScorerId: string | null;
  gameLoopIntervalId: NodeJS.Timeout | null;
}
