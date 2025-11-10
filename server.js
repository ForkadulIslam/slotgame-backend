import express from 'express';
import cors from 'cors';
import { customGameSession, customGameSessionSerializer } from './src/games/simple-slot/reference_use_5x4.js';
const app = express();
app.use(express.json());
app.use(cors());
app.get('/initial-session', (req, res) => {
    const initialData = customGameSessionSerializer.getInitialData(customGameSession);
    res.json(initialData);
});
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
        const responseData = { ...roundData, totalWin };
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
