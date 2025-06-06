import { RoomState } from "./shared/types";
import { GamePhase } from "./shared/types";
import { gameConstants } from "./shared/types";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { PlayerInputPayload } from "./shared/types";

const httpServer = createServer();

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const rooms = new Map<string, RoomState>();

httpServer.listen(3001, () => {
  console.log("Server is listening on port 3001");
});

function startGameLoop(roomId: string) {
  console.log("Starting game loop for room", roomId);
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }
  if (room.gameLoopIntervalId) {
    clearInterval(room.gameLoopIntervalId);
  }
  console.log("Starting interval");
  room.gameLoopIntervalId = setInterval(() => {
    const currentRoomState = rooms.get(roomId);
    if (!currentRoomState || currentRoomState.phase !== GamePhase.ACTIVE_GAME) {
      clearInterval(room.gameLoopIntervalId!);
      room.gameLoopIntervalId = null;
      return;
    }

    const deltaTimeSeconds = gameConstants.SERVER_TICK_RATE_MS / 1000;
    currentRoomState.ball.x += currentRoomState.ball.vx * deltaTimeSeconds;
    currentRoomState.ball.y += currentRoomState.ball.vy * deltaTimeSeconds;

    if (currentRoomState.ball.y - gameConstants.BALL_RADIUS < 0) {
      currentRoomState.ball.y = gameConstants.BALL_RADIUS;
      currentRoomState.ball.vy *= -1;
    } else if (
      currentRoomState.ball.y + gameConstants.BALL_RADIUS >
      gameConstants.GAME_HEIGHT
    ) {
      currentRoomState.ball.y =
        gameConstants.GAME_HEIGHT - gameConstants.BALL_RADIUS;
      currentRoomState.ball.vy *= -1;
    }

    Object.values(currentRoomState.players).forEach((player) => {
      const PADDLE_SPEED_PER_TICK =
        gameConstants.PADDLE_SPEED / (1000 / gameConstants.SERVER_TICK_RATE_MS);
      if (player.currentInput === "up") {
        player.paddleY -= PADDLE_SPEED_PER_TICK;
      } else if (player.currentInput === "down") {
        player.paddleY += PADDLE_SPEED_PER_TICK;
      }
      player.paddleY = Math.max(0, player.paddleY);
      player.paddleY = Math.min(
        gameConstants.GAME_HEIGHT - gameConstants.PADDLE_HEIGHT,
        player.paddleY
      );
    });

    Object.keys(currentRoomState.players).forEach((playerId) => {
      const player = currentRoomState.players[playerId];
      const paddleX =
        player.side === "left"
          ? gameConstants.PADDLE_WIDTH
          : gameConstants.GAME_WIDTH - gameConstants.PADDLE_WIDTH;
      const paddleLeft =
        player.side === "left"
          ? 0
          : gameConstants.GAME_WIDTH - gameConstants.PADDLE_WIDTH;
      const paddleRight =
        player.side === "left"
          ? gameConstants.PADDLE_WIDTH
          : gameConstants.GAME_WIDTH;
      const paddleTop = player.paddleY;
      const paddleBottom = player.paddleY + gameConstants.PADDLE_HEIGHT;
    });

    const ball = currentRoomState.ball;
    const ballTop = ball.y - gameConstants.BALL_RADIUS;
    const ballBottom = ball.y + gameConstants.BALL_RADIUS;
    const ballLeft = ball.x - gameConstants.BALL_RADIUS;
    const ballRight = ball.x + gameConstants.BALL_RADIUS;

    Object.keys(currentRoomState.players).forEach((playerId) => {
      const player = currentRoomState.players[playerId];
      const paddleLeft =
        player.side === "left"
          ? 0
          : gameConstants.GAME_WIDTH - gameConstants.PADDLE_WIDTH;
      const paddleRight =
        player.side === "left"
          ? gameConstants.PADDLE_WIDTH
          : gameConstants.GAME_WIDTH;
      const paddleTop = player.paddleY;
      const paddleBottom = player.paddleY + gameConstants.PADDLE_HEIGHT;

      if (
        ballRight > paddleLeft &&
        ballLeft < paddleRight &&
        ballBottom > paddleTop &&
        ballTop < paddleBottom
      ) {
        if (player.side === "left" && ball.vx < 0) {
          ball.x = paddleRight + gameConstants.BALL_RADIUS;
          ball.vx *= -1; // Reverse horizontal direction
          // **Calculate reflection angle based on hit point:**
          let intersectY =
            ball.y - (player.paddleY + gameConstants.PADDLE_HEIGHT / 2);
          let normalizedIntersectY =
            intersectY / (gameConstants.PADDLE_HEIGHT / 2);
          let bounceAngle = normalizedIntersectY * (Math.PI / 3);
          ball.vy = ball.speed * Math.sin(bounceAngle);
          ball.vx = ball.speed * Math.cos(bounceAngle); // vx should remain positive (moving right)
          ball.speed += gameConstants.BALL_SPEED_INCREMENT_PER_HIT;
        }
        // Else if `player.side === 'right'` (right paddle) and `ball.vx > 0` (ball moving right):
        else if (player.side === "right" && ball.vx > 0) {
          ball.x = paddleLeft - gameConstants.BALL_RADIUS;
          ball.vx *= -1; // Reverse horizontal direction (now moving left)
          let intersectY =
            ball.y - (player.paddleY + gameConstants.PADDLE_HEIGHT / 2);
          let normalizedIntersectY =
            intersectY / (gameConstants.PADDLE_HEIGHT / 2);
          let bounceAngle = normalizedIntersectY * (Math.PI / 3);
          ball.vy = ball.speed * Math.sin(bounceAngle);
          ball.vx = -ball.speed * Math.cos(bounceAngle); // vx must be negative (moving left)
          ball.speed += gameConstants.BALL_SPEED_INCREMENT_PER_HIT;
        }
      }
    });

    let scorer: "left" | "right" | null = null;

    if (ball.x - gameConstants.BALL_RADIUS < 0) {
      scorer = "right";
    } else if (ball.x + gameConstants.BALL_RADIUS > gameConstants.GAME_WIDTH) {
      scorer = "left";
    }

    if (scorer) {
      const scoringPlayerId = Object.keys(currentRoomState.players).find(
        (playerId) => currentRoomState.players[playerId].side === scorer
      );

      if (scoringPlayerId) {
        const scoringPlayer = currentRoomState.players[scoringPlayerId];
        scoringPlayer.score += 1;

        if (scoringPlayer.score >= 5) {
          currentRoomState.phase = GamePhase.GAME_OVER;
          io.to(roomId).emit("gameOver", {
            winnerName: scoringPlayer.name,
          });
          rooms.delete(roomId);
          io.socketsLeave(roomId);
          return;
        }
      }

      ball.x = gameConstants.GAME_WIDTH / 2;
      ball.y = gameConstants.GAME_HEIGHT / 2;
      ball.speed += gameConstants.BALL_SPEED_INCREMENT_PER_HIT;
      let angle = (Math.random() * Math.PI) / 2 - Math.PI / 4;
      ball.vy = ball.speed * Math.sin(angle);
      ball.vx = ball.speed * Math.cos(angle);

      if (scorer === "right") {
        ball.vx *= -1;
      }
    }
    if (currentRoomState.phase === GamePhase.ACTIVE_GAME) {
      io.to(roomId).emit("gameStateUpdate", {
        ball: currentRoomState.ball,
        paddles: Object.values(currentRoomState.players).map((p) => ({
          id: p.id,
          y: p.paddleY,
          side: p.side,
        })),
        scores: {
          player1:
            Object.values(currentRoomState.players).find(
              (p) => p.side === "left"
            )?.score || 0,
          player2:
            Object.values(currentRoomState.players).find(
              (p) => p.side === "right"
            )?.score || 0,
        },
        phase: currentRoomState.phase,
      });
    }
  }, gameConstants.SERVER_TICK_RATE_MS);
}
function stopGameLoop(roomId: string) {
  const room = rooms.get(roomId);
  if (room && room.gameLoopIntervalId) {
    clearInterval(room.gameLoopIntervalId);
    room.gameLoopIntervalId = null;
  }
}

io.on("connection", (socket) => {
  console.log("Client connected", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });

  socket.on(
    "joinRoom",
    (data: { roomNumber: string | number; playerName: string }) => {
      const roomId = String(data.roomNumber);
      const username = data.playerName;
      const room = rooms.get(roomId);
      if (room) {
        // Room exists
        if (Object.keys(room.players).length === 1) {
          //Only one person is in the room
          room.players[socket.id] = {
            id: socket.id,
            name: username,
            isReady: false,
            paddleY: 0,
            score: 0,
            side: "right",
            currentInput: "stop",
          };
          socket.join(roomId);
          room.phase = GamePhase.READY_CHECK;
          const firstPlayer = Object.values(room.players)[0];

          socket.emit("roomJoined", {
            roomId: roomId,
            playerSide: "right",
            opponentName: firstPlayer.name,
            initialGameState: {
              players: room.players,
              ball: room.ball,
              phase: room.phase,
            },
          });
          io.in(roomId)
            .except(socket.id)
            .emit("opponentJoined", {
              opponentName: username,
              opponentId: socket.id,
              updatedGameState: {
                players: room.players,
                phase: room.phase,
              },
            });
          console.log("Room joined", roomId, "as player two");
        } else {
          // Room is already full
          socket.emit("roomFull", {});
          console.log("Room is full: ", roomId);
        }
      } else {
        //Room is empty
        const newRoom: RoomState = {
          id: roomId,
          players: {
            [socket.id]: {
              id: socket.id,
              name: username,
              isReady: false,
              paddleY: 0,
              score: 0,
              side: "left",
              currentInput: "stop",
            },
          },
          ball: { x: 0, y: 0, vx: 0, vy: 0, speed: 5 },
          phase: GamePhase.WAITING_FOR_OPPONENT,
          lastScorerId: null,
          gameLoopIntervalId: null,
          servingPlayerId: null,
        };
        rooms.set(roomId, newRoom);
        socket.join(roomId);
        socket.emit("roomJoined", {
          roomId,
          playerSide: "left",
          opponentName: null,
          initialGameState: {
            players: newRoom.players,
            ball: newRoom.ball,
            phase: newRoom.phase,
          },
        });
        console.log("Room joined", roomId, "as player one");
      }
    }
  );

  socket.on("toggleReady", () => {
    const socketNumber = Array.from(socket.rooms)[1];
    const player = rooms.get(socketNumber)?.players[socket.id];
    const room = rooms.get(socketNumber);
    if (
      !player ||
      !room ||
      (room.phase !== GamePhase.READY_CHECK &&
        room.phase !== GamePhase.ACTIVE_GAME)
    )
      return;
    if (room.phase === GamePhase.READY_CHECK) {
      player.isReady = !player.isReady;
      io.to(room.id).emit("playerReadyStateUpdate", {
        playerId: socket.id,
        isReady: player.isReady,
      });
      const allReadyToStart = Object.values(room.players).every(
        (p) => p.isReady
      );
      if (allReadyToStart) {
        room.phase = GamePhase.ACTIVE_GAME;
        const player1Id = Object.keys(room.players)[0];
        const player2Id = Object.keys(room.players)[1];
        room.players[player1Id].paddleY =
          gameConstants.GAME_HEIGHT / 2 - gameConstants.PADDLE_HEIGHT / 2;
        room.players[player2Id].paddleY =
          gameConstants.GAME_HEIGHT / 2 - gameConstants.PADDLE_HEIGHT / 2;
        room.ball.x = gameConstants.GAME_WIDTH / 2;
        room.ball.y = gameConstants.GAME_HEIGHT / 2;
        room.servingPlayerId = Math.random() < 0.5 ? player1Id : player2Id;
        room.ball.speed = gameConstants.INITIAL_BALL_SPEED;
        const angle = (Math.random() * Math.PI) / 2 - Math.PI / 4;
        room.ball.vy = room.ball.speed * Math.sin(angle);
        room.ball.vx = room.ball.speed * Math.cos(angle);
        if (room.servingPlayerId === player2Id) room.ball.vx *= -1;
        io.to(room.id).emit("gameStarted", {
          initialBallState: room.ball,
          initialPlayersState: room.players,
          servingPlayerId: room.servingPlayerId,
          phase: room.phase,
        });
        startGameLoop(room.id);
      }
    }
  });

  socket.on("playerInput", (input: PlayerInputPayload) => {
    console.log("playerInput", input);
    const socketNumber = Array.from(socket.rooms)[1];
    const playerState = rooms.get(socketNumber)?.players[socket.id];
    const room = rooms.get(socketNumber);
    if (
      !playerState ||
      !room ||
      room.phase !== GamePhase.ACTIVE_GAME ||
      !["up", "down", "stop"].includes(input.direction)
    )
      return;
    playerState.currentInput = input.direction;
  });
});
