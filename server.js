import express from 'express';
import cors from 'cors';
import { customGameSession, customGameSessionSerializer } from './src/games/simple-slot/slot5_4_reels.js';
import { runFreeGamesSimulation } from './src/games/simple-slot/free-game-config.js';
const app = express();
app.use(express.json());
app.use(cors());






// app.get('/initial-session', (req, res) => {
//     const initialData = customGameSessionSerializer.getInitialData(customGameSession);
//     res.json(initialData);
// });
// app.get('/initial-fg-session', (req, res) => {
//     const initialData = freeGameSessionSerializer.getInitialData(freeGameSession);
//     res.json(initialData);
// });
app.post('/spin', (req, res) => {
    
    const bet = req.body.bet;
    if (!bet) {
        return res.status(400).json({ error: 'Bet amount is required' });
    }
    try {
        customGameSession.setBet(bet);
        customGameSession.play();
        const roundData = customGameSessionSerializer.getRoundData(customGameSession);
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
            let baseCredit = customGameSession.getCreditsAmount();
            freeGamesResult = runFreeGamesSimulation(bet, 10);
            baseCredit += freeGamesResult.freeGamesTotalWin
            customGameSession.setCreditsAmount(baseCredit)
        }
        if (roundData.winningScatters && roundData.winningScatters.Scatter2) {
            // If Scatter1 wins, trigger the free games simulation and return its results
            console.log('Special scatter2........');
        }



        const responseData = { ...roundData, totalWin, freeGamesResult };
        res.json(responseData);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }

});



const port = 3000;

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
