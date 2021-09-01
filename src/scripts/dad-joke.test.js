const {
  axios,
  getApp,
  utils: { cache },
} = require("../utils/test");

const script = require("./dad-joke");

describe("dad jokes (are the best worst)", () => {
  const app = getApp();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("subscribes to dad joke requests", () => {
    script(app);
    expect(app.message).toHaveBeenCalledWith(
      expect.any(Function),
      /dad joke/i,
      expect.any(Function)
    );
  });

  describe("response to joke requests", () => {
    let handler;
    beforeEach(() => {
      script(app);
      handler = app.getHandler();
    });

    const message = { say: jest.fn() };

    it("fetches jokes from a cache", async () => {
      cache.mockResolvedValue([]);
      await handler(message);
      expect(cache).toHaveBeenCalledWith("dad jokes", 60, expect.any(Function));
    });

    describe("gets jokes from fatherhood.gov if the cache is expired or whatever", () => {
      let fetch;
      beforeEach(async () => {
        cache.mockResolvedValue([]);
        await handler(message);
        fetch = cache.mock.calls[0][2];
      });

      it("if the API throws an error", async () => {
        axios.get.mockRejectedValue("error");
        const out = await fetch();

        expect(out).toEqual([]);
      });

      it("if the API returns a malformed object", async () => {
        axios.get.mockResolvedValue({ data: { data_is_missing: [] } });
        const out = await fetch();

        expect(out).toEqual([]);
      });

      it("if the API doesn't return any jokes", async () => {
        axios.get.mockResolvedValue({ data: { data: [] } });
        const out = await fetch();

        expect(out).toEqual([]);
      });

      it("if the API does return some jokes", async () => {
        axios.get.mockResolvedValue({
          data: {
            data: [
              {
                attributes: {
                  field_joke_opener: "setup 1",
                  field_joke_response: "punchline 1",
                },
              },
              {
                attributes: {
                  field_joke_opener: "setup 2",
                  field_joke_response: "punchline 2",
                },
              },
              {
                attributes: {
                  field_joke_opener: "setup 3",
                  field_joke_response: "punchline 3",
                },
              },
            ],
          },
        });
        const out = await fetch();

        expect(out).toEqual([
          { setup: "setup 1", punchline: "punchline 1" },
          { setup: "setup 2", punchline: "punchline 2" },
          { setup: "setup 3", punchline: "punchline 3" },
        ]);
      });
    });

    describe("responds with a joke", () => {
      it("unless there aren't any jokes", async () => {
        cache.mockResolvedValue([]);
        await handler(message);
        expect(message.say).not.toHaveBeenCalled();
      });

      it("if there is at least one joke", async () => {
        cache.mockResolvedValue([
          { setup: "joke setup here", punchline: "the funny part" },
        ]);
        await handler(message);

        expect(message.say).toHaveBeenCalledWith({
          icon_emoji: ":dog-joke-setup:",
          text: "joke setup here",
          username: "Jed Bartlett",
        });

        // Ensure the punchline part comes after a delay by clearing out the
        // existing mock calls.
        message.say.mockClear();
        jest.advanceTimersByTime(5000);

        expect(message.say).toHaveBeenCalledWith({
          icon_emoji: ":dog-joke:",
          text: "the funny part",
          username: "Jed Bartlett",
        });
      });
    });
  });
});
