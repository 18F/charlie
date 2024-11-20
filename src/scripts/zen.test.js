const { getApp } = require("../utils/test");
const zen = require("./zen");

describe("zen bot", () => {
  const app = getApp();
  const text = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    fetch.mockResolvedValue({ text });
  });

  it("subscribes to direct mentions that include the word 'zen'", () => {
    zen(app);

    expect(app.message).toHaveBeenCalledWith(
      expect.any(Function),
      /\bzen\b/i,
      expect.any(Function),
    );
  });

  it("fetches a zen message from the GitHub API when triggered", async () => {
    zen(app);
    const handler = app.getHandler();

    const message = {
      event: {
        thread_ts: "thread timestamp",
      },
      say: jest.fn(),
    };

    text.mockResolvedValue("zen message");

    await handler(message);

    expect(message.say).toHaveBeenCalledWith({
      text: "zen message",
      thread_ts: "thread timestamp",
    });
  });
});
