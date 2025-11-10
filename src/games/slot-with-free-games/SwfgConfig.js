import { LeftToRightLinesPatterns, LinesDefinitionsFor5x3, Paytable, ScatteredLinesPatterns, SymbolsSequence, VideoSlotWithFreeGamesConfig, } from "pokie";
export class SwfgConfig extends VideoSlotWithFreeGamesConfig {
    constructor() {
        super();
        this.freeGamesMode = false;
        this.setCreditsAmount(10000);
        const pt = new Paytable(this.getAvailableBets(), this.getAvailableSymbols(), this.getWildSymbols(), this.getReelsNumber());
        this.getAvailableSymbols()
            .filter((symbol) => !this.isSymbolWild(symbol))
            .forEach((symbol) => {
            pt.setPayoutForSymbol(symbol, 2, 1);
            pt.setPayoutForSymbol(symbol, 3, 2);
            pt.setPayoutForSymbol(symbol, 4, 3);
            pt.setPayoutForSymbol(symbol, 5, 4);
        });
        this.setPaytable(pt);
        this.normalPatterns = new LeftToRightLinesPatterns(this.getReelsNumber(), 2);
        this.freeGamesPatterns = new ScatteredLinesPatterns(this.getReelsNumber(), 2);
        this.setLinesDefinitions(new LinesDefinitionsFor5x3());
        this.normalSequences = super
            .getSymbolsSequences()
            .map((sequence) => new SymbolsSequence().fromArray(sequence.toArray()));
        this.freeGamesSequences = super
            .getSymbolsSequences()
            .map((sequence) => new SymbolsSequence().fromArray(sequence.toArray()).removeAllSymbols(this.getScatterSymbols()[0]));
    }
    setFreeGamesMode(value) {
        this.freeGamesMode = value;
    }
    isFreeGamesMode() {
        return this.freeGamesMode;
    }
    getSymbolsSequences() {
        if (this.freeGamesMode) {
            return this.freeGamesSequences;
        }
        else {
            return this.normalSequences;
        }
    }
    getLinesPatterns() {
        if (this.freeGamesMode) {
            return this.freeGamesPatterns;
        }
        else {
            return this.normalPatterns;
        }
    }
}
