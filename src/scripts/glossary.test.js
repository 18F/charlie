const {
  axios,
  getApp,
  utils: { cache },
} = require("../utils/test");
const script = require("./glossary");

describe("the glossary", () => {
  const app = getApp();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("registers a handler", () => {
    script(app);
    expect(app.message).toHaveBeenCalledWith(
      expect.any(Function),
      /(glossary|define) (.+)/i,
      expect.any(Function)
    );
  });

  describe("handles glossary look-up requests", () => {
    let handler;

    const message = {
      context: {
        matches: ["whole message", "glossary or define", "queried term"],
      },
      event: { thread_ts: "thread timestamp" },
      say: jest.fn(),
    };

    beforeEach(() => {
      script(app);
      handler = app.getHandler();
    });

    it("handles the case where a term is not found", async () => {
      cache.mockResolvedValue({ term1: {}, term2: {} });

      await handler(message);

      expect(message.say).toHaveBeenCalledWith({
        icon_emoji: ":books:",
        thread_ts: "thread timestamp",
        text: "I don't know what *queried term* means. You can add it to <https://github.com/18F/procurement-glossary|the glossary>.",
      });
    });

    describe("handles the case where a term is found", () => {
      it("using a bunch of normal characters", async () => {
        cache.mockResolvedValue({
          term1: {},
          "queried term": {
            longform: "The Queried Term",
            description: "a description of it",
          },
        });

        await handler(message);

        expect(message.say).toHaveBeenCalledWith({
          icon_emoji: ":books:",
          thread_ts: "thread timestamp",
          text: "The term *The Queried Term (queried term)* means a description of it",
        });
      });

      it("when using characters that have been encoded as HTML entities", async () => {
        cache.mockResolvedValue({
          term1: {},
          "queried & term": {
            longform: "The Queried Term",
            description: "a description of it",
          },
        });
        message.context.matches[2] = "queried &amp; term";

        await handler(message);

        expect(message.say).toHaveBeenCalledWith({
          icon_emoji: ":books:",
          thread_ts: "thread timestamp",
          text: "The term *The Queried Term (queried & term)* means a description of it",
        });

        message.context.matches[2] = "queried term";
      });

      it("when the returned definition does not include a long form", async () => {
        cache.mockResolvedValue({
          term1: {},
          "queried term": {
            description: "a description of it",
          },
        });

        await handler(message);

        expect(message.say).toHaveBeenCalledWith({
          icon_emoji: ":books:",
          thread_ts: "thread timestamp",
          text: "The term *queried term* means a description of it",
        });
      });
    });

    it("fetches and parses YAML", async () => {
      cache.mockResolvedValue({});
      await handler(message);

      const fetcher = cache.mock.calls[0].pop();

      axios.get.mockResolvedValue({
        data: `
abbreviations:
  term 1: alice
  term 2:
    bob: debra
`,
      });

      const result = await fetcher();

      expect(result).toEqual({ "term 1": "alice", "term 2": { bob: "debra" } });
    });
  });
});
