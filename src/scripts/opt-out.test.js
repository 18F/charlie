const { getApp } = require("../utils/test");
const optOut = require("./opt-out");

describe("opt-out generic action", () => {
  const app = getApp();
  optOut(app);

  // TODO: Update the test utils to allow getting action handlers
  const handler = app.action.mock.calls[0][1];

  beforeEach(() => {
    jest.resetAllMocks();
    app.brain.clear();
  });

  it("subscribes to opt-out actions", () => {
    // Call the module again because the mocks have been reset since it was
    // called in the setup. Doing this seems less error-prone than moving the
    // beforeEach down below.
    optOut(app);
    expect(app.action).toHaveBeenCalledWith("opt_out", expect.any(Function));
  });

  describe("adds the user to the appropriate opt-out list if they are not on it", () => {
    const message = {
      ack: jest.fn(),
      action: { selected_option: { value: "action" } },
      body: { user: { id: "user id" } },
    };

    it("when there is nothing in the brain", async () => {
      await handler(message);

      expect(message.ack).toHaveBeenCalled();
      expect(Array.from(app.brain.entries())).toEqual([
        ["OPT_OUT", { action: ["user id"] }],
      ]);
    });

    it("when the brain has an opt-out list, but not for this item", async () => {
      app.brain.set("OPT_OUT", { otherAction: [] });

      await handler(message);

      expect(message.ack).toHaveBeenCalled();
      expect(Array.from(app.brain.entries())).toEqual([
        ["OPT_OUT", { action: ["user id"], otherAction: [] }],
      ]);
    });

    it("when the brain has an opt-out list for this item", async () => {
      app.brain.set("OPT_OUT", { action: [] });
      await handler(message);

      expect(message.ack).toHaveBeenCalled();
      expect(Array.from(app.brain.entries())).toEqual([
        ["OPT_OUT", { action: ["user id"] }],
      ]);
    });

    it("but does not add them again if they're already in the opt-out list for this item", async () => {
      app.brain.set("OPT_OUT", { action: ["user id"] });
      await handler(message);

      expect(message.ack).toHaveBeenCalled();
      expect(Array.from(app.brain.entries())).toEqual([
        ["OPT_OUT", { action: ["user id"] }],
      ]);
    });
  });
});
