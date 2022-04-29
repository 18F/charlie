const fs = require("fs");

const { getApp } = require("../utils/test");
const script = require("./q-expand");

describe("q-expand", () => {
  const app = getApp();
  let getCsvData;

  beforeAll(() => {
    getCsvData = script.getCsvData;
    script.getCsvData = jest.fn();
  });

  afterAll(() => {
    script.getCsvData = getCsvData;
  });

  beforeEach(() => {
    app.brain.clear();
    jest.resetAllMocks();

    script.getCsvData.mockResolvedValue({
      Q: "Top level",
      QQ: "One depth",
      QQC: "Not a contractor",
      QU: "One nest",
      QUE: "A second",
      QUEA: "Another level!",
      QUEAA: "Keep going down",
      QUEAAB: "So far down!",
      QUEAAA: "Deep down now!",
      QUEAAC: "Center of the Earth!",
      QUEAAD: "Whee, way down!",
      QUEAB: "Secret level",
      QUEABA: "Secret sublevel 1",
      QUEABB: "Secret sublevel 2",
    });
  });

  it("called with regex", () => {
    script(app);
    expect(app.message).toHaveBeenCalledWith(
      /^qexp?\s+([a-z0-9-]{1,8}\*?)$/i,
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
        "|||||└──QUEAAD: Whee, way down!\n" +
        "||||└──QUEAA: Keep going down\n" +
        "|||└──QUEA: Another level!\n" +
        "||└──QUE: A second\n" +
        "|└──QU: One nest\n" +
        "└──Q: Top level```",
    });
  });

  it("responds as desired for C endings (NOT Contractor)", async () => {
    script(app);
    const handler = app.getHandler();

    const message = {
      message: {
        thread_ts: "thread id",
      },
      context: {
        matches: ["qex QQC", "QQC"],
      },
      say: jest.fn(),
    };

    await handler(message);

    expect(message.say).toHaveBeenCalledWith({
      icon_emoji: ":tts:",
      username: "Q-Expander",
      thread_ts: "thread id",
      text:
        "```QQC\n" +
        "||└──QQC: Not a contractor\n" +
        "|└──QQ: One depth\n" +
        "└──Q: Top level```",
    });
  });

  it("responds as desired for -C endings (Contractor)", async () => {
    script(app);
    const handler = app.getHandler();

    const message = {
      message: {
        thread_ts: "thread id",
      },
      context: {
        matches: ["qex QQC-C", "QQC-C"],
      },
      say: jest.fn(),
    };

    await handler(message);

    expect(message.say).toHaveBeenCalledWith({
      icon_emoji: ":tts:",
      username: "Q-Expander",
      thread_ts: "thread id",
      text:
        "```QQC-C\n" +
        "|||└──QQC-C: Contractor\n" +
        "||└──QQC: Not a contractor\n" +
        "|└──QQ: One depth\n" +
        "└──Q: Top level```",
    });
  });

  it("expands wildcards at the end of a requested acronyms", async () => {
    script(app);
    const handler = app.getHandler();

    const message = {
      message: {
        thread_ts: "thread id",
      },
      context: {
        matches: ["qex QUEA*", "QUEA*"],
      },
      say: jest.fn(),
    };

    await handler(message);

    expect(message.say).toHaveBeenCalledWith({
      icon_emoji: ":tts:",
      username: "Q-Expander",
      thread_ts: "thread id",
      text: `
\`\`\`QUEA*
|||||└──QUEAAA: Deep down now!
|||||└──QUEAAB: So far down!
|||||└──QUEAAC: Center of the Earth!
|||||└──QUEAAD: Whee, way down!
||||└──QUEAA: Keep going down
|||||└──QUEABA: Secret sublevel 1
|||||└──QUEABB: Secret sublevel 2
||||└──QUEAB: Secret level
|||└──*QUEA: Another level!*
||└──QUE: A second
|└──QU: One nest
└──Q: Top level\`\`\``.trim(),
    });
  });

  it("expands wildcards for unknown acronyms, as best it can", async () => {
    script(app);
    const handler = app.getHandler();

    const message = {
      message: {
        thread_ts: "thread id",
      },
      context: {
        matches: ["qex QUEZZ*", "QUEZZ*"],
      },
      say: jest.fn(),
    };

    await handler(message);

    expect(message.say).toHaveBeenCalledWith({
      icon_emoji: ":tts:",
      username: "Q-Expander",
      thread_ts: "thread id",
      text: `
\`\`\`QUEZZ*
||||└──QUEZZ: ???
|||└──QUEZ: ???
||└──QUE: A second
|└──QU: One nest
└──Q: Top level\`\`\``.trim(),
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
    expect(csvData.QUEAAC).toBe("Quacks Cohort  🦆🦆");
  });

  it("is formatted correctly", () => {
    const csv = fs
      .readFileSync("config/q-expand.csv", { encoding: "utf-8" })
      .trim()
      .split("\n");
    const lines = csv.map((line) => line.split(","));
    const invalid = lines.filter((parts) => parts.length !== 2);
    expect(invalid.length).toBe(0);
  });
});
