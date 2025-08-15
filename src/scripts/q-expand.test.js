const fs = require("fs");
const { parse } = require("csv-parse");

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
      expect.any(Function),
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
    expect(typeof csvData).toBe("object");

    // Also make sure that all of the keys have string values
    for (const key of Object.keys(csvData)) {
      expect(typeof csvData[key]).toBe("string");
    }
  });

  it("is formatted correctly", async () => {
    const invalidCount = await new Promise((resolve) => {
      const rows = [];

      fs.createReadStream("config/q-expand.csv")
        .pipe(parse({ delimiter: "," }))
        .on("data", (row) => {
          rows.push(row);
        })
        .on("end", () => {
          const invalid = rows.filter(
            (row) =>
              row.length !== 2 ||
              row.filter((column) => column.endsWith(",")).length > 0,
          );
          resolve(invalid.length);
        });
    });

    expect(invalidCount).toBe(0);
  });
});
