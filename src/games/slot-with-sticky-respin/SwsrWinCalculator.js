import { VideoSlotWinCalculator } from "pokie";
export class SwsrWinCalculator extends VideoSlotWinCalculator {
    calculateWin(bet, symbolsCombination) {
        SwsrWinCalculator.symbolsCombination = symbolsCombination;
        super.calculateWin(bet, symbolsCombination);
    }
    getAllWinningSymbolsPositions() {
        const positions = [];
        Object.values(this.getWinningLines()).forEach((line) => {
            line.getPattern().forEach((flag, x) => {
                const y = line.getDefinition()[x];
                if (flag) {
                    const symbolId = SwsrWinCalculator.symbolsCombination.getSymbols(x)[y];
                    positions.push({
                        x,
                        y,
                        symbolId,
                    });
                }
            });
        });
        Object.values(this.getWinningScatters()).forEach((scatter) => {
            scatter.getSymbolsPositions().forEach(([x, y]) => {
                const symbolId = SwsrWinCalculator.symbolsCombination.getSymbols(x)[y];
                positions.push({
                    x,
                    y,
                    symbolId,
                });
            });
        });
        return positions;
    }
}
