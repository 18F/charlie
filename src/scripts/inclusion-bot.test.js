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
    why: a string goes here
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
          matches:
            /(match 1.1|match 1.2)(?=[^"“”']*(["“”'][^"“”']*["“”'][^"“”']*)*$)/i,
          why: "a string goes here",
        },
        {
          alternatives: ["alt 2.1", "alt 2.2"],
          ignore: /(ignore 2.1)/gi,
          matches: /(match 2.1)(?=[^"“”']*(["“”'][^"“”']*["“”'][^"“”']*)*$)/i,
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

  beforeEach(() => {
    jest.resetAllMocks();

    fs.readFileSync.mockReturnValue(`
link: https://link.url
message: "This is the message"

triggers:
  - matches:
      - match 1
    alternatives:
      - a1
      - a2
      - a3
    ignore:
      - not match 1
  - matches:
      - match 2a
      - match 2b
    alternatives:
      - b1
`);
  });

  it("subscribes to case-insensitive utterances of uninclusive language", () => {
    bot(app);

    expect(app.message).toHaveBeenCalledWith(
      /\b(match 1)(?=[^"“”']*(["“”'][^"“”']*["“”'][^"“”']*)*$)|(match 2a|match 2b)(?=[^"“”']*(["“”'][^"“”']*["“”'][^"“”']*)*$)\b/i,
      expect.any(Function)
    );
  });

  describe("properly responds to triggers", () => {
    const expectedMessage = {
      attachments: [
        {
          color: "#2eb886",
          fallback: "This is the message",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "This is the message",
              },
            },
            {
              accessory: {
                action_id: "inclusion_modal",
                text: {
                  text: "Why this suggestion?",
                  type: "plain_text",
                },
                type: "button",
                value: "match 1",
              },
              text: {
                text: "",
                type: "mrkdwn",
              },
              type: "section",
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: "You can view the <https://docs.google.com/document/d/1iQT7Gy0iQa7sopBP0vB3CZ56GhyYrDNUzLdoWOowSHs/edit|full list of words and phrases> this bot watches for.",
                },
              ],
            },
          ],
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

      expect(addEmojiReaction).toHaveBeenCalledWith(msg, "wave");

      expectedMessage.attachments[0].blocks[1].text.text =
        expect.stringMatching(
          /• Instead of saying "match 1," how about \*(a1|a2|a3)\*\?/
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

      expectedMessage.attachments[0].blocks[1].accessory.value =
        "match 1|match 2a";

      expect(addEmojiReaction).toHaveBeenCalledWith(msg, "wave");

      expectedMessage.attachments[0].blocks[1].text.text =
        expect.stringMatching(
          /• Instead of saying "match 1," how about \*(a1|a2|a3)\*\?\n• Instead of saying "match 2a," how about \*b1\*\?/
        );

      expect(postEphemeralResponse).toHaveBeenCalledWith(msg, expectedMessage);

      // Reset the parts of the expected message that we changed above.
      expectedMessage.attachments[0].blocks[1].accessory.value = "match 1";
    });

    it("handles two triggering phrases where one is explicitly ignored", () => {
      msg.message.text = "hello this is the not match 1 trigger and match 2a";
      handler(msg);

      expectedMessage.attachments[0].blocks[1].accessory.value = "match 2a";

      expect(addEmojiReaction).toHaveBeenCalledWith(msg, "wave");

      expectedMessage.attachments[0].blocks[1].text.text =
        expect.stringMatching(
          /• Instead of saying "match 2a," how about \*b1\*\?/
        );
      expect(postEphemeralResponse).toHaveBeenCalledWith(msg, expectedMessage);

      // Reset the parts of the expected message that we changed above.
      expectedMessage.attachments[0].blocks[1].accessory.value = "match 1";
    });

    it("does not trigger on phrases that are contained within quotes", () => {
      msg.message.text = `this "is match 1 but" in quotes and also "match 1" without anything else in the quotes`;
      handler(msg);

      expect(addEmojiReaction).not.toHaveBeenCalled();
      expect(postEphemeralResponse).not.toHaveBeenCalled();
    });

    it("but it does trigger if one phrase is unquoted", () => {
      msg.message.text = `here is "match 1" but match 2a is not quoted`;
      handler(msg);

      expectedMessage.attachments[0].blocks[1].accessory.value = "match 2a";

      expect(addEmojiReaction).toHaveBeenCalledWith(msg, "wave");

      expectedMessage.attachments[0].blocks[1].text.text =
        expect.stringMatching(
          /• Instead of saying "match 2a," how about \*b1\*\?/
        );
      expect(postEphemeralResponse).toHaveBeenCalledWith(msg, expectedMessage);

      // Reset the parts of the expected message that we changed above.
      expectedMessage.attachments[0].blocks[1].accessory.value = "match 1";
    });
  });
});
