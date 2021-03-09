const { getApp } = require("../utils/test");

const script = require("./pugs");

describe("pug bot", () => {
  const app = getApp();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("registers message handlers", () => {
    it("for a single pug", () => {
      script(app);
      expect(app.message).toHaveBeenCalledWith(
        expect.any(Function),
        /pug me/i,
        expect.any(Function)
      );
    });

    it("for multiple pugs", () => {
      script(app);
      expect(app.message).toHaveBeenCalledWith(
        expect.any(Function),
        /pug bomb ?(\d+)?/i,
        expect.any(Function)
      );
    });
  });

  describe("handles pug requests", () => {
    it("for a single pug", () => {
      script(app);
      const handler = app.getHandler(0);
      const say = jest.fn();

      handler({ say });

      expect(say).toHaveBeenCalledWith({
        blocks: [
          {
            type: "image",
            title: { type: "plain_text", text: "a pug!" },
            image_url: expect.stringMatching(
              /https:\/\/i\.imgur\.com\/.{7}\.(jpg|png)/
            ),
            alt_text: "a pug",
          },
        ],
      });
    });

    describe("for multiple pugs", () => {
      const say = jest.fn();

      let handler;
      beforeEach(() => {
        script(app);
        handler = app.getHandler(1);
      });

      it("if the count is provided, uses the count", () => {
        handler({ context: { matches: [null, 2] }, say });

        expect(say).toHaveBeenCalledWith({
          blocks: [
            {
              type: "image",
              title: { type: "plain_text", text: "a pug!" },
              image_url: expect.stringMatching(
                /https:\/\/i\.imgur\.com\/.{7}\.(jpg|png)/
              ),
              alt_text: "a pug",
            },
            {
              type: "image",
              title: { type: "plain_text", text: "a pug!" },
              image_url: expect.stringMatching(
                /https:\/\/i\.imgur\.com\/.{7}\.(jpg|png)/
              ),
              alt_text: "a pug",
            },
          ],
        });
      });

      it("if the count is not provided, defaults to 3", () => {
        handler({ context: { matches: [null] }, say });

        expect(say).toHaveBeenCalledWith({
          blocks: [
            {
              type: "image",
              title: { type: "plain_text", text: "a pug!" },
              image_url: expect.stringMatching(
                /https:\/\/i\.imgur\.com\/.{7}\.(jpg|png)/
              ),
              alt_text: "a pug",
            },
            {
              type: "image",
              title: { type: "plain_text", text: "a pug!" },
              image_url: expect.stringMatching(
                /https:\/\/i\.imgur\.com\/.{7}\.(jpg|png)/
              ),
              alt_text: "a pug",
            },
            {
              type: "image",
              title: { type: "plain_text", text: "a pug!" },
              image_url: expect.stringMatching(
                /https:\/\/i\.imgur\.com\/.{7}\.(jpg|png)/
              ),
              alt_text: "a pug",
            },
          ],
        });
      });

      it("if the count is provided but is not numeric, defaults to 3", () => {
        handler({ context: { matches: [null, "bob"] }, say });

        expect(say).toHaveBeenCalledWith({
          blocks: [
            {
              type: "image",
              title: { type: "plain_text", text: "a pug!" },
              image_url: expect.stringMatching(
                /https:\/\/i\.imgur\.com\/.{7}\.(jpg|png)/
              ),
              alt_text: "a pug",
            },
            {
              type: "image",
              title: { type: "plain_text", text: "a pug!" },
              image_url: expect.stringMatching(
                /https:\/\/i\.imgur\.com\/.{7}\.(jpg|png)/
              ),
              alt_text: "a pug",
            },
            {
              type: "image",
              title: { type: "plain_text", text: "a pug!" },
              image_url: expect.stringMatching(
                /https:\/\/i\.imgur\.com\/.{7}\.(jpg|png)/
              ),
              alt_text: "a pug",
            },
          ],
        });
      });
    });
  });
});
