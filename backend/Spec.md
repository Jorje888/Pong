Prompt 1: Project Setup - Backend Core

Goal: Initialize a Node.js/TypeScript backend project with Socket.IO and define core data structures.

Tasks:

1.  Create a new Node.js project (`npm init -y`, `tsc --init`).
2.  Install necessary dependencies: `typescript`, `ts-node`, `nodemon`, `@types/node`, `socket.io`.
3.  Create a `src` directory.
4.  Inside `src`, create `shared/types.ts`. Define the following interfaces based on the specification:
    - `GameConstants` (use placeholder values for speeds, sizes, e.g., GAME_WIDTH: 800, GAME_HEIGHT: 600, PADDLE_HEIGHT: 100, PADDLE_WIDTH: 20, BALL_RADIUS: 10, MAX_SCORE: 5, etc.).
    - `PlayerState` (id, name, isReady, paddleY, score, side, socket - type `any` for now for socket).
    - `BallState` (x, y, vx, vy, speed).
    - `GamePhase` enum (`WAITING_FOR_OPPONENT`, `READY_CHECK`, `ACTIVE_GAME`, `PAUSED`, `GAME_OVER`).
    - `RoomState` (id, players: `{[socketId: string]: PlayerState}`, ball: `BallState`, phase: `GamePhase`, lastScorerId: `string | null`, gameLoopIntervalId: `NodeJS.Timeout | null`).
5.  Inside `src`, create `server.ts`.
    - Import `Server` from `socket.io`.
    - Create an HTTP server and pass it to the Socket.IO `Server`.
    - Initialize an empty `Map` to store `RoomState` objects: `const rooms = new Map<string, RoomState>();`.
    - Start the server listening on a port (e.g., 3001).
    - Log a message when a client connects and disconnects (basic `io.on('connection', (socket) => { ... })`).
6.  Add `scripts` to `package.json` for `dev` (using `nodemon` and `ts-node`) and `build`/`start` (using `tsc` and `node`).
7.  Create a `tsconfig.json` with appropriate settings (`rootDir`, `outDir`, `esModuleInterop`, `target`, `module`).

Testing:

- Run the server using `npm run dev`.
- Verify the server starts without errors.

Prompt 2: Backend - Basic Room Joining Logic

Goal: Implement the initial server-side logic for players joining rooms.

Files to Modify:

- `src/server.ts`
- `src/shared/types.ts` (if any payload types are needed for new events)

Tasks:

1.  In `server.ts`, within the `io.on('connection', (socket) => { ... })` handler:
    - Listen for a `joinRoom` event from the client. The payload should be `{ roomNumber: string, playerName: string }`.
    - **Room Creation/Joining Logic:**
      - If `rooms.has(roomNumber)` is false:
        - Create a new `RoomState` object.
          - `id`: `roomNumber`.
          - `players`: Add the new player. Assign `socket.id`, `playerName`, `isReady: false`, initial `paddleY` (e.g., `GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2`), `score: 0`, `side: 'left'`. Store the actual `socket` object in `PlayerState.socket`.
          - `ball`: Initialize with default values (e.g., center of screen, zero velocity).
          - `phase`: `GamePhase.WAITING_FOR_OPPONENT`.
          - `lastScorerId: null`, `gameLoopIntervalId: null`.
        - Store this new room in the `rooms` map.
        - Make the socket join the Socket.IO room: `socket.join(roomNumber)`.
        - Emit a `roomJoined` event back to the joining client: `{ roomId: roomNumber, playerSide: 'left', opponentName: null, initialGameState: { players: room.players, ball: room.ball, phase: room.phase } }`. (Consider what initial state the client needs immediately).
      - Else (room exists):
        - Get the `room` from the `rooms` map.
        - If `Object.keys(room.players).length === 1`:
          - Add the new player to `room.players`. Assign `side: 'right'`, and other initial `PlayerState` values. Store their socket.
          - Make this socket join the Socket.IO room: `socket.join(roomNumber)`.
          - Set `room.phase = GamePhase.READY_CHECK` (as per spec, or keep it `WAITING_FOR_OPPONENT` until explicitly ready? Let's stick to spec: section 4.3 implies "Waiting for opponent" is replaced when player 2 joins, then "Ready" appears. So, phase might shift to `READY_CHECK` once two players are in). For now, let's assume joining transitions to `READY_CHECK` if two players are present.
          - Emit `roomJoined` to the new (second) player: `{ roomId: roomNumber, playerSide: 'right', opponentName: /* name of first player */, initialGameState: { players: room.players, ball: room.ball, phase: room.phase } }`.
          - Emit an `opponentJoined` event to the first player already in the room: `{ opponentName: /* name of second player */, opponentId: socket.id, updatedGameState: { players: room.players, phase: room.phase } }`.
        - Else (room has 2 players):
          - Emit a `roomFull` event back to the attempting client: `{}`.
2.  Define necessary payload types in `shared/types.ts` for `roomJoined`, `roomFull`, and `opponentJoined` if they are complex.

Testing (Manual, using a Socket.IO client tool or two instances of it):

1.  Client 1 joins "room123" with name "Alice".
    - Server should log creation, Alice should receive `roomJoined` (side 'left', no opponent).
2.  Client 2 joins "room123" with name "Bob".
    - Server should log Bob joining. Bob should receive `roomJoined` (side 'right', opponent Alice). Alice should receive `opponentJoined` (opponent Bob). Room phase should reflect two players are now present (e.g., `READY_CHECK`).
3.  Client 3 attempts to join "room123" with name "Charlie".
    - Charlie should receive `roomFull`.
4.  Client 4 joins "room456" with name "Dave".
    - Server should create a new room. Dave gets `roomJoined`.

- Verify `rooms` map on the server reflects these states.
- (Manual) Use a simple Socket.IO client tool (like Postman or a quick HTML page) to connect and see connection/disconnection logs.

Prompt 3: Project Setup - Frontend Core & Welcome Screen UI

Goal: Initialize a React/TypeScript frontend, install dependencies, and create the Welcome Screen UI.

Tasks:

1.  Create a new React project using Create React App with the TypeScript template: `npx create-react-app pong-frontend --template typescript`.
2.  Navigate into `pong-frontend`.
3.  Install dependencies: `socket.io-client`, `phaser`. Install types: `@types/socket.io-client`.
4.  Clean up default CRA files (App.css, logo.svg, etc.) if desired.
5.  Create a `src/components` directory.
6.  Inside `src/components`, create `WelcomeScreen.tsx`:
    - It should be a functional React component.
    - It should have state for `roomNumber` (string) and `playerName` (string) using `useState`.
    - It should render:
      - An input field for "Room Number" (bind to `roomNumber` state).
      - An input field for "Your Name" (bind to `playerName` state).
      - A "Join Room" button.
      - A paragraph element (initially empty or hidden) to display the "Room is full..." message.
    - Style it minimally for now.
7.  In `src/App.tsx`:
    - Render the `WelcomeScreen` component.
    - (Placeholder) Add state to `App.tsx` like `currentPage` (`'welcome' | 'game' | 'endgame'`) defaulting to `'welcome'`. We'll use this for navigation later. For now, just render `WelcomeScreen`.

Testing (Manual):

- Run the React app (`npm start`).
- Verify the Welcome Screen displays correctly with input fields and a button.
- Typing in inputs should update their values.

Prompt 4: Frontend - Socket.IO Connection & Joining Room

Goal: Connect the frontend to the backend Socket.IO server and implement the client-side logic for joining a room.

Files to Modify/Create:

- `src/App.tsx`
- `src/components/WelcomeScreen.tsx`
- `src/socket.ts` (new file for Socket.IO client instance)
- `src/shared/types.ts` (copy or link from backend if not already in a shared monorepo structure; for now, assume it's copied/accessible)

Tasks:

1.  Create `src/socket.ts`:
    - Import `io` from `socket.io-client`.
    - Define the server URL (e.g., `http://localhost:3001`).
    - Export a Socket.IO client instance: `export const socket = io(SERVER_URL, { autoConnect: false });`. We use `autoConnect: false` so we can control when connection happens.
2.  In `src/App.tsx`:
    - Import `socket` from `src/socket.ts`.
    - Use a `useEffect` hook to `socket.connect()` when the component mounts and `socket.disconnect()` when it unmounts.
    - Add state for `currentRoomId: string | null`, `playerSide: 'left' | 'right' | null`, `opponentName: string | null`, `roomFullError: string | null`.
    - Set up Socket.IO event listeners in a `useEffect` hook (that runs once on mount):
      - `socket.on('roomJoined', (data) => { ... })`:
        - Log the data.
        - Set `currentRoomId`, `playerSide`, `opponentName` from `data`.
        - Set `roomFullError(null)`.
        - Change `currentPage` state to `'game'` (we'll create the GamePage component next).
      - `socket.on('roomFull', () => { ... })`:
        - Set `roomFullError("Room is full, please try another room.")`.
      - `socket.on('opponentJoined', (data) => { ... })`: // This is for the first player already in room
        - Log the data.
        - Set `opponentName` from `data.opponentName`.
        - (This might also update `room.phase` if we pass it, useful for triggering UI changes like showing Ready button).
    - Pass a callback function `handleJoinRoom` to `WelcomeScreen`. This function will take `roomNumber` and `playerName`.
3.  In `WelcomeScreen.tsx`:
    - Accept `handleJoinRoom` and `roomFullError` as props.
    - When the "Join Room" button is clicked:
      - Call `handleJoinRoom(roomNumber, playerName)`.
      - Clear the `roomFullError` on input change in `roomNumber` or `playerName` fields, or when join is attempted.
    - Display the `roomFullError` message prop if it's not null.
4.  Back in `App.tsx`, `handleJoinRoom` function:
    - It should emit `socket.emit('joinRoom', { roomNumber, playerName })`.
    - Clear any previous `roomFullError`.
5.  Update `App.tsx`'s render logic:
    - If `currentPage === 'welcome'`, render `WelcomeScreen`.
    - Else if `currentPage === 'game'`, render a placeholder `<div>Game Page - Room: {currentRoomId} - Side: {playerSide} - Opponent: {opponentName || 'Waiting...'}</div>`.

Testing (Manual):

1.  Ensure the backend server from Prompt 2 is running.
2.  Run the React app.
3.  Open two browser windows.
4.  Window 1: Enter "room1", "PlayerA", click Join.
    - Placeholder Game Page should show "Room: room1 - Side: left - Opponent: Waiting...".
    - Backend console should show PlayerA joined.
5.  Window 2: Enter "room1", "PlayerB", click Join.
    - Window 2 Game Page should show "Room: room1 - Side: right - Opponent: PlayerA".
    - Window 1 Game Page should update to show "Opponent: PlayerB".
    - Backend console should show PlayerB joined.
6.  Window 3: Enter "room1", "PlayerC", click Join.
    - Welcome Screen should show "Room is full, please try another room."
    - Window 3 should remain on the Welcome Screen.

Prompt 5: Frontend - Phaser Integration & Basic Game Scene

Goal: Integrate Phaser into the React app and display a basic, static game scene.

Files to Modify/Create:

- `src/App.tsx`
- `src/components/GamePage.tsx` (new component)
- `src/phaser/scenes/MainGameScene.ts` (new Phaser scene file)
- `src/phaser/game.ts` (new file for Phaser game config and instance creation)
- `src/shared/types.ts` (access `GameConstants`)

Tasks:

1.  Create `src/phaser/scenes/MainGameScene.ts`:
    - Import `Phaser` and `GameConstants` from your shared types (assume `GAME_WIDTH`, `GAME_HEIGHT` are defined).
    - Create a class `MainGameScene extends Phaser.Scene`.
    - Constructor: `super({ key: 'MainGameScene' });`.
    - `preload()`: (empty for now).
    - `create()`:
      - Set background color: `this.cameras.main.setBackgroundColor('#000033');`
      - Draw a center dashed line: Use `this.add.graphics()` to draw a vertical dashed line in the middle of the screen (`GAME_WIDTH / 2`).
      - Draw top and bottom boundary lines: Use `this.add.graphics()` to draw horizontal lines.
      - (Placeholder text) Add Phaser text object: `this.add.text(50, 50, 'Waiting for opponent...', { fontSize: '24px', fill: '#fff' });`. Also display `Room: [roomNumber]` using data passed to the scene.
    - `update()`: (empty for now).
2.  Create `src/phaser/game.ts`:

    - Import `Phaser` and `MainGameScene`.
    - Import `GameConstants`.
    - Define a Phaser game configuration object:

      ```typescript
      import Phaser from 'phaser';
      import MainGameScene from './scenes/MainGameScene';
      import { gameConstants } // Assuming GameConstants is an object with values

      export const phaserConfig: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          width: gameConstants.GAME_WIDTH,
          height: gameConstants.GAME_HEIGHT,
          parent: 'phaser-game-container', // ID of the div where the canvas will be injected
          physics: {
              default: 'arcade',
              arcade: {
                  // debug: true, // useful for seeing physics bodies
              }
          },
          scene: [MainGameScene]
      };
      ```

    - (Optional for now, can be done in component) A function to launch the game: `export const launchGame = (containerId: string) => new Phaser.Game({ ...phaserConfig, parent: containerId });`

3.  Create `src/components/GamePage.tsx`:
    - Props: `roomId: string`, `playerSide: 'left' | 'right'`, `opponentName: string | null`.
    - Use `useEffect` to initialize and destroy the Phaser game.
      - On mount: `const game = new Phaser.Game(phaserConfig);`
      - Pass `roomId` and initial `opponentName` to the `MainGameScene` via scene data `this.scene.start('MainGameScene', { roomId, opponentName })` or by creating a custom registry value.
      - On unmount: `game.destroy(true);`
    - Render a `div` with `id="phaser-game-container"` for Phaser to attach to.
    - Render React UI elements _outside_ or _overlaying_ the Phaser canvas for room info and "Waiting for opponent" if needed (though Phaser text is also fine for now). For instance, display "Room: {props.roomId}" and "Opponent: {props.opponentName || 'Waiting...'}" using React components.
4.  Update `src/App.tsx`:
    - When `currentPage === 'game'`, render `<GamePage roomId={currentRoomId!} playerSide={playerSide!} opponentName={opponentName} />`.
5.  Modify `MainGameScene.ts`:
    - In `create(data: { roomId: string, opponentName: string | null })`:
      - Use `data.roomId` and `data.opponentName` to display initial info.
      - Store `this.opponentNameText = this.add.text(...)` for "Waiting for opponent..." or opponent's name.
      - Create a method `updateOpponentDisplay(name: string | null)` in the scene to change this text.
6.  Update `src/App.tsx` socket listeners for `roomJoined` and `opponentJoined`:
    - When `opponentJoined` is received (or `roomJoined` for the second player), if the game instance/scene already exists, find a way to call `MainGameScene.updateOpponentDisplay(newOpponentName)`. This can be done via Phaser's event emitter, game registry, or by re-passing props to `GamePage` if it intelligently updates the scene. (A simple way for now: store scene reference or use registry `this.registry.set('opponentName', name);` and have scene listen to registry changes or read it in `update`).

Testing (Manual):

1.  Run backend and frontend.
2.  Join a room as Player 1.
    - Verify the GamePage shows, Phaser canvas appears with background, center line, boundaries.
    - Verify text "Room: [your_room_id]" and "Waiting for opponent..." is visible.
3.  Join the same room as Player 2 on another browser.
    - Player 2's screen should show the game scene with "Opponent: [Player1_Name]".
    - Player 1's screen should update from "Waiting for opponent..." to "Opponent: [Player2_Name]".

Prompt 6: Ready Mechanism - Backend Logic

Goal: Implement the server-side logic for the player "Ready" mechanism.

Files to Modify:

- `src/server.ts`
- `src/shared/types.ts`

Tasks:

1.  In `src/shared/types.ts`:
    - Ensure `PlayerState` has `isReady: boolean`. (Already defined in Prompt 1's `PlayerState`).
    - Define payload type for `playerReadyStateUpdate` (Server-to-Client): `{ playerId: string, isReady: boolean, readyButtonColors?: { player1: string, player2: string } }`. (Button colors determined by client, but server could hint or client derives it). For now, just `playerId` and `isReady`.
    - Define payload type for `gameStarted` (Server-to-Client): `{ initialBallState: BallState, initialPlayersState: { [socketId: string]: PlayerState }, servingPlayerId: string }`.
2.  In `src/server.ts`:
    - When the second player joins a room (in the `joinRoom` handler, after two players are in):
      - Set the `room.phase` to `GamePhase.READY_CHECK`.
      - Initialize `isReady` to `false` for both players in `room.players` if not already.
      - (Consider if `opponentJoined` or `roomJoined` for P2 should also convey this phase change to clients).
    - Add a new socket event listener for `toggleReady`: `socket.on('toggleReady', () => { ... })`.
      - Find the player (`socket.id`) and their `room`. If not found, or room not in `READY_CHECK` or `ACTIVE_GAME` phase, ignore.
      - If `room.phase === GamePhase.READY_CHECK`:
        - Toggle the `player.isReady` status.
        - Broadcast `playerReadyStateUpdate` to the room: `io.to(room.id).emit('playerReadyStateUpdate', { playerId: socket.id, isReady: player.isReady });`.
        - Check if both players in the room are now `isReady`.
          - If yes:
            - Set `room.phase = GamePhase.ACTIVE_GAME`.
            - Reset paddles to initial vertical center positions:
              - `room.players[player1Id].paddleY = gameConstants.GAME_HEIGHT / 2 - gameConstants.PADDLE_HEIGHT / 2;` (adjust for PADDLE_HEIGHT if needed)
              - `room.players[player2Id].paddleY = gameConstants.GAME_HEIGHT / 2 - gameConstants.PADDLE_HEIGHT / 2;`
            - Reset ball to the exact center: `room.ball.x = gameConstants.GAME_WIDTH / 2; room.ball.y = gameConstants.GAME_HEIGHT / 2;`.
            - Randomly choose a serving player (either `player1Id` or `player2Id`). Store this as `room.servingPlayerId` (add this field to `RoomState` if not present, or use `lastScorerId` carefully for the first serve).
            - Set initial ball velocity:
              - `room.ball.speed = gameConstants.INITIAL_BALL_SPEED;` (define this constant in `shared/types.ts -> GameConstants`).
              - `let angle = Math.random() * Math.PI / 2 - Math.PI / 4; // -45 to +45 degrees`
              - `room.ball.vy = room.ball.speed * Math.sin(angle);`
              - `room.ball.vx = room.ball.speed * Math.cos(angle);`
              - If serving player is right (e.g., Player 2), `room.ball.vx *= -1;` (ball moves left). (Ensure player sides are consistently 'left' or 'right').
            - Emit `gameStarted` to the room: `io.to(room.id).emit('gameStarted', { initialBallState: room.ball, initialPlayersState: room.players, servingPlayerId: room.servingPlayerId, phase: room.phase });`.
            - (The game loop will be started in a later step, for now, this event signals clients).
3.  Update `RoomState` in `shared/types.ts` to include `servingPlayerId: string | null;`. Initialize to `null`.

Testing (Manual, using a Socket.IO client tool for now):

1.  Have two clients join the same room. Server should set room phase to `READY_CHECK`.
2.  Client 1 sends `toggleReady`.
    - Server should update P1's `isReady` to `true`.
    - Server should emit `playerReadyStateUpdate` to both clients (`{ playerId: P1_ID, isReady: true }`).
3.  Client 2 sends `toggleReady`.
    - Server should update P2's `isReady` to `true`.
    - Server should emit `playerReadyStateUpdate` to both clients (`{ playerId: P2_ID, isReady: true }`).
    - Server should then identify both are ready, set phase to `ACTIVE_GAME`.
    - Server should emit `gameStarted` with initial ball, paddle positions, and serving player ID.
    - Verify ball velocity is non-zero and directed towards one player. Verify paddle Y positions are centered.

Prompt 7: Ready Mechanism - Frontend UI & Logic

Goal: Implement the "Ready" button UI and its logic on the frontend.

Files to Modify/Create:

- `src/components/GamePage.tsx`
- `src/phaser/scenes/MainGameScene.ts`
- `src/App.tsx` (to manage game state passed to Phaser)
- `src/shared/types.ts` (access `GamePhase`)

Tasks:

1.  In `src/App.tsx`:
    - Add new state variables:
      - `playerStates: { [socketId: string]: PlayerState } | null = null;`
      - `ballState: BallState | null = null;`
      - `gamePhase: GamePhase | null = GamePhase.WAITING_FOR_OPPONENT;` (initialize based on initial room join)
      - `ownSocketId: string | null = null;` (set this when socket connects: `socket.on('connect', () => setOwnSocketId(socket.id));`)
    - Update `socket.on('roomJoined', (data) => { ... })`:
      - Set `playerStates` from `data.initialGameState.players`.
      - Set `ballState` from `data.initialGameState.ball`.
      - Set `gamePhase` from `data.initialGameState.phase`.
    - Update `socket.on('opponentJoined', (data) => { ... })`:
      - Update `playerStates` from `data.updatedGameState.players`.
      - Update `gamePhase` from `data.updatedGameState.phase`.
    - Add `socket.on('playerReadyStateUpdate', (data: { playerId: string, isReady: boolean }) => { ... })`:
      - Update the `isReady` status for the specific player in `playerStates`.
      - Update `playerStates` state (ensure immutability for React state updates).
    - Add `socket.on('gameStarted', (data) => { ... })`:
      - Update `ballState` with `data.initialBallState`.
      - Update `playerStates` with `data.initialPlayersState`.
      - Set `gamePhase` to `data.phase` (should be `ACTIVE_GAME`).
      - Log "Game Started! Serving player: " + `data.servingPlayerId`.
    - Pass `playerStates`, `gamePhase`, and `ownSocketId` down to `GamePage`.
2.  In `src/components/GamePage.tsx`:
    - Accept new props: `playerStates`, `gamePhase`, `ownSocketId`.
    - Modify the `useEffect` where Phaser game is initialized:
      - When the game is created, or when these props change, pass them to the Phaser scene, e.g., `game.scene.getScene('MainGameScene').updateGameDisplay(playerStates, gamePhase, ownSocketId);` or use the registry.
3.  In `src/phaser/scenes/MainGameScene.ts`:
    - Add member variables to store `this.playerStates`, `this.gamePhase`, `this.ownSocketId`.
    - Add a `readyButton: Phaser.GameObjects.Text | null = null;`
    - Create a method `updateGameDisplay(playerStates, gamePhase, ownSocketId)`:
      - Store these values.
      - Call a new method `drawReadyButton()`.
      - (Later, this will also update paddles/ball).
    - Create `drawReadyButton()`:
      - If `this.readyButton` exists, destroy it.
      - If `this.gamePhase === GamePhase.READY_CHECK` or `this.gamePhase === GamePhase.ACTIVE_GAME` or `this.gamePhase === GamePhase.PAUSED`:
        - Determine button text and color:
          - If `this.ownSocketId` and `this.playerStates` are available:
            - `const me = this.playerStates[this.ownSocketId];`
            - If `this.gamePhase === GamePhase.READY_CHECK`: color = `me.isReady ? 'yellow' : 'red'`. Text = "READY".
            - If `this.gamePhase === GamePhase.ACTIVE_GAME`: color = `'green'`. Text = "READY (PAUSE)".
            - If `this.gamePhase === GamePhase.PAUSED`:
              - If `me.isReady` (meaning this player is _not_ the one who paused): color = `'green'`. Text = "READY (RESUME)".
              - Else (this player paused): color = `'yellow'`. Text = "READY (PAUSED)".
        - `this.readyButton = this.add.text(gameConstants.GAME_WIDTH / 2, gameConstants.GAME_HEIGHT - 50, TEXT_HERE, { fontSize: '32px', fill: COLOR_HERE }).setOrigin(0.5);`
        - `this.readyButton.setInteractive();`
        - `this.readyButton.on('pointerdown', () => { socket.emit('toggleReady'); });` (Import `socket` from `src/socket.ts`).
      - If "Waiting for opponent..." text is visible and phase is no longer `WAITING_FOR_OPPONENT`, hide/remove it.
      - If opponent name should be shown (e.g. when `READY_CHECK` starts), ensure it is.
    - In `create(data)`: Call `updateGameDisplay` with initial data.
    - Ensure player names are displayed (e.g., top left for P1, top right for P2).

Testing (Manual):

1.  Backend from Prompt 6 running.
2.  Frontend running. Open two browser windows.
3.  Player A joins. Sees "Waiting for opponent...". No Ready button.
4.  Player B joins.
    - Both players' screens should now show opponent names.
    - Both players should see a red "READY" button.
5.  Player A clicks "READY".
    - Player A's button turns yellow. Player B's button remains red.
6.  Player B clicks "READY".
    - Both Player A's and Player B's buttons should turn green (Text: "READY (PAUSE)").
    - `gameStarted` log should appear in client consoles with initial state.
    - (Paddles and ball won't move yet, but their initial positions from `gameStarted` should be reflected if rendering logic for them is added to `updateGameDisplay`).

Prompt 8: Backend - Authoritative Game Loop & Initial State Broadcast

Goal: Implement the server-side game loop that broadcasts the game state at a fixed interval. For now, it will broadcast static or minimally changing state.

Files to Modify:

- `src/server.ts`
- `src/shared/types.ts` (for `GameConstants.SERVER_TICK_RATE_MS`)

Tasks:

1.  In `src/shared/types.ts -> GameConstants`:
    - Define `SERVER_TICK_RATE_MS: 16.67` (for ~60 FPS).
    - Define `INITIAL_BALL_SPEED: number` (e.g., 250 pixels/second).
    - Define `PADDLE_SPEED: number` (e.g., 300 pixels/second).
2.  In `src/server.ts`:
    - Create a function `startGameLoop(roomId: string)`:
      - Get the `room` from `rooms`. If not found, or no `gameLoopIntervalId` on `RoomState`, return.
      - If `room.gameLoopIntervalId` already exists, clear it: `clearInterval(room.gameLoopIntervalId)`.
      - `room.gameLoopIntervalId = setInterval(() => { ... }, gameConstants.SERVER_TICK_RATE_MS);`
      - Inside the interval callback:
        - Get the `currentRoomState = rooms.get(roomId)`. If not found or phase is not `ACTIVE_GAME`, do nothing (or clear interval if appropriate for other phases).
        - **For now, no physics updates.** We will add ball movement and paddle updates in subsequent prompts.
        - Emit `gameStateUpdate` to all clients in the room:
          ```typescript
          io.to(roomId).emit("gameStateUpdate", {
            ball: currentRoomState.ball,
            // Send only Y positions and IDs for paddles to reduce payload.
            // Client can derive which paddle is which based on their own side or player IDs.
            paddles: Object.values(currentRoomState.players).map((p) => ({
              id: p.id,
              y: p.paddleY,
              side: p.side,
            })),
            scores: {
              player1:
                Object.values(currentRoomState.players).find(
                  (p) => p.side === "left"
                )?.score || 0, // Or use IDs
              player2:
                Object.values(currentRoomState.players).find(
                  (p) => p.side === "right"
                )?.score || 0,
            },
            phase: currentRoomState.phase,
          });
          ```
    - Modify the `toggleReady` handler:
      - When both players become ready and `gameStarted` is emitted:
        - Call `startGameLoop(room.id)`.
    - Add a function `stopGameLoop(roomId: string)`:
      - Get the `room`. If found and `room.gameLoopIntervalId` exists, `clearInterval(room.gameLoopIntervalId)` and set `room.gameLoopIntervalId = null`.
    - (Think about when to stop the loop: game over, player disconnects, pause). For now, starting is the focus.
3.  Ensure `RoomState` has `gameLoopIntervalId: NodeJS.Timeout | null;` initialized to `null`. (Already defined in Prompt 1).
4.  Modify the `gameStateUpdate` payload in `shared/types.ts` if needed to match what's being sent (e.g. `paddles: {id: string, y: number, side: 'left'|'right'}[]`, `scores: {player1: number, player2: number}`).

Testing:

1.  Backend running.
2.  Use a Socket.IO client tool (or the frontend from Prompt 7 if you add logging for `gameStateUpdate`).
3.  Two clients join, both click Ready.
4.  Server should start the game loop for that room.
5.  Observe `gameStateUpdate` events being emitted to clients in the room at roughly 60 FPS.
6.  The `ball` and `paddle` data in these updates should initially match the state set in `gameStarted`.

Prompt 9: Frontend - Rendering Game State from Loop

Goal: Make the frontend Phaser scene render the paddles and ball based on `gameStateUpdate` events from the server.

Files to Modify:

- `src/App.tsx`
- `src/components/GamePage.tsx`
- `src/phaser/scenes/MainGameScene.ts`
- `src/shared/types.ts`

Tasks:

1.  In `src/App.tsx`:
    - Add `socket.on('gameStateUpdate', (data) => { ... })`:
      - Update `ballState` with `data.ball`.
      - Update `playerStates` by merging `data.paddles` information (matching by `id` or `side`). Be careful here, as `data.paddles` is an array of paddle states, not the full `PlayerState`. You might need to iterate:
        ```typescript
        // Inside gameStateUpdate listener in App.tsx
        setPlayerStates((prevPlayerStates) => {
          if (!prevPlayerStates) return null;
          const newPlayerStates = { ...prevPlayerStates };
          data.paddles.forEach((paddleUpdate) => {
            if (newPlayerStates[paddleUpdate.id]) {
              newPlayerStates[paddleUpdate.id] = {
                ...newPlayerStates[paddleUpdate.id],
                paddleY: paddleUpdate.y,
              };
            }
          });
          // Update scores too
          Object.values(newPlayerStates).forEach((player) => {
            if (player.side === "left") player.score = data.scores.player1;
            if (player.side === "right") player.score = data.scores.player2;
          });
          return newPlayerStates;
        });
        ```
      - Update `gamePhase` with `data.phase`.
      - (Scores will also be part of this, ensure `App.tsx` state and `GamePage` props handle them).
2.  In `src/phaser/scenes/MainGameScene.ts`:
    - Add member variables for Phaser GameObjects:
      - `private ball: Phaser.GameObjects.Arc | null = null;`
      - `private leftPaddle: Phaser.GameObjects.Rectangle | null = null;`
      - `private rightPaddle: Phaser.GameObjects.Rectangle | null = null;`
      - `private scoreText: Phaser.GameObjects.Text | null = null;`
    - In `create(data)`:
      - Initialize these GameObjects (but don't add them to scene yet if `playerStates` isn't populated).
      - `this.ball = this.add.circle(0, 0, gameConstants.BALL_RADIUS, 0xffffff).setVisible(false);`
      - `this.leftPaddle = this.add.rectangle(0, 0, gameConstants.PADDLE_WIDTH, gameConstants.PADDLE_HEIGHT, 0xffffff).setVisible(false);`
      - `this.rightPaddle = this.add.rectangle(0, 0, gameConstants.PADDLE_WIDTH, gameConstants.PADDLE_HEIGHT, 0xffffff).setVisible(false);`
      - `this.scoreText = this.add.text(gameConstants.GAME_WIDTH / 2, 30, "0 - 0", { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setVisible(false);`
    - Modify/extend `updateGameDisplay(playerStates, ballState, gamePhase, ownSocketId)` (this method is now effectively the main render updater based on props from React):
      - If `playerStates` and `ballState`:
        - Make game objects visible if they aren't.
        - Update ball position: `this.ball.setPosition(ballState.x, ballState.y); this.ball.setVisible(true);`
        - Iterate through `Object.values(playerStates)`:
          - `const player = playerStateEntry;`
          - If `player.side === 'left'`:
            - `this.leftPaddle.setPosition(gameConstants.PADDLE_WIDTH, player.paddleY + gameConstants.PADDLE_HEIGHT / 2); this.leftPaddle.setVisible(true);` (Adjust X position to be slightly off edge, Y to be center of paddle).
          - If `player.side === 'right'`:
            - `this.rightPaddle.setPosition(gameConstants.GAME_WIDTH - gameConstants.PADDLE_WIDTH, player.paddleY + gameConstants.PADDLE_HEIGHT / 2); this.rightPaddle.setVisible(true);`
        - Update score text:
          - `const p1 = Object.values(playerStates).find(p => p.side === 'left');`
          - `const p2 = Object.values(playerStates).find(p => p.side === 'right');`
          - `this.scoreText.setText(`${p1 ? p1.score : 0} - ${p2 ? p2.score : 0}`).setVisible(true);`
      - If `gamePhase` is not `ACTIVE_GAME` (e.g. `READY_CHECK`, `WAITING_FOR_OPPONENT`), you might want to hide the ball or set paddles to a default "inactive" look/position if they are not already correctly positioned by server state.
      - Ensure `drawReadyButton()` is still called to update button state.

Testing (Manual):

1.  Backend (Prompt 8) and Frontend running.
2.  Two players join and ready up. Game starts.
3.  Phaser scene should now display the ball and two paddles at their initial positions as dictated by the server's `gameStarted` event, and then continuously updated by `gameStateUpdate`.
4.  Scores should display as "0 - 0".

Prompt 10: Frontend - Paddle Keyboard Input Handling

Goal: Implement keyboard input handling in the Phaser scene to detect paddle movement commands and emit them to the server.

Files to Modify:

- `src/phaser/scenes/MainGameScene.ts`
- `src/socket.ts` (to ensure `socket` is easily importable and used)
- `src/shared/types.ts` (define `playerInput` C2S event payload)

Tasks:

1.  In `src/shared/types.ts`:
    - Define the Client-to-Server event payload for `playerInput`:
      `type PlayerInputPayload = { direction: 'up' | 'down' | 'stop' };`
2.  In `src/phaser/scenes/MainGameScene.ts`:
    - Add member variables to store keyboard key objects:
      ```typescript
      private keyW: Phaser.Input.Keyboard.Key | null = null;
      private keyS: Phaser.Input.Keyboard.Key | null = null;
      private keyUp: Phaser.Input.Keyboard.Key | null = null;
      private keyDown: Phaser.Input.Keyboard.Key | null = null;
      ```
    - Add a member variable to store the player's assigned side, obtained from scene data or registry:
      `private playerSide: 'left' | 'right' | null = null;`
      (This should be set in `create(data)` or `updateGameDisplay` when `ownSocketId` and `playerStates` are available to determine the current player's side).
    - In the `create()` method (or a new method called from `create` like `initInput()`):
      - Get the current player's side. For example, if `this.ownSocketId` and `this.playerStates` are available from `this.registry` or passed in `data`:
        `const me = this.playerStates?.[this.ownSocketId!]; this.playerSide = me?.side;`
      - Initialize the key objects:
        `this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);`
        `this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);`
        `this.keyUp = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);`
        `this.keyDown = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);`
      - Add a member variable `private lastSentDirection: PlayerInputPayload['direction'] | null = null;` to avoid sending redundant 'stop' or continuous 'up'/'down' events if the state hasn't changed (optional optimization, but good for reducing network traffic). For simplicity, we can start without it and just send on press/release.
3.  In the `update(time: number, delta: number)` method of `MainGameScene.ts`:

    - First, check if `this.gamePhase === GamePhase.ACTIVE_GAME`. Only process input if the game is active.
    - If not `ACTIVE_GAME`, ensure no movement commands are sent (and potentially reset `lastSentDirection`).
    - Determine which keys to check based on `this.playerSide`:
      - `let moveDirection: PlayerInputPayload['direction'] | null = null;`
      - If `this.playerSide === 'left'`:
        - If `this.keyW?.isDown`: `moveDirection = 'up';`
        - Else if `this.keyS?.isDown`: `moveDirection = 'down';`
      - Else if `this.playerSide === 'right'`:
        - If `this.keyUp?.isDown`: `moveDirection = 'up';`
        - Else if `this.keyDown?.isDown`: `moveDirection = 'down';`
      - If no relevant key is down, `moveDirection = 'stop';`
    - Emit `playerInput` to the server if the direction changed from the last frame (or simply on every frame if not implementing `lastSentDirection` optimization yet, but 'stop' should only be sent once after keys are released):

      - For a simple implementation without `lastSentDirection`:

        - Listen for keydown and keyup events directly on keys instead of polling in `update`.

        ```typescript
        // In create() or initInput()
        const handleKeyDown = (direction: "up" | "down") => {
          if (this.gamePhase === GamePhase.ACTIVE_GAME) {
            socket.emit("playerInput", { direction });
          }
        };
        const handleKeyUp = (
          pressedDirection: "up" | "down",
          otherDirectionKey: Phaser.Input.Keyboard.Key | null
        ) => {
          // Only send 'stop' if the other movement key for that player isn't also down
          if (
            this.gamePhase === GamePhase.ACTIVE_GAME &&
            (!otherDirectionKey || !otherDirectionKey.isDown)
          ) {
            socket.emit("playerInput", { direction: "stop" });
          }
        };

        if (this.playerSide === "left") {
          this.keyW?.on("down", () => handleKeyDown("up"));
          this.keyS?.on("down", () => handleKeyDown("down"));
          this.keyW?.on("up", () => handleKeyUp("up", this.keyS));
          this.keyS?.on("up", () => handleKeyUp("down", this.keyW));
        } else if (this.playerSide === "right") {
          this.keyUp?.on("down", () => handleKeyDown("up"));
          this.keyDown?.on("down", () => handleKeyDown("down"));
          this.keyUp?.on("up", () => handleKeyUp("up", this.keyDown));
          this.keyDown?.on("up", () => handleKeyUp("down", this.keyUp));
        }
        ```

      - This event-driven approach is generally better for key presses than polling in `update` for this specific use case.

    - Ensure `socket` is imported from `src/socket.ts`.

4.  In `src/App.tsx` or `GamePage.tsx`, ensure `playerSide` (derived from `ownSocketId` and `playerStates`) is correctly passed down and made available to the `MainGameScene`, perhaps via scene data during `scene.start` or by setting it in the registry. The scene needs to know its designated side to determine which keys to listen to. This was partially covered in Prompt 7, ensure it's robust.

Testing (Manual):

1.  Backend (Prompt 8) and Frontend running.
2.  Two players join, ready up. Game starts (`ACTIVE_GAME` phase).
3.  Open browser console (Network tab) to monitor WebSocket traffic.
4.  As Player 1 (left paddle), press 'W'.
    - Verify a `playerInput` event with `{ direction: 'up' }` is sent.
5.  Release 'W'.
    - Verify a `playerInput` event with `{ direction: 'stop' }` is sent.
6.  Press 'S', release 'S'. Verify `down` and `stop`.
7.  As Player 2 (right paddle), press 'ArrowUp'.
    - Verify a `playerInput` event with `{ direction: 'up' }` is sent.
8.  Release 'ArrowUp'.
    - Verify a `playerInput` event with `{ direction: 'stop' }` is sent.
9.  Press 'ArrowDown', release 'ArrowDown'. Verify `down` and `stop`.
10. If game is not `ACTIVE_GAME` (e.g., `READY_CHECK`), pressing keys should not send `playerInput` events.
11. (Optional) If holding W then press S, 'down' should be sent. Releasing S while W is still held should send 'up'. Releasing W should then send 'stop'.
12. The ball and paddles will be static for now, but their positions should be correctly rendered from the server state.

Prompt 11: Backend - Paddle Movement Logic

Goal: Implement server-side logic to handle `playerInput` events and update authoritative paddle positions.

Files to Modify:

- `src/server.ts`
- `src/shared/types.ts` (specifically `GameConstants.PADDLE_SPEED` and `PlayerState`)

Tasks:

1.  In `src/shared/types.ts`:
    - Ensure `PlayerState` has a field to store current movement intention, e.g., `currentInput: 'up' | 'down' | 'stop' = 'stop';`. Initialize it to `'stop'`.
    - Ensure `GameConstants` has `PADDLE_SPEED` defined (e.g., 300 pixels per second). This was specified in Prompt 8.
2.  In `src/server.ts`:
    - Modify the `socket.on('connection', ...)` block:
      - Add a listener for the `playerInput` event: `socket.on('playerInput', (input: PlayerInputPayload) => { ... });`
      - Inside the handler:
        - Find the `room` the `socket` is in.
        - Find the `playerState` for this `socket.id` within that `room`.
        - If `room` or `playerState` is not found, or `room.phase !== GamePhase.ACTIVE_GAME`, ignore the input.
        - Validate the `input.direction` value.
        - Update `playerState.currentInput = input.direction;`.
3.  Modify the `startGameLoop` function's `setInterval` callback:
    - This loop already runs at `SERVER_TICK_RATE_MS`.
    - Inside the loop, _before_ emitting `gameStateUpdate`, if `currentRoomState.phase === GamePhase.ACTIVE_GAME`:
      - Iterate over each `player` in `currentRoomState.players`:
        - `const player = currentRoomState.players[playerId];`
        - `const PADDLE_SPEED_PER_TICK = gameConstants.PADDLE_SPEED / (1000 / gameConstants.SERVER_TICK_RATE_MS);`
        - If `player.currentInput === 'up'`:
          - `player.paddleY -= PADDLE_SPEED_PER_TICK;`
        - Else if `player.currentInput === 'down'`:
          - `player.paddleY += PADDLE_SPEED_PER_TICK;`
        - **Constrain paddle movement:**
          - `player.paddleY = Math.max(0, player.paddleY);`
          - `player.paddleY = Math.min(gameConstants.GAME_HEIGHT - gameConstants.PADDLE_HEIGHT, player.paddleY);` (Ensure `PADDLE_HEIGHT` is accessible from `gameConstants`).
    - The existing `gameStateUpdate` emission will then send the new `paddleY` positions.

Testing:

1.  Backend running. Frontend from Prompt 10 running.
2.  Two players join, ready up. Game starts.
3.  Player 1 presses and holds 'W'.
    - Observe the left paddle on both clients' screens moving upwards.
    - Verify it stops at the top edge of the game board.
4.  Player 1 releases 'W', then presses and holds 'S'.
    - Observe the left paddle moving downwards.
    - Verify it stops at the bottom edge.
5.  Repeat tests for Player 2 with 'ArrowUp' and 'ArrowDown'.
6.  Test that paddles do not move if the game is not in `ACTIVE_GAME` phase (e.g., during `READY_CHECK` or if paused later).
7.  Monitor server logs for any errors. The `gameStateUpdate` sent to clients should reflect the continuously changing `paddleY` values when keys are pressed.

Prompt 12: Backend - Ball Movement & Wall Collisions

Goal: Implement basic ball movement and collision with top/bottom walls on the server.

Files to Modify:

- `src/server.ts`
- `src/shared/types.ts` (ensure `BallState` includes `vx`, `vy`, `speed` and `GameConstants` includes `INITIAL_BALL_SPEED`).

Tasks:

1.  Recall from Prompt 6 (Backend Ready Mechanism): When the game starts, `room.ball` is initialized with:
    - `x`, `y` at center.
    - `speed = gameConstants.INITIAL_BALL_SPEED`.
    - `vx` and `vy` calculated for an initial serve angle and speed.
2.  In `src/server.ts`, within the `startGameLoop` function's `setInterval` callback, if `currentRoomState.phase === GamePhase.ACTIVE_GAME`:
    - **Before** updating paddles (or after, order relative to paddle updates for one tick doesn't hugely matter yet, but physics steps are usually: input -> update -> collisions -> response).
    - Update ball position based on its velocity:
      - `const BALL_SPEED_FACTOR = (1000 / gameConstants.SERVER_TICK_RATE_MS);` (This isn't quite right. Velocities should be in pixels per second. Movement per tick is `vx * (delta_time_seconds)`).
      - `const deltaTimeSeconds = gameConstants.SERVER_TICK_RATE_MS / 1000;`
      - `currentRoomState.ball.x += currentRoomState.ball.vx * deltaTimeSeconds;`
      - `currentRoomState.ball.y += currentRoomState.ball.vy * deltaTimeSeconds;`
    - **Wall Collision (Top/Bottom):**
      - If `currentRoomState.ball.y - gameConstants.BALL_RADIUS < 0`:
        - `currentRoomState.ball.y = gameConstants.BALL_RADIUS;` (Clamp position)
        - `currentRoomState.ball.vy *= -1;` (Reverse vertical velocity)
      - Else if `currentRoomState.ball.y + gameConstants.BALL_RADIUS > gameConstants.GAME_HEIGHT`:
        - `currentRoomState.ball.y = gameConstants.GAME_HEIGHT - gameConstants.BALL_RADIUS;` (Clamp position)
        - `currentRoomState.ball.vy *= -1;`
    - (Scoring, i.e., ball passing left/right boundaries, will be handled in a subsequent prompt).
3.  The `gameStateUpdate` will then broadcast the new ball position.

Testing:

1.  Backend and Frontend from previous prompts running.
2.  Two players join, ready up. Game starts.
3.  Observe the ball moving from the center towards the serving player's side.
4.  Verify the ball correctly bounces off the top and bottom walls. Its horizontal movement should continue unaffected by these vertical bounces.
5.  Paddles can be moved, but the ball will pass through them for now.
6.  The ball should move at a constant speed (`INITIAL_BALL_SPEED`).

Prompt 13: Backend - Paddle-Ball Collision & Reflection

Goal: Implement server-side collision detection and response between the ball and the paddles. Ball speed should increase on each paddle hit.

Files to Modify:

- `src/server.ts`
- `src/shared/types.ts` (ensure `GameConstants` includes `PADDLE_WIDTH`, `PADDLE_HEIGHT`, `BALL_RADIUS`, and `BALL_SPEED_INCREMENT_PER_HIT`).

Tasks:

1.  In `src/shared/types.ts -> GameConstants`:
    - Define `BALL_SPEED_INCREMENT_PER_HIT: number;` (e.g., 10 or 20, representing pixels/second).
    - Ensure `PADDLE_WIDTH`, `PADDLE_HEIGHT`, `BALL_RADIUS` are defined.
2.  In `src/server.ts`, within the `startGameLoop` function's `setInterval` callback, if `currentRoomState.phase === GamePhase.ACTIVE_GAME`:

    - This logic should come _after_ ball position is updated by velocity and _after_ wall collisions, but _before_ checking for scoring.
    - Define paddle properties for collision:

      - For each player in `currentRoomState.players`:
        - `const player = currentRoomState.players[playerId];`
        - `const paddleX = (player.side === 'left') ? gameConstants.PADDLE_WIDTH : gameConstants.GAME_WIDTH - gameConstants.PADDLE_WIDTH;` (This X is the _edge_ of the paddle closest to center, or center, depending on how you define it. Let's assume it's the edge facing the center of the board. Adjust if PADDLE_WIDTH is its center).
        - More robustly, for AABB:
          - `const paddleLeft = (player.side === 'left') ? 0 : gameConstants.GAME_WIDTH - gameConstants.PADDLE_WIDTH;`
          - `const paddleRight = (player.side === 'left') ? gameConstants.PADDLE_WIDTH : gameConstants.GAME_WIDTH;`
          - `const paddleTop = player.paddleY;`
          - `const paddleBottom = player.paddleY + gameConstants.PADDLE_HEIGHT;`

    - **Collision Detection and Response:**

      - Get the ball's current state: `const ball = currentRoomState.ball;`
      - Define ball's bounding box for clarity:

        - `const ballTop = ball.y - gameConstants.BALL_RADIUS;`
        - `const ballBottom = ball.y + gameConstants.BALL_RADIUS;`
        - `const ballLeft = ball.x - gameConstants.BALL_RADIUS;`
        - `const ballRight = ball.x + gameConstants.BALL_RADIUS;`

      - Iterate through each player/paddle:

        - `const player = currentRoomState.players[playerId];`
        - Get paddle bounds as defined above (`paddleLeft`, `paddleRight`, `paddleTop`, `paddleBottom`).
        - **AABB Collision Check:**
          ```typescript
          if (ballRight > paddleLeft && ballLeft < paddleRight && ballBottom > paddleTop && ballTop < paddleBottom) {
              // Collision detected with this paddle
          ```
        - **Collision Response:**

          - **Determine which paddle was hit and ensure ball is moving towards it:**

            - If `player.side === 'left'` (left paddle) and `ball.vx < 0` (ball moving left):
              - `ball.x = paddleRight + gameConstants.BALL_RADIUS;` // Place ball just outside paddle
              - `ball.vx *= -1;` // Reverse horizontal direction
              - **Calculate reflection angle based on hit point:**
                - `let intersectY = ball.y - (player.paddleY + gameConstants.PADDLE_HEIGHT / 2);` // Y distance from paddle center
                - `let normalizedIntersectY = intersectY / (gameConstants.PADDLE_HEIGHT / 2);` // Range -1 to 1
                - `let bounceAngle = normalizedIntersectY \* (Math.PI / 3); // Max bounce angle (e.g., 60 degrees or PI/3)
                - `ball.vy = ball.speed * Math.sin(bounceAngle);`
                - `ball.vx = ball.speed * Math.cos(bounceAngle);` // vx should remain positive (moving right)
              - `ball.speed += gameConstants.BALL_SPEED_INCREMENT_PER_HIT;` // Increase speed
            - Else if `player.side === 'right'` (right paddle) and `ball.vx > 0` (ball moving right):
              - `ball.x = paddleLeft - gameConstants.BALL_RADIUS;` // Place ball just outside paddle
              - `ball.vx *= -1;` // Reverse horizontal direction (now moving left)
              - `let intersectY = ball.y - (player.paddleY + gameConstants.PADDLE_HEIGHT / 2);`
              - `let normalizedIntersectY = intersectY / (gameConstants.PADDLE_HEIGHT / 2);`
              - `let bounceAngle = normalizedIntersectY * (Math.PI / 3);`
              - `ball.vy = ball.speed * Math.sin(bounceAngle);`
              - `ball.vx = -ball.speed * Math.cos(bounceAngle);` // vx must be negative (moving left)
              - `ball.speed += gameConstants.BALL_SPEED_INCREMENT_PER_HIT;`

          - **Important**: Ensure that after calculating new `vx` and `vy` from `bounceAngle` and `ball.speed`, the signs of `vx` are correct for the direction away from the paddle. The `Math.cos(bounceAngle)` will always be positive if `bounceAngle` is within -PI/2 to PI/2.
          - A simpler reflection might just change `vy` based on `normalizedIntersectY` and keep `vx` magnitude but reverse sign, then re-normalize `vx, vy` to new `ball.speed`. The provided method changes overall direction more dynamically.

3.  The `gameStatFeUpdate` will broadcast the ball's new velocity and position.

Testing:

1.  Backend and Frontend from previous prompts running.
2.  Two players join, ready up. Game starts.
3.  Move paddles to intercept the ball.
4.  Verify the ball correctly bounces off the paddles.
5.  Verify the reflection angle changes based on where the ball hits the paddle (center vs. edge).
6.  Check WebSocket messages or client-side logs to see if the ball's speed (as part of its velocity vector magnitude) increases after each paddle hit.
7.  Test edge cases: ball hitting the very top/bottom edge of a paddle.
8.  Ensure the ball doesn't get "stuck" in a paddle. The clamping (`ball.x = ...`) should help prevent this.

Prompt 14: Backend - Scoring & Game Reset After Score

Goal: Implement server-side logic for detecting when a player scores, updating scores, pausing briefly, and resetting the ball for the next serve.

Files to Modify:

- `src/server.ts`
- `src/shared/types.ts` (ensure `GameConstants` includes `MAX_SCORE` and `GAME_PAUSE_AFTER_SCORE_MS`. `PlayerState` has `score`. `RoomState` has `lastScorerId`).

Tasks:

1.  In `src/shared/types.ts -> GameConstants`:
    - Define `MAX_SCORE: 5;` (as per spec).
    - Define `GAME_PAUSE_AFTER_SCORE_MS: 1500;` (1.5 seconds).
2.  In `src/server.ts`, within the `startGameLoop` function's `setInterval` callback, if `currentRoomState.phase === GamePhase.ACTIVE_GAME`:

    - This logic should come _after_ ball movement, wall collisions, and paddle collisions.
    - **Scoring Detection:**

      - `const ball = currentRoomState.ball;`
      - `let scorer: 'left' | 'right' | null = null;`
      - If `ball.x - gameConstants.BALL_RADIUS < 0`: // Ball passed left boundary
        - `scorer = 'right';` // Right player scores
      - Else if `ball.x + gameConstants.BALL_RADIUS > gameConstants.GAME_WIDTH`: // Ball passed right boundary

        - `scorer = 'left';` // Left player scores

      - If `scorer` is not `null`:

        - **Update Score:**
          - Find the player who scored and the player who was scored against.
          - `const scoringPlayer = Object.values(currentRoomState.players).find(p => p.side === scorer);`
          - `const concedingPlayer = Object.values(currentRoomState.players).find(p => p.side !== scorer);`
          - If `scoringPlayer` exists: `scoringPlayer.score++;`
          - `currentRoomState.lastScorerId = scoringPlayer ? scoringPlayer.id : null;`
        - **Log Score:** `console.log(\`Score by ${scorer} player! New score: P1 ${leftPlayer.score} - P2 ${rightPlayer.score}\`);`
        - **Check for Game Over (will be detailed in next prompt, for now just log):**
          - If `scoringPlayer && scoringPlayer.score >= gameConstants.MAX_SCORE`:
            - `console.log(\`Game Over! Winner: ${scoringPlayer.name}\`);`
            - (Actual game over logic will set phase to `GAME_OVER` and stop loop). For now, we let it continue to test reset.
        - **Reset Ball & Paddles (and pause game logic):**
          - `currentRoomState.phase = GamePhase.PAUSED; // Or a new phase like 'SCORED_PAUSE'`
          - The `gameStateUpdate` should be sent immediately with the new scores and this PAUSED phase so clients see the score and the pause.
          - `io.to(roomId).emit('gameStateUpdate', { /* ... updated state ... */, phase: currentRoomState.phase });`
          - `setTimeout(() => { ... }, gameConstants.GAME_PAUSE_AFTER_SCORE_MS);`
          - Inside the `setTimeout` callback:
            - `const roomForReset = rooms.get(roomId);` // Re-fetch room state as it might change
            - If `!roomForReset` or `roomForReset.phase === GamePhase.GAME_OVER` (if game over was handled), return.
            - `roomForReset.ball.x = gameConstants.GAME_WIDTH / 2;`
            - `roomForReset.ball.y = gameConstants.GAME_HEIGHT / 2;`
            - `roomForReset.ball.speed = gameConstants.INITIAL_BALL_SPEED;`
            - // Paddles also reset to center vertical positions
            - `Object.values(roomForReset.players).forEach(p => { p.paddleY = gameConstants.GAME_HEIGHT / 2 - gameConstants.PADDLE_HEIGHT / 2; });`
            - **Determine next server:** The player who was scored against serves.
              - `const servingPlayer = concedingPlayer;`
              - `let angle = Math.random() * Math.PI / 2 - Math.PI / 4; // -45 to +45 degrees`
              - `roomForReset.ball.vy = roomForReset.ball.speed * Math.sin(angle);`
              - `roomForReset.ball.vx = roomForReset.ball.speed * Math.cos(angle);`
              - If `servingPlayer && servingPlayer.side === 'right'`: `roomForReset.ball.vx *= -1;` // Ball moves left
              - Else if `servingPlayer && servingPlayer.side === 'left'`: // No change to vx, ball moves right
                // if (roomForReset.ball.vx < 0) roomForReset.ball.vx \*= -1; // Ensure it's positive if it wasn't
              - Ensure vx direction is correct for serve. If serving player is left, ball moves right (positive vx). If serving player is right, ball moves left (negative vx).
            - `roomForReset.phase = GamePhase.ACTIVE_GAME;`
            - `io.to(roomId).emit('gameStateUpdate', { /* ... full state for fresh start of point ... */, phase: roomForReset.phase });` // Notify clients of resume
        - **Important**: While in this temporary "scored pause" (which we are using `GamePhase.PAUSED` for), the main game loop should not process physics or input.

          - Modify the start of the game loop:

            ```typescript
            if (currentRoomState.phase !== GamePhase.ACTIVE_GAME) {
              // If paused for score, still send updates so score is visible, but don't run physics
              // If truly paused by player, also don't run physics.
              // If game over, maybe stop loop or stop sending updates.
              // For now, a simple check:
              // if (currentRoomState.phase === GamePhase.PAUSED_BY_SCORE) { /* send update */ } else { return; }
              // For now, just make sure the setTimeout changes it back to ACTIVE_GAME
              // and the main loop doesn't run physics if not ACTIVE_GAME
              return; // This will stop physics updates when not ACTIVE_GAME
            }
            // ... rest of physics logic ...
            ```

            A better approach for the "pause after score" might be a dedicated sub-state or flag that the game loop respects, allowing `gameStateUpdate` to continue broadcasting (so scores are seen) but skipping physics. For now, using `GamePhase.PAUSED` and having the `setTimeout` switch it back to `ACTIVE_GAME` is a simpler start. The `return` above if not `ACTIVE_GAME` will stop updates. This needs refinement.

            Let's refine the pause after score:
            Instead of `currentRoomState.phase = GamePhase.PAUSED;`, let's introduce `currentRoomState.isPausedAfterScore = true;`.
            The game loop will check `if (currentRoomState.isPausedAfterScore) { /* do nothing for physics */ }`.
            The `setTimeout` will set `roomForReset.isPausedAfterScore = false;` and then reset ball/paddles and set velocities. The `phase` remains `ACTIVE_GAME` throughout this score-pause.

            Revised logic for score:

            ```typescript
            if (scorer) {
              // ... update score ...
              // ... log score ...
              // ... check for game over (log only for now) ...

              currentRoomState.isPausedAfterScore = true; // Add this boolean to RoomState
              // Send one immediate update with new scores
              io.to(roomId).emit("gameStateUpdate", {
                /* ... state ... */
              });

              setTimeout(() => {
                const roomForReset = rooms.get(roomId);
                if (!roomForReset || roomForReset.phase === GamePhase.GAME_OVER)
                  return;

                roomForReset.isPausedAfterScore = false;
                // ... reset ball position, speed, paddles ...
                // ... set new ball.vx, ball.vy for serve ...
                // No need to emit here, next game loop tick will send the reset state.
              }, gameConstants.GAME_PAUSE_AFTER_SCORE_MS);
            }
            ```

            And in the game loop, at the beginning:

            ```typescript
            if (
              currentRoomState.phase !== GamePhase.ACTIVE_GAME ||
              currentRoomState.isPausedAfterScore
            ) {
              // Still emit gameStateUpdate if isPausedAfterScore so clients see static scene with new score
              if (currentRoomState.isPausedAfterScore) {
                io.to(roomId).emit("gameStateUpdate", {
                  /* ... current static state ... */
                });
              }
              return; // Skip physics updates
            }
            // ... rest of physics logic ...
            ```

            Add `isPausedAfterScore: boolean;` to `RoomState` interface, initialize to `false`.

3.  Frontend `MainGameScene` should already be updating scores from `gameStateUpdate`.

Testing:

1.  Backend and Frontend running.
2.  Play the game. Let one player score.
3.  Verify:
    - The score updates correctly on both clients.
    - The game pauses visually (ball and paddles stop moving) for ~1.5 seconds.
    - After the pause, the ball resets to the center.
    - Paddles reset to their center vertical positions.
    - The player who was scored _against_ serves the next ball. The ball should move towards their side initially.
    - Ball speed resets to `INITIAL_BALL_SPEED` for the serve.
4.  Continue playing until one player reaches `MAX_SCORE - 1`. Score another point.
    - Observe the console log for "Game Over!" (actual game over handling is next).
    - For now, the game should reset and continue after this point too.

Prompt 15: Backend - Game Over Condition and Event Emission

Goal: Implement the server-side logic to detect when a player reaches MAX_SCORE, stop the game for that room, and notify clients.

Files to Modify:

- `src/server.ts`
- `src/shared/types.ts` (define `gameOver` S2C event payload, ensure `GamePhase.GAME_OVER` exists)

Tasks:

1.  In `src/shared/types.ts`:
    - Ensure `GamePhase` enum includes `GAME_OVER`. (Already defined in Prompt 1).
    - Define the Server-to-Client event payload for `gameOver`:
      `type GameOverPayload = { winnerName: string, finalScore1: number, finalScore2: number };` (or `winnerId: string` if names might not be unique or if client prefers ID). Let's use `winnerName` as per spec, assuming names are available and suitable for display.
2.  In `src/server.ts`:

    - Create or ensure the existence of the `stopGameLoop(roomId: string)` function from Prompt 8, which clears `room.gameLoopIntervalId` and sets it to `null`.
    - Modify the scoring logic within the `startGameLoop`'s `setInterval` callback (from Prompt 14, where a score is detected):

      - After a score is updated (`scoringPlayer.score++;`):
      - Check if the `scoringPlayer`'s score has reached `gameConstants.MAX_SCORE`:

        ```typescript
        if (scoringPlayer && scoringPlayer.score >= gameConstants.MAX_SCORE) {
          console.log(
            `Game Over! Winner: ${scoringPlayer.name} in room ${roomId}`
          );
          currentRoomState.phase = GamePhase.GAME_OVER;
          stopGameLoop(roomId); // Stop the game loop for this room

          // Determine final scores for the payload
          const player1 = Object.values(currentRoomState.players).find(
            (p) => p.side === "left"
          );
          const player2 = Object.values(currentRoomState.players).find(
            (p) => p.side === "right"
          );

          io.to(roomId).emit("gameOver", {
            winnerName: scoringPlayer.name,
            finalScore1: player1 ? player1.score : 0,
            finalScore2: player2 ? player2.score : 0,
          });

          // No more ball reset or pause logic after game over, so return or ensure this block bypasses that.
          // The 'isPausedAfterScore' logic and its setTimeout should not run if game is over.
          // One way is to simply return after emitting 'gameOver'.
          return; // Exit the current tick processing for this room.
        }
        // ... existing logic for isPausedAfterScore and setTimeout for ball reset (if game is NOT over) ...
        // Ensure this subsequent logic is skipped if game over was triggered.
        // For example, wrap the isPausedAfterScore and setTimeout in an 'else' block for the game over condition.
        else {
          // This is the existing "point scored, but game not over" logic
          currentRoomState.isPausedAfterScore = true;
          io.to(roomId).emit("gameStateUpdate", {
            /* ... state ... */
          }); // Immediate update for score

          setTimeout(() => {
            const roomForReset = rooms.get(roomId);
            // CRITICAL: Check if game became over while waiting for this timeout
            if (!roomForReset || roomForReset.phase === GamePhase.GAME_OVER)
              return;

            roomForReset.isPausedAfterScore = false;
            // ... reset ball position, speed, paddles ...
            // ... set new ball.vx, ball.vy for serve ...
          }, gameConstants.GAME_PAUSE_AFTER_SCORE_MS);
        }
        ```

    - In the main game loop `setInterval` function, at the very beginning, if `currentRoomState.phase === GamePhase.GAME_OVER`, you might also want to `return;` to ensure no further processing or `gameStateUpdate` events are sent for a room that has concluded, beyond the `gameOver` event. (Or the `stopGameLoop` handles this by clearing the interval).

Testing:

1.  Backend and Frontend from previous prompts running.
2.  Play the game until one player is about to win (e.g., score is 4-X, with `MAX_SCORE` being 5).
3.  Let that player score the winning point.
4.  Verify in the server console:
    - "Game Over! Winner: [PlayerName] in room [RoomId]" is logged.
5.  Using a WebSocket monitoring tool (or frontend console if you add a listener):
    - Verify a `gameOver` event is emitted to all clients in that room with the correct `winnerName` and `finalScore1`, `finalScore2`.
6.  Verify that `gameStateUpdate` events stop being sent for that room after the `gameOver` event (because the loop is stopped).
7.  Verify the `isPausedAfterScore` logic (ball reset, etc.) does _not_ occur after the game-winning point.

Prompt 16: Frontend - End Game Screen & Post-Game Options

Goal: Implement the frontend "End Game" screen that appears after a game concludes, showing results and options to rejoin or leave.

Files to Modify/Create:

- `src/App.tsx`
- `src/components/GamePage.tsx` (potentially to hide Phaser canvas or overlay)
- `src/components/EndGameScreen.tsx` (new component)
- `src/socket.ts` (for emitting `leaveRoom`)
- `src/shared/types.ts` (for `GameOverPayload`)

Tasks:

1.  In `src/App.tsx`:
    - Add new state variables:
      - `gameOverData: GameOverPayload | null = null;`
    - Update `currentPage` state in `App.tsx` to include `'endgame'`.
    - Add a Socket.IO event listener for `gameOver`:
      ```typescript
      socket.on("gameOver", (data: GameOverPayload) => {
        console.log("Game Over received:", data);
        setGameOverData(data);
        setCurrentPage("endgame");
        // Potentially clear other game-specific state like ballState, playerStates if they are not needed on end screen
        // Or keep them if EndGameScreen wants to display final detailed state. For now, gameOverData is primary.
      });
      ```
2.  Create `src/components/EndGameScreen.tsx`:
    - Props: `gameOverData: GameOverPayload`, `onRejoinRoom: () => void`, `onLeaveRoom: () => void`, `ownPlayerName: string | null` (to determine win/loss message for the current player).
    - Display win/loss message:
      - If `props.gameOverData.winnerName === props.ownPlayerName`, display "You Won!".
      - Else, display "You Lost!". (Need `ownPlayerName` which can be derived from `ownSocketId` and `playerStates` in `App.tsx` and passed down).
    - Display final score: e.g., `Final Score: ${props.gameOverData.finalScore1} - ${props.gameOverData.finalScore2}`.
    - Display "Rejoin Room" button. On click, it should call `props.onRejoinRoom()`.
    - Display "Leave Room" button. On click, it should call `props.onLeaveRoom()`.
3.  In `src/App.tsx`:
    - Add `ownPlayerName` state, set when player joins (from their input).
    - Define `handleRejoinRoom` function:
      - It needs `currentRoomId` and `ownPlayerName` (which should still be in `App.tsx`'s state).
      - `console.log(\`Attempting to rejoin room: ${currentRoomId}\`);`
      - `socket.emit('joinRoom', { roomNumber: currentRoomId!, playerName: ownPlayerName! });`
      - `setCurrentPage('welcome'); // Or directly to 'game' if join is successful immediately. Welcome might be safer to handle roomFull again.`
      - `setGameOverData(null);` // Clear game over state
      - The existing `roomJoined` and `roomFull` listeners in `App.tsx` will handle the server's response, potentially transitioning to 'game' or showing an error on 'welcome'.
    - Define `handleLeaveRoom` function:
      - `console.log('Leaving room');`
      - `socket.emit('leaveRoom', {});` (Server needs to handle this event).
      - `setCurrentRoomId(null);`
      - `setPlayerSide(null);`
      - `setOpponentName(null);`
      - `setPlayerStates(null);`
      - `setBallState(null);`
      - `setGameOverData(null);`
      - `setCurrentPage('welcome');`
    - Modify `App.tsx`'s render logic:
      - If `currentPage === 'endgame' && gameOverData`, render `<EndGameScreen gameOverData={gameOverData} onRejoinRoom={handleRejoinRoom} onLeaveRoom={handleLeaveRoom} ownPlayerName={ownPlayerName} />`.
      - Ensure that when transitioning to `'endgame'`, the `GamePage` (and its Phaser canvas) is either unmounted or hidden, so it doesn't interfere or continue trying to render. Unmounting `GamePage` is cleaner.
4.  Backend `src/server.ts`: Add `leaveRoom` handler.
    - `socket.on('leaveRoom', () => { ... });`
      - Find the room the player is in using `socket.rooms` or a custom tracking map.
      - Remove the player from `room.players`.
      - `socket.leave(roomId);`
      - `console.log(\`Player ${socket.id} left room ${roomId}\`);`
      - If the room becomes empty: `if (Object.keys(room.players).length === 0) { rooms.delete(roomId); console.log(\`Room ${roomId} is empty and deleted.\`); }`
      - If one player leaves from a 2-player room (not game over yet, e.g. from a future disconnect feature): notify the other player. (This is more for general disconnection, `leaveRoom` from end screen implies game is over for both).

Testing (Manual):

1.  Backend (Prompt 15) and Frontend running.
2.  Play a full game until one player wins.
3.  Verify both clients transition to the "End Game" screen.
4.  Verify the correct win/loss message is displayed for each player.
5.  Verify the final score is displayed correctly.
6.  Test "Leave Room" button:
    - Click it. Player should be returned to the Welcome Screen.
    - Server should log player leaving and potentially the room being deleted if empty.
7.  Test "Rejoin Room" button:
    - Click it. Player should attempt to rejoin the _same_ room.
    - If the other player also left, they'll enter the "Waiting for opponent" state in the game scene.
    - If the other player also rejoins, they can start a new game via the Ready mechanism.
    - If the room was taken by others (simulate by quickly joining with new clients), the rejoining player should see "Room is full" on the Welcome Screen.
8.  Ensure the Phaser canvas/GamePage is not visible or active when the EndGameScreen is shown.

Prompt 17: Backend - Game Pause/Resume Logic

Goal: Implement the server-side logic for allowing players to pause and resume an active game using the 'toggleReady' mechanism.

Files to Modify:

- `src/server.ts`
- `src/shared/types.ts` (ensure `GamePhase.PAUSED` is defined, and `PlayerState.isReady` is used)

Tasks:

1.  In `src/server.ts`, modify the existing `socket.on('toggleReady', () => { ... })` handler:
    - This handler currently manages the ready-up sequence before game start. We need to extend it for in-game pausing.
    - **Current structure (simplified):**
      ```typescript
      // ...
      // if (room.phase === GamePhase.READY_CHECK) {
      //     player.isReady = !player.isReady;
      //     // ... broadcast playerReadyStateUpdate
      //     // ... check if both ready, then startGame
      // }
      // ...
      ```
    - **New Logic to Add:**
      - After finding `room` and `player`:
      - **If `room.phase === GamePhase.ACTIVE_GAME`:**
        - The player clicking `toggleReady` is initiating a pause.
        - Set this `player.isReady = false;` (signifying they are "un-ready" to continue immediately, thus pausing).
        - Set `room.phase = GamePhase.PAUSED;`
        - `console.log(\`Player ${player.name} paused the game in room ${room.id}.\`);`
        - Broadcast `playerReadyStateUpdate` to the room: `io.to(room.id).emit('playerReadyStateUpdate', { playerId: socket.id, isReady: player.isReady });`
        - Also, immediately broadcast the new game phase: `io.to(room.id).emit('gameStateUpdate', { /* ... current ball, paddles, scores ... */, phase: room.phase });`
      - **Else if `room.phase === GamePhase.PAUSED`:**
        - The game is already paused. A player clicking `toggleReady` is attempting to resume.
        - Only the player who _did not_ initiate the pause (i.e., whose `isReady` is still `true`) can effectively make both players ready again by clicking.
        - Or, a simpler rule: if _any_ player in a paused game clicks `toggleReady`, set _their_ `isReady` to `true`. Then check if _both_ players are now `isReady`.
        - Let's go with the simpler rule for now: the player clicking `toggleReady` signals their readiness to resume.
        - `player.isReady = true;`
        - `console.log(\`Player ${player.name} in room ${room.id} indicated readiness to resume. Current ready states: P1=${room.players[p1Id]?.isReady}, P2=${room.players[p2Id]?.isReady}\`);`
        - Broadcast `playerReadyStateUpdate` for this player: `io.to(room.id).emit('playerReadyStateUpdate', { playerId: socket.id, isReady: player.isReady });`
        - Check if _all_ players in the room now have `isReady === true`.
          - `const playersInRoom = Object.values(room.players);`
          - `const allReadyToResume = playersInRoom.length === 2 && playersInRoom.every(p => p.isReady);`
          - If `allReadyToResume`:
            - `room.phase = GamePhase.ACTIVE_GAME;`
            - `console.log(\`Game resumed in room ${room.id}.\`);`
            - Reset `isReady` for both players to `true` (though they should be already if `allReadyToResume` is true, this is a safeguard or could be where the other player's `isReady` is set if the rule was "pauser becomes unready, other becomes ready to resume"). For clarity, ensure both are true.
              Object.values(room.players).forEach(p => p.isReady = true);
            - Broadcast the game resumption: `io.to(room.id).emit('gameStateUpdate', { /* ... current ball, paddles, scores ... */, phase: room.phase });`
            - Also send a final `playerReadyStateUpdate` for both if necessary, to ensure client buttons are green. (The `gameStateUpdate` might be enough if clients derive button state from phase and individual `isReady` states).
2.  In the `startGameLoop` function's `setInterval` callback in `src/server.ts`:

    - The existing check `if (currentRoomState.phase !== GamePhase.ACTIVE_GAME || currentRoomState.isPausedAfterScore)` needs to correctly handle `GamePhase.PAUSED`.
    - If `currentRoomState.phase === GamePhase.PAUSED` (and not `isPausedAfterScore`), the game physics (ball movement, paddle movement processing) should NOT run.
    - However, `gameStateUpdate` events _should still be sent_ if you want the client to remain synchronized with the static paused state (e.g., if a player disconnects during pause, the other client needs to know). Or, you might choose to send fewer updates during pause. For simplicity, the current structure where it returns if not `ACTIVE_GAME` effectively stops physics and new updates for those specific elements.
    - Let's refine the game loop condition slightly:

      ```typescript
      // Inside setInterval in startGameLoop
      const currentRoomState = rooms.get(roomId);
      if (!currentRoomState) {
        /* clear interval, return */
      }

      if (currentRoomState.phase === GamePhase.GAME_OVER) {
        // stopGameLoop(roomId) should have already been called, but as a safeguard:
        // clearInterval(currentRoomState.gameLoopIntervalId!); currentRoomState.gameLoopIntervalId = null;
        return;
      }

      if (currentRoomState.isPausedAfterScore) {
        io.to(roomId).emit("gameStateUpdate", {
          /* payload with current scores, ball, paddles, phase */
        });
        return; // Skip physics, wait for timeout to resume
      }

      if (currentRoomState.phase === GamePhase.PAUSED) {
        // Optionally, emit a heartbeat gameStateUpdate to keep clients synced on the PAUSED phase,
        // or if any non-physics related state might change (e.g. a player disconnects).
        // For now, we can assume no state changes during player-initiated pause other than phase itself,
        // which was broadcast when pause initiated. So, doing nothing further here is fine.
        // The game will resume when players toggle ready again.
        // If gameStateUpdate is still sent, ensure it has the PAUSED phase.
        io.to(roomId).emit("gameStateUpdate", {
          /* payload with current scores, ball, paddles, phase */ phase:
            GamePhase.PAUSED,
        });
        return; // Skip physics
      }

      // If phase is ACTIVE_GAME and not isPausedAfterScore:
      // ... existing physics logic (paddle input processing, ball movement, collisions, scoring) ...
      // ... then emit gameStateUpdate with ACTIVE_GAME phase ...
      ```

Testing (Manual, using WebSocket tool if frontend not ready, or with frontend after next prompt):

1.  Two clients join, start a game. Game is `ACTIVE_GAME`.
2.  Client 1 sends `toggleReady`.
    - Server logs: Player 1 paused. Room phase becomes `PAUSED`. Player 1 `isReady` becomes `false`.
    - Server emits `playerReadyStateUpdate` for Player 1.
    - Server emits `gameStateUpdate` with `phase: GamePhase.PAUSED`.
    - (If game loop is checked) Physics updates should halt.
3.  Client 2 sends `toggleReady`.
    - Server logs: Player 2 ready to resume. Player 2 `isReady` becomes `true`.
    - Server emits `playerReadyStateUpdate` for Player 2.
    - Server checks: Player 1 `isReady` is `false`, Player 2 `isReady` is `true`. Not all ready. Game remains `PAUSED`.
4.  Client 1 sends `toggleReady` again.
    - Server logs: Player 1 ready to resume. Player 1 `isReady` becomes `true`.
    - Server emits `playerReadyStateUpdate` for Player 1.
    - Server checks: Player 1 `isReady` is `true`, Player 2 `isReady` is `true`. All ready!
    - Server logs: Game resumed. Room phase becomes `ACTIVE_GAME`. Both players `isReady` true.
    - Server emits `gameStateUpdate` with `phase: GamePhase.ACTIVE_GAME`.
    - Physics updates should resume in the game loop.

Prompt 18: Frontend - Game Pause/Resume UI & Interaction

Goal: Update the frontend to reflect the paused game state, modify the "Ready" button behavior for pausing/resuming, and prevent paddle input during pause.

Files to Modify:

- `src/phaser/scenes/MainGameScene.ts`
- `src/App.tsx` (to correctly pass `gamePhase` and `playerStates` which include `isReady`)

Tasks:

1.  In `src/phaser/scenes/MainGameScene.ts`:

    - The `drawReadyButton()` method (from Prompt 7) already has logic for button text/color based on `gamePhase` and `player.isReady`. We need to ensure it correctly handles the new pause scenarios:

      ```typescript
      // Inside drawReadyButton() in MainGameScene.ts
      // ... (get me = this.playerStates[this.ownSocketId], and otherPlayer) ...

      if (this.gamePhase === GamePhase.READY_CHECK) {
        buttonText = "READY";
        buttonColor = me.isReady ? "#FFFF00" : "#FF0000"; // Yellow if I'm ready, Red if not
      } else if (this.gamePhase === GamePhase.ACTIVE_GAME) {
        buttonText = "PAUSE"; // Or keep as "READY (PAUSE)"
        buttonColor = "#00FF00"; // Green
      } else if (this.gamePhase === GamePhase.PAUSED) {
        // Find out who paused. The player whose isReady is false initiated the pause.
        const pauser = Object.values(this.playerStates || {}).find(
          (p) => !p.isReady
        );
        if (me.isReady) {
          // I am ready to resume (I didn't pause, or I've clicked to unpause myself)
          buttonText = "RESUME";
          buttonColor = "#00FF00"; // Green, I'm ready to go
        } else {
          // I am not ready (I paused, or I haven't clicked to resume yet)
          buttonText = "RESUME"; // Or "UNPAUSE"
          buttonColor = "#FFFF00"; // Yellow, I need to click this to signal I'm ready
        }
      }
      // ... (create/update button text and color) ...
      ```

      The spec says:

      - Pauser's button (who clicked when active) turns yellow.
      - Other player's button remains green.
      - Game resumes when other player (green button) clicks theirs. Both turn green.

      Revised `drawReadyButton()` logic for `PAUSED` state, based on spec:

      ```typescript
      // ...
      } else if (this.gamePhase === GamePhase.PAUSED) {
          const localPlayer = this.playerStates?.[this.ownSocketId!];
          if (localPlayer) {
              if (!localPlayer.isReady) { // This player initiated the pause (their isReady is false)
                  buttonText = "PAUSED BY YOU"; // Or "READY (YELLOW)"
                  buttonColor = '#FFFF00'; // Yellow
              } else { // This player is waiting for the other to unpause, or for themselves to click to resume if they are the 'other' player
                  buttonText = "RESUME GAME"; // Or "READY (GREEN)"
                  buttonColor = '#00FF00'; // Green
              }
          }
      }
      // ...
      ```

      This logic needs to be consistent with how the server sets `isReady` flags during pause. If server sets pauser `isReady=false` and other `isReady=true`:

      - Pauser (sees `!localPlayer.isReady`): Button Yellow "PAUSED"
      - Other Player (sees `localPlayer.isReady`): Button Green "RESUME"
      - When Other Player clicks, server sets both `isReady=true`, phase `ACTIVE_GAME`. Both buttons Green "PAUSE". This matches spec.

    - In the `update()` method (or input handlers in `create()`) where `playerInput` is emitted:
      - Add a check: `if (this.gamePhase !== GamePhase.ACTIVE_GAME) return;` at the beginning of the input processing logic. This will prevent `playerInput` events from being sent if the game is not active (e.g., paused, ready_check, game_over).
    - Visual feedback for pause:
      - The game elements (ball, paddles) should naturally freeze because their positions are only updated in `updateGameDisplay` based on `gameStateUpdate` from the server. If the server stops sending updates for these elements or sends static positions during pause, the visuals will reflect that.
      - Optionally, you could display a "PAUSED" message overlay in the center of the screen when `this.gamePhase === GamePhase.PAUSED`.
        ```typescript
        // In updateGameDisplay or a new method
        if (this.pausedText) this.pausedText.destroy();
        if (gamePhase === GamePhase.PAUSED) {
          this.pausedText = this.add
            .text(
              this.game.config.width / 2,
              this.game.config.height / 2,
              "PAUSED",
              { fontSize: "48px", fill: "#FFF" }
            )
            .setOrigin(0.5);
        }
        ```
        (Declare `private pausedText: Phaser.GameObjects.Text | null = null;`)

2.  In `src/App.tsx`:
    - Ensure `gamePhase` and `playerStates` (which contains `isReady` for each player) are correctly updated from `gameStateUpdate` and `playerReadyStateUpdate` events.
    - Ensure these props are consistently passed down to `GamePage` and then to `MainGameScene` (likely via registry or a scene update method). This was covered in Prompt 7 and 9, just re-verify its correctness for pause state changes.

Testing (Manual):

1.  Backend (Prompt 17) and Frontend running.
2.  Two players join, start a game. Buttons are green ("PAUSE" or "READY (PAUSE)").
3.  Player 1 clicks their green button.
    - Player 1's button should turn yellow (e.g., "PAUSED BY YOU" or similar).
    - Player 2's button should remain green (e.g., "RESUME GAME").
    - Game action (ball, paddle movement) should freeze on both screens.
    - A "PAUSED" message might appear.
    - Trying to move paddles should have no effect (no `playerInput` sent).
4.  Player 2 clicks their green button.
    - Both players' buttons should turn green again.
    - The "PAUSED" message should disappear.
    - Game action should resume from where it left off.
    - Paddles should become responsive again.
5.  Test variations:
    - Player 1 pauses. Player 1 tries to click their yellow button again. (Current server logic: this would make P1 `isReady=true`, game remains paused until P2 also clicks. Button for P1 turns green. P2 button still green. Then if P2 clicks, game resumes). This is slightly different from "only other player can resume" but simpler. Ensure UI matches this behavior.
    - What if Player 2 (green button) clicks first to pause? Symmetric behavior should occur.
