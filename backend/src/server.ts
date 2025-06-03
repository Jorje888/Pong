import { RoomState } from "./shared/types";
import { GamePhase } from "./shared/types";

import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

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
          io.to(roomId).emit("opponentJoined", {
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
            },
          },
          ball: { x: 0, y: 0, vx: 0, vy: 0, speed: 5 },
          phase: GamePhase.WAITING_FOR_OPPONENT,
          lastScorerId: null,
          gameLoopIntervalId: null,
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
});
