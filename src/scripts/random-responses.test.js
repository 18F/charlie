const fs = require("fs");
const {
  axios,
  getApp,
  utils: { cache },
} = require("../utils/test");

const script = require("./random-responses");

jest.mock("fs");

describe("random responder", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("response builder", () => {
    const random = jest.spyOn(global.Math, "random");

    const config = { botName: null, defaultEmoji: null };

    const message = {
      event: { thread_ts: "thread timestamp" },
      say: jest.fn(),
    };

    beforeEach(() => {
      config.botName = null;
      config.defaultEmoji = null;
    });

    afterAll(() => {
      random.mockRestore();
    });

    const responsePermutations = [
      {
        testName: "simple string response",
        responseList: ["a message"],
        expected: { text: "a message", thread_ts: "thread timestamp" },
      },
      {
        testName: "string with emoji",
        responseList: [":emoji: b message"],
        expected: {
          text: "b message",
          thread_ts: "thread timestamp",
          icon_emoji: ":emoji:",
        },
      },
      {
        testName: "message object with no name or emoji",
        responseList: [{ text: "c message" }],
        expected: { text: "c message", thread_ts: "thread timestamp" },
      },
      {
        testName: "message object with no name",
        responseList: [{ text: "d message", emoji: ":emoji:" }],
        expected: {
          text: "d message",
          thread_ts: "thread timestamp",
          icon_emoji: ":emoji:",
        },
      },
      {
        testName: "message object with no emoji",
        responseList: [{ text: "e message", name: "bob" }],
        expected: {
          text: "e message",
          thread_ts: "thread timestamp",
          username: "bob",
        },
      },
      {
        testName: "full message object",
        responseList: [{ text: "f message", emoji: ":emoji:", name: "bob" }],
        expected: {
          text: "f message",
          thread_ts: "thread timestamp",
          icon_emoji: ":emoji:",
          username: "bob",
        },
      },
    ];

    describe("with no config", () => {
      responsePermutations.forEach(({ testName, responseList, expected }) => {
        it(testName, async () => {
          random.mockReturnValue(0);

          await script.responseFrom({ ...config, responseList })(message);

          expect(random).toHaveBeenCalledWith();
          expect(message.say).toHaveBeenCalledWith(expected);
        });
      });
    });

    describe("with default emoji set", () => {
      const baseExpectation = { icon_emoji: ":default-emoji:" };

      responsePermutations.forEach(({ testName, responseList, expected }) => {
        it(testName, async () => {
          config.defaultEmoji = ":default-emoji:";
          random.mockReturnValue(0);

          await script.responseFrom({ ...config, responseList })(message);

          expect(random).toHaveBeenCalled();
          expect(message.say).toHaveBeenCalledWith({
            ...baseExpectation,
            ...expected,
          });
        });
      });
    });

    describe("with bot name set", () => {
      const baseExpectation = { username: "bot name" };

      responsePermutations.forEach(({ testName, responseList, expected }) => {
        it(testName, async () => {
          config.botName = "bot name";
          if (expected.username) {
            expected.username += " (bot name)"; // eslint-disable-line no-param-reassign
          }
          random.mockReturnValue(0);

          await script.responseFrom({ ...config, responseList })(message);

          expect(random).toHaveBeenCalled();
          expect(message.say).toHaveBeenCalledWith({
            ...baseExpectation,
            ...expected,
          });
        });
      });
    });
  });

  describe("response getter", () => {
    it("gets responses directly from config", async () => {
      const responses = await script.getResponses({
        responseList: "these are my responses",
      });
      expect(responses).toEqual("these are my responses");
    });

    it("gets responses from a url", async () => {
      axios.get.mockResolvedValue({ data: "response data" });
      cache.mockResolvedValue("cached data");

      const responses = await script.getResponses({
        responseUrl: "over there",
      });

      const data = await cache.mock.calls[0][2]();

      expect(cache).toHaveBeenCalledWith(
        "random response from over there",
        expect.any(Number),
        expect.any(Function)
      );
      expect(axios.get).toHaveBeenCalledWith("over there");
      expect(data).toEqual("response data");
      expect(responses).toEqual("cached data");
    });

    it("returns an empty list if the configuration doesn't have a list or URL", async () => {
      const responses = await script.getResponses({});
      expect(responses).toEqual([]);
    });
  });

  describe("trigger attachment", () => {
    const app = getApp();

    it("handles a single text trigger", () => {
      script.attachTrigger(app, { trigger: "one trigger" });
      expect(app.message).toHaveBeenCalledWith(
        /one trigger/i,
        expect.any(Function)
      );
    });

    it("handles a single regex trigger", () => {
      script.attachTrigger(app, { trigger: /one regex/g });
      expect(app.message).toHaveBeenCalledWith(
        /one regex/i,
        expect.any(Function)
      );
    });

    it("handles an array of text triggers", () => {
      script.attachTrigger(app, {
        trigger: ["trigger 1", "trigger 2", "trigger 3"],
      });

      expect(app.message).toHaveBeenCalledWith(
        /trigger 1/i,
        expect.any(Function)
      );
      expect(app.message).toHaveBeenCalledWith(
        /trigger 2/i,
        expect.any(Function)
      );
      expect(app.message).toHaveBeenCalledWith(
        /trigger 3/i,
        expect.any(Function)
      );
    });

    it("handles an array of regex triggers", () => {
      script.attachTrigger(app, {
        trigger: [/trigger 1/g, /trigger 2/g, /trigger 3/g],
      });

      expect(app.message).toHaveBeenCalledWith(
        /trigger 1/i,
        expect.any(Function)
      );
      expect(app.message).toHaveBeenCalledWith(
        /trigger 2/i,
        expect.any(Function)
      );
      expect(app.message).toHaveBeenCalledWith(
        /trigger 3/i,
        expect.any(Function)
      );
    });
  });

  describe("initializes by attaching every trigger", () => {
    const app = getApp();

    beforeEach(() => {
      fs.readFileSync.mockReturnValue(`["config 1", "config 2", "config 3"]`);
    });

    it("attaches a trigger for each configuration", async () => {
      const attachTrigger = jest.spyOn(script, "attachTrigger");

      await script(app);

      expect(attachTrigger).toHaveBeenCalledWith(app, "config 1");
      expect(attachTrigger).toHaveBeenCalledWith(app, "config 2");
      expect(attachTrigger).toHaveBeenCalledWith(app, "config 3");

      expect(app.message).toHaveBeenCalledWith(
        /fact of facts/i,
        expect.any(Function)
      );
    });

    it("handles the fact-of-fact response", async () => {
      const random = jest.spyOn(global.Math, "random").mockReturnValue(0);
      const handler = jest.fn();
      const responseFrom = jest
        .spyOn(script, "responseFrom")
        .mockReturnValue(handler);

      await script(app);

      const factOfFact = app.message.mock.calls[0].pop();
      factOfFact("message");

      // Confirm that a response handler for a random configuration was created
      // and that it was called.
      expect(random).toHaveBeenCalled();
      expect(responseFrom).toHaveBeenCalledWith("config 1");
      expect(handler).toHaveBeenCalledWith("message");

      random.mockRestore();
      responseFrom.mockRestore();
    });
  });
});
