# Proposal: Adding a Free Spin Feature to the Simple Slot Game

This document outlines the proposed plan to implement a free spin feature in the `simple-slot` game, based on the architecture of the `slot-with-free-games` example.

## 1. Feature Overview

-   **Triggering Condition:** Landing 3, 4, or 5 "Scatter1" symbols anywhere on the reels will trigger the free spin feature. The existing cash payout for these combinations will be preserved.
-   **Free Spins Awarded:**
    -   3 "Scatter1" symbols: 10 Free Spins
    -   4 "Scatter1" symbols: 15 Free Spins
    -   5 "Scatter1" symbols: 20 Free Spins
-   **Free Spin Bonus:** All winnings during the free spin rounds will be multiplied by 2x.
-   **Re-triggers:** Free spins cannot be re-triggered. The scatter symbols will be removed from the reels during the feature.

## 2. Proposed Implementation Steps

To implement this feature, we will create three new custom classes and update the main game file to use them.

### Step 2.1: Create `SimpleSlotWithFreeGamesConfig.js`

A new file `src/games/simple-slot/SimpleSlotWithFreeGamesConfig.js` will be created.

-   This class will extend `VideoSlotWithFreeGamesConfig` from the `pokie` library.
-   It will be responsible for managing different configurations for the base game and free games.
-   It will define two different sets of reel strips (symbol sequences):
    1.  **Base Game Reels:** The current reel strips.
    2.  **Free Game Reels:** A new set of reel strips where "Scatter1" and "Scatter2" symbols are removed, and the number of "Wild" symbols is increased to make the feature more exciting.
-   It will use a `freeGamesMode` flag to switch between these configurations.

### Step 2.2: Create `SimpleSlotWithFreeGamesSession.js`

A new file `src/games/simple-slot/SimpleSlotWithFreeGamesSession.js` will be created.

-   This class will extend `VideoSlotWithFreeGamesSession`.
-   Its primary role is to set the `freeGamesMode` flag on the config object after each spin, allowing the game to use the correct reel strips and win calculations.

### Step 2.3: Create `SimpleSlotWithFreeGamesWinCalculator.js`

A new file `src/games/simple-slot/SimpleSlotWithFreeGamesWinCalculator.js` will be created.

-   This class will extend `VideoSlotWinCalculator`.
-   It will override the `calculateWin` method to apply a **2x multiplier** to all line and scatter wins if the game is in `freeGamesMode`.

### Step 2.4: Update `reference_use_5x4.js`

The main game file, `src/games/simple-slot/reference_use_5x4.js`, will be modified as follows:

1.  **Import new classes:** Import the three newly created classes.
2.  **Update Imports from `pokie`:** Change the `VideoSlotConfig` and `VideoSlotSession` imports to `VideoSlotWithFreeGamesConfig` and `VideoSlotWithFreeGamesSession` respectively. Also, import `VideoSlotWithFreeGamesSessionSerializer`.
3.  **Instantiate Custom Classes:**
    -   Replace `new VideoSlotConfig()` with `new SimpleSlotWithFreeGamesConfig()`.
    -   Instantiate the new `SimpleSlotWithFreeGamesWinCalculator`.
    -   Replace `new VideoSlotSession(...)` with `new SimpleSlotWithFreeGamesSession(...)`, passing the new config and win calculator.
4.  **Configure Free Spins:** Use the `setFreeGamesForScatters` method on the config object to define the "Scatter1" symbol as the trigger and specify the number of free spins awarded for each combination.

This approach encapsulates the free spin logic cleanly, following the patterns established in the `pokie` framework examples, and makes the game logic easy to understand and maintain.