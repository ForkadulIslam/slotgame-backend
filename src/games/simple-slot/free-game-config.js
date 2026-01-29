import {
    CustomLinesDefinitions,
    LinesDefinitionsFor5x4,
    Paytable,
    SymbolsSequence,
    VideoSlotWithFreeGamesConfig,
    VideoSlotWithFreeGamesSession,
    VideoSlotWithFreeGamesSessionSerializer,
    SimulationConfig,
    Simulation,
} from "pokie";

/*
This file defines the configuration and session for a special Free Game mode.
- It uses ScatteredLinesPatterns, so symbols pay anywhere on the line.
- The reels do not contain scatter symbols, preventing re-triggers.
- The paytable has a 2x multiplier on all line wins compared to the base game.
*/

class FreeGameConfig extends VideoSlotWithFreeGamesConfig {

    constructor() {
        super();
        // Basic game setup (mirrors the base game)
        this.setReelsNumber(5);
        this.setReelsSymbolsNumber(4);
        this.setAvailableBets([1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 50]);
        this.setAvailableSymbols(["Ace", "King", "Queen", "Jack", "Ten", "Nine", "Wild"]); // No Scatters
        this.setWildSymbols(["Wild"]);
        //this.setCreditsAmount(Infinity);

        // Use the same line definitions as the base game
        const defaultLinesDefinitions = new LinesDefinitionsFor5x4();
        const customLinesDefinitions = new CustomLinesDefinitions();
        customLinesDefinitions.setLineDefinition("0", defaultLinesDefinitions.getLineDefinition("0"));
        customLinesDefinitions.setLineDefinition("1", defaultLinesDefinitions.getLineDefinition("1"));
        customLinesDefinitions.setLineDefinition("2", defaultLinesDefinitions.getLineDefinition("2"));
        customLinesDefinitions.setLineDefinition("3", defaultLinesDefinitions.getLineDefinition("3"));
        customLinesDefinitions.setLineDefinition("4", defaultLinesDefinitions.getLineDefinition("4"));
        customLinesDefinitions.setLineDefinition("5", defaultLinesDefinitions.getLineDefinition("5"));
        customLinesDefinitions.setLineDefinition("6", defaultLinesDefinitions.getLineDefinition("6"));
        customLinesDefinitions.setLineDefinition("7", defaultLinesDefinitions.getLineDefinition("7"));
        customLinesDefinitions.setLineDefinition("8", defaultLinesDefinitions.getLineDefinition("8"));
        customLinesDefinitions.setLineDefinition("9", defaultLinesDefinitions.getLineDefinition("9"));
        customLinesDefinitions.setLineDefinition("10", defaultLinesDefinitions.getLineDefinition("10"));
        customLinesDefinitions.setLineDefinition("11", defaultLinesDefinitions.getLineDefinition("11"));
        customLinesDefinitions.setLineDefinition("12", [0, 1, 0, 1, 0]);
        customLinesDefinitions.setLineDefinition("13", [1, 2, 1, 2, 1]);
        customLinesDefinitions.setLineDefinition("14", [2, 3, 2, 3, 2]);
        customLinesDefinitions.setLineDefinition("15", [1, 0, 1, 0, 1]);
        customLinesDefinitions.setLineDefinition("16", [2, 1, 2, 1, 2]);
        customLinesDefinitions.setLineDefinition("17", [3, 2, 3, 2, 3]);
        customLinesDefinitions.setLineDefinition("18", [0, 1, 2, 3, 2]);
        customLinesDefinitions.setLineDefinition("19", [3, 2, 1, 0, 1]);
        customLinesDefinitions.setLineDefinition("20", [0, 2, 0, 2, 0]);
        customLinesDefinitions.setLineDefinition("21", [1, 3, 1, 3, 1]);
        customLinesDefinitions.setLineDefinition("22", [1, 0, 0, 0, 1]);
        customLinesDefinitions.setLineDefinition("23", [2, 3, 3, 3, 2]);
        customLinesDefinitions.setLineDefinition("24", [0, 2, 1, 2, 0]);
        this.setLinesDefinitions(customLinesDefinitions);
        //console.log(this.getLinesDefinitions())
        // Use ScatteredLinesPatterns for free games to make them feel different
        //this.setLinesPatterns(new LeftToRightLinesPatterns(this.getReelsNumber()));

        // Create FREE GAME reels (no scatters, more wilds)
        const freeGameSequences = [];
        for (let i = 0; i < this.getReelsNumber(); i++) {
            const sequence = new SymbolsSequence();
            // Note: No "Scatter1" or "Scatter2", and more "Wild" symbols
            sequence.fromNumbersOfSymbols({
                Nine: 5,
                Ten: 5,
                Jack: 4,
                Queen: 4,
                King: 3,
                Ace: 2,
                Wild: 2,
            });
            sequence.shuffle();
            freeGameSequences.push(sequence);
        }
        this.setSymbolsSequences(freeGameSequences);

        // Create a paytable with a 2x multiplier for line wins
        const multiplier = 2;
        const freeGamePaytable = new Paytable(this.getAvailableBets());
        freeGamePaytable.setPayoutForSymbol("Nine", 3, 0.2 * multiplier);
        freeGamePaytable.setPayoutForSymbol("Nine", 4, 0.4 * multiplier);
        freeGamePaytable.setPayoutForSymbol("Nine", 5, 0.8 * multiplier);
        freeGamePaytable.setPayoutForSymbol("Ten", 3, 0.2 * multiplier);
        freeGamePaytable.setPayoutForSymbol("Ten", 4, 0.4 * multiplier);
        freeGamePaytable.setPayoutForSymbol("Ten", 5, 0.8 * multiplier);
        freeGamePaytable.setPayoutForSymbol("Jack", 3, 0.4 * multiplier);
        freeGamePaytable.setPayoutForSymbol("Jack", 4, 0.8 * multiplier);
        freeGamePaytable.setPayoutForSymbol("Jack", 5, 1.5 * multiplier);
        freeGamePaytable.setPayoutForSymbol("Queen", 3, 0.4 * multiplier);
        freeGamePaytable.setPayoutForSymbol("Queen", 4, 0.8 * multiplier);
        freeGamePaytable.setPayoutForSymbol("Queen", 5, 1.5 * multiplier);
        freeGamePaytable.setPayoutForSymbol("King", 3, 0.8 * multiplier);
        freeGamePaytable.setPayoutForSymbol("King", 4, 1.5 * multiplier);
        freeGamePaytable.setPayoutForSymbol("King", 5, 3 * multiplier);
        freeGamePaytable.setPayoutForSymbol("Ace", 3, 1 * multiplier);
        freeGamePaytable.setPayoutForSymbol("Ace", 4, 2 * multiplier);
        freeGamePaytable.setPayoutForSymbol("Ace", 5, 4 * multiplier);


        this.setPaytable(freeGamePaytable);

    }
}



export function runFreeGamesSimulation(credits, bet, numberOfRound=10) {
    const config = new FreeGameConfig();
    const betAmountAdditionForFreeGame = credits+bet*numberOfRound //Credits has been adjusted as the free game should not deduct bet amount
    config.setCreditsAmount(betAmountAdditionForFreeGame); // Ensure simulation doesn't stop due to lack of credits
    const session = new VideoSlotWithFreeGamesSession(config);
    session.setBet(bet);
    const serializer = new VideoSlotWithFreeGamesSessionSerializer();

    const simulationConfig = new SimulationConfig();
    simulationConfig.setNumberOfRounds(numberOfRound); // Number of free spins

    const simulation = new Simulation(session, simulationConfig);

    const allRoundsData = [];
    simulation.afterPlayCallback = () => {
        const roundData = serializer.getRoundData(session);
        allRoundsData.push(roundData);
    };

    simulation.run();
    const totalWin = simulation.getTotalPayoutAmount();
    const totalWinRound = simulation.getNumberOfWinningRounds();
    // Return a structured object with all the free spins data
    console.log('Frespin result:')
    return {
        triggeredFreeGames: true,
        freeGamesSpins: allRoundsData,
        freeGamesTotalWin: totalWin,
        numberOfFreeSpins: numberOfRound,
        totalWinRound
    };
}

