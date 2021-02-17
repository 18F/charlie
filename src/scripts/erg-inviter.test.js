const fs = require("fs");
const {
  getApp,
  utils: {
    slack: { postMessage, sendDirectMessage },
  },
} = require("../utils/test");
const bot = require("./erg-inviter");

jest.mock("fs");

describe("ERG metadata loader", () => {
  fs.readFileSync.mockReturnValue(`
ergs:
  one:
    text: this is some text`);

  it("loads ERGs from the YAML files", () => {
    const ergs = bot.getERGs();

    expect(ergs).toEqual({
      one: { text: "this is some text" },
    });
  });
});

describe("ERG inviter", () => {
  const app = getApp();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("handles ERG invitation requests", () => {
    it("subscribes to ERG invitation actions", () => {
      bot(app);

      expect(app.action).toHaveBeenCalledWith(
        bot.actionId,
        expect.any(Function)
      );
    });

    it("sends a message to the appropriate channel when a user requests an invitation", async () => {
      bot(app);
      // TODO: Update the test utils to allow getting action handlers
      const handler = app.action.mock.calls[0][1];
      const ack = jest.fn().mockResolvedValue();

      await handler({
        ack,
        action: { value: "target channel" },
        body: { user: { id: "user id" } },
      });

      expect(ack).toHaveBeenCalledWith();
      expect(postMessage).toHaveBeenCalledWith({
        channel: "target channel",
        icon_emoji: ":tts:",
        text: ":wave: <@user id> has requested an invitation to this channel.",
        username: "Inclusion Bot",
      });
      expect(sendDirectMessage).toHaveBeenCalledWith("user id", {
        icon_emoji: ":tts:",
        text: "Okay, I've sent your request to join that channel.",
        username: "Inclusion Bot",
      });
    });
  });

  describe("handles requests for information about ERGs", () => {
    beforeAll(() => {
      bot.getERGs = () => ({
        one: { description: "Number One", channel: "one1" },
        two: { description: "Number Two", channel: "two2" },
        three: { description: "Number Three", channel: "three3" },
      });
    });

    it("subscribes to case-insensitive requests for ERGs", () => {
      bot(app);

      expect(app.message).toHaveBeenCalledWith(
        expect.any(Function),
        /ergs/i,
        expect.any(Function)
      );
    });

    it("sends a DM to the requesting user with a list of ERG channels", () => {
      bot(app);
      const handler = app.getHandler();

      handler({ event: { user: "abc123" } });

      expect(sendDirectMessage).toHaveBeenCalledWith("abc123", {
        icon_emoji: ":tts:",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "Here are the available employee afinity group channels.",
            },
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: `• *one*: Number One` },
            accessory: {
              type: "button",
              text: { type: "plain_text", text: "Request invitation" },
              value: "one1",
              action_id: bot.actionId,
            },
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: `• *two*: Number Two` },
            accessory: {
              type: "button",
              text: { type: "plain_text", text: "Request invitation" },
              value: "two2",
              action_id: bot.actionId,
            },
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: `• *three*: Number Three` },
            accessory: {
              type: "button",
              text: { type: "plain_text", text: "Request invitation" },
              value: "three3",
              action_id: bot.actionId,
            },
          },
        ],
        text: "Here are the available employee afinity group channels.",
        username: "Inclusion Bot",
      });
    });
  });
});
