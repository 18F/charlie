const fs = require("fs");
const {
  getApp,
  utils: {
    homepage,
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
        bot.requestionInvitationActionId,
        expect.any(Function)
      );
    });

    it("sends a message to the appropriate channel when a user requests an invitation", async () => {
      bot(app);
      const handler = app.getActionHandler(bot.requestionInvitationActionId);
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
              text: { type: "plain_text", text: "Request invitation to one" },
              value: "one1",
              action_id: bot.requestionInvitationActionId,
            },
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: `• *two*: Number Two` },
            accessory: {
              type: "button",
              text: { type: "plain_text", text: "Request invitation to two" },
              value: "two2",
              action_id: bot.requestionInvitationActionId,
            },
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: `• *three*: Number Three` },
            accessory: {
              type: "button",
              text: { type: "plain_text", text: "Request invitation to three" },
              value: "three3",
              action_id: bot.requestionInvitationActionId,
            },
          },
        ],
        text: "Here are the available employee afinity group channels.",
        username: "Inclusion Bot",
      });
    });
  });

  describe("sets up a homepage interaction", () => {
    it("registers a homepage interaction", () => {
      bot(app);

      expect(homepage.registerInteractive).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it("sends back a UI for the homepage", () => {
      bot(app);
      const getUI = homepage.registerInteractive.mock.calls[0][0];
      const ui = getUI();

      expect(ui).toEqual({
        type: "section",
        text: {
          type: "mrkdwn",
          text: ":inclusion-bot: Request an invitation to TTS employee affinity group Slack channels:.",
        },
        accessory: {
          type: "button",
          text: { type: "plain_text", text: "See a list of groups" },
          action_id: bot.showGroupsModalActionId,
        },
      });
    });
  });

  describe("handles the action for showing a modal of ERG options", () => {
    beforeEach(() => {
      bot.getERGs = () => ({
        one: { description: "Number One", channel: "one1" },
        two: { description: "Number Two", channel: "two2" },
        three: { description: "Number Three", channel: "three3" },
      });
    });

    it("registers the action", () => {
      bot(app);
      expect(app.action).toHaveBeenCalledWith(
        bot.showGroupsModalActionId,
        expect.any(Function)
      );
    });

    it("shows a modal when the action is fired", async () => {
      bot(app);
      const action = app.getActionHandler(bot.showGroupsModalActionId);

      const message = {
        ack: jest.fn(),
        body: { trigger_id: "trigger id" },
        client: { views: { open: jest.fn() } },
      };

      await action(message);

      expect(message.ack).toHaveBeenCalled();
      expect(message.client.views.open).toHaveBeenCalledWith({
        trigger_id: "trigger id",
        view: {
          type: "modal",
          title: {
            type: "plain_text",
            text: "TTS affinity groups",
          },
          blocks: [
            {
              type: "section",
              text: { type: "mrkdwn", text: `• *one*: Number One` },
              accessory: {
                type: "button",
                text: { type: "plain_text", text: "Request invitation to one" },
                value: "one1",
                action_id: bot.requestionInvitationActionId,
              },
            },
            {
              type: "section",
              text: { type: "mrkdwn", text: `• *two*: Number Two` },
              accessory: {
                type: "button",
                text: { type: "plain_text", text: "Request invitation to two" },
                value: "two2",
                action_id: bot.requestionInvitationActionId,
              },
            },
            {
              type: "section",
              text: { type: "mrkdwn", text: `• *three*: Number Three` },
              accessory: {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Request invitation to three",
                },
                value: "three3",
                action_id: bot.requestionInvitationActionId,
              },
            },
          ],
        },
      });
    });
  });
});
