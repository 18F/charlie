const { brain } = require("./test");

const { incrementStats, BRAIN_KEY } = require("./stats");

describe("bot stats helper", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("sets a bot's stats to 1 if there are currently no stats", () => {
    brain.get.mockReturnValue();
    incrementStats("bot1");

    expect(brain.set).toHaveBeenCalledWith(BRAIN_KEY, {
      bot1: 1,
    });
  });

  it("sets a bot's stats to 1 if it is currently undefined", () => {
    brain.get.mockReturnValue({ bot1: 7, bot2: 3 });
    incrementStats("bot3");

    expect(brain.set).toHaveBeenCalledWith(BRAIN_KEY, {
      bot1: 7,
      bot2: 3,
      bot3: 1,
    });
  });

  it("increments a bot's stats if the bot already has stats", () => {
    brain.get.mockReturnValue({ bot1: 7, bot2: 3, bot3: 9 });
    incrementStats("bot3");

    expect(brain.set).toHaveBeenCalledWith(BRAIN_KEY, {
      bot1: 7,
      bot2: 3,
      bot3: 10,
    });
  });
});
