// src/shared/types.ts

export interface GameConstants {
  GAME_WIDTH: number;
  GAME_HEIGHT: number;
  PADDLE_HEIGHT: number;
  PADDLE_WIDTH: number;
  BALL_RADIUS: number;
  MAX_SCORE: number;
  INITIAL_BALL_SPEED: number;
  SERVER_TICK_RATE_MS: number;
  PADDLE_SPEED: number;
  BALL_SPEED_INCREMENT_PER_HIT: number;
  GAME_PAUSE_AFTER_SCORE_MS: number;
}

export const gameConstants: GameConstants = {
  GAME_WIDTH: 800,
  GAME_HEIGHT: 600,
  PADDLE_HEIGHT: 100,
  PADDLE_WIDTH: 20,
  BALL_RADIUS: 10,
  MAX_SCORE: 5,
  INITIAL_BALL_SPEED: 250,
  SERVER_TICK_RATE_MS: 16.67,
  PADDLE_SPEED: 300,
  BALL_SPEED_INCREMENT_PER_HIT: 10,
  GAME_PAUSE_AFTER_SCORE_MS: 1500,
};

export interface PlayerState {
  id: string;
  name: string;
  isReady: boolean;
  paddleY: number;
  score: number;
  side: "left" | "right";
  currentInput: "up" | "down" | "stop";
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
  servingPlayerId: string | null;
}

export interface RoomJoinedPayload {
  roomId: string;
  playerSide: "left" | "right";
  opponentName: string | null;
  initialGameState: {
    players: { [socketId: string]: PlayerState };
    ball: BallState;
    phase: GamePhase;
  };
}

export interface OpponentJoinedPayload {
  opponentName: string;
  opponentId: string;
  updatedGameState: {
    players: { [socketId: string]: PlayerState };
    phase: GamePhase;
  };
}

export interface PlayerReadyStateUpdatePayload {
  playerId: string;
  isReady: boolean;
  readyButtonColors?: {
    player1: string;
    player2: string;
  };
}

export interface GameStartedPayload {
  initialBallState: BallState;
  initialPlayersState: { [socketId: string]: PlayerState };
  servingPlayerId: string;
}

export interface RoomState {
  id: string;
  players: { [socketId: string]: PlayerState };
  ball: BallState;
  phase: GamePhase;
  lastScorerId: string | null;
  gameLoopIntervalId: NodeJS.Timeout | null;
}

export interface RoomJoinedPayload {
  roomId: string;
  playerSide: "left" | "right";
  opponentName: string | null;
  initialGameState: {
    players: { [socketId: string]: PlayerState };
    ball: BallState;
    phase: GamePhase;
  };
}

export interface OpponentJoinedPayload {
  opponentName: string;
  opponentId: string;
  updatedGameState: {
    players: { [socketId: string]: PlayerState };
    phase: GamePhase;
  };
}
export type PlayerInputPayload = { direction: "up" | "down" | "stop" };
