const {
  getApp,
  utils: {
    helpMessage: { getHelp, type },
    slack: { getSlackUsers },
  },
} = require("../utils/test");
const help = require("./help");

describe("Charlie self-help", () => {
  const app = getApp();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("registers a help handler", () => {
    help(app);

    expect(app.message).toHaveBeenCalledWith(
      expect.any(Function),
      "help",
      expect.any(Function)
    );
  });

  describe("it renders a full block of helpful helpiness", () => {
    const context = {
      botUserId: "bot-id",
    };

    const say = jest.fn();

    // The expected output assumes the mocked input below will be sorted and
    // rendered correctly. It also assumes the bot's name will be properly
    // fetched from the Slack API, given only a bot ID.
    const expected = {
      text: "Charlie help",
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "Interactive bots" },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*a bot*: Help for bot A\n```trigger a```",
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*b bot*: Also B bot helpy help (requires @-mentioning Charlie)\n```@the bot trigger b```",
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*z bot*: Bot Z also has help\n```trigger z```",
          },
        },
        {
          type: "header",
          text: { type: "plain_text", text: "Non-interactive bots" },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*f bot*: flippity flop floop floop",
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*r bot*: rrrrrrrrrr",
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*t bot*: tater tater",
          },
        },
      ],
    };

    let handler;

    beforeEach(() => {
      help(app);
      handler = app.getHandler();

      getSlackUsers.mockResolvedValue([
        { id: "nobody", real_name: "not it" },
        { id: "bot-id", real_name: "the bot" },
      ]);

      // This return value ensures that bots will be sorted before they are sent
      // back to the user and that bots that require a direct mention are shown
      // correctly. And that should cover most of the code paths in the bot.
      getHelp.mockReturnValue(
        new Map([
          [
            type.interactive,
            [
              {
                name: "a bot",
                helpText: "Help for bot A",
                trigger: "trigger a",
                directMention: false,
              },
              {
                name: "z bot",
                helpText: "Bot Z also has help",
                trigger: "trigger z",
                directMention: false,
              },
              {
                name: "b bot",
                helpText: "Also B bot helpy help",
                trigger: "trigger b",
                directMention: true,
              },
            ],
          ],
          [
            type.noninteractive,
            [
              { name: "r bot", helpText: "rrrrrrrrrr" },
              { name: "t bot", helpText: "tater tater" },
              { name: "f bot", helpText: "flippity flop floop floop" },
            ],
          ],
        ])
      );
    });

    it("starts a thread if the message isn't already in one", async () => {
      await handler({ context, event: { ts: "message timestamp" }, say });

      expect(say).toHaveBeenCalledWith({
        ...expected,
        thread_ts: "message timestamp",
      });
    });

    it("replies in the same thread as the triggering message", async () => {
      await handler({
        context,
        event: { thread_ts: "thread timestamp", ts: "message timestamp" },
        say,
      });

      expect(say).toHaveBeenCalledWith({
        ...expected,
        thread_ts: "thread timestamp",
      });
    });
  });
});
