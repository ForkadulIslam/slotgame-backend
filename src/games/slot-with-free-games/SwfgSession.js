import { VideoSlotWithFreeGamesSession } from "pokie";
export class SwfgSession extends VideoSlotWithFreeGamesSession {
    constructor(config, combinationsGenerator, winCalculator) {
        super(config, combinationsGenerator, winCalculator);
        SwfgSession.config = config;
    }
    play() {
        super.play();
        if (this.getFreeGamesSum() > 0 && this.getFreeGamesNum() !== this.getFreeGamesSum()) {
            SwfgSession.config.setFreeGamesMode(true);
        }
        else {
            SwfgSession.config.setFreeGamesMode(false);
        }
    }
}
