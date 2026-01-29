import 'dotenv/config.js';
import { createClient } from 'redis';
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

// --- Redis Client Setup ---
let redisClient;
const SESSION_EXPIRY = 3600 * 24; // 24 Hours

(async () => {
    redisClient = createClient({
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
        socket: {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT
        }
    });

    redisClient.on('error', (err) => console.error('Redis Client Error', err));

    try {
        await redisClient.connect();
        console.log('Successfully connected to Redis!');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
    }
})();

// Route to test Redis connection
app.get('/test-redis', async (req, res) => {
    if (!redisClient || !redisClient.isReady) {
        return res.status(500).json({ error: 'Redis client is not connected.' });
    }
    try {
        const testKey = 'test-key';
        const testValue = 'Hello Redis!';
        await redisClient.set(testKey, testValue, { EX: 10 }); // Set with 10s expiry
        const value = await redisClient.get(testKey);
        res.json({ status: 'success', value });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * We only save the "Truth" - the balance.
 * If you have a Free Spin session that persists across refreshes, 
 * you would save that state here too.
 */
async function savePlayerState(sessionId, credits) {
    const data = JSON.stringify({ credits });
    await redisClient.set(`slot_ptr_${sessionId}`, data, { EX: SESSION_EXPIRY });
}

async function getPlayerState(sessionId) {
    const data = await redisClient.get(`slot_ptr_${sessionId}`);
    return data ? JSON.parse(data) : null;
}



//console.log(runFreeGamesSimulation(1, 20));
app.get('/', (req, res)=>{
    res.json('Live server');
})

app.post('/start-session', async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'User ID is required to start a session.' 
        });
    }

    let initialUserBalance;
    try {
        const userApiUrl = `http://jadurtaka.bdflc.org/api/user_by_id/${userId}`;
        const response = await fetch(userApiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const userData = await response.json();
        if (userData.status === 'success' && userData.data && userData.data.balance) {
            initialUserBalance = parseFloat(userData.data.balance);
        } else {
            throw new Error('Could not retrieve user balance');
        }
    } catch (error) {
        //console.error('Error fetching user balance:', error);
        return res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch user' 
        });
    }

    const sessionId = uuidv4(); // Generate a unique ID
    const { session, serializer } = createGameSession();

    session.setCreditsAmount(initialUserBalance);
    await savePlayerState(sessionId, session.getCreditsAmount());

    console.log(`New Redis-backed session for userId ${userId}: ${sessionId}`);

    const initialData = serializer.getInitialData(session);
    res.json({ 
        status: 'success', 
        message: 'Session started successfully.',
        data: { sessionId, ...initialData }
    });
});

app.post('/spin', async (req, res) => { // Made the function async
    
    
    const { bet, sessionId } = req.body; // Client must send their sessionId
    const state = await getPlayerState(sessionId);
    if (!sessionId || !state) {
        return res.status(400).json({ error: 'Invalid or missing sessionId' });
    }
    if (!bet) {
        return res.status(400).json({ error: 'Bet amount is required' });
    }

    try {
        await lock.acquire(sessionId, async () => {

            const { session: userSession, serializer: userSessionSerializer } = createGameSession();

            // Re-hydrate: Inject the balance from Redis into the Pokie object
            userSession.setCreditsAmount(state.credits);

            // Validate Balance
            if (userSession.getCreditsAmount() < bet) {
                return res.status(400).json({ error: 'Insufficient credits' });
            }

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
                freeGamesResult = runFreeGamesSimulation(baseCredit, bet, 5);
                baseCredit += freeGamesResult.freeGamesTotalWin
                userSession.setCreditsAmount(baseCredit)
            }
            if (roundData.winningScatters && roundData.winningScatters.Scatter2) {
                // If Scatter1 wins, trigger the free games simulation and return its results
                console.log('Special scatter2........');
            }



            // Persist the NEW balance back to Redis
            await savePlayerState(sessionId, userSession.getCreditsAmount());
            const responseData = { ...roundData, totalWin, freeGamesResult }
            
            res.json(responseData);
        }, { timeout: 0 });
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
