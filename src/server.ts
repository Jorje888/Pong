import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { RoomState } from "./shared/types";
import { GamePhase } from "./shared/types";

const httpServer = http.createServer();
const io = new SocketIOServer(httpServer);

const rooms = new Map<string, RoomState>();

httpServer.listen(3001, () => {
  console.log("Server is listening on port 3001");
});

io.on("connection", (socket) => {
  console.log("Client connected", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });

  socket.on("joinRoom", (roomId: string) => {
    const room = rooms.get(roomId);
    if (room) {
      socket.join(roomId);
      room.players[socket.id] = {
        id: socket.id,
        name: "",
        isReady: false,
        paddleY: 0,
        score: 0,
        side: "left",
        socket,
      };
    } else {
      const newRoom: RoomState = {
        id: roomId,
        players: {
          [socket.id]: {
            id: socket.id,
            name: "",
            isReady: false,
            paddleY: 0,
            score: 0,
            side: "left",
            socket,
          },
        },
        ball: { x: 0, y: 0, vx: 0, vy: 0, speed: 5 },
        phase: GamePhase.WAITING_FOR_OPPONENT,
        lastScorerId: null,
        gameLoopIntervalId: null,
      };
      rooms.set(roomId, newRoom);
      socket.join(roomId);
    }
  });
});
