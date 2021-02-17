const fs = require("fs");
const {
  getApp,
  utils: {
    slack: { addEmojiReaction, postEphemeralResponse },
  },
} = require("../utils/test");
const bot = require("./inclusion-bot");

jest.mock("fs");

describe("Inclusion bot match loader", () => {
  fs.readFileSync.mockReturnValue(`
link: https://link.url
message: "This is the message"

triggers:
  - matches:
      - match 1.1
      - match 1.2
    alternatives:
      - alt 1.1
  - matches:
      - match 2.1
    ignore:
      - ignore 2.1
    alternatives:
      - alt 2.1
      - alt 2.2`);

  it("maps the YAML file to the right format", () => {
    const matches = bot.getTriggers();
    expect(matches).toEqual({
      link: "https://link.url",
      message: "This is the message",
      triggers: [
        {
          alternatives: ["alt 1.1"],
          ignore: undefined,
          matches: /(match 1.1|match 1.2)/i,
        },
        {
          alternatives: ["alt 2.1", "alt 2.2"],
          ignore: /(ignore 2.1)/gi,
          matches: /(match 2.1)/i,
        },
      ],
    });
  });
});

describe("Inclusion bot", () => {
  const app = getApp();

  const msg = {
    message: {
      id: "message id",
      room: "channel id",
      text: "",
      user: { id: "user id" },
    },
  };

  beforeAll(() => {
    bot.getTriggers = () => ({
      link: "http://link.url",
      message: "This is the message",
      triggers: [
        {
          alternatives: ["a1", "a2", "a3"],
          ignore: ["not match 1"],
          matches: /(match 1)/i,
        },
        {
          alternatives: ["b1"],
          matches: /(match 2a|match 2b)/i,
        },
      ],
    });
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("subscribes to case-insensitive utterances of uninclusive language", () => {
    bot(app);

    expect(app.message).toHaveBeenCalledWith(
      new RegExp(/\b(match 1)|(match 2a|match 2b)\b/, "i"),
      expect.any(Function)
    );
  });

  describe("properly responds to triggers", () => {
    const expectedMessage = {
      attachments: [
        {
          color: "#ffbe2e",
          text: "",
          fallback: "fallback",
        },
        {
          color: "#2eb886",
          text: "This is the message",
          fallback: "This is the message",
        },
      ],
      icon_emoji: ":tts:",
      user: "user id",
      username: "Inclusion Bot",
      unfurl_links: false,
      unfurl_media: false,
    };

    let handler;
    beforeEach(() => {
      bot(app);
      handler = app.getHandler();
    });

    it("handles a single triggering phrase", () => {
      msg.message.text = "hello this is the match 1 trigger";
      handler(msg);

      expect(addEmojiReaction).toHaveBeenCalledWith(msg, "inclusion-bot");

      expectedMessage.attachments[0].text = expect.stringMatching(
        /• Instead of saying "match 1," how about \*(a1|a2|a3)\*? \(_<https:\/\/link\.url|What's this\?>_\)/
      );
      expect(postEphemeralResponse).toHaveBeenCalledWith(msg, expectedMessage);
    });

    it("handles a single triggering phrase that should be explicitly ignored", () => {
      msg.message.text = "hello this is the not match 1 trigger";
      handler(msg);

      expect(addEmojiReaction).not.toHaveBeenCalled();
      expect(postEphemeralResponse).not.toHaveBeenCalled();
    });

    it("handles two triggering phrases", () => {
      msg.message.text = "hello this is the match 1 trigger and match 2a";
      handler(msg);

      expect(addEmojiReaction).toHaveBeenCalledWith(msg, "inclusion-bot");

      expectedMessage.attachments[0].text = expect.stringMatching(
        /• Instead of saying "match 1," how about \*(a1|a2|a3)\*?\n• Instead of saying "match 2a," how about \*b1\*? \(_<https:\/\/link\.url|What's this\?>_\)/
      );
      expect(postEphemeralResponse).toHaveBeenCalledWith(msg, expectedMessage);
    });

    it("handles two triggering phrases where one is explicitly ignored", () => {
      msg.message.text = "hello this is the not match 1 trigger and match 2a";
      handler(msg);

      expect(addEmojiReaction).toHaveBeenCalledWith(msg, "inclusion-bot");

      expectedMessage.attachments[0].text = expect.stringMatching(
        /• Instead of saying "match 2a," how about \*b1\*? \(_<https:\/\/link\.url|What's this\?>_\)/
      );
      expect(postEphemeralResponse).toHaveBeenCalledWith(msg, expectedMessage);
    });
  });
});
