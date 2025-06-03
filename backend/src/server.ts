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

  socket.on("joinRoom", (roomId: string, username: string) => {
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
          socket: socket,
        };
        socket.join(roomId);
        room.phase = GamePhase.READY_CHECK;
        const [firstPlayer] = Object.values(room.players);

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
        firstPlayer.socket.emit("opponentJoined", {
          opponentName: username,
          opponentId: socket.id,
          updatedGameState: {
            players: room.players,
            phase: room.phase,
          },
        });
      } else {
        // Room is already full
        socket.emit("roomFull", {});
      }
    } else {
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
    }
  });
});
