const { axios, getApp } = require("../utils/test");
const zen = require("./zen");

describe("zen bot", () => {
  const app = getApp();

  it("subscribes to direct mentions that include the word 'zen'", () => {
    zen(app);

    expect(app.message).toHaveBeenCalledWith(
      expect.any(Function),
      /\bzen\b/i,
      expect.any(Function),
    );
  });

  it("fetches a zen message from the GitHub API when triggered", async () => {
    const handler = app.getHandler();

    const message = {
      event: {
        thread_ts: "thread timestamp",
      },
      say: jest.fn(),
    };

    axios.get.mockResolvedValue({ data: "zen message" });

    await handler(message);

    expect(message.say).toHaveBeenCalledWith({
      text: "zen message",
      thread_ts: "thread timestamp",
    });
  });
});
