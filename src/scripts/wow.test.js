const { axios, getApp } = require("../utils/test");

const script = require("./wow");

describe("Owen Wilson wow-bot", () => {
  const app = getApp();
  const say = jest.fn();

  let handler;

  beforeEach(() => {
    jest.resetAllMocks();

    script(app);
    handler = app.getHandler();
  });

  describe("without any errors", () => {
    it("returns a wow message", async () => {
      axios.get.mockResolvedValue({
        data: [
          {
            character: "Bob",
            full_line: "Wow!",
            movie: "The Wow Movie",
            video: { "720p": "wow.com" },
            year: "wowza",
          },
        ],
      });

      await handler({ say });

      expect(say).toHaveBeenCalledWith({
        username: "Owen Wilson",
        icon_emoji: ":owen-wilson-wow:",
        text: "> *Bob:* Wow!\nThe Wow Movie (wowza), <wow.com|:movie_camera: video>",
        blocks: [
          { type: "section", text: { type: "mrkdwn", text: "> *Bob:* Wow!" } },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: "The Wow Movie (wowza), <wow.com|:movie_camera: video>",
              },
            ],
          },
        ],
      });
    });
  });

  describe("with an invalid API response", () => {
    it("does not do anything", async () => {
      axios.get.mockResolvedValue({ data: "bob" });

      await handler({ say });

      expect(say).not.toHaveBeenCalled();
    });
  });
});
