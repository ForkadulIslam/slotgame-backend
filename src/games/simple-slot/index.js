
import * as POKIE from "pokie";
const config = new POKIE.VideoSlotConfig();
config.setReelsNumber(3);
config.setReelsSymbolsNumber(3);

config.setAvailableSymbols([
    "S",
    "A",
    "K",
    "Q",
    "J",
    "10",
    "9",
]);
config.setScatterSymbols(["S"]);





const pt = new POKIE.Paytable(
  config.getAvailableBets(), 
  config.getAvailableSymbols()
);

// payouts for 2 symbols
pt.setPayoutForSymbol("9", 2, 1);
pt.setPayoutForSymbol("10", 2, 1);

pt.setPayoutForSymbol("J", 2, 2);
pt.setPayoutForSymbol("Q", 2, 2);

pt.setPayoutForSymbol("K", 2, 3);

pt.setPayoutForSymbol("A", 2, 5);

// payouts for 3 symbols
pt.setPayoutForSymbol("9", 3, 2);
pt.setPayoutForSymbol("10", 3, 2);

pt.setPayoutForSymbol("J", 3, 3);
pt.setPayoutForSymbol("Q", 3, 3);

pt.setPayoutForSymbol("K", 3, 5);

pt.setPayoutForSymbol("A", 3, 8);





// payout for 3 scatter symbols
pt.setPayoutForSymbol("S", 3, 10);

config.setPaytable(pt);

const symbolsNumbers = {
    "9": 10,
    "10": 10,
    "J": 9,
    "Q": 9,
    "K": 8,
    "A": 7,
    "S": 6,
};
const sequence = new POKIE.SymbolsSequence().fromNumbersOfSymbols(
  symbolsNumbers
);
sequence.shuffle();
for (let i = 0; i < sequence.getSize(); i++) {
    const symbols = sequence.getSymbols(i, config.getReelsSymbolsNumber());
    const indexOfS = symbols.indexOf("S");
    const lastIndexOfS = symbols.lastIndexOf("S");
    if (indexOfS !== lastIndexOfS) {
        i = 0;
        sequence.shuffle();
    }
}
console.log("Sequence size: " + sequence.getSize());
console.log("Sequence: ");
console.log(sequence.toArray());





config.setSymbolsSequences([
    new POKIE.SymbolsSequence().fromArray(sequence.toArray()),
    new POKIE.SymbolsSequence().fromArray(sequence.toArray()),
    new POKIE.SymbolsSequence().fromArray(sequence.toArray()),
]);




const allReelsCombinations = 
  POKIE.SymbolsCombinationsAnalyzer.getAllPossibleSymbolsCombinations(
    config.getSymbolsSequences(), config.getReelsSymbolsNumber()
  );

console.log("Total combinations number: " + allReelsCombinations.length);

console.log("First combination: ");
console.log(allReelsCombinations[0]);

console.log("Second combination: ");
console.log(allReelsCombinations[1]);

console.log("Third combination: ");
console.log(allReelsCombinations[2]);

console.log("Penultimate combination: ");
console.log(allReelsCombinations[allReelsCombinations.length - 2]);

console.log("Last combination: ");
console.log(allReelsCombinations[allReelsCombinations.length - 1]);






const allWinsData = [];
let totalPayout = 0;
allReelsCombinations.forEach(combination => {
    const wc = new POKIE.VideoSlotWinCalculator(config);
    wc.calculateWin(config.getBet(), new POKIE.SymbolsCombination().fromMatrix(combination));
    if (wc.getWinAmount() > 0) {
        allWinsData.push(wc);
        totalPayout += wc.getWinAmount();
    }
});

console.log(allWinsData[0]);
console.log("Total winning combinations number: " + allWinsData.length);
console.log("Total payout: " + totalPayout);
console.log("Hit frequency: " + allWinsData.length / allReelsCombinations.length);
console.log("RTP: " + totalPayout / allReelsCombinations.length);







const session = new POKIE.VideoSlotSession(config);
export const customGameSession = session;
export const customGameSessionSerializer = new POKIE.VideoSlotSessionSerializer();
export const customScenarios = [];

