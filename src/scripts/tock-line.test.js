const { getApp } = require("../utils/test");
const tock = require("./tock-line");

describe("tock line", () => {
  const app = getApp();

  const message = {
    context: {
      matches: ["whole match", "optional lines", "tock line"],
    },
    event: {
      channel: "channel id",
      text: "<@bot id> tock line",
      thread_ts: "thread id",
    },
    say: jest.fn(),
  };

  beforeAll(() => {
    jest.resetAllMocks();
  });

  it("hooks up the right listeners", () => {
    tock(app);

    expect(app.message).toHaveBeenCalledWith(
      expect.any(Function),
      /tock( line)?$/i,
      expect.any(Function)
    );

    expect(app.message).toHaveBeenCalledWith(
      expect.any(Function),
      /set tock( line)? (.*)$/i,
      expect.any(Function)
    );
  });

  it("reports if there is no Tock line set for the channel", () => {
    tock(app);
    const handler = app.getHandler();

    handler(message);

    expect(message.say).toHaveBeenCalledWith({
      icon_emoji: ":happytock:",
      text: "I don't know a tock line for this room. To set one, say `<@bot id> set tock line <line>`",
      thread_ts: "thread id",
    });
  });

  it("responds with the Tock line if configured", () => {
    tock(app);
    const handler = app.getHandler();

    app.brain.set("tockLines", { "channel id": "1234" });

    handler(message);

    expect(message.say).toHaveBeenCalledWith({
      icon_emoji: ":happytock:",
      text: "The tock line for <#channel id> is `1234`",
      thread_ts: "thread id",
    });
  });

  it("sets the tock line for a given room", () => {
    tock(app);
    const handler = app.getHandler(1);

    handler(message);

    expect(app.brain.get("tockLines")).toEqual({ "channel id": "tock line" });
  });
});
