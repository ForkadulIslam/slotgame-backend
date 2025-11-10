import { SymbolsCombination, SymbolsCombinationsGenerator } from "pokie";
export class SwsrCombinationsGenerator extends SymbolsCombinationsGenerator {
    constructor() {
        super(...arguments);
        this.stickySymbolsPositions = [];
    }
    setStickySymbols(value) {
        this.stickySymbolsPositions = value;
    }
    getStickySymbols() {
        return this.stickySymbolsPositions;
    }
    generateSymbolsCombination() {
        const symbolsMatrix = super.generateSymbolsCombination().toMatrix();
        this.stickySymbolsPositions.forEach((pos) => {
            symbolsMatrix[pos.x][pos.y] = pos.symbolId;
        });
        return new SymbolsCombination().fromMatrix(symbolsMatrix);
    }
}
