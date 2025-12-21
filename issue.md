# Refactoring to a Session-Based Architecture for Multi-User Support

This guide outlines the necessary steps to convert the current game server from a single, global session model to a robust, session-based architecture capable of handling multiple users concurrently without conflicts.

### The Problem with the Current Approach

The current server uses a single, shared `customGameSession` object for all players. This creates a critical flaw known as a **race condition**. When multiple users make requests at the same time, they will overwrite each other's game state (balance, reel positions, wins), leading to incorrect data and a broken user experience.

### The Solution: Isolated User Sessions

The solution is to provide every user with their own unique and isolated game session. The server will manage these sessions using a unique `sessionId` for each user.

---

## Step 1: Install UUID Package

We need a reliable way to generate unique IDs for each session. The `uuid` package is the industry standard for this.

Open your terminal in the project directory and run the following command:

```bash
npm install uuid
```

---

## Step 2: Modify Game Logic to Export a "Factory" Function

Instead of creating and exporting a single session instance, your game file (`src/games/simple-slot/slot5_4_reels.js`) should export a function that creates a *new* session on demand.

**In `src/games/simple-slot/slot5_4_reels.js`:**

1.  Do not export `customGameSession` and `customGameSessionSerializer` directly.
2.  Instead, create and export a `createGameSession` function that returns a new session and its serializer.

**Example (`slot5_4_reels.js`):**

```javascript
// ... all your config code (config, paytable, sequences) remains the same ...

// REMOVE these lines at the end of the file:
// const session = new VideoSlotSession(config);
// const sessinSerializer =  new VideoSlotSessionSerializer();
// export const customGameSession = session;
// export const customGameSessionSerializer = sessinSerializer;

// ADD this new factory function instead:
export function createGameSession() {
    // 'config' is the VideoSlotConfig object you already defined in this file
    const newSession = new VideoSlotSession(config);
    const newSerializer = new VideoSlotSessionSerializer();
    newSession.setCreditsAmount(1000); // Set initial credits for the new session
    return { session: newSession, serializer: newSerializer };
}
```

---

## Step 3: Implement Session Management in `server.js`

Now, let's modify `server.js` to handle multiple sessions.

1.  **Import necessary modules:** We'll need `uuid` and our new `createGameSession` factory function.
2.  **Create a session store:** A simple in-memory object will work as a store for all active user sessions.

**Example (`server.js`):**

```javascript
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid'; // Import uuid
import { createGameSession } from './src/games/simple-slot/slot5_4_reels.js'; // Import the factory
import { runFreeGamesSimulation } from './src/games/simple-slot/free-game-config.js';

const app = express();
app.use(express.json());
app.use(cors());

// In-memory store for active user sessions
const activeSessions = {};
```

---

## Step 4: Create a `/start-session` Endpoint

Create a new endpoint that clients will call to begin a game. This endpoint will create their session, store it, and give them back their unique `sessionId`.

**Example (`server.js`):**

```javascript
// Add this new endpoint to server.js
app.post('/start-session', (req, res) => {
    const sessionId = uuidv4(); // Generate a unique ID

    // Create a new session using our factory
    const { session, serializer } = createGameSession();

    // Store the new session and its serializer
    activeSessions[sessionId] = { session, serializer };

    console.log(`New session started: ${sessionId}`);

    const initialData = serializer.getInitialData(session);
    res.json({ sessionId, ...initialData });
});
```

---

## Step 5: Update the `/spin` Endpoint

Finally, update the `/spin` endpoint to be session-aware. It will now use the `sessionId` provided by the client to retrieve the correct game instance from the `activeSessions` store.

**Example (`server.js`):**

```javascript
// Replace the old /spin endpoint with this new version
app.post('/spin', (req, res) => {
    const { bet, sessionId } = req.body; // Client must send their sessionId

    if (!sessionId || !activeSessions[sessionId]) {
        return res.status(400).json({ error: 'Invalid or missing sessionId' });
    }
    if (!bet) {
        return res.status(400).json({ error: 'Bet amount is required' });
    }

    // Retrieve the correct session and serializer for this user
    const { session: userSession, serializer: userSessionSerializer } = activeSessions[sessionId];

    try {
        userSession.setBet(bet);
        userSession.play();
        const roundData = userSessionSerializer.getRoundData(userSession);

        // The rest of your logic remains the same, but uses the user-specific session
        let totalWin = 0;
        if (roundData.winningLines && Object.values(roundData.winningLines).length > 0) {
            totalWin += Object.values(roundData.winningLines).reduce((sum, line) => sum + line.winAmount, 0);
        }
        if (roundData.winningScatters && Object.values(roundData.winningScatters).length > 0) {
            totalWin += Object.values(roundData.winningScatters).reduce((sum, scatter) => sum + scatter.winAmount, 0);
        }

        let freeGamesResult = null;
        if (roundData.winningScatters && roundData.winningScatters.Scatter1) {
            let baseCredit = userSession.getCreditsAmount();
            freeGamesResult = runFreeGamesSimulation(bet, 10);
            baseCredit += freeGamesResult.freeGamesTotalWin;
            userSession.setCreditsAmount(baseCredit);
        }

        const responseData = { ...roundData, totalWin, freeGamesResult };
        res.json(responseData);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

---

By following these steps, your server will be correctly architected to handle many users at once, ensuring each player has their own isolated and secure game state.
