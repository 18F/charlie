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

  describe("it breaks up giant messages into smaller ones", () => {
    let handler;
    const say = jest.fn();

    const args = {
      context: {
        botUserId: "bot-id",
      },
      event: { thread: "thread" },
      say,
    };

    const registeredHelpers = new Map([
      [type.interactive, []],
      [type.noninteractive, []],
    ]);

    beforeEach(() => {
      help(app);
      handler = app.getHandler();

      getSlackUsers.mockResolvedValue([
        { id: "nobody", real_name: "not it" },
        { id: "bot-id", real_name: "the bot" },
      ]);

      registeredHelpers.set(type.interactive, []);
      registeredHelpers.set(type.noninteractive, []);

      getHelp.mockReturnValue(registeredHelpers);
    });

    it("does nothing if there are only a few registered scripts", async () => {
      const SCRIPT_COUNT = 3;

      // There should be two blocks for every registered script: one for the
      // script itself and one for the divider. The last script does not have a
      // divider, but each tyep of script has a header.
      //
      // SCRIPT_COUNT is how many scripts we register for each kind of script,
      // so in total we're registering SCRIPT_COUNT * 2 scripts.
      const EXPECTED_BLOCKS = 12;

      for (let i = 0; i < SCRIPT_COUNT; i += 1) {
        registeredHelpers.get(type.interactive).push({ name: "help" });
      }

      for (let i = 0; i < SCRIPT_COUNT; i += 1) {
        registeredHelpers.get(type.interactive).push({ name: "help" });
      }

      await handler(args);

      expect(say).toHaveBeenCalledTimes(1);
      expect(say.mock.calls[0][0].blocks.length).toEqual(EXPECTED_BLOCKS);
    });

    it("sends multiple messages if there are lots of scripts", async () => {
      const SCRIPT_COUNT = 40;

      for (let i = 0; i < SCRIPT_COUNT; i += 1) {
        registeredHelpers.get(type.interactive).push({ name: "help" });
      }

      for (let i = 0; i < SCRIPT_COUNT; i += 1) {
        registeredHelpers.get(type.interactive).push({ name: "help" });
      }

      await handler(args);

      // There will be 160 total blocks generated which is too many for a single
      // Slack message, so the response needs to be broken into a few messages.
      // Trailing dividers in a given message should be removed.
      //
      // BEFORE MESSAGE 1:
      //   Interactive: 40
      //   Noninteractive: 40
      //
      // The first message will include the "Interactive bots" header, help info
      // for 25 scripts, and 24 dividers, for a total of 50 blocks.
      //
      // BEFORE MESSAGE 2:
      //   Interactive: 15
      //   Noninteractive: 40
      //
      // The second message will contain the remaining 15 interactive script
      // help blocks, 14 dividers, the "Noninteractive bots" header , 10
      // noninteractive script blocks, and 9 more dividers, for a total of
      // 49 more blocks.
      //
      // BEFORE MESSAGE 3:
      //   Interactive: 0
      //   Noninteractive: 30
      //
      // The third message will contain 25 script help blocks and 24 dividers.
      //
      // BEFORE MESSAGE 4:
      //   Interactive: 0
      //   Noninteractive: 5
      //
      // The fourth message will contain 5 help blocks and 4 dividers.

      expect(say).toHaveBeenCalledTimes(4);

      expect(say.mock.calls[0][0].blocks.length).toEqual(50);
      expect(say.mock.calls[1][0].blocks.length).toEqual(49);
      expect(say.mock.calls[2][0].blocks.length).toEqual(49);
      expect(say.mock.calls[3][0].blocks.length).toEqual(9);
    });
  });
});
