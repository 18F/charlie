const { getApp } = require("../utils/test");
const script = require("./q-expand");

describe("q-expand", () => {
  const app = getApp();

  beforeEach(() => {
    app.brain.clear();
    jest.resetAllMocks();
  });

  it("called with regex", () => {
    script(app);
    expect(app.message).toHaveBeenCalledWith(
      /^qexp?\s+([a-z0-9]{1,6})$/i,
      expect.any(Function)
    );
  });

  it("responds as expected with known acronyms", async () => {
    script(app);
    const handler = app.getHandler();

    const message = {
      message: {
        thread_ts: "thread id",
      },
      context: {
        matches: ["qex QUEAAD", "QUEAAD"],
      },
      say: jest.fn(),
    };

    await handler(message);

    expect(message.say).toHaveBeenCalledWith({
      icon_emoji: ":tts:",
      username: "Q-Expander",
      thread_ts: "thread id",
      text:
        "```QUEAAD\n" +
        "|||||└──QUEAAD: Chumanjalaal Cohort\n" +
        "||||└──QUEAA: Engineering\n" +
        "|||└──QUEA: 18F Chapters\n" +
        "||└──QUE: 18F\n" +
        "|└──QU: Office of Clients & Markets\n" +
        "└──Q: FAS (TTS)```",
    });
  });
  it("responds as expected with unknown acronyms", async () => {
    script(app);
    const handler = app.getHandler();

    const message = {
      message: {
        thread_ts: "thread id",
      },
      context: {
        matches: ["qex FOOBAR", "FOOBAR"],
      },
      say: jest.fn(),
    };

    await handler(message);

    expect(message.say).toHaveBeenCalledWith({
      icon_emoji: ":tts:",
      thread_ts: "thread id",
      username: "Q-Expander",
      text:
        "```FOOBAR\n" +
        "|||||└──FOOBAR: ???\n" +
        "||||└──FOOBA: ???\n" +
        "|||└──FOOB: ???\n" +
        "||└──FOO: ???\n" +
        "|└──FO: ???\n" +
        "└──F: ???```",
    });
  });
});

describe("q-expand csv data", () => {
  it("properly pulled into object", async () => {
    const csvData = await script.getCsvData();
    expect(csvData.Q).toBe("FAS (TTS)");
    expect(csvData.QUBE).toBe("Client Services");
    expect(csvData.QUEAF).toBe("Account Management");
    expect(csvData.QUEAAA).toBe("Space Goats Cohort");
  });
});
