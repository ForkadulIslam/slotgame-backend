import { PlayUntilAnyWinStrategy, PlayUntilSymbolWinStrategy, Simulation, SimulationConfig, } from "pokie";
let localSession;
let localSerializer;
let localCustomScenarios;
export const initializeData = (session, serializer, customScenarios) => {
    localSession = session;
    localSerializer = serializer;
    localCustomScenarios = customScenarios;
};
export const getInitialData = async () => {
    return new Promise((res) => {
        res(localSerializer.getInitialData(localSession));
    });
};
export const getRoundData = async () => {
    return new Promise((res) => {
        localSession.play();
        res(localSerializer.getRoundData(localSession));
    });
};
export const getSymbolWinData = async (itemId, times) => {
    return new Promise((res) => {
        localSession.play();
        const simulationConfig = new SimulationConfig();
        simulationConfig.setNumberOfRounds(Infinity);
        const playStrategy = new PlayUntilSymbolWinStrategy(itemId);
        playStrategy.setExactNumberOfWinningSymbols(times);
        simulationConfig.setPlayStrategy(playStrategy);
        res(runSimulation(simulationConfig));
    });
};
export const getAnyWinData = async () => {
    return new Promise((res) => {
        localSession.play();
        const simulationConfig = new SimulationConfig();
        simulationConfig.setNumberOfRounds(Infinity);
        const playStrategy = new PlayUntilAnyWinStrategy();
        simulationConfig.setPlayStrategy(playStrategy);
        res(runSimulation(simulationConfig));
    });
};
export const getCustomScenarioData = async (scenarioId) => {
    return new Promise((res) => {
        const simulationConfig = localCustomScenarios?.find((entry) => entry[0] === scenarioId);
        res(runSimulation(simulationConfig[2]));
    });
};
const runSimulation = (simulationConfig) => {
    const simulation = new Simulation(localSession, simulationConfig);
    localSession.play();
    simulation.run();
    return localSerializer.getRoundData(localSession);
};
