import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid'; // Import uuid
import { createGameSession } from './src/games/simple-slot/slot5_4_reels.js'; // Import the factory
import { runFreeGamesSimulation } from './src/games/simple-slot/free-game-config.js';
import AsyncLock from 'async-lock'; // Added import for async-lock

const app = express();
app.use(express.json());
app.use(cors());

const lock = new AsyncLock(); // Created an instance of AsyncLock

//console.log(runFreeGamesSimulation(1, 20));


let activeSessions = {}; // Changed from [] to {}

app.get('/', (req, res)=>{
    res.json('Live server');
})

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

app.post('/spin', async (req, res) => { // Made the function async
    
    
    const { bet, sessionId } = req.body; // Client must send their sessionId

    if (!sessionId || !activeSessions[sessionId]) {
        return res.status(400).json({ error: 'Invalid or missing sessionId' });
    }
    if (!bet) {
        return res.status(400).json({ error: 'Bet amount is required' });
    }

    try {
        await lock.acquire(sessionId, async () => { // Acquired lock using sessionId
            // Retrieve the correct session and serializer for this user
            const { session: userSession, serializer: userSessionSerializer } = activeSessions[sessionId];

            userSession.setBet(bet);
            userSession.play();
            const roundData = userSessionSerializer.getRoundData(userSession);
            let totalWin = 0;
            if (roundData.winningLines && Object.values(roundData.winningLines).length > 0) {
                totalWin += Object.values(roundData.winningLines).reduce((sum, line) => sum + line.winAmount, 0);
            }
            if (roundData.winningScatters && Object.values(roundData.winningScatters).length > 0) {
                totalWin += Object.values(roundData.winningScatters).reduce((sum, scatter) => sum + scatter.winAmount, 0);
            }


            // Check if Scatter1 has a win
            let freeGamesResult = null;
            if (roundData.winningScatters && roundData.winningScatters.Scatter1) {
                // If Scatter1 wins, trigger the free games simulation and return its results
                let baseCredit = userSession.getCreditsAmount();
                freeGamesResult = runFreeGamesSimulation(baseCredit, bet, 10);
                baseCredit += freeGamesResult.freeGamesTotalWin
                userSession.setCreditsAmount(baseCredit)
            }
            if (roundData.winningScatters && roundData.winningScatters.Scatter2) {
                // If Scatter1 wins, trigger the free games simulation and return its results
                console.log('Special scatter2........');
            }
            const responseData = { ...roundData, totalWin, freeGamesResult }
            
            res.json(responseData);
        });
    }
    catch (error) {
        // Errors from within the async block passed to acquire will be caught here.
        res.status(500).json({ error: error.message });
    }

});



const port = process.env.PORT || 3000

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
