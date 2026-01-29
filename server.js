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
async function savePlayerState(sessionId, stateObject) {
    await redisClient.set(`slot_ptr_${sessionId}`, JSON.stringify(stateObject), { EX: SESSION_EXPIRY });
}

async function getPlayerState(sessionId) {
    const data = await redisClient.get(`slot_ptr_${sessionId}`);
    return data ? JSON.parse(data) : null;
}

async function deletePlayerState(sessionId) {
    await redisClient.del(`slot_ptr_${sessionId}`);
}

async function setUserSessionId(userId, sessionId) {
    await redisClient.set(`user_session:${userId}`, sessionId, { EX: SESSION_EXPIRY });
}

async function getUserSessionId(userId) {
    return await redisClient.get(`user_session:${userId}`);
}

async function deleteUserSessionMapping(userId) {
    await redisClient.del(`user_session:${userId}`);
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

    // Invalidate any existing session for this user
    const oldSessionId = await getUserSessionId(userId);
    if (oldSessionId) {
        await deletePlayerState(oldSessionId);
        await deleteUserSessionMapping(userId);
        console.log(`Invalidated old session ${oldSessionId} for user ${userId}`);
    }

    let initialUserBalance;
    try {
        const userApiUrl = `http://jadurtaka.test/api/user_by_id/${userId}`;
        const response = await fetch(userApiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const userData = await response.json();
        if (userData.status === 'success' && userData.data && userData.data.balance) {
            initialUserBalance = parseFloat(userData.data.balance);
        } else {
            throw new Error('Could not retrieve user balance from the external API.');
        }
    } catch (error) {
        console.error('Error fetching user balance:', error);
        return res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch user balance from the external API.' 
        });
    }

    const sessionId = uuidv4(); // Generate a unique ID
    const { session, serializer } = createGameSession();

    session.setCreditsAmount(initialUserBalance);

    // Create the initial state object with spin_count
    const initialState = {
        //userId: userId, // Added userId to the session state
        credits: session.getCreditsAmount(),
        spin_count: 0,
        booster: {
            active: true,
            multiplier: 1,
            no_of_spin_round: 10,
            uses_left: 15,
            spin_interval: 100
        }
    };

    await savePlayerState(sessionId, initialState);
    await setUserSessionId(userId, sessionId);

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

            // Increment spin count
            state.spin_count++;

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
                // If Scatter1 wins, check for booster conditions
                //console.log(state.booster);
                if (state.booster && state.booster.active && state.booster.uses_left > 0 && state.spin_count > state.booster.spin_interval) {
                    // Booster conditions met, trigger enhanced free games
                    let baseCredit = userSession.getCreditsAmount();
                    freeGamesResult = runFreeGamesSimulation(baseCredit, bet, state.booster.no_of_spin_round, state.booster.multiplier);
                    baseCredit += freeGamesResult.freeGamesTotalWin;
                    userSession.setCreditsAmount(baseCredit);
                    state.booster.uses_left--; // Decrement booster uses
                    state.spin_count = 0; // Reset spin count
                }
            }
            if (roundData.winningScatters && roundData.winningScatters.Scatter2) {
                // If Scatter1 wins, trigger the free games simulation and return its results
            }


            // Update the state object with the new balance
            state.credits = userSession.getCreditsAmount();



            // Persist the NEW, full state object back to Redis
            await savePlayerState(sessionId, state);

            const responseData = {  totalWin, freeGamesResult, spin_count: state.spin_count }
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
