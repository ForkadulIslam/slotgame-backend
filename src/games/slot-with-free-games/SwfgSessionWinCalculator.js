import { VideoSlotWinCalculator, WinningLine, WinningScatter, } from "pokie";
export class SwfgSessionWinCalculator extends VideoSlotWinCalculator {
    constructor(config) {
        super(config);
        SwfgSessionWinCalculator.config = config;
    }
    calculateWin(bet, symbolsCombination) {
        super.calculateWin(bet, symbolsCombination);
        if (SwfgSessionWinCalculator.config.isFreeGamesMode()) {
            const originalScatters = super.getWinningScatters();
            this.multipliedScatters = {};
            Object.values(originalScatters).forEach((scatter) => (this.multipliedScatters[scatter.getSymbolId()] = new WinningScatter(scatter.getSymbolId(), scatter.getSymbolsPositions(), scatter.getWinAmount() * 2)));
            const originalLines = super.getWinningLines();
            this.multipliedLines = {};
            Object.values(originalLines).forEach((line) => (this.multipliedLines[line.getLineId()] = new WinningLine(line.getWinAmount() * 2, line.getDefinition(), line.getPattern(), line.getLineId(), line.getSymbolsPositions(), line.getWildSymbolsPositions(), line.getSymbolId())));
        }
        else {
            this.multipliedScatters = undefined;
            this.multipliedLines = undefined;
        }
    }
    getWinningLines() {
        return this.multipliedLines ? this.multipliedLines : super.getWinningLines();
    }
    getWinningScatters() {
        return this.multipliedScatters ? this.multipliedScatters : super.getWinningScatters();
    }
}
