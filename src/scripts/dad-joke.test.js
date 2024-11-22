const fs = require("node:fs/promises");
const { getApp } = require("../utils/test");

const script = require("./dad-joke");

jest.mock("fs");

describe("dad jokes (are the best worst)", () => {
  const app = getApp();

  beforeAll(() => {
    jest.useFakeTimers();
    fs.readFile = jest.fn();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("subscribes to dad joke requests", async () => {
    fs.readFile.mockResolvedValue("[]");

    await script(app);

    expect(app.message).toHaveBeenCalledWith(
      expect.any(Function),
      /dad joke/i,
      expect.any(Function),
    );
  });

  describe("response to joke requests", () => {
    let handler;
    beforeEach(async () => {
      fs.readFile.mockResolvedValue(
        JSON.stringify([
          { setup: "joke setup here", punchline: "the funny part" },
        ]),
      );

      await script(app);
      handler = app.getHandler();
    });

    const message = { message: { thread_ts: "thread id" }, say: jest.fn() };

    it("responds with a joke", async () => {
      await handler(message);

      expect(message.say).toHaveBeenCalledWith({
        icon_emoji: ":dog-joke-setup:",
        text: "joke setup here",
        thread_ts: "thread id",
        username: "Jed Bartlett",
      });

      // Ensure the punchline part comes after a delay by clearing out the
      // existing mock calls.
      message.say.mockClear();
      jest.advanceTimersByTime(5000);

      expect(message.say).toHaveBeenCalledWith({
        icon_emoji: ":dog-joke:",
        text: "the funny part",
        thread_ts: "thread id",
        username: "Jed \u200bBartlett",
      });
    });
  });
});
